import { CONFIG } from '../config.js';
import { sanitizeImgUrl } from '../utils/format.js';

export async function fetchProducts() {
  const url  = `${CONFIG.APPS_SCRIPT_URL}?action=productos&t=${Date.now()}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok || !Array.isArray(json.data)) throw new Error("Respuesta inesperada del servidor");

  return json.data.map((row, i) => ({
    id:    Number(row.id)   || i + 1,
    name:  String(row.nombre   || ""),
    size:  String(row["tamaño"] || row.tamano || ""),
    price: Number(String(row.precio).replace(/[^0-9.]/g, "")) || 0,
    cat:   String(row.categoria  || "General"),
    top:   String(row.destacado).toLowerCase() === "true" || row.destacado === true,
    e:     String(row.emoji      || "🧴"),
    desc:  String(row.descripcion|| "Producto de limpieza de alta calidad."),
    img:   sanitizeImgUrl(String(row.imagen || "")),
    img2:  sanitizeImgUrl(String(row.imagen2 || "")),
    img3:  sanitizeImgUrl(String(row.imagen3 || "")),
    stock: (row.stock !== undefined && row.stock !== "" && row.stock !== null)
             ? String(row.stock).trim() !== "" ? Number(row.stock) : null
             : null,
  }));
}

export async function saveOrderToSheets(orderData) {
  if (CONFIG.APPS_SCRIPT_URL === "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT") {
    console.warn("⚠️ Apps Script URL no configurada. El pedido no se guardará en Sheets.");
    return;
  }
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(orderData),
    });
  } catch (err) {
    console.error("Error guardando pedido en Sheets:", err);
  }
}
