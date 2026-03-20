/**
 * history.js — Historial de pedidos y rastreo
 */

import { fetchHistorial, fetchEstado } from './api.js'
import { overlayOn } from './ui/overlay.js'
import { showToast } from './ui/toast.js'
import { fmt } from '../helpers/format.js'
import { isValidPhone } from '../helpers/validators.js'

// ── Historial ─────────────────────────────────────────────
export function openHistory() {
  document.getElementById('historyModal')?.classList.add('on')
  overlayOn(true)
  const r = document.getElementById('historyResult'); if (r) r.innerHTML = ''
  const p = document.getElementById('historyPhone');  if (p) p.value = ''
}
export function closeHistory() {
  document.getElementById('historyModal')?.classList.remove('on')
  overlayOn(false)
}
export async function searchHistory() {
  const tel = (document.getElementById('historyPhone')?.value || '').trim().replace(/[^0-9]/g, '')
  if (!isValidPhone(tel)) { showToast('⚠️ Ingresa un teléfono válido'); return }
  const btn = document.getElementById('historySearchBtn')
  const res = document.getElementById('historyResult')
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando...' }
  if (res) res.innerHTML = '<div class="hist-loading">Consultando pedidos...</div>'
  try {
    const data = await fetchHistorial(tel)
    if (!data.ok || !data.pedidos?.length) {
      if (res) res.innerHTML = '<div class="hist-empty">📭 No encontramos pedidos con ese número.</div>'
    } else if (res) {
      res.innerHTML = data.pedidos.map(p => {
        const prods    = String(p.productos || '').split('\n').filter(l => l.trim()).map(l => `<div class="hist-prod-line">▪ ${l.trim()}</div>`).join('')
        const totalStr = !isNaN(Number(p.total)) ? fmt(Number(p.total)) : String(p.total || '')
        return `<div class="hist-item"><div class="hist-item-hd"><span class="hist-date">📅 ${p.fecha || ''}</span><span class="hist-status">${p.estado_pago || 'Pendiente'}</span></div><div class="hist-prods">${prods}</div><div class="hist-total">Total: <strong>${totalStr}</strong></div></div>`
      }).join('')
    }
  } catch { if (res) res.innerHTML = '<div class="hist-empty">⚠️ Error al consultar.</div>' }
  if (btn) { btn.disabled = false; btn.textContent = '🔍 Buscar' }
}

// ── Rastreo ───────────────────────────────────────────────
export function openStatus() {
  document.getElementById('statusModal')?.classList.add('on')
  overlayOn(true)
  const r = document.getElementById('statusResult'); if (r) r.innerHTML = ''
  const p = document.getElementById('statusPhone');  if (p) p.value = ''
}
export function closeStatus() {
  document.getElementById('statusModal')?.classList.remove('on')
  overlayOn(false)
}
export async function searchStatus() {
  const tel   = (document.getElementById('statusPhone')?.value || '').trim().replace(/\D/g, '')
  if (!isValidPhone(tel)) { showToast('⚠️ Ingresa un teléfono válido'); return }
  const btn   = document.getElementById('statusSearchBtn')
  const res   = document.getElementById('statusResult')
  const STEPS = ['Recibido', 'En preparación', 'En camino', 'Entregado']
  if (btn) { btn.disabled = true; btn.textContent = '⏳' }
  if (res) res.innerHTML = '<div class="hist-loading">Consultando...</div>'
  try {
    const data = await fetchEstado(tel)
    if (!data.ok || !data.pedidos?.length) {
      if (res) res.innerHTML = '<div class="hist-empty">📭 No encontramos pedidos con ese número.</div>'
    } else if (res) {
      res.innerHTML = data.pedidos.slice(0, 3).map(p => {
        const si  = STEPS.indexOf(p.estado_envio || 'Recibido')
        const cur = si >= 0 ? si : 0
        return `<div class="status-card"><div class="status-card-hd"><span>📅 ${p.fecha}</span><span class="hist-status">${p.estado_pago || 'Pendiente'}</span></div><div class="status-steps">${STEPS.map((s, i) => `<div class="status-step ${i <= cur ? 'done' : ''} ${i === cur ? 'active' : ''}"><div class="step-dot"></div><div class="step-lbl">${s}</div></div>${i < STEPS.length - 1 ? '<div class="step-line"></div>' : ''}`).join('')}</div><div class="hist-total">Total: <strong>${typeof p.total === 'number' ? fmt(p.total) : p.total}</strong></div></div>`
      }).join('')
    }
  } catch { if (res) res.innerHTML = '<div class="hist-empty">⚠️ Error al consultar.</div>' }
  if (btn) { btn.disabled = false; btn.textContent = 'Consultar' }
}