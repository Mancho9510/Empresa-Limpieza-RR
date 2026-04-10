/**
 * validators.js — Funciones de validación de formularios
 */

/**
 * Valida que un teléfono tenga entre 7 y 15 dígitos
 */
export function isValidPhone(tel) {
  return /^[0-9]{7,15}$/.test(String(tel).replace(/\s/g, ''))
}

/**
 * Valida que los campos obligatorios del pedido estén completos
 * Retorna: { ok: boolean, campo: string | null }
 */
export function validateOrderForm(data) {
  const required = ['nombre', 'telefono', 'ciudad', 'departamento', 'barrio', 'direccion']
  for (const campo of required) {
    if (!data[campo] || String(data[campo]).trim() === '') {
      return { ok: false, campo }
    }
  }
  if (!isValidPhone(data.telefono)) {
    return { ok: false, campo: 'telefono' }
  }
  return { ok: true, campo: null }
}
