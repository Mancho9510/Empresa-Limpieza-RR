import { state } from './state.js';
import { getCachedProducts, setCachedProducts } from '../services/cache.js';
import { fetchProducts } from '../services/api.js';
import { showToast, $ } from '../utils/dom.js';
import { DEMO_PRODUCTS } from '../demo-data.js';
import { buildCarousel } from '../components/Carousel.js';
import { buildCats, renderProds } from '../components/ProductGrid.js';
import { loadResenas } from '../components/Reviews.js';
import { refreshCart } from '../components/Cart.js';

export function showSkeletons(count = 8) {
  const grid = $("prodGrid");
  if (grid) grid.innerHTML = Array(count).fill(`<div class="skeleton skel-card"></div>`).join("");
}

export function showError(msg) {
  const grid = $("prodGrid");
  if (!grid) return;
  grid.innerHTML = `
    <div class="error-banner">
      <strong>⚠️ ${msg}</strong><br>
      <button onclick="loadProducts()">🔄 Reintentar</button>
    </div>`;
}

export async function loadProducts(forceRefresh = false) {
  showSkeletons();

  if (!forceRefresh) {
    const cached = getCachedProducts();
    if (cached) {
      state.products = cached;
      onProductsLoaded();
      showToast("⚡ Catálogo cargado al instante");
      return;
    }
  }

  try {
    const apiProds = await fetchProducts();
    if (apiProds === null) {
      await new Promise(r => setTimeout(r, 600));
      state.products = DEMO_PRODUCTS;
      onProductsLoaded();
      return;
    }
    
    state.products = apiProds;
    setCachedProducts(state.products);
    onProductsLoaded();

  } catch (err) {
    console.error("Error cargando productos:", err);
    const stale = getCachedProducts(true);
    if (stale) {
      state.products = stale;
      onProductsLoaded();
      showToast("⚠️ Sin conexión — mostrando catálogo guardado");
    } else {
      showError("No se pudieron cargar los productos. Verifica tu conexión.");
    }
  }
}

export function onProductsLoaded() {
  state.topP = state.products.filter(p => p.top);
  state.cats = ["Todos", ...new Set(state.products.map(p => p.cat))];

  const statEl = document.querySelector(".stat-num");
  if (statEl) statEl.textContent = state.products.length + "+";

  buildCarousel();
  buildCats();
  renderProds();
  loadResenas();
  
  if (state.cart.length > 0) refreshCart();
}
