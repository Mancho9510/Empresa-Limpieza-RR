/**
 * cart.js — Estado y lógica del carrito de compras
 *
 * El carrito es un array de { id, qty }.
 * Este módulo no toca el DOM directamente — eso le corresponde
 * a los event listeners de app.js o a funciones render separadas.
 */

import { fmt } from '../helpers/format.js'

// Estado del carrito (array de { id, qty })
let cart = []

// Cupón activo: null o { code, type, value, label }
let activeCoupon = null

// ── Getters ───────────────────────────────────────────────

export function getCart()         { return [...cart] }
export function getActiveCoupon() { return activeCoupon }
export function getItemCount()    { return cart.reduce((s, i) => s + i.qty, 0) }

// ── Mutaciones ────────────────────────────────────────────

/**
 * Agrega un producto al carrito
 * @param {number} id  - ID del producto
 * @param {number} qty - Cantidad a agregar
 * @param {object} [product] - Datos del producto (para validar stock)
 */
export function addItem(id, qty, product = null) {
  // Validar stock si existe
  if (product?.stock !== null && product?.stock !== undefined && product?.stock !== '') {
    const stockNum  = Number(product.stock)
    const enCarrito = cart.find(x => x.id === id)?.qty || 0
    if (!isNaN(stockNum) && enCarrito + qty > stockNum) {
      return { ok: false, reason: `Solo quedan ${stockNum} unidades` }
    }
  }
  const existing = cart.find(x => x.id === id)
  if (existing) existing.qty += qty
  else cart.push({ id, qty })
  return { ok: true }
}

export function updateQty(id, delta) {
  const item = cart.find(x => x.id === id)
  if (!item) return
  item.qty += delta
  if (item.qty <= 0) removeItem(id)
}

export function removeItem(id) {
  cart = cart.filter(x => x.id !== id)
}

export function clearCart() {
  cart = []
  activeCoupon = null
}

// ── Cálculos ──────────────────────────────────────────────

/**
 * Calcula el subtotal dado un array de productos
 * @param {Array} products - Array de productos (del módulo api)
 */
export function calcSubtotal(products) {
  return cart.reduce((sum, item) => {
    const p = products.find(x => x.id === item.id)
    return sum + (p ? p.price * item.qty : 0)
  }, 0)
}

export function calcDiscount(subtotal) {
  if (!activeCoupon) return 0
  if (activeCoupon.type === 'pct')   return Math.round(subtotal * activeCoupon.value / 100)
  if (activeCoupon.type === 'fixed') return Math.min(activeCoupon.value, subtotal)
  return 0
}

export function applyCoupon(couponData) {
  activeCoupon = couponData
}

export function removeCoupon() {
  activeCoupon = null
}
