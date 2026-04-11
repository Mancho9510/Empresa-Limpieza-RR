import '../css/index.css';
import { inject } from '@vercel/analytics';
import { $ } from './utils/dom.js';
import { state } from './store/state.js';
import { loadCart } from './store/cart.js';
import { loadProducts } from './store/products.js';
import { renderProds } from './components/ProductGrid.js';
import { openModal, closeModal, quickAdd, addFromModal, chQty, goGallery } from './components/Modal.js';
import { cNext, cPrev, goSlide } from './components/Carousel.js';
import { setCat, clearSearch, cardQtyChange, cardAddToCart } from './components/ProductGrid.js';
import { openCart, closeCart } from './components/Cart.js';
import { openOrder, closeOrder, confirmOrder, onEnvioChange, PAY_INFO } from './components/OrderForm.js';
import { updQty, remItem } from './store/cart.js';
import { applyCoupon } from './store/coupons.js';
import { openHistory, closeHistory, searchHistory } from './components/History.js';
import { openStatus, closeStatus, searchStatus } from './components/Status.js';
import { openRating, closeRating, setRating, submitRating } from './components/Reviews.js';
import { openRecibo, closeRecibo, compartirRecibo } from './components/Recibo.js';
import { compartirProducto } from './components/Share.js';
import { initPWA, toggleTheme, installPWA, dismissPWA } from './components/PWA.js';

// Exponer funciones globales para el HTML inline (onClick)
window.openModal        = openModal;
window.quickAdd         = quickAdd;
window.cardQtyChange    = cardQtyChange;
window.cardAddToCart    = cardAddToCart;
window.chQty            = chQty;
window.addFromModal     = addFromModal;
window.closeModal       = closeModal;
window.cNext            = cNext;
window.cPrev            = cPrev;
window.goSlide          = goSlide;
window.goGallery        = goGallery;

window.setCat           = setCat;
window.clearSearch      = clearSearch;

window.openOrder        = openOrder;
window.closeOrder       = closeOrder;

window.closeCart        = closeCart;
window.openCart         = openCart;

window.openHistory      = openHistory;
window.closeHistory     = closeHistory;
window.searchHistory    = searchHistory;

window.openStatus       = openStatus;
window.closeStatus      = closeStatus;
window.searchStatus     = searchStatus;

window.openRating       = openRating;
window.closeRating      = closeRating;
window.setRating        = setRating;
window.submitRating     = submitRating;

window.openRecibo       = openRecibo;
window.closeRecibo      = closeRecibo;
window.compartirRecibo  = compartirRecibo;
window.compartirProducto= compartirProducto;

window.confirmOrder     = confirmOrder;
window.applyCoupon      = applyCoupon;

window.updQty           = updQty;
window.remItem          = remItem;
window.onEnvioChange    = onEnvioChange;

window.toggleTheme      = toggleTheme;
window.installPWA       = installPWA;
window.dismissPWA       = dismissPWA;
window.loadProducts     = loadProducts;

window.overlayClick = function() {
  closeModal();
  closeCart();
  closeRating();
  closeHistory();
  closeStatus();
  closeRecibo();
};

// Initialize Vercel Analytics
inject();

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("lrr-theme");
  if (savedTheme === "dark" || savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  loadCart();
  loadProducts();

  const searchInp = $("searchInput");
  if (searchInp) {
    searchInp.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim();
      renderProds();
    });
  }

  const payRadios = document.querySelectorAll('input[name="pago"]');
  payRadios.forEach(r => r.addEventListener("change", (e) => {
    const pInfo = $("payInfo");
    const pb    = $("payProofBanner");
    const val   = e.target.value;
    const info  = PAY_INFO[val];

    if (!pInfo || !pb) return;
    
    if (info) {
      if (info.isContra) {
        pInfo.innerHTML = `
          <div class="pi-contra">
            <span style="font-size:1.5rem">${info.icon}</span>
            <div>
              <strong>Pago al momento de la entrega</strong>
              <div style="font-size:.85rem;color:var(--text-muted);margin-top:2px">
                Por favor ten el dinero acto para facilitar la entrega.
              </div>
            </div>
          </div>`;
        pInfo.classList.remove("pay-info--hidden");
        pb.classList.add("pay-proof--hidden");
      } else if (info.num) {
        pInfo.innerHTML = `
          <div class="pi-nequi">
            <span style="font-size:1.5rem">${info.icon}</span>
            <div>
               <div>Transfiere a <strong>${info.label}</strong>: 
                <span style="user-select:all;font-weight:800;letter-spacing:1px;color:var(--primary)">${info.num}</span>
               </div>
               <div style="font-size:.8rem;color:var(--text-muted);margin-top:2px">A nombre de Limpieza RR</div>
            </div>
          </div>`;
        pInfo.classList.remove("pay-info--hidden");
        pb.classList.remove("pay-proof--hidden");
      } else {
        pInfo.innerHTML = `
          <div class="pi-banco">
            <span style="font-size:1.5rem">${info.icon}</span>
            <div>
              <strong>Te compartiremos los datos bancarios</strong> por WhatsApp al confirmar.
            </div>
          </div>`;
        pInfo.classList.remove("pay-info--hidden");
        pb.classList.remove("pay-proof--hidden");
      }
    } else {
      pInfo.classList.add("pay-info--hidden");
      pb.classList.add("pay-proof--hidden");
    }
  }));

  initPWA();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('vis');
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fi').forEach(el => observer.observe(el));

  const bindClick = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  
  bindClick('btnCart', openCart);
  bindClick('cartCloseBtn', closeCart);
  bindClick('btnOrder', openOrder);
  bindClick('orderCloseBtn', closeOrder);
  bindClick('btnConfirm', confirmOrder);
  bindClick('couponBtn', applyCoupon);
  bindClick('overlay', overlayClick);
  bindClick('historyCloseBtn', closeHistory);
  bindClick('historySearchBtn', searchHistory);
  bindClick('statusCloseBtn', closeStatus);
  bindClick('statusSearchBtn', searchStatus);
  bindClick('reciboClosBtn', closeRecibo);
  bindClick('reciboShareBtn', compartirRecibo);
  bindClick('ratingCloseBtn', closeRating);
  bindClick('ratingSubmitBtn', submitRating);
  bindClick('searchClear', clearSearch);
  bindClick('cBtnPrev', cPrev);
  bindClick('cBtnNext', cNext);
  bindClick('themeToggle', toggleTheme);
  bindClick('pwaBtnInstall', installPWA);
  bindClick('pwaBtnDismiss', dismissPWA);

  ['navHistoryBtn', 'mmHistory', 'footerHistoryBtn'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('click', e => { e.preventDefault(); openHistory(); });
  });

  ['navStatusBtn', 'mmStatus', 'footerStatusBtn'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('click', e => { e.preventDefault(); openStatus(); });
  });

  const hp = $("historyPhone");
  if (hp) hp.addEventListener("keydown", e => { if (e.key === "Enter") searchHistory(); });
  
  const sp = $("statusPhone");
  if (sp) sp.addEventListener("keydown", e => { if (e.key === "Enter") searchStatus(); });

  const fEnvio = $("fEnvio");
  if (fEnvio) fEnvio.addEventListener("change", onEnvioChange);

  document.querySelectorAll(".star-btn").forEach(btn => {
    btn.addEventListener("click", () => setRating(Number(btn.dataset.rating)));
  });

  const hamburger = $("hamburger");
  const mobileMenu = $("mobileMenu");
  
  function toggleMenu() {
    if(!hamburger) return;
    const isAct = hamburger.classList.toggle("is-active");
    if(mobileMenu) mobileMenu.classList.toggle("open", isAct);
    hamburger.setAttribute("aria-expanded", isAct);
  }
  
  function closeMenu() {
    if(hamburger) {
      hamburger.classList.remove("is-active");
      hamburger.setAttribute("aria-expanded", "false");
    }
    if(mobileMenu) mobileMenu.classList.remove("open");
  }

  if (hamburger) hamburger.addEventListener("click", toggleMenu);
  ["mmInicio", "mmProductos", "mmContacto", "mmHistory", "mmStatus"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("click", closeMenu);
  });
  
  document.addEventListener("click", e => {
    if (mobileMenu && hamburger && !mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
      closeMenu();
    }
  });
});