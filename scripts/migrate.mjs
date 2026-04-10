import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appsScriptUrl = process.env.APPS_SCRIPT_URL;

if (!supabaseUrl || !supabaseKey || supabaseKey.startsWith('PENDING')) {
  console.error("❌ Faltan claves de Supabase. Asegúrate de configurar .env.local y poner el service_role_key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadImageAndUploadToSupabase(url, filename) {
  try {
    if (!url || !url.startsWith('http')) return null;
    
    // Si la URL es de Drive, debemos tener una URL compatible. Suponiendo que las URL que manda el script ya son directas.
    const res = await fetch(url);
    if (!res.ok) {
        console.warn(`WARNING: No se pudo descargar la imagen ${url}`);
        return url; // Dejar la original si falla
    }
    const buffer = await res.arrayBuffer();
    
    // Subir a Storage
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const { data, error } = await supabase.storage
      .from('productos')
      .upload(`migracion/${Date.now()}_${cleanFilename}`, buffer, {
        contentType: res.headers.get('content-type') || 'image/jpeg',
        upsert: false
      });

    if (error) {
       console.error("Storage Error:", error.message);
       return url;
    }

    const publicUrl = supabase.storage.from('productos').getPublicUrl(data.path).data.publicUrl;
    return publicUrl;
  } catch (err) {
    console.error("Fetch Error:", err);
    return url;
  }
}

async function run() {
  console.log("🚀 Iniciando migración desde Google Sheets...");
  
  // 1. Asegurar Bucket
  console.log("📁 Asegurando Bucket publico 'productos'...");
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'productos')) {
      await supabase.storage.createBucket('productos', { public: true });
  }

  // 2. Traer productos de Sheets
  console.log(`🌐 Obteniendo productos desde ${appsScriptUrl}...`);
  const apiRes = await fetch(`${appsScriptUrl}?action=productos`);
  let apiData;
  try {
    const raw = await apiRes.text();
    apiData = JSON.parse(raw);
  } catch (e) {
    console.error("❌ Error parsing JSON from Apps Script:", e);
    return;
  }

  if (!apiData.ok || !apiData.data) {
     console.error("❌ Error al traer productos de Google Sheets.", apiData);
     return;
  }

  const productos = apiData.data;
  console.log(`📥 Encontrados ${productos.length} productos. Comenzando a procesar...`);

  let inserts = [];

  for (let [i, p] of productos.entries()) {
    console.log(`⏳ [${i+1}/${productos.length}] Procesando: ${p.nombre} - ${p.tamano}`);
    
    let imagen1 = p.imagen;
    let imagen2 = p.imagen2;
    let imagen3 = p.imagen3;

    if (imagen1) imagen1 = await downloadImageAndUploadToSupabase(imagen1, `img1_${p.nombre}_${p.tamano}.jpg`);
    if (imagen2) imagen2 = await downloadImageAndUploadToSupabase(imagen2, `img2_${p.nombre}_${p.tamano}.jpg`);
    if (imagen3) imagen3 = await downloadImageAndUploadToSupabase(imagen3, `img3_${p.nombre}_${p.tamano}.jpg`);

    inserts.push({
      nombre: String(p.nombre).trim(),
      tamano: p.tamano ? String(p.tamano).trim() : null,
      precio: Number(p.precio) || 0,
      costo: Number(p.costo) || 0,
      categoria: String(p.categoria || 'General').trim(),
      destacado: p.destacado === true || String(p.destacado).toLowerCase() === 'true',
      emoji: String(p.emoji || '').trim(),
      descripcion: String(p.descripcion || '').trim(),
      imagen: imagen1 || null,
      imagen2: imagen2 || null,
      imagen3: imagen3 || null,
      stock: p.stock !== null && p.stock !== "" && p.stock !== undefined ? Number(p.stock) : null
    });
  }

  console.log(`\n💾 Insertando ${inserts.length} productos en la tabla 'productos'...`);
  
  // Limpiar vieja data
  await supabase.from('productos').delete().neq('id', 'dummy_id');

  // Insertar
  const { error: dbError } = await supabase.from('productos').insert(inserts);
  
  if (dbError) {
      console.error("❌ Error al insertar en BD:", dbError);
  } else {
      console.log("✅ ¡Migración de Productos completada con éxito!");
  }
}

run().catch(console.error);
