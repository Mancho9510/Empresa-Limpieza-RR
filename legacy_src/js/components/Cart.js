import { state } from '../store/state.js';
import { subtotal } from '../store/cart.js';
import { getDiscount } from '../store/coupons.js';
import { fmt } from '../utils/format.js';
import { $, overlayOn } from '../utils/dom.js';

export function openCart() {
  $("cartSidebar")?.classList.add("on");
  overlayOn(true);
  $("prodModal")?.classList.remove("on");
  refreshCart();
}

export function closeCart() {
  $("cartSidebar")?.classList.remove("on");
  overlayOn(false);
}

export function refreshCart() {
  const tot = state.cart.reduce((s, i) => s + i.qty, 0);
  const badge = $("cartBadge");
  if(badge) {
    badge.textContent = tot;
    badge.style.display = tot > 0 ? "flex" : "none";
  }

  const badgeMob = $("cartBadgeMobile");
  if (badgeMob) {
    badgeMob.textContent = tot;
    badgeMob.style.display = tot > 0 ? "flex" : "none";
  }

  const sub = subtotal();
  const discount = getDiscount();
  const finalTotal = sub - discount;

  if ($("cartSub")) $("cartSub").textContent = fmt(sub);
  
  const discRow = $("cartDiscRow");
  const discVal = $("cartDiscVal");
  if (discRow && discVal) {
    if (discount > 0) {
      discRow.classList.remove("cart-disc-row--hidden");
      discVal.textContent = "− " + fmt(discount);
    } else {
      discRow.classList.add("cart-disc-row--hidden");
    }
  }
  
  const totalRow = $("cartTotalRow");
  if (totalRow) totalRow.textContent = fmt(finalTotal);
  
  if ($("btnOrder")) $("btnOrder").disabled = state.cart.length === 0;

  const body = $("cartBody");
  if (!body) return;

  if (!state.cart.length) {
    body.innerHTML = `
      <div class="cart-empty-msg">
        <div style="font-size:3rem">🛒</div>
        <p>Tu carrito está vacío</p>
        <p style="font-size:.8rem;margin-top:4px">¡Agrega productos para comenzar!</p>
      </div>`;
    return;
  }

  body.innerHTML = state.cart.map(it => {
    const p = state.products.find(x => x.id === it.id);
    if (!p) return "";
    return `
      <div class="cart-item">
        <div class="ci-icon">${p.e}</div>
        <div class="ci-info">
          <div class="ci-name">${p.name} ${p.size}</div>
          <div class="ci-price">${fmt(p.price * it.qty)}</div>
        </div>
        <div class="ci-qty">
          <button class="qm-btn" onclick="updQty(${it.id}, -1)">−</button>
          <span style="font-weight:700;font-size:.88rem">${it.qty}</span>
          <button class="qm-btn" onclick="updQty(${it.id}, 1)">+</button>
          <button class="qm-btn" onclick="remItem(${it.id})" style="color:#EF4444">✕</button>
        </div>
      </div>`;
  }).join("");
}
