/**
 * app.js — Entry point de la tienda Limpieza RR
 *
 * Solo importa módulos y coordina la inicialización.
 * Toda la lógica vive en src/js/modules/
 */

import '/tienda.css'

// Módulos de datos
import { loadProducts, onProductsLoaded, buildCats, renderGrid, setSearch, getProducts, compartirProducto } from './modules/products.js'
import { buildCarousel, cNext, cPrev } from './modules/carousel.js'

// Módulos de UI
import { openCart, closeCart, refreshCart } from './modules/cart-ui.js'
import { openModal, closeModal } from './modules/modal.js'
import { handleApplyCoupon } from './modules/coupon.js'
import { openOrder, closeOrder, onEnvioChange, onPaymentChange, confirmOrder, setProducts as setOrderProducts } from './modules/order.js'
import { loadResenas, openRating, closeRating, setRating, submitRating } from './modules/reviews.js'
import { openHistory, closeHistory, searchHistory, openStatus, closeStatus, searchStatus } from './modules/history.js'
import { openRecibo, closeRecibo, compartirRecibo } from './modules/recibo.js'
import { initPWA, installPWA, dismissPWA } from './modules/pwa.js'
import { overlayOn } from './modules/ui/overlay.js'
import { addItem } from './modules/cart.js'
import { showToast } from './modules/ui/toast.js'
import { initAnalytics, trackViewProduct, trackAddToCart, trackBeginCheckout, trackPurchase, trackSearch } from './modules/analytics.js'

// ── Inicialización ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initAnalytics()      // ← GA4: debe ser lo primero
  attachEvents()
  initScrollObserver()
  initPWA()

  // Cuando los productos cargan, inicializar carrusel y grid
  onProductsLoaded(({ products, topP, cats }) => {
    setOrderProducts(products)
    buildCarousel(topP)
    buildCats()
    renderGrid()
    loadResenas()
  })

  await loadProducts()
})

// ── Event listeners — todos en un solo lugar ──────────
function attachEvents() {
  // Nav
  document.getElementById('btnCart')?.addEventListener('click', () => openCart(getProducts()))
  document.getElementById('cartCloseBtn')?.addEventListener('click', closeCart)
  document.getElementById('hamburger')?.addEventListener('click', toggleMenu)
  document.getElementById('navHistoryBtn')?.addEventListener('click', e => { e.preventDefault(); openHistory() })
  document.getElementById('navStatusBtn')?.addEventListener('click',  e => { e.preventDefault(); openStatus() })
  ;['mmInicio','mmProductos','mmContacto'].forEach(id => document.getElementById(id)?.addEventListener('click', closeMenu))
  document.getElementById('mmHistory')?.addEventListener('click', e => { e.preventDefault(); closeMenu(); openHistory() })
  document.getElementById('mmStatus')?.addEventListener('click',  e => { e.preventDefault(); closeMenu(); openStatus() })
  document.addEventListener('click', e => {
    const nav = document.querySelector('nav'), menu = document.getElementById('mobileMenu')
    if (menu?.classList.contains('open') && nav && !nav.contains(e.target)) closeMenu()
  })

  // Overlay
  document.getElementById('overlay')?.addEventListener('click', () => {
    if (document.getElementById('prodModal')?.classList.contains('on'))    { closeModal();   return }
    if (document.getElementById('cartSidebar')?.classList.contains('on'))  { closeCart();    return }
    if (document.getElementById('ratingModal')?.classList.contains('on'))  { closeRating();  return }
    if (document.getElementById('historyModal')?.classList.contains('on')) { closeHistory(); return }
    if (document.getElementById('statusModal')?.classList.contains('on'))  { closeStatus();  return }
    if (document.getElementById('reciboModal')?.classList.contains('on'))  { closeRecibo();  return }
  })

  // Carrusel
  document.getElementById('cBtnPrev')?.addEventListener('click', cPrev)
  document.getElementById('cBtnNext')?.addEventListener('click', cNext)

  // Búsqueda
  let _searchTimer = null
  document.getElementById('searchInput')?.addEventListener('input', e => {
    const q = e.target.value.trim()
    setSearch(q)
    // GA4: trackSearch con debounce 800ms — solo cuando el usuario para de escribir
    clearTimeout(_searchTimer)
    if (q.length >= 2) {
      _searchTimer = setTimeout(() => trackSearch(q), 800)
    }
  })
  document.getElementById('searchClear')?.addEventListener('click', () => {
    const inp = document.getElementById('searchInput'); if (inp) inp.value = ''
    setSearch('')
  })

  // Grid de productos — delegación de eventos
  document.getElementById('prodGrid')?.addEventListener('click', e => {
    const addBtn   = e.target.closest('[data-add]')
    const shareBtn = e.target.closest('[data-share]')
    const card     = e.target.closest('[data-id]')
    const products = getProducts()
    if (addBtn) {
      e.stopPropagation()
      const p      = products.find(x => x.id === Number(addBtn.dataset.add))
      const result = addItem(Number(addBtn.dataset.add), 1, p)
      if (!result.ok) { showToast(`⚠️ ${result.reason}`); return }
      trackAddToCart(p, 1)   // GA4
      refreshCart(products); showToast('✅ Producto agregado al carrito')
    } else if (shareBtn) {
      e.stopPropagation(); compartirProducto(Number(shareBtn.dataset.share))
    } else if (card) {
      openModal(Number(card.dataset.id), products)
      trackViewProduct(products.find(x => x.id === Number(card.dataset.id)))  // GA4
    }
  })

  // Carrusel — delegación
  document.getElementById('cTrack')?.addEventListener('click', e => {
    const addBtn = e.target.closest('[data-add]'), slide = e.target.closest('[data-id]')
    const products = getProducts()
    if (addBtn) {
      e.stopPropagation()
      const p      = products.find(x => x.id === Number(addBtn.dataset.add))
      const result = addItem(Number(addBtn.dataset.add), 1, p)
      if (!result.ok) { showToast(`⚠️ ${result.reason}`); return }
      trackAddToCart(p, 1)   // GA4
      refreshCart(products); showToast('✅ Producto agregado al carrito')
    } else if (slide) {
      openModal(Number(slide.dataset.id), products)
      trackViewProduct(products.find(x => x.id === Number(slide.dataset.id)))  // GA4
    }
  })

  // Carrito
  document.getElementById('btnOrder')?.addEventListener('click', () => {
    openOrder()
    // GA4: usuario inicia el checkout — getCart y calcSubtotal ya están importados en cart-ui.js
    // Los pasamos al módulo de analytics directamente desde el estado del carrito
    const prods = getProducts()
    import('./modules/cart.js').then(({ getCart, calcSubtotal }) => {
      const cart = getCart()
      if (cart.length > 0) trackBeginCheckout(cart, prods, calcSubtotal(prods))
    })
  })
  document.getElementById('couponBtn')?.addEventListener('click', () => handleApplyCoupon(() => refreshCart(getProducts())))
  document.getElementById('couponInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleApplyCoupon(() => refreshCart(getProducts())) })

  // Pedido
  document.getElementById('orderCloseBtn')?.addEventListener('click', closeOrder)
  document.getElementById('fEnvio')?.addEventListener('change', onEnvioChange)
  document.getElementById('btnConfirmOrder')?.addEventListener('click', () => {
    confirmOrder(openRecibo, openRating, trackPurchase)
  })
  document.querySelectorAll('input[name="pago"]').forEach(r => r.addEventListener('change', () => onPaymentChange(r.value)))

  // Recibo
  document.getElementById('reciboClosBtn')?.addEventListener('click',  closeRecibo)
  document.getElementById('reciboShareBtn')?.addEventListener('click', compartirRecibo)

  // Calificación
  document.getElementById('ratingSubmitBtn')?.addEventListener('click', submitRating)
  document.getElementById('ratingCloseBtn')?.addEventListener('click',  closeRating)
  document.querySelectorAll('.star-btn').forEach(btn => btn.addEventListener('click', () => setRating(Number(btn.dataset.rating))))

  // Historial / rastreo
  document.getElementById('historyCloseBtn')?.addEventListener('click', closeHistory)
  document.getElementById('historySearchBtn')?.addEventListener('click', searchHistory)
  document.getElementById('historyPhone')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchHistory() })
  document.getElementById('statusCloseBtn')?.addEventListener('click', closeStatus)
  document.getElementById('statusSearchBtn')?.addEventListener('click', searchStatus)
  document.getElementById('statusPhone')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchStatus() })

  // PWA
  document.getElementById('pwaBtnInstall')?.addEventListener('click', installPWA)
  document.getElementById('pwaBtnDismiss')?.addEventListener('click', dismissPWA)
}

// ── Menú móvil ─────────────────────────────────────────
function toggleMenu() {
  const btn  = document.getElementById('hamburger')
  const menu = document.getElementById('mobileMenu')
  const open = menu?.classList.toggle('open')
  btn?.classList.toggle('open', open)
  btn?.setAttribute('aria-expanded', String(open))
}
function closeMenu() {
  document.getElementById('hamburger')?.classList.remove('open')
  document.getElementById('mobileMenu')?.classList.remove('open')
  document.getElementById('hamburger')?.setAttribute('aria-expanded', 'false')
}

// ── Scroll fade-in ──────────────────────────────────────
function initScrollObserver() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') })
  }, { threshold: 0.08 })
  document.querySelectorAll('.fi').forEach(el => obs.observe(el))
}