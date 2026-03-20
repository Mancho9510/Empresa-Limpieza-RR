/**
 * cart-ui.js — Renderizado del carrito en el DOM
 * La lógica pura (estado) vive en cart.js
 * Este módulo solo toca el DOM
 */

import { getCart, getItemCount, calcSubtotal, calcDiscount, updateQty, removeItem } from './cart.js'
import { fmt } from '../helpers/format.js'
import { overlayOn } from './ui/overlay.js'

export function refreshCart(products) {
  const cart     = getCart()
  const sub      = calcSubtotal(products)
  const discount = calcDiscount(sub)
  const total    = sub - discount
  const count    = getItemCount()

  // Badge
  const badge = document.getElementById('cartBadge')
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none' }

  // Totales
  const cartSub = document.getElementById('cartSub')
  if (cartSub) cartSub.textContent = fmt(sub)

  const discRow = document.getElementById('cartDiscRow')
  const discVal = document.getElementById('cartDiscVal')
  if (discRow && discVal) {
    discRow.classList.toggle('cart-disc-row--hidden', discount <= 0)
    if (discount > 0) discVal.textContent = '− ' + fmt(discount)
  }

  const totalRow = document.getElementById('cartTotalRow')
  if (totalRow) totalRow.innerHTML = `<strong>${fmt(total)}</strong>`

  const btnOrder = document.getElementById('btnOrder')
  if (btnOrder) btnOrder.disabled = cart.length === 0

  // Cuerpo del carrito
  const body = document.getElementById('cartBody')
  if (!body) return

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty-msg"><div style="font-size:3rem">🛒</div><p>Tu carrito está vacío</p></div>`
    return
  }

  body.innerHTML = cart.map(it => {
    const p = products.find(x => x.id === it.id)
    if (!p) return ''
    return `
    <div class="cart-item">
      <div class="ci-icon">${p.e}</div>
      <div class="ci-info">
        <div class="ci-name">${p.name} ${p.size}</div>
        <div class="ci-price">${fmt(p.price * it.qty)}</div>
      </div>
      <div class="ci-qty">
        <button class="qm-btn" data-updqty="${it.id}" data-delta="-1">−</button>
        <span style="font-weight:700;font-size:.88rem">${it.qty}</span>
        <button class="qm-btn" data-updqty="${it.id}" data-delta="1">+</button>
        <button class="qm-btn" data-remitem="${it.id}" style="color:#EF4444">✕</button>
      </div>
    </div>`
  }).join('')

  body.addEventListener('click', e => {
    const u = e.target.closest('[data-updqty]')
    const r = e.target.closest('[data-remitem]')
    if (u) { updateQty(Number(u.dataset.updqty), Number(u.dataset.delta)); refreshCart(products) }
    if (r) { removeItem(Number(r.dataset.remitem)); refreshCart(products) }
  })
}

export function openCart(products) {
  document.getElementById('cartSidebar')?.classList.add('on')
  overlayOn(true)
  document.getElementById('prodModal')?.classList.remove('on')
  refreshCart(products)
}

export function closeCart() {
  document.getElementById('cartSidebar')?.classList.remove('on')
  overlayOn(false)
}