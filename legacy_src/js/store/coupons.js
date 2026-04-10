import { state } from './state.js';
import { CONFIG } from '../config.js';
import { $ } from '../utils/dom.js';
import { refreshCart } from '../components/Cart.js';
import { subtotal } from './cart.js';

export async function applyCoupon() {
  const code = ($("couponInput")?.value || "").trim().toUpperCase();
  const btn  = $("couponBtn");
  if (!code) { showCouponMsg("Ingresa un código", "error"); return; }

  btn.disabled = true;
  btn.textContent = "⏳";

  try {
    const url = `${CONFIG.APPS_SCRIPT_URL}?action=cupon&code=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.ok && json.cupon) {
      state.activeCoupon = { code, ...json.cupon };
      showCouponMsg(`✅ ${json.cupon.label} aplicado`, "ok");
      refreshCart();
    } else {
      state.activeCoupon = null;
      showCouponMsg("❌ Código inválido o vencido", "error");
      refreshCart();
    }
  } catch {
    showCouponMsg("⚠️ No se pudo verificar el código", "error");
  }
  btn.disabled = false;
  btn.textContent = "Aplicar";
}

export function removeCoupon() {
  state.activeCoupon = null;
  if ($("couponInput")) $("couponInput").value = "";
  showCouponMsg("", "");
  refreshCart();
}

export function showCouponMsg(msg, type) {
  const el = $("couponMsg");
  if (!el) return;
  el.textContent = msg;
  el.className = "coupon-msg" + (type ? " coupon-msg--" + type : "");
}

export function getDiscount() {
  if (!state.activeCoupon) return 0;
  const sub = subtotal();
  if (state.activeCoupon.type === "pct")   return Math.round(sub * state.activeCoupon.value / 100);
  if (state.activeCoupon.type === "fixed") return Math.min(state.activeCoupon.value, sub);
  return 0;
}
