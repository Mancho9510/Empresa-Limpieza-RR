/**
 * api.js — Capa de acceso a Google Apps Script
 * Todas las llamadas al backend pasan por aquí.
 *
 * IMPORTANTE: Cambia APPS_SCRIPT_URL por tu URL real.
 */

// ── Configuración ──────────────────────────────────────────
export const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby-dGGJrYSeWPHPscyzIP5ndwA519NZzRpJHSh7TFylsQIooLzRL0qS4Ge2CxNy6CHo/exec',
  WA_NUMBER:  '573503443140',
  PAY_NUMBER: '3203346819',
  PAY_HOLDER: 'Limpieza RR',
  AUTOPLAY_MS: 4200,
}

// ── TTL del caché de productos (30 minutos) ────────────────
const CACHE_KEY = 'lrr_prods_v1'
const CACHE_TTL = 30 * 60 * 1000

// ── GET: obtener datos públicos ────────────────────────────

export async function fetchProductos() {
  const cached = getCachedProducts()
  if (cached) return cached

  const url = `${CONFIG.APPS_SCRIPT_URL}?action=productos&t=${Date.now()}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Error del servidor')
  setCachedProducts(json.data)
  return json.data
}

export async function fetchCupon(code) {
  const url = `${CONFIG.APPS_SCRIPT_URL}?action=cupon&code=${encodeURIComponent(code)}`
  const res  = await fetch(url)
  const json = await res.json()
  return json
}

export async function fetchHistorial(telefono) {
  const url = `${CONFIG.APPS_SCRIPT_URL}?action=historial&telefono=${encodeURIComponent(telefono)}&t=${Date.now()}`
  const res  = await fetch(url)
  const text = await res.text()
  return JSON.parse(text)
}

export async function fetchEstado(telefono) {
  const url = `${CONFIG.APPS_SCRIPT_URL}?action=estado&telefono=${encodeURIComponent(telefono)}&t=${Date.now()}`
  const res  = await fetch(url)
  const text = await res.text()
  return JSON.parse(text)
}

export async function fetchResenas() {
  const url = `${CONFIG.APPS_SCRIPT_URL}?action=resenas&t=${Date.now()}`
  const res  = await fetch(url)
  return await res.json()
}

// ── POST: guardar datos ────────────────────────────────────

export async function postPedido(orderData) {
  return await postJSON(orderData)
}

export async function postCalificacion(data) {
  return await postJSON({ accion: 'calificacion', ...data })
}

// ── Helper POST interno ────────────────────────────────────
async function postJSON(body) {
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(body),
    })
  } catch (err) {
    console.error('API POST error:', err)
  }
}

// ── Caché localStorage ─────────────────────────────────────
export function getCachedProducts(allowStale = false) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (!allowStale && Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return data
  } catch { return null }
}

function setCachedProducts(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export function clearProductCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}
