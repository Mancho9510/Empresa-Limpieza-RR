import '../tienda.css';
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
});