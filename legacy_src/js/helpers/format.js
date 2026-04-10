/**
 * format.js — Funciones de formato y utilidades
 * Helpers puros: no acceden al DOM, no hacen fetch.
 * Se pueden importar en cualquier módulo.
 */

/**
 * Formatea un número como precio colombiano
 * Ejemplo: fmt(16000) → "$ 16.000"
 */
export function fmt(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}

/**
 * Convierte URLs de Google Drive al formato de imagen directa
 * Soporta: /file/d/ID/view y ?id=ID
 */
export function sanitizeImgUrl(url) {
  if (!url || url.trim() === '') return ''
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (matchFile) return `https://drive.google.com/uc?export=view&id=${matchFile[1]}`
  const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (matchOpen) return `https://drive.google.com/uc?export=view&id=${matchOpen[1]}`
  if (url.startsWith('http')) return url
  return ''
}

/**
 * Normaliza un número de teléfono colombiano
 * Ejemplo: "57300123456" → "300123456"
 */
export function normalizeTel(value) {
  let tel = String(value || '').replace(/\D/g, '')
  if (tel.length === 12 && tel.startsWith('57')) tel = tel.slice(2)
  return tel
}
