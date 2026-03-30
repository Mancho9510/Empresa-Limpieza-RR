import { state } from '../store/state.js';
import { addById } from '../store/cart.js';
import { fmt, prodThumb } from '../utils/format.js';
import { $, overlayOn, showToast } from '../utils/dom.js';
import { openCart } from './Cart.js';

export function buildGallery(p) {
  const imgs = [p.img, p.img2, p.img3].filter(Boolean);
  if (!imgs.length) return `<div class="m-img-wrap">${prodThumb(p, "lg")}</div>`;
  if (imgs.length === 1) {
    return `<div class="m-img-wrap">
      <img class="p-img p-img--lg" src="${imgs[0]}" alt="${p.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="p-img-fallback p-img-fallback--lg" style="display:none">${p.e}</div>
    </div>`;
  }
  state.galleryIdx = 0;
  return `
    <div class="gallery-wrap">
      <div class="gallery-main" id="galleryMain">
        <img class="gallery-img" src="${imgs[0]}" alt="${p.name}" id="galleryImg"
             onerror="this.src='';this.parentElement.innerHTML='<div class=\\'gallery-emoji\\'>${p.e}</div>'">
      </div>
      <div class="gallery-dots" id="galleryDots">
        ${imgs.map((img, i) => `
          <div class="gallery-dot ${i === 0 ? 'on' : ''}" onclick="goGallery(${i}, ${JSON.stringify(imgs).replace(/"/g, "'")})">
            <img src="${img}" alt="foto ${i+1}">
          </div>`).join("")}
      </div>
    </div>`;
}

export function goGallery(idx, imgs) {
  state.galleryIdx = idx;
  const imgsArr = typeof imgs === 'string' ? JSON.parse(imgs.replace(/'/g, '"')) : imgs;
  const mainImg = $("galleryImg");
  if (mainImg) mainImg.src = imgsArr[idx];
  document.querySelectorAll(".gallery-dot").forEach((d, i) => d.classList.toggle("on", i === idx));
}

export function openModal(id) {
  state.selId = id;
  state.mQty  = 1;
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  const modalGrid = $("modalGrid");
  if(modalGrid) {
    modalGrid.innerHTML = `
      ${buildGallery(p)}
      <div>
        ${p.top ? `<div class="top-chip modal-top-chip">⭐ Producto Destacado</div>` : ""}
        <h2 class="m-name">${p.name} ${p.size}</h2>
        <div class="m-price">${fmt(p.price)}</div>
        <p class="m-desc">${p.desc}</p>
        <div class="qty-row">
          <button class="q-btn" onclick="chQty(-1)">−</button>
          <span class="q-num" id="mQtyNum">1</span>
          <button class="q-btn" onclick="chQty(1)">+</button>
        </div>
        <div class="m-actions">
          <button class="btn-primary" onclick="addFromModal()">🛒 Agregar al carrito</button>
          <button class="btn-outline" onclick="closeModal()">Volver</button>
        </div>
      </div>`;
  }

  $("prodModal")?.classList.add("on");
  overlayOn(true);
}

export function chQty(d) {
  state.mQty = Math.max(1, state.mQty + d);
  if ($("mQtyNum")) $("mQtyNum").textContent = state.mQty;
}

export function addFromModal() { 
  addById(state.selId, state.mQty); 
  closeModal(); 
  openCart(); 
}

export function closeModal() { 
  $("prodModal")?.classList.remove("on"); 
  overlayOn(false); 
}

export function quickAdd(id) { 
  addById(id, 1); 
  showToast("✅ Producto agregado al carrito"); 
}
