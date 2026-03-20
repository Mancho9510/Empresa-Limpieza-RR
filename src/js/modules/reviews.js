/**
 * reviews.js — Reseñas públicas y calificaciones post-pedido
 */

import { fetchResenas, postCalificacion } from './api.js'
import { overlayOn } from './ui/overlay.js'
import { showToast } from './ui/toast.js'

let ratingVal    = 0
let ratingNombre = ''
let ratingTel    = ''

// ── Reseñas públicas ─────────────────────────────────────
export async function loadResenas() {
  const wrap  = document.getElementById('resenasWrap')
  const stats = document.getElementById('resenasStats')
  if (!wrap) return

  try {
    const data = await fetchResenas()

    if (!data.ok || !data.resenas?.length) {
      wrap.innerHTML = '<p class="resenas-empty">Aún no hay reseñas — ¡sé el primero!</p>'
      return
    }

    const resenas = data.resenas
    const avg     = resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length
    const stars   = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))

    // Mostrar estadísticas
    if (stats) {
      stats.style.display = 'flex'
      const an = document.getElementById('resenaAvgNum');   if (an) an.textContent = avg.toFixed(1)
      const as = document.getElementById('resenaAvgStars'); if (as) as.textContent = stars(avg)
      const ac = document.getElementById('resenaAvgCount'); if (ac) ac.textContent = `${resenas.length} reseña${resenas.length !== 1 ? 's' : ''}`
    }

    // Ordenar: más estrellas primero, luego por longitud de comentario
    const ordenadas = [...resenas]
      .sort((a, b) => b.estrellas - a.estrellas || (b.comentario?.length || 0) - (a.comentario?.length || 0))
      .slice(0, 6)

    // Renderizar tarjetas — SIN clase .fi para evitar que queden invisibles
    // Las reseñas siempre son visibles, no necesitan animación de scroll
    wrap.innerHTML = ordenadas.map(r => {
      const fecha = r.fecha ? r.fecha.split(' ')[0] : ''
      const inic  = (r.nombre || 'Cliente')
        .split(' ').slice(0, 2)
        .map(w => w[0]?.toUpperCase() || '')
        .join('') || 'C'

      return `
      <div class="resena-card">
        <div class="resena-header">
          <div class="resena-avatar">${inic}</div>
          <div>
            <div class="resena-nombre">${r.nombre || 'Cliente'}</div>
            <div class="resena-fecha">${fecha}</div>
          </div>
          <div class="resena-stars">${stars(r.estrellas)}</div>
        </div>
        ${r.comentario ? `<p class="resena-texto">"${r.comentario}"</p>` : ''}
      </div>`
    }).join('')

  } catch (err) {
    console.error('Error cargando reseñas:', err)
    wrap.innerHTML = ''
  }
}

// ── Modal de calificación ─────────────────────────────────
export function openRating(nombre, tel) {
  ratingNombre = nombre || ''
  ratingTel    = tel    || ''
  ratingVal    = 0
  _renderStars(0)
  const c = document.getElementById('ratingComment')
  if (c) c.value = ''
  document.getElementById('ratingModal')?.classList.add('on')
  overlayOn(true)
}

export function closeRating() {
  document.getElementById('ratingModal')?.classList.remove('on')
  overlayOn(false)
}

export function setRating(val) {
  ratingVal = val
  _renderStars(val)
}

export async function submitRating() {
  if (!ratingVal) { showToast('⭐ Selecciona una calificación'); return }
  await postCalificacion({
    nombre:     ratingNombre,
    telefono:   ratingTel,
    estrellas:  ratingVal,
    comentario: document.getElementById('ratingComment')?.value.trim() || '',
  })
  closeRating()
  showToast('⭐ ¡Gracias por tu calificación!')
}

function _renderStars(val) {
  document.querySelectorAll('.star-btn').forEach((s, i) => s.classList.toggle('on', i < val))
}