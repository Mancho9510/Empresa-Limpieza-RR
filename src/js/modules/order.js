/**
 * order.js — Formulario de pedido y envío por WhatsApp
 */

import { getCart, getActiveCoupon, calcSubtotal, calcDiscount, clearCart } from './cart.js'
import { postPedido } from './api.js'
import { fmt } from '../helpers/format.js'
import { validateOrderForm } from '../helpers/validators.js'
import { overlayOn } from './ui/overlay.js'
import { refreshCart } from './cart-ui.js'
import { showToast } from './ui/toast.js'
import { CONFIG } from './api.js'

let products = []
export function setProducts(p) { products = p }

export function openOrder() {
  updateSummary()
  document.getElementById('orderModal')?.classList.add('on')
  overlayOn(true)
}
export function closeOrder() {
  document.getElementById('orderModal')?.classList.remove('on')
  overlayOn(false)
}

export function onEnvioChange() {
  const val  = document.getElementById('fEnvio')?.value
  const note = document.getElementById('envioNote')
  if (!note) return
  if (val === 'convenir') {
    note.innerHTML = '⚠️ <strong>Precio a convenir:</strong> acordaremos el costo por WhatsApp.'
    note.classList.add('envio-note--visible')
  } else if (val) {
    note.innerHTML = '✅ El costo de envío será cobrado junto al pedido.'
    note.classList.add('envio-note--visible')
  } else {
    note.innerHTML = ''
    note.classList.remove('envio-note--visible')
  }
  updateSummary()
}

export function onPaymentChange(value) {
  const PAY = {
    'Nequi':      { icon:'💜', label:'Nequi',        num: CONFIG.PAY_NUMBER },
    'Breb':       { icon:'💙', label:'Breb',          num: CONFIG.PAY_NUMBER },
    'Daviplata':  { icon:'❤️', label:'Daviplata',     num: CONFIG.PAY_NUMBER },
    'Transferencia bancaria': { icon:'🏦', label:'Transferencia', num: null },
    'Contra entrega': { icon:'🚪', label:'Contra entrega', num: null, isContra: true },
  }
  const info   = PAY[value]
  const infoEl = document.getElementById('payInfo')
  const banner = document.getElementById('payProofBanner')
  if (!info || !infoEl) return
  if (info.num) {
    infoEl.classList.remove('pay-info--hidden')
    infoEl.innerHTML = `<span class="pay-info-icon">${info.icon}</span><div><div class="pay-info-label">Número ${info.label}</div><div class="pay-info-num">${info.num}</div><div class="pay-info-name">${CONFIG.PAY_HOLDER}</div></div>`
    banner?.classList.remove('pay-proof--hidden')
  } else if (info.isContra) {
    infoEl.classList.remove('pay-info--hidden')
    infoEl.innerHTML = `<span class="pay-info-icon">🚪</span><div><div class="pay-info-label">Pago contra entrega</div><div class="pay-info-num" style="font-size:1rem">Pagas cuando recibas tu pedido</div><div class="pay-info-name">Ten el dinero exacto listo 💵</div></div>`
    banner?.classList.add('pay-proof--hidden')
  } else {
    infoEl.classList.add('pay-info--hidden')
    banner?.classList.remove('pay-proof--hidden')
  }
}

function getShipping()      { const v = document.getElementById('fEnvio')?.value; return (!v || v === 'convenir') ? null : Number(v) }
function getShippingLabel() { const s = document.getElementById('fEnvio'); return s?.options[s.selectedIndex]?.text || '' }

function updateSummary() {
  const cart     = getCart()
  const sumItems = document.getElementById('sumItems')
  if (sumItems) {
    sumItems.innerHTML = cart.map(it => {
      const p = products.find(x => x.id === it.id)
      return p ? `<div class="si"><span>${p.name} ${p.size} ×${it.qty}</span><span>${fmt(p.price * it.qty)}</span></div>` : ''
    }).join('')
  }
  const sub      = calcSubtotal(products)
  const shipping = getShipping()
  const shipRow  = document.getElementById('sumShipping')
  const shipVal  = document.getElementById('sumShippingVal')
  const totalEl  = document.getElementById('sumTotal')
  if (shipping === null)  { shipRow?.classList.remove('sum-shipping--hidden'); if (shipVal) shipVal.textContent = 'A convenir'; if (totalEl) totalEl.textContent = fmt(sub) + ' + envío' }
  else if (shipping === 0){ shipRow?.classList.add('sum-shipping--hidden'); if (totalEl) totalEl.textContent = fmt(sub) }
  else                    { shipRow?.classList.remove('sum-shipping--hidden'); if (shipVal) shipVal.textContent = fmt(shipping); if (totalEl) totalEl.textContent = fmt(sub + shipping) }
}

export async function confirmOrder(openRecibo, openRating, onTrackPurchase = null) {
  const g  = id => document.getElementById(id)?.value.trim()
  const nom = g('fNombre'), tel = g('fTelefono'), ciu = g('fCiudad'), dep = g('fDepto')
  const bar = g('fBarrio'),  dir = g('fDir'),     cas = g('fCasa'),   con = g('fConj'), not = g('fNota')
  const pag    = document.querySelector('input[name="pago"]:checked')
  const env    = document.getElementById('fEnvio')?.value
  const v      = validateOrderForm({ nombre: nom, telefono: tel, ciudad: ciu, departamento: dep, barrio: bar, direccion: dir })
  if (!v.ok)  { alert(`⚠️ Por favor completa el campo: ${v.campo}`); return }
  if (!pag)   { alert('⚠️ Selecciona un medio de pago.');  return }
  if (!env)   { alert('⚠️ Selecciona una zona de envío.'); return }

  const btn = document.getElementById('btnConfirmOrder')
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando pedido...' }

  const cart     = getCart()
  const shipping = getShipping()
  const sub      = calcSubtotal(products)
  const discount = calcDiscount(sub)
  const total    = (shipping !== null ? sub + shipping : sub) - discount
  const isContra = pag.value === 'Contra entrega'
  const prodLines = cart.map(it => {
    const p = products.find(x => x.id === it.id)
    return `${p.name} ${p.size} | Cant: ${it.qty} | P.Unit: ${fmt(p.price)} | Subtotal: ${fmt(p.price * it.qty)}`
  }).join('\n')

  const orderData = { nombre: nom, telefono: tel, ciudad: ciu, departamento: dep, barrio: bar, direccion: dir, casa: cas, conjunto: con, nota: not, cupon: getActiveCoupon()?.code || '', descuento: discount, pago: pag.value, zona_envio: getShippingLabel(), costo_envio: shipping ?? 'A convenir', subtotal: sub, total: shipping !== null ? total : 'A convenir', estado_pago: isContra ? 'CONTRA ENTREGA' : 'PENDIENTE', productos: prodLines }

  await postPedido(orderData)

  // Mensaje WhatsApp
  let msg = `🧹 *NUEVO PEDIDO – Limpieza RR*\n━━━━━━━━━━━━━━━━━━━━\n\n📦 *PRODUCTOS:*\n`
  cart.forEach(it => { const p = products.find(x => x.id === it.id); msg += `▪️ ${p.name} ${p.size}\n   Cantidad: ${it.qty}  |  ${fmt(p.price * it.qty)}\n` })
  msg += `\n━━━━━━━━━━━━━━━━━━━━\n🛒 Subtotal: ${fmt(sub)}\n`
  msg += shipping === null ? `🚚 Envío: A convenir\n💰 *TOTAL: ${fmt(sub)} + envío*\n` : `🚚 Envío: ${fmt(shipping)}\n💰 *TOTAL A PAGAR: ${fmt(total)}*\n`
  msg += `\n━━━━━━━━━━━━━━━━━━━━\n📍 *DATOS DE ENTREGA:*\n• Nombre: ${nom}\n• Ciudad: ${ciu} – ${dep}\n• Barrio: ${bar}\n• Dirección: ${dir}\n${cas?`• Casa/Apto: ${cas}\n`:''}${con?`• Conjunto: ${con}\n`:''}${not?`• Nota: ${not}\n`:''}\n━━━━━━━━━━━━━━━━━━━━\n💳 *MEDIO DE PAGO:* ${pag.value}\n${isContra ? '🚪 Pago al momento de la entrega.' : '📎 *Por favor adjunta el comprobante de pago.*'}`

  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')

  // GA4: pedido confirmado — este es el evento más valioso
  try { onTrackPurchase?.(orderData, cart, products) } catch(e) {}

  const lastOrder = { ...orderData }
  clearCart(); refreshCart(products); closeOrder()
  showToast('✅ ¡Pedido enviado por WhatsApp!')
  setTimeout(() => openRecibo(lastOrder), 800)
  setTimeout(() => openRating(nom, tel), 6000)
  _resetForm()

  if (btn) {
    btn.disabled = false
    btn.innerHTML = `<svg width="21" height="21" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg> Confirmar pedido por WhatsApp`
  }
}

function _resetForm() {
  ;['fNombre','fTelefono','fCiudad','fDepto','fBarrio','fDir','fCasa','fConj','fNota'].forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })
  const ci = document.getElementById('couponInput'); if (ci) ci.value = ''
  const fe = document.getElementById('fEnvio');      if (fe) fe.value = ''
  document.querySelectorAll('input[name="pago"]').forEach(r => r.checked = false)
  document.getElementById('payInfo')?.classList.add('pay-info--hidden')
  document.getElementById('payProofBanner')?.classList.add('pay-proof--hidden')
}