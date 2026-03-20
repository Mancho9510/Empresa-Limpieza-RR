/**
 * recibo.js — Recibo digital post-pedido
 */
import { fmt } from '../helpers/format.js'
import { overlayOn } from './ui/overlay.js'
import { showToast } from './ui/toast.js'

let reciboData = null

export function openRecibo(orderData) {
  reciboData = orderData
  const body = document.getElementById('reciboBody'); if (!body) return
  const total    = typeof orderData.total === 'number' ? fmt(orderData.total) : orderData.total
  const shipping = orderData.costo_envio > 0 ? fmt(orderData.costo_envio) : 'A convenir'
  const fecha    = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  const prodLines = (orderData.productos || '').split('\n').filter(l => l.trim()).map(l => `<div class="recibo-prod-line">▪ ${l.trim()}</div>`).join('')
  body.innerHTML = `
    <div class="recibo-section">
      <div class="recibo-row"><span>📅 Fecha</span><span>${fecha}</span></div>
      <div class="recibo-row"><span>👤 Cliente</span><span>${orderData.nombre || ''}</span></div>
      <div class="recibo-row"><span>📍 Dirección</span><span>${orderData.barrio || ''}, ${orderData.direccion || ''}</span></div>
      <div class="recibo-row"><span>💳 Pago</span><span>${orderData.pago || ''}</span></div>
      <div class="recibo-row"><span>🚚 Envío</span><span>${shipping}</span></div>
    </div>
    <div class="recibo-section"><div class="recibo-prods-title">Productos</div><div class="recibo-prods">${prodLines}</div></div>
    <div class="recibo-section recibo-totales"><div class="recibo-row recibo-total"><span><strong>Total a pagar</strong></span><span><strong>${total}</strong></span></div></div>`
  document.getElementById('reciboModal')?.classList.add('on')
  overlayOn(true)
}
export function closeRecibo() {
  document.getElementById('reciboModal')?.classList.remove('on')
  overlayOn(false)
}
export function compartirRecibo() {
  if (!reciboData) return
  const total = typeof reciboData.total === 'number' ? fmt(reciboData.total) : reciboData.total
  const texto = `🧾 *Recibo — Limpieza RR*\n\n👤 ${reciboData.nombre || ''}\n📍 ${reciboData.barrio || ''}, ${reciboData.direccion || ''}\n💳 ${reciboData.pago || ''}\n\n${(reciboData.productos || '').split('\n').filter(l=>l.trim()).map(l=>'▪ '+l.trim()).join('\n')}\n\n💰 *Total: ${total}*`
  if (navigator.share) navigator.share({ title: 'Recibo Limpieza RR', text: texto }).catch(() => {})
  else navigator.clipboard.writeText(texto).then(() => showToast('📋 Recibo copiado')).catch(() => {})
}