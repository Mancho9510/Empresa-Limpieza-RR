/**
 * carousel.js — Carrusel de productos destacados
 */

import { fmt } from '../helpers/format.js'
import { thumb } from './products.js'
import { CONFIG } from './api.js'

let cIdx   = 0
let cTimer = null
let topP   = []

export function buildCarousel(topProducts) {
  topP = topProducts
  const track = document.getElementById('cTrack')
  const dots  = document.getElementById('cDots')
  if (!track) return

  if (!topP.length) {
    track.innerHTML = `<div class="carousel-slide"><div class="c-icon">🧴</div><div class="c-name">Sin productos destacados</div></div>`
    return
  }

  track.innerHTML = topP.map(p => `
    <div class="carousel-slide" data-id="${p.id}" style="cursor:pointer">
      <div class="c-img-wrap">${thumb(p, 'md')}</div>
      <div class="top-chip">⭐ DESTACADO</div>
      <div class="c-name">${p.name}<br><span class="c-size">${p.size}</span></div>
      <div class="c-price">${fmt(p.price)}</div>
      <button class="c-add" data-add="${p.id}">+ Agregar al carrito</button>
    </div>`).join('')

  if (dots) {
    dots.innerHTML = topP.map((_, i) =>
      `<div class="c-dot ${i === 0 ? 'on' : ''}" data-dot="${i}"></div>`
    ).join('')
    dots.addEventListener('click', e => {
      const d = e.target.closest('[data-dot]')
      if (d) goSlide(Number(d.dataset.dot))
    })
  }

  clearInterval(cTimer)
  cTimer = setInterval(cNext, CONFIG.AUTOPLAY_MS)
}

export function goSlide(i) {
  cIdx = i
  const track = document.getElementById('cTrack')
  if (track) track.style.transform = `translateX(-${i * 100}%)`
  document.querySelectorAll('.c-dot').forEach((d, j) => d.classList.toggle('on', j === i))
}

export function cNext() { if (topP.length) goSlide((cIdx + 1) % topP.length) }
export function cPrev() {
  if (topP.length) {
    goSlide((cIdx - 1 + topP.length) % topP.length)
    clearInterval(cTimer)
    cTimer = setInterval(cNext, CONFIG.AUTOPLAY_MS)
  }
}