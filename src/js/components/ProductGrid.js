import { state } from '../store/state.js';
import { addById } from '../store/cart.js';
import { fmt, prodThumb, catBadgeClass } from '../utils/format.js';
import { $, showToast } from '../utils/dom.js';

export function buildCats() {
  const catFilter = $("catFilter");
  if(!catFilter) return;
  catFilter.innerHTML = state.cats.map(c =>
    `<button class="f-btn ${c === state.activeCat ? "on" : ""}" onclick="setCat('${c}')">${c}</button>`
  ).join("");
}

export function setCat(c) {
  state.activeCat = c;
  buildCats();
  renderProds();
}

export function renderProds() {
  let list = state.activeCat === "Todos" ? state.products : state.products.filter(p => p.cat === state.activeCat);
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) || p.size.toLowerCase().includes(q)
    );
  }
  const grid = $("prodGrid");
  if(!grid) return;

  if (!list.length) {
    grid.innerHTML = state.searchQuery
      ? `<div class="no-results"><div class="no-results-icon">🔍</div><p>Sin resultados para <strong>"${state.searchQuery}"</strong></p><button class="btn-outline" style="margin-top:12px" onclick="clearSearch()">Limpiar</button></div>`
      : `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px 0">No hay productos en esta categoría.</p>`;
    return;
  }
  
  grid.innerHTML = list.map(p => {
    const stockNum   = (p.stock !== null && p.stock !== undefined && p.stock !== "") ? Number(p.stock) : null;
    const tieneStock = stockNum !== null && !isNaN(stockNum);
    const agotado    = tieneStock && stockNum <= 0;
    const pocosLeft  = tieneStock && stockNum > 0 && stockNum <= 5;
    const badgeCls   = catBadgeClass(p.cat);
    return `
    <div class="prod-card ${agotado ? "prod-card--agotado" : ""}" onclick="${agotado ? "" : `openModal(${p.id})`}">
      ${p.top ? `<div class="prod-chip top-chip">⭐ TOP</div>` : ""}
      ${agotado ? `<div class="stock-badge stock-badge--out">Agotado</div>` : ""}
      ${pocosLeft && !agotado ? `<div class="stock-badge stock-badge--low">¡Solo ${stockNum}!</div>` : ""}
      <button class="p-sharebtn" onclick="event.stopPropagation(); compartirProducto(${p.id})" title="Compartir" aria-label="Compartir">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>
      <div class="p-img-wrap">${prodThumb(p, "md")}</div>
      <span class="p-cat-badge ${badgeCls}">${p.cat}</span>
      <div class="p-name">${p.name}</div>
      <div class="p-size">${p.size}</div>
      <div class="p-price">${fmt(p.price)}</div>
      <div class="p-card-bottom">
        <div class="p-qty-row">
          <button class="p-qty-btn" onclick="event.stopPropagation(); cardQtyChange(${p.id}, -1)" ${agotado ? "disabled" : ""} aria-label="Menos">−</button>
          <span class="p-qty-num" id="qnum-${p.id}">1</span>
          <button class="p-qty-btn" onclick="event.stopPropagation(); cardQtyChange(${p.id}, 1)"  ${agotado ? "disabled" : ""} aria-label="Más">+</button>
        </div>
        <button class="p-addbtn" ${agotado ? "disabled" : `onclick="event.stopPropagation(); cardAddToCart(${p.id})"`}>
          ${agotado ? "Agotado" : "Agregar al Carrito"}
        </button>
      </div>
    </div>`;
  }).join("");
}

const _cardQty = {};

export function cardQtyChange(id, delta) {
  const current = _cardQty[id] || 1;
  const p = state.products.find(x => x.id === id);
  const maxStock = (p && p.stock !== null && p.stock !== undefined && p.stock !== "")
                   ? Number(p.stock) : Infinity;
  const next = Math.min(Math.max(1, current + delta), isFinite(maxStock) ? maxStock : 999);
  _cardQty[id] = next;
  const el = document.getElementById("qnum-" + id);
  if (el) el.textContent = next;
}

export function cardAddToCart(id) {
  const qty = _cardQty[id] || 1;
  addById(id, qty);
  _cardQty[id] = 1;
  const el = document.getElementById("qnum-" + id);
  if (el) el.textContent = 1;
  showToast(`✅ ${qty > 1 ? qty + "x " : ""}Producto agregado al carrito`);
}

export function clearSearch() {
  state.searchQuery = "";
  const inp = $("searchInput");
  if (inp) inp.value = "";
  renderProds();
}
