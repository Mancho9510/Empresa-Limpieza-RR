/**
 * coupon.js — Validación y aplicación de cupones
 */
import { fetchCupon } from './api.js'
import { applyCoupon, removeCoupon } from './cart.js'
import { showToast } from './ui/toast.js'

export async function handleApplyCoupon(refreshCartFn) {
  const input = document.getElementById('couponInput')
  const btn   = document.getElementById('couponBtn')
  const code  = (input?.value || '').trim().toUpperCase()
  if (!code) { showCouponMsg('Ingresa un código', 'error'); return }
  btn.disabled = true; btn.textContent = '⏳'
  try {
    const json = await fetchCupon(code)
    if (json.ok && json.cupon) { applyCoupon({ code, ...json.cupon }); showCouponMsg(`✅ ${json.cupon.label} aplicado`, 'ok'); refreshCartFn() }
    else { removeCoupon(); showCouponMsg('❌ Código inválido o vencido', 'error'); refreshCartFn() }
  } catch { showCouponMsg('⚠️ No se pudo verificar el código', 'error') }
  btn.disabled = false; btn.textContent = 'Aplicar'
}

export function showCouponMsg(text, type) {
  const el = document.getElementById('couponMsg'); if (!el) return
  el.textContent = text; el.className = 'coupon-msg' + (type ? ' coupon-msg--' + type : '')
}