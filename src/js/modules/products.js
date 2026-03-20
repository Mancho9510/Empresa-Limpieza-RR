/**
 * products.js — Carga, normalización y renderizado de productos
 */

import { fetchProductos, getCachedProducts } from './api.js'
import { showToast } from './ui/toast.js'
import { fmt, sanitizeImgUrl } from '../helpers/format.js'

// Estado del módulo
let products   = []
let topP       = []
let cats       = []
let activeCat  = 'Todos'
let searchQuery = ''

// Callbacks que app.js registra para que products.js notifique cambios
let onLoadedCb = null

export function onProductsLoaded(cb) { onLoadedCb = cb }
export function getProducts()  { return products }
export function getTopProducts() { return topP }

// ── Carga desde API o caché ──────────────────────────────
export async function loadProducts() {
  showSkeletons()

  const cached = getCachedProducts()
  if (cached) {
    products = normalize(cached)
    _onLoaded()
    showToast('⚡ Catálogo cargado al instante')
  }

  try {
    const raw  = await fetchProductos()
    products   = normalize(raw)
    _onLoaded()
    if (!cached) showToast(`✅ ${products.length} productos disponibles`)
  } catch (err) {
    console.error('Error cargando productos:', err)
    if (!cached) showToast('⚠️ Sin conexión — verifica tu red')
  }
}

function _onLoaded() {
  topP = products.filter(p => p.top)
  cats = ['Todos', ...new Set(products.map(p => p.cat))]
  const statEl = document.getElementById('statCount')
  if (statEl) statEl.textContent = products.length + '+'
  if (onLoadedCb) onLoadedCb({ products, topP, cats })
}

// ── Normalizar datos crudos de Sheets ───────────────────
function normalize(raw) {
  return raw.map((row, i) => ({
    id:    Number(row.id) || i + 1,
    name:  String(row.nombre   || ''),
    size:  String(row['tamaño'] || row.tamano || ''),
    price: Number(String(row.precio || '0').replace(/[^0-9.]/g, '')) || 0,
    cat:   String(row.categoria  || 'General'),
    top:   String(row.destacado).toLowerCase() === 'true' || row.destacado === true,
    e:     String(row.emoji      || '🧴'),
    desc:  String(row.descripcion|| 'Producto de limpieza de alta calidad.'),
    img:   sanitizeImgUrl(String(row.imagen  || '')),
    img2:  sanitizeImgUrl(String(row.imagen2 || '')),
    img3:  sanitizeImgUrl(String(row.imagen3 || '')),
    stock: (row.stock !== undefined && row.stock !== '' && row.stock !== null)
             ? Number(row.stock) : null,
  }))
}

// ── Categorías ───────────────────────────────────────────
export function buildCats() {
  const cf = document.getElementById('catFilter')
  if (!cf) return
  cf.innerHTML = cats.map(c =>
    `<button class="f-btn ${c === activeCat ? 'on' : ''}" data-cat="${c}">${c}</button>`
  ).join('')
  cf.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]')
    if (!btn) return
    activeCat = btn.dataset.cat
    buildCats()
    renderGrid()
  })
}

// ── Búsqueda ─────────────────────────────────────────────
export function setSearch(q) { searchQuery = q; renderGrid() }
export function clearSearch() { searchQuery = ''; renderGrid() }

// ── Grid de productos ─────────────────────────────────────
export function renderGrid() {
  const grid = document.getElementById('prodGrid')
  if (!grid) return

  let list = activeCat === 'Todos' ? products : products.filter(p => p.cat === activeCat)
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q)  ||
      p.desc.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q)
    )
  }

  if (!list.length) {
    grid.innerHTML = searchQuery
      ? `<div class="no-results"><div class="no-results-icon">🔍</div><p>Sin resultados para <strong>"${searchQuery}"</strong></p><button class="btn-outline" id="clearSearchBtn" style="margin-top:12px">Limpiar búsqueda</button></div>`
      : `<p style="color:var(--gray);grid-column:1/-1;text-align:center;padding:40px 0">No hay productos en esta categoría.</p>`
    document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
      searchQuery = ''
      const inp = document.getElementById('searchInput')
      if (inp) inp.value = ''
      renderGrid()
    })
    return
  }

  grid.innerHTML = list.map(p => {
    const sn = p.stock !== null ? Number(p.stock) : null
    const agotado   = sn !== null && !isNaN(sn) && sn <= 0
    const pocosLeft = sn !== null && !isNaN(sn) && sn > 0 && sn <= 5
    return `
    <div class="prod-card ${agotado ? 'prod-card--agotado' : ''}" data-id="${p.id}" ${agotado ? '' : 'style="cursor:pointer"'}>
      ${p.top ? `<div class="prod-chip top-chip">⭐ TOP</div>` : ''}
      ${agotado   ? `<div class="stock-badge stock-badge--out">Agotado</div>` : ''}
      ${pocosLeft ? `<div class="stock-badge stock-badge--low">¡Solo ${sn}!</div>` : ''}
      <div class="p-img-wrap">${thumb(p)}</div>
      <div class="p-name">${p.name} ${p.size}</div>
      <div class="p-price">${fmt(p.price)}</div>
      <div class="p-card-actions">
        <button class="p-addbtn" ${agotado ? 'disabled' : `data-add="${p.id}"`}>${agotado ? 'Agotado' : '+ Agregar'}</button>
        <button class="p-sharebtn" data-share="${p.id}" aria-label="Compartir">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </div>`
  }).join('')
}

// ── Thumbnails ────────────────────────────────────────────
export function thumb(p, size = 'md') {
  if (p.img) {
    const cls = size === 'lg' ? 'p-img p-img--lg' : 'p-img'
    return `<img class="${cls}" src="${p.img}" alt="${p.name}" loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="p-img-fallback ${size === 'lg' ? 'p-img-fallback--lg' : ''}" style="display:none">${p.e}</div>`
  }
  return `<div class="${size === 'lg' ? 'p-icon p-icon--lg' : 'p-icon'}">${p.e}</div>`
}

export function buildGallery(p) {
  const imgs = [p.img, p.img2, p.img3].filter(Boolean)
  if (!imgs.length) return `<div class="m-img-wrap">${thumb(p, 'lg')}</div>`
  if (imgs.length === 1) return `<div class="m-img-wrap"><img class="p-img p-img--lg" src="${imgs[0]}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="p-img-fallback p-img-fallback--lg" style="display:none">${p.e}</div></div>`
  return `
    <div class="gallery-wrap">
      <div class="gallery-main"><img class="gallery-img" src="${imgs[0]}" id="galleryImg" alt="${p.name}"></div>
      <div class="gallery-dots" id="galleryDots">
        ${imgs.map((img, i) => `<div class="gallery-dot ${i === 0 ? 'on' : ''}" data-gidx="${i}" data-imgs='${JSON.stringify(imgs)}'><img src="${img}" alt="foto ${i+1}"></div>`).join('')}
      </div>
    </div>`
}

// ── Skeletons de carga ────────────────────────────────────
function showSkeletons() {
  const grid = document.getElementById('prodGrid')
  if (grid) grid.innerHTML = Array(8).fill(`<div class="skeleton skel-card"></div>`).join('')
}

// ── Compartir producto ────────────────────────────────────
export function compartirProducto(id) {
  const p = products.find(x => x.id === id)
  if (!p) return
  const url   = window.location.origin + window.location.pathname + '#productos'
  const texto = `🧴 *${p.name} ${p.size}* — ${fmt(p.price)}\n\n${p.desc}\n\n📦 Pide en Limpieza RR:\n${url}`
  if (navigator.share) navigator.share({ title: `${p.name} — Limpieza RR`, text: texto, url }).catch(() => {})
  else navigator.clipboard.writeText(texto).then(() => showToast('📋 ¡Texto del producto copiado!')).catch(() => {})
}