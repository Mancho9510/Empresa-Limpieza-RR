/**
 * migrateAll.mjs
 * Migración masiva desde Google Apps Script → Supabase
 * Columnas exactas según Google Sheets (confirmadas 2026-04-10)
 *
 * Uso: node scripts/migrateAll.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs  from 'fs';
import path from 'path';

// ── Cargar .env.local ─────────────────────────────────────────
try {
  const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=][^=]*)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
    }
  });
} catch { /* archivo no encontrado, se usan vars del sistema */ }

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AS_URL         = process.env.APPS_SCRIPT_URL;
const ADMIN_KEY      = process.env.ADMIN_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}
if (!AS_URL || !ADMIN_KEY) {
  console.error('❌ Faltan APPS_SCRIPT_URL o ADMIN_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────

/**
 * Convierte fechas del formato colombiano "DD/MM/AAAA HH:mm:ss"
 * o cualquier string reconocible a ISO 8601.
 * Si falla devuelve null (columnas TIMESTAMPTZ con DEFAULT NOW() lo manejan).
 */
function safeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // Formato "DD/MM/AAAA HH:mm:ss" o "DD/MM/AAAA"
  const colMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (colMatch) {
    const [, dd, mm, yyyy, hh = '0', mn = '0', ss = '0'] = colMatch;
    const d = new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mn, +ss));
    if (!isNaN(d)) return d.toISOString();
  }

  // Intentar parseo genérico (detiene ambigüedades MM/DD americanas)
  const cleaned = s
    .replace(/a\.\s*m\./gi, 'AM')
    .replace(/p\.\s*m\./gi, 'PM');
  const d = new Date(cleaned);
  if (!isNaN(d)) return d.toISOString();

  return null;
}

function safeDateOrNow(raw) {
  return safeDate(raw) ?? new Date().toISOString();
}

function phone(raw) {
  return String(raw ?? '').replace(/[^0-9+]/g, '');
}

function num(raw, decimals = 2) {
  const n = parseFloat(String(raw ?? '').replace(/,/g, '.'));
  return isNaN(n) ? 0 : +n.toFixed(decimals);
}

function bool(raw) {
  if (typeof raw === 'boolean') return raw;
  return ['true', 'si', 'sí', '1', 'yes'].includes(String(raw).toLowerCase().trim());
}

async function fetchAction(action) {
  const url = `${AS_URL}?action=${action}&clave=${ADMIN_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} para acción: ${action}`);
  return res.json();
}

async function clearTable(table, uniqueCol, dummyVal) {
  const { error } = await supabase.from(table).delete().neq(uniqueCol, dummyVal);
  if (error) console.warn(`  ⚠️  No se pudo limpiar ${table}: ${error.message}`);
}

async function insertChunked(table, rows, chunkSize = 200) {
  let ok = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  ❌ Error en ${table} (chunk ${i / chunkSize + 1}):`, error.message);
    } else {
      ok += chunk.length;
    }
  }
  return ok;
}

// ══════════════════════════════════════════════════════════════
// MIGRACIONES
// ══════════════════════════════════════════════════════════════

// ─── 1. CALIFICACIONES ────────────────────────────────────────
// Sheets: fecha | nombre | telefono | estrellas | comentario
async function migrateCalificaciones() {
  console.log('\n📋 CALIFICACIONES...');
  const data = await fetchAction('resenas');
  const list = data.data ?? data.resenas ?? data.calificaciones ?? [];
  if (!list.length) { console.log('  ⚠️  Sin datos'); return; }

  await clearTable('calificaciones', 'id', 0);

  const rows = list.map(r => ({
    fecha:      safeDateOrNow(r.fecha ?? r.created_at),
    nombre:     String(r.nombre ?? ''),
    telefono:   phone(r.telefono),
    estrellas:  Math.min(5, Math.max(1, num(r.estrellas, 0) || 5)),
    comentario: String(r.comentario ?? '')
  }));

  const ok = await insertChunked('calificaciones', rows);
  console.log(`  ✅ ${ok} calificaciones migradas`);
}

// ─── 2. PRODUCTOS ─────────────────────────────────────────────
// Sheets: id | nombre | tamano | precio | costo | categoria |
//         destacado | emoji | descripcion | imagen | imagen2 | imagen3 | stock
async function migrateProductos() {
  console.log('\n📦 PRODUCTOS...');
  const data = await fetchAction('productos');
  const list = data.data ?? data.productos ?? [];
  if (!list.length) { console.log('  ⚠️  Sin datos'); return; }

  await clearTable('productos', 'id', 0);

  const rows = list.map(p => ({
    // No incluimos id aquí: lo asigna la secuencia BIGSERIAL
    // (si el Apps Script devuelve id numérico se puede incluir)
    nombre:      String(p.nombre ?? ''),
    tamano:      String(p.tamano ?? p.tamaño ?? ''),
    precio:      num(p.precio),
    costo:       num(p.costo),
    categoria:   String(p.categoria ?? ''),
    destacado:   bool(p.destacado),
    emoji:       String(p.emoji ?? ''),
    descripcion: String(p.descripcion ?? ''),
    imagen:      String(p.imagen ?? ''),
    imagen2:     String(p.imagen2 ?? ''),
    imagen3:     String(p.imagen3 ?? ''),
    stock:       num(p.stock, 0)
  }));

  const ok = await insertChunked('productos', rows);
  console.log(`  ✅ ${ok} productos migrados`);
}

// ─── 3. PEDIDOS ───────────────────────────────────────────────
// Sheets: fecha | nombre | telefono | ciudad | departamento | barrio |
//         direccion | casa | conjunto | nota | cupon | descuento | pago |
//         zona_envio | costo_envio | subtotal | total | estado_pago |
//         estado_envio | productos | productos_json | archivado
async function migratePedidos() {
  console.log('\n🛒 PEDIDOS...');
  const data = await fetchAction('admin_pedidos');
  const list = data.data ?? data.pedidos ?? [];
  if (!list.length) { console.log('  ⚠️  Sin datos'); return; }

  await clearTable('pedidos', 'id', 0);

  const rows = list.map(p => {
    let prod_json = [];
    try {
      prod_json = Array.isArray(p.productos_json)
        ? p.productos_json
        : JSON.parse(p.productos_json || '[]');
    } catch { prod_json = []; }

    return {
      fecha:         safeDateOrNow(p.fecha),
      nombre:        String(p.nombre ?? 'Desconocido'),
      telefono:      phone(p.telefono),
      ciudad:        String(p.ciudad ?? ''),
      departamento:  String(p.departamento ?? ''),
      barrio:        String(p.barrio ?? ''),
      direccion:     String(p.direccion ?? ''),
      casa:          String(p.casa ?? ''),
      conjunto:      String(p.conjunto ?? ''),
      nota:          String(p.nota ?? ''),
      cupon:         String(p.cupon ?? ''),
      descuento:     num(p.descuento),
      pago:          String(p.pago ?? ''),
      zona_envio:    String(p.zona_envio ?? ''),
      costo_envio:   num(p.costo_envio),
      subtotal:      num(p.subtotal),
      total:         num(p.total),
      estado_pago:   String(p.estado_pago ?? 'PENDIENTE'),
      estado_envio:  String(p.estado_envio ?? 'Recibido'),
      productos:     String(p.productos ?? ''),
      productos_json: prod_json,
      archivado:     bool(p.archivado)
    };
  });

  const ok = await insertChunked('pedidos', rows);
  console.log(`  ✅ ${ok} pedidos migrados`);
}

// ─── 4. CLIENTES ──────────────────────────────────────────────
// Sheets: primera_compra | ultima_compra | nombre | telefono | ciudad |
//         barrio | direccion | total_pedidos | total_gastado | tipo |
//         ultimos_pedidos | productos_favoritos | Frecuencia
async function migrateClientes() {
  console.log('\n👥 CLIENTES...');
  const data = await fetchAction('admin_clientes');
  const list = data.data ?? data.clientes ?? [];
  if (!list.length) { console.log('  ⚠️  Sin datos'); return; }

  await clearTable('clientes', 'telefono', 'dummy_placeholder_000');

  const mapped = list.map(c => ({
    primera_compra:     safeDateOrNow(c.primera_compra),
    ultima_compra:      safeDateOrNow(c.ultima_compra),
    nombre:             String(c.nombre ?? ''),
    telefono:           phone(c.telefono),
    ciudad:             String(c.ciudad ?? ''),
    barrio:             String(c.barrio ?? ''),
    direccion:          String(c.direccion ?? ''),
    total_pedidos:      num(c.total_pedidos, 0),
    total_gastado:      num(c.total_gastado),
    tipo:               String(c.tipo ?? 'Nuevo'),
    ultimos_pedidos:    num(c.ultimos_pedidos ?? c['ultimos_pedidos'], 0),
    productos_favoritos: String(c.productos_favoritos ?? ''),
    frecuencia:         num(c.Frecuencia ?? c.frecuencia)
  })).filter(c => c.telefono.length > 5);

  // Deduplicar por teléfono (más pedidos gana)
  const unique = new Map();
  for (const c of mapped) {
    const prev = unique.get(c.telefono);
    if (!prev || c.total_pedidos > prev.total_pedidos) unique.set(c.telefono, c);
  }

  const ok = await insertChunked('clientes', Array.from(unique.values()));
  console.log(`  ✅ ${ok} clientes migrados`);
}

// ─── 5. PROVEEDORES ───────────────────────────────────────────
// Sheets: nombre | contacto_nombre | telefono | email | productos |
//         direccion | nota | fecha_registro | activo
async function migrateProveedores() {
  console.log('\n🏭 PROVEEDORES...');
  const data = await fetchAction('admin_proveedores');
  const list = data.data ?? data.proveedores ?? [];
  if (!list.length) { console.log('  ⚠️  Sin datos'); return; }

  await clearTable('proveedores', 'id', 0);

  const rows = list.map(p => ({
    nombre:          String(p.nombre ?? ''),
    contacto_nombre: String(p.contacto_nombre ?? p.contacto ?? ''),
    telefono:        phone(p.telefono),
    email:           String(p.email ?? ''),
    productos:       String(p.productos ?? ''),
    direccion:       String(p.direccion ?? ''),
    nota:            String(p.nota ?? p.notas ?? ''),
    fecha_registro:  safeDateOrNow(p.fecha_registro),
    activo:          bool(p.activo ?? true)
  }));

  const ok = await insertChunked('proveedores', rows);
  console.log(`  ✅ ${ok} proveedores migrados`);
}

// ─── 6. CUPONES ───────────────────────────────────────────────
// Sheets: codigo | descripcion | tipo | valor | usos_maximos |
//         usos_actuales | vencimiento | activo
async function migrateCupones() {
  console.log('\n🎟️  CUPONES...');
  const data = await fetchAction('admin_cupones');
  const list = data.data ?? data.cupones ?? [];
  if (!list.length) { console.log('  ⚠️  Sin datos'); return; }

  await clearTable('cupones', 'codigo', 'dummy_placeholder_000');

  const rows = list.map(c => ({
    codigo:        String(c.codigo ?? '').toUpperCase().trim(),
    descripcion:   String(c.descripcion ?? ''),
    tipo:          String(c.tipo ?? 'pct'),          // 'pct' | 'fixed'
    valor:         num(c.valor ?? c.descuento),
    usos_maximos:  num(c.usos_maximos ?? c.limite, 0),
    usos_actuales: num(c.usos_actuales ?? c.usos, 0),
    vencimiento:   safeDate(c.vencimiento),           // null si vacío
    activo:        bool(c.activo ?? true)
  })).filter(c => c.codigo.length > 0);

  // Deduplicar por código
  const unique = new Map();
  for (const c of rows) unique.set(c.codigo, c);

  const ok = await insertChunked('cupones', Array.from(unique.values()));
  console.log(`  ✅ ${ok} cupones migrados`);
}

// ══════════════════════════════════════════════════════════════
// RUNNER PRINCIPAL
// ══════════════════════════════════════════════════════════════
async function run() {
  console.log('🚀 Iniciando migración masiva Limpieza RR → Supabase');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Hora: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`);

  try { await migrateCalificaciones(); } catch(e) { console.error('❌ CALIFICACIONES falló:', e.message); }
  try { await migrateProductos();      } catch(e) { console.error('❌ PRODUCTOS falló:',      e.message); }
  try { await migratePedidos();        } catch(e) { console.error('❌ PEDIDOS falló:',         e.message); }
  try { await migrateClientes();       } catch(e) { console.error('❌ CLIENTES falló:',        e.message); }
  try { await migrateProveedores();    } catch(e) { console.error('❌ PROVEEDORES falló:',     e.message); }
  try { await migrateCupones();        } catch(e) { console.error('❌ CUPONES falló:',         e.message); }

  console.log('\n🎉 Migración completada. Revisa los ❌ arriba si hubo errores.');
}

run().catch(console.error);
