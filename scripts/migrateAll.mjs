import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Fix env vars
try {
  const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
    }
  });
} catch(e) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appsScriptUrl = process.env.APPS_SCRIPT_URL;
const adminKey = process.env.ADMIN_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🚀 Iniciando migración masiva desde Google Sheets...");

  // 1. Clientes
  console.log("\n🌐 Obteniendo CLIENTES...");
  const clRes = await fetch(`${appsScriptUrl}?action=admin_clientes&clave=${adminKey}`);
  const clData = await clRes.json();
  const clList = clData.data || clData.clientes || [];
  if (clData.ok && clList.length) {
     console.log(`📥 Encontrados ${clList.length} clientes. Limpiando e insertando...`);
     await supabase.from('clientes').delete().neq('telefono', 'dummy');
     
     const mappedClientes = clList.map(c => ({
         nombre: c.nombre || '',
         telefono: String(c.telefono).replace(/[^0-9+]/g, ''),
         ciudad: c.ciudad || '',
         barrio: c.barrio || '',
         direccion: c.direccion || '',
         primera_compra: safeDate(c.primera_compra),
         ultima_compra: safeDate(c.ultima_compra),
         total_pedidos: Number(c.total_pedidos) || 0,
         total_gastado: Number(c.total_gastado) || 0,
         tipo: c.tipo || 'Nuevo'
     })).filter(c => c.telefono.length > 5);

     // Remove duplicates by phone
     const uniqueClientesMap = new Map();
     for (const c of mappedClientes) {
         if (!uniqueClientesMap.has(c.telefono) || c.total_pedidos > uniqueClientesMap.get(c.telefono).total_pedidos) {
             uniqueClientesMap.set(c.telefono, c);
         }
     }

     const { error } = await supabase.from('clientes').insert(Array.from(uniqueClientesMap.values()));
     if (error) console.error("❌ SQL Error (clientes):", error);
     else console.log("✅ Clientes migrados!");
  }

  // 2. Pedidos
  console.log("\n🌐 Obteniendo PEDIDOS...");
  const pedRes = await fetch(`${appsScriptUrl}?action=admin_pedidos&clave=${adminKey}`);
  const pedData = await pedRes.json();
  const pedList = pedData.data || pedData.pedidos || [];
  if (pedData.ok && pedList.length) {
     console.log(`📥 Encontrados ${pedList.length} pedidos. Limpiando e insertando...`);
     await supabase.from('pedidos').delete().neq('id', 0);
     
     const mappedPedidos = pedList.map((p, i) => ({
         id: i + 1,
         fecha: safeDate(p.fecha),
         nombre: String(p.nombre || 'Desconocido'),
         telefono: String(p.telefono).replace(/[^0-9+]/g, ''),
         ciudad: p.ciudad || '',
         barrio: p.barrio || '',
         direccion: p.direccion || '',
         cupon: p.cupon || '',
         descuento: Number(p.descuento) || 0,
         pago: p.pago || '',
         subtotal: Number(p.subtotal) || 0,
         total: Number(p.total) || 0,
         estado_pago: p.estado_pago || 'PENDIENTE',
         estado_envio: p.estado_envio || 'Recibido',
         productos_json: Array.isArray(p.productos_json) ? p.productos_json : (typeof p.productos_json === 'string' ? JSON.parse(p.productos_json || '[]') : []),
         archivado: p.archivado === true || String(p.archivado).toLowerCase() === 'true'
     }));

     const chunkSize = 200;
     for (let i = 0; i < mappedPedidos.length; i += chunkSize) {
         const chunk = mappedPedidos.slice(i, i + chunkSize);
         const { error } = await supabase.from('pedidos').insert(chunk);
         if (error) console.error(`❌ SQL Error (pedidos chunk ${i}):`, error);
     }
     console.log("✅ Pedidos migrados!");
  }
  
  // 3. Reseñas
  console.log("\n🌐 Obteniendo RESEÑAS...");
  const resRes = await fetch(`${appsScriptUrl}?action=resenas&clave=${adminKey}`);
  const resData = await resRes.json();
  const resList = resData.data || resData.resenas || resData.calificaciones || [];
  if (resData.ok && resList.length) {
      console.log(`📥 Encontradas ${resList.length} reseñas. Limpiando e insertando...`);
      await supabase.from('calificaciones').delete().neq('id', 0);
      const mappedResenas = resList.map((r, i) => ({
          id: i + 1,
          telefono: String(r.telefono),
          estrellas: Number(r.estrellas) || 5,
          comentario: String(r.comentario || ''),
          created_at: safeDate(r.fecha || r.created_at)
      }));
      const { error } = await supabase.from('calificaciones').insert(mappedResenas);
      if (error) console.error("❌ SQL Error (calificaciones):", error);
      else console.log("✅ Reseñas migradas!");
  }

  // 4. Proveedores
  console.log("\n🌐 Obteniendo PROVEEDORES...");
  const provRes = await fetch(`${appsScriptUrl}?action=admin_proveedores&clave=${adminKey}`);
  const provData = await provRes.json();
  const provList = provData.data || provData.proveedores || [];
  if (provData.ok && provList.length) {
      console.log(`📥 Encontrados ${provList.length} proveedores. Limpiando e insertando...`);
      await supabase.from('proveedores').delete().neq('id', 0);
      const mappedProv = provList.map((p, i) => ({
          id: i + 1,
          nombre: String(p.nombre || ''),
          contacto: p.contacto || '',
          telefono: p.telefono || '',
          estado: p.estado || 'activo',
          notas: p.notas || ''
      }));
      const { error } = await supabase.from('proveedores').insert(mappedProv);
      if (error) console.error("❌ SQL Error (proveedores):", error);
      else console.log("✅ Proveedores migrados!");
  }

  // 5. Cupones
  console.log("\n🌐 Obteniendo CUPONES...");
  const cupRes = await fetch(`${appsScriptUrl}?action=admin_cupones&clave=${adminKey}`);
  const cupData = await cupRes.json();
  const cupList = cupData.data || cupData.cupones || [];
  if (cupData.ok && cupList.length) {
      console.log(`📥 Encontrados ${cupList.length} cupones. Limpiando e insertando...`);
      await supabase.from('cupones').delete().neq('codigo', 'dummy');
      const mappedCup = cupList.map(c => ({
          codigo: String(c.codigo || '').toUpperCase(),
          descuento: Number(c.descuento) || 0,
          tipo: String(c.tipo || 'porcentaje'),
          estado: String(c.estado || 'activo'),
          usos: Number(c.usos) || 0,
          limite: Number(c.limite) || 0
      }));
      const { error } = await supabase.from('cupones').insert(mappedCup);
      if (error) console.error("❌ SQL Error (cupones):", error);
      else console.log("✅ Cupones migrados!");
  }

  console.log("\n🎉 Migración TOTAL completada con éxito!");
}

function safeDate(dStr) {
  if (!dStr) return new Date().toISOString();
  // Example of problem: 4/10/2026 12:44:31 a. m.
  let cleaned = String(dStr).replace(/a\.\s*m\./gi, 'AM').replace(/p\.\s*m\./gi, 'PM');
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

run().catch(console.error);
