import { state } from './state.js';
import { refreshCart } from '../components/Cart.js';
import { showToast } from '../utils/dom.js';

const CART_KEY = "lrr_cart_v1";
const CART_TTL = 48 * 60 * 60 * 1000; // 48 horas

export function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ items: state.cart, ts: Date.now() }));
  } catch (_) {}
}

export function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return;
    const { items, ts } = JSON.parse(raw);
    if (!items || Date.now() - ts > CART_TTL) {
      localStorage.removeItem(CART_KEY);
      return;
    }
    state.cart = items.filter(it => it.id && it.qty > 0);
  } catch (_) {
    try { localStorage.removeItem(CART_KEY); } catch (_) {}
  }
}

export function clearSavedCart() {
  try { localStorage.removeItem(CART_KEY); } catch (_) {}
}

export function addById(id, qty) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  // Verificar stock si existe la propiedad
  if (p.stock !== null && p.stock !== undefined && p.stock !== "" && Number(p.stock) >= 0) {
    const stockNum = Number(p.stock);
    if (!isNaN(stockNum) && stockNum >= 0) {
      const enCarrito = state.cart.find(x => x.id === id)?.qty || 0;
      if (enCarrito + qty > stockNum) {
        showToast(`⚠️ Solo quedan ${stockNum} unidades disponibles`);
        if (stockNum === 0) return;
        qty = Math.max(0, stockNum - enCarrito);
        if (qty === 0) return;
      }
    }
  }
  const ex = state.cart.find(x => x.id === id);
  ex ? ex.qty += qty : state.cart.push({ id, qty });
  refreshCart();
  saveCart();
}

export function updQty(id, d) {
  const it = state.cart.find(x => x.id === id);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) remItem(id);
  else { refreshCart(); saveCart(); }
}

export function remItem(id) {
  state.cart = state.cart.filter(x => x.id !== id);
  refreshCart();
  saveCart();
}

export function subtotal() {
  return state.cart.reduce((s, it) => {
    const p = state.products.find(x => x.id === it.id);
    return s + (p ? p.price * it.qty : 0);
  }, 0);
}
