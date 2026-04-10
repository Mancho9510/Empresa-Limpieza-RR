import { state } from '../store/state.js';
import { CONFIG } from '../config.js';
import { fmt, prodThumb } from '../utils/format.js';
import { $ } from '../utils/dom.js';

export function buildCarousel() {
  const track = $("cTrack");
  const dots  = $("cDots");

  if (!track || !dots) return;

  if (!state.topP.length) {
    track.innerHTML = `<div class="carousel-slide"><p style="color:var(--gray)">Sin productos destacados aún.</p></div>`;
    return;
  }

  track.innerHTML = state.topP.map(p => `
    <div class="carousel-slide" onclick="openModal(${p.id})">
      <div class="c-img-wrap">${prodThumb(p, "md")}</div>
      <div class="top-chip">⭐ DESTACADO</div>
      <div class="c-name">${p.name}<br><span class="c-size">${p.size}</span></div>
      <div class="c-price">${fmt(p.price)}</div>
      <button class="c-add" onclick="event.stopPropagation(); quickAdd(${p.id})">
        + Agregar al carrito
      </button>
    </div>`).join("");

  dots.innerHTML = state.topP.map((_, i) =>
    `<div class="c-dot ${i === 0 ? "on" : ""}" onclick="goSlide(${i})"></div>`
  ).join("");

  clearInterval(state.cTimer);
  state.cTimer = setInterval(cNext, CONFIG.AUTOPLAY_MS);
}

export function goSlide(i) {
  state.cIdx = i;
  if ($("cTrack")) $("cTrack").style.transform = `translateX(-${i * 100}%)`;
  document.querySelectorAll(".c-dot").forEach((d, j) => d.classList.toggle("on", j === i));
}

export function cNext() { 
  if(state.topP.length) goSlide((state.cIdx + 1) % state.topP.length); 
}

export function cPrev() {
  if(!state.topP.length) return;
  goSlide((state.cIdx - 1 + state.topP.length) % state.topP.length);
  clearInterval(state.cTimer);
  state.cTimer = setInterval(cNext, CONFIG.AUTOPLAY_MS);
}
