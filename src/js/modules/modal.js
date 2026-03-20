/**
 * modal.js — Modal de producto y galería de imágenes
 */

import { fmt } from '../helpers/format.js'
import { buildGallery } from './products.js'
import { addItem } from './cart.js'
import { showToast } from './ui/toast.js'
import { overlayOn } from './ui/overlay.js'
import { refreshCart, openCart } from './cart-ui.js'

let selId = null
let mQty  = 1

export function openModal(id, products) {
  selId = id; mQty = 1
  const p = products.find(x => x.id === id)
  if (!p) return
  const mg = document.getElementById('modalGrid')
  if (!mg) return

  mg.innerHTML = `
    ${buildGallery(p)}
    <div>
      ${p.top ? `<div class="top-chip modal-top-chip">⭐ Producto Destacado</div>` : ''}
      <h2 class="m-name">${p.name} ${p.size}</h2>
      <div class="m-price">${fmt(p.price)}</div>
      <p class="m-desc">${p.desc}</p>
      <div class="qty-row">
        <button class="q-btn" id="qMinus" aria-label="Reducir">−</button>
        <span class="q-num" id="mQtyNum">1</span>
        <button class="q-btn" id="qPlus" aria-label="Aumentar">+</button>
      </div>
      <div class="m-actions">
        <button class="btn-primary" id="addFromModalBtn">🛒 Agregar al carrito</button>
        <button class="btn-outline" id="closeModalInnerBtn">Volver</button>
      </div>
    </div>`

  // Galería
  document.getElementById('galleryDots')?.addEventListener('click', e => {
    const d = e.target.closest('[data-gidx]')
    if (!d) return
    const imgs = JSON.parse(d.dataset.imgs)
    const idx  = Number(d.dataset.gidx)
    const img  = document.getElementById('galleryImg')
    if (img) img.src = imgs[idx]
    document.querySelectorAll('.gallery-dot').forEach((dot, i) => dot.classList.toggle('on', i === idx))
  })

  document.getElementById('qMinus')?.addEventListener('click', () => {
    mQty = Math.max(1, mQty - 1)
    document.getElementById('mQtyNum').textContent = mQty
  })
  document.getElementById('qPlus')?.addEventListener('click', () => {
    mQty++
    document.getElementById('mQtyNum').textContent = mQty
  })
  document.getElementById('addFromModalBtn')?.addEventListener('click', () => {
    const result = addItem(selId, mQty, p)
    if (!result.ok) { showToast(`⚠️ ${result.reason}`); return }
    refreshCart(products); closeModal(); openCart(products)
  })
  document.getElementById('closeModalInnerBtn')?.addEventListener('click', closeModal)

  document.getElementById('prodModal')?.classList.add('on')
  overlayOn(true)
}

export function closeModal() {
  document.getElementById('prodModal')?.classList.remove('on')
  overlayOn(false)
}