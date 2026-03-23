/* ══════════════════════════════════════════
   ADMIN API — Capa de acceso a Apps Script
══════════════════════════════════════════ */
import { APPS_URL, ADMIN_KEY } from './config.js';

function buildUrl(action, params = {}) {
  const url = new URL(APPS_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('clave', ADMIN_KEY);
  url.searchParams.set('t', Date.now());
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url.toString();
}

async function getJson(action, params = {}) {
  const res  = await fetch(buildUrl(action, params), { redirect: 'follow' });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

async function postJson(payload) {
  const res  = await fetch(APPS_URL, {
    method:   'POST',
    redirect: 'follow',
    headers:  { 'Content-Type': 'text/plain' },
    body:     JSON.stringify({ ...payload, clave: ADMIN_KEY }),
  });

  const text = await res.text();

  // LOG DE DIAGNÓSTICO — quitar cuando todo funcione
  console.group(`📤 POST accion=${payload.accion}`);
  console.log('payload:', payload);
  console.log('status:', res.status, res.url);
  console.log('respuesta (primeros 300 chars):', text.slice(0, 300));
  console.groupEnd();

  try {
    const data = JSON.parse(text);
    if (!data.ok) throw new Error(data.error || 'Error del servidor');
    return data;
  } catch (parseErr) {
    // Si la respuesta no es JSON, registrar el problema real
    console.error('❌ respuesta no-JSON de Apps Script:', text.slice(0, 500));
    // NO asumir ok ciegamente — lanzar error si el texto parece un fallo real
    if (text.includes('Error') || text.includes('error') || res.status >= 400) {
      throw new Error('Apps Script devolvió respuesta inesperada (ver consola)');
    }
    // Solo para cold start con HTML de redirección exitosa (status 200)
    return { ok: true };
  }
}

export const adminApi = {
  getPedidos:      (p) => getJson('admin_pedidos',      p),
  getProductos:    (f) => getJson('admin_productos', f ? { refresh: 1 } : {}),
  getDashboard:    (f) => getJson('admin_dashboard',    f ? { refresh: 1 } : {}),
  getRentabilidad: (f) => getJson('admin_rentabilidad', f ? { refresh: 1 } : {}),
  getClientes:     (p) => getJson('admin_clientes',     p),
  getProveedores:  (p) => getJson('admin_proveedores',  p),
  updateEstado:    (p) => postJson({ accion: 'actualizar_estado',   ...p }),
  updateStock:     (p) => postJson({ accion: 'actualizar_stock',    ...p }),
  updateCosto:     (p) => postJson({ accion: 'actualizar_costo',    ...p }),
  updatePrecio:    (p) => postJson({ accion: 'actualizar_precio',   ...p }),
};