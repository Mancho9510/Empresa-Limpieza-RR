import { state } from '../store/state.js';
import { CONFIG } from '../config.js';
import { fmt } from '../utils/format.js';
import { $, overlayOn, showToast } from '../utils/dom.js';
import { saveOrderToSheets } from '../services/api.js';
import { subtotal, clearSavedCart } from '../store/cart.js';
import { refreshCart, closeCart } from './Cart.js';
import { getDiscount, showCouponMsg } from '../store/coupons.js';
import { openRecibo } from './Recibo.js';
import { openRating } from './Reviews.js';

export const PAY_INFO = {
  "Nequi":      { icon: "💜", label: "Nequi",      num: CONFIG.PAY_NUMBER },
  "Breb":       { icon: "💙", label: "Breb",        num: CONFIG.PAY_NUMBER },
  "Daviplata":  { icon: "❤️", label: "Daviplata",   num: CONFIG.PAY_NUMBER },
  "Transferencia bancaria": { icon: "🏦", label: "Transferencia", num: null },
  "Contra entrega": { icon: "🚪", label: "Contra entrega", num: null, isContra: true },
};

export function openOrder() {
  updateOrderSummary();
  closeCart();
  $("orderModal")?.classList.add("on");
  overlayOn(true);
}

export function closeOrder() {
  $("orderModal")?.classList.remove("on");
  overlayOn(false);
}

export function updateOrderSummary() {
  const sumItems = $("sumItems");
  if (sumItems) {
    sumItems.innerHTML = state.cart.map(it => {
      const p = state.products.find(x => x.id === it.id);
      if (!p) return '';
      return `<div class="si">
        <span>${p.name} ${p.size} ×${it.qty}</span>
        <span>${fmt(p.price * it.qty)}</span>
      </div>`;
    }).join("");
  }

  const shipping    = getShippingCost();
  const shipRow     = $("sumShipping");
  const shipVal     = $("sumShippingVal");
  const totalEl     = $("sumTotal");
  const sub         = subtotal();

  if (!shipRow || !totalEl) return;

  if (shipping === null) {
    shipRow.classList.remove("sum-shipping--hidden");
    if(shipVal) shipVal.textContent = "A convenir";
    totalEl.textContent = fmt(sub) + " + envío";
  } else if (shipping === 0) {
    shipRow.classList.add("sum-shipping--hidden");
    totalEl.textContent = fmt(sub);
  } else {
    shipRow.classList.remove("sum-shipping--hidden");
    if(shipVal) shipVal.textContent = fmt(shipping);
    totalEl.textContent = fmt(sub + shipping);
  }
}

export function getShippingCost() {
  const val = $("fEnvio")?.value;
  if (!val || val === "convenir") return null;
  return Number(val);
}

export function getShippingLabel() {
  const sel = $("fEnvio");
  if(!sel) return "";
  return sel.options[sel.selectedIndex]?.text || "";
}

export function onEnvioChange() {
  const val  = $("fEnvio")?.value;
  const note = $("envioNote");
  if (!note) return;
  if (val === "convenir") {
    note.innerHTML = '⚠️ <strong>Precio a convenir:</strong> al confirmar tu pedido por WhatsApp acordaremos el costo de envío según tu dirección exacta.';
    note.classList.add("envio-note--visible");
  } else if (val !== "") {
    note.innerHTML = '✅ El costo de envío será cobrado junto al pedido.';
    note.classList.add("envio-note--visible");
  } else {
    note.innerHTML = "";
    note.classList.remove("envio-note--visible");
  }
  updateOrderSummary();
}

export async function confirmOrder() {
  const nom    = $("fNombre")?.value.trim() || "";
  const ciu    = $("fCiudad")?.value.trim() || "";
  const dep    = $("fDepto")?.value.trim() || "";
  const bar    = $("fBarrio")?.value.trim() || "";
  const dir    = $("fDir")?.value.trim() || "";
  const cas    = $("fCasa")?.value.trim() || "";
  const con    = $("fConj")?.value.trim() || "";
  const not    = $("fNota")?.value.trim() || "";
  const pag    = document.querySelector('input[name="pago"]:checked');
  const envSel = $("fEnvio")?.value;
  const tel    = $("fTelefono") ? $("fTelefono").value.trim() : "";

  if (!nom || !tel || !ciu || !dep || !bar || !dir) {
    alert("⚠️ Por favor completa todos los campos obligatorios: Nombre, Teléfono, Ciudad, Departamento, Barrio y Dirección."); return;
  }
  if (!/^[0-9]{7,15}$/.test(tel.replace(/\\s/g,""))) {
    alert("⚠️ El teléfono debe contener solo números (7 a 15 dígitos)."); return;
  }
  if (!pag) {
    alert("⚠️ Por favor selecciona un medio de pago."); return;
  }
  if (!envSel) {
    alert("⚠️ Por favor selecciona una zona de envío."); return;
  }

  const btn = document.querySelector(".btn-confirm");
  if (btn) {
    btn.disabled = true;
    btn.classList.add("saving");
    btn.textContent = "⏳ Guardando pedido...";
  }

  const shipping    = getShippingCost();
  const shippingLbl = getShippingLabel();
  const sub         = subtotal();
  const total       = (shipping !== null ? sub + shipping : sub);
  const isContra    = pag.value === "Contra entrega";

  const productosLineas = state.cart.map(it => {
    const p = state.products.find(x => x.id === it.id);
    if (!p) return '';
    return `${p.name} ${p.size} | Cant: ${it.qty} | P.Unit: ${fmt(p.price)} | Subtotal: ${fmt(p.price * it.qty)}`;
  }).filter(Boolean).join("\\n");

  const productosJson = JSON.stringify(state.cart.filter(it => state.products.find(x => x.id === it.id)).map(it => {
    const p = state.products.find(x => x.id === it.id);
    return { id: p.id, nombre: p.name, tamano: p.size, cantidad: it.qty, precio: p.price };
  }));

  const discount    = getDiscount();
  const finalTotal  = total - discount;

  const orderData = {
    nombre:       nom,
    telefono:     tel,
    ciudad:       ciu,
    departamento: dep,
    barrio:       bar,
    direccion:    dir,
    casa:         cas,
    conjunto:     con,
    nota:         not,
    cupon:        state.activeCoupon ? state.activeCoupon.code : "",
    descuento:    discount,
    pago:         pag.value,
    zona_envio:   shippingLbl,
    costo_envio:  shipping !== null ? shipping : 0, 
    subtotal:     sub,
    total:        finalTotal,  
    estado_pago:  isContra ? "CONTRA ENTREGA" : "PENDIENTE",
    productos:    productosLineas,
    productos_json: productosJson,
  };

  await saveOrderToSheets(orderData);

  const payInfo = PAY_INFO[pag.value];
  let msg = `🧹 *NUEVO PEDIDO – Limpieza RR*\\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\\n\\n`;

  msg += `📦 *PRODUCTOS:*\\n`;
  state.cart.forEach(it => {
    const p = state.products.find(x => x.id === it.id);
    if (!p) return;
    msg += `▪️ ${p.name} ${p.size}\\n`;
    msg += `   Cantidad: ${it.qty}  |  ${fmt(p.price * it.qty)}\\n`;
  });

  msg += `\\n━━━━━━━━━━━━━━━━━━━━\\n`;
  msg += `🛒 Subtotal: ${fmt(sub)}\\n`;
  if (discount > 0) {
    msg += `🏷️ Descuento (${state.activeCoupon?.code || "cupón"}): -${fmt(discount)}\\n`;
  }
  if (shipping === null) {
    msg += `🚚 Envío: A convenir (acordamos el costo por chat)\\n`;
    msg += `💰 *TOTAL: ${fmt(sub - discount)} + envío*\\n`;
  } else if (shipping === 0) {
    msg += `🚚 Envío: Sin costo\\n`;
    msg += `💰 *TOTAL A PAGAR: ${fmt(finalTotal)}*\\n`;
  } else {
    msg += `🚚 Envío: ${fmt(shipping)}\\n`;
    msg += `💰 *TOTAL A PAGAR: ${fmt(finalTotal)}*\\n`;
  }

  msg += `\\n━━━━━━━━━━━━━━━━━━━━\\n`;
  msg += `📍 *DATOS DE ENTREGA:*\\n`;
  msg += `• Nombre: ${nom}\\n`;
  msg += `• Ciudad: ${ciu} – ${dep}\\n`;
  msg += `• Barrio: ${bar}\\n`;
  msg += `• Dirección: ${dir}\\n`;
  if (cas) msg += `• Casa/Apto: ${cas}\\n`;
  if (con) msg += `• Conjunto: ${con}\\n`;
  if (not) msg += `• Nota: ${not}\\n`;

  msg += `\\n━━━━━━━━━━━━━━━━━━━━\\n`;
  msg += `💳 *MEDIO DE PAGO:* ${pag.value}\\n`;
  if (isContra) {
    msg += `🚪 Pago al momento de la entrega.\\n`;
    msg += `💵 Por favor ten el dinero exacto listo.`;
  } else if (payInfo.num) {
    msg += `📱 Número: *${payInfo.num}*\\n`;
    msg += `👤 A nombre de: ${CONFIG.PAY_HOLDER}\\n`;
    msg += `\\n📎 *Por favor adjunta el comprobante de pago a este mensaje.*`;
  } else {
    msg += `🏦 Te compartiremos los datos bancarios para la transferencia.\\n`;
    msg += `📎 *Una vez transferido, adjunta el comprobante de pago.*`;
  }

  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");

  const lastOrderData = { ...orderData };
  state.cart = [];
  state.activeCoupon = null;
  clearSavedCart();   
  refreshCart();
  closeOrder();
  showToast("✅ ¡Pedido enviado por WhatsApp y guardado!");
  
  setTimeout(() => openRecibo(lastOrderData), 800);
  setTimeout(() => openRating(lastOrderData.nombre, lastOrderData.telefono), 6000);

  ["fNombre","fTelefono","fCiudad","fDepto","fBarrio","fDir","fCasa","fConj","fNota"].forEach(id => { if ($(id)) $(id).value = ""; });
  if ($("couponInput")) $("couponInput").value = "";
  showCouponMsg("", "");
  if ($("fEnvio")) $("fEnvio").value = "";
  document.querySelectorAll('input[name="pago"]').forEach(r => r.checked = false);
  $("payInfo")?.classList.add("pay-info--hidden");
  if ($("payInfo")) $("payInfo").innerHTML = "";
  $("payProofBanner")?.classList.add("pay-proof--hidden");

  if (btn) {
    btn.disabled = false;
    btn.classList.remove("saving");
    btn.innerHTML = `
      <svg width="21" height="21" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      Confirmar pedido por WhatsApp`;
  }
}
