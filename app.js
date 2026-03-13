/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Lógica de la aplicación
   ═══════════════════════════════════════════════════════════

   CONFIGURACIÓN REQUERIDA:
   1. Crea tu Google Sheet con dos pestañas: "Productos" y "Pedidos"
   2. Crea un Apps Script (Extensiones → Apps Script)
   3. Publica el script como Web App
   4. Pega la URL del Web App en APPS_SCRIPT_URL abajo

   ══════════════════════════════════════════════════════════= */

/* ─── ⚙️  CONFIGURACIÓN ──────────────────────────────────── */
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwntGswrb4Omm-O9jiX3FW0Lukjn5i-Zmcsrk2hf7seqGJbXvMvaI8xO2mt2oqgBhyczQ/exec",
  WA_NUMBER:       "573503443140",
  AUTOPLAY_MS:     4200,
};

/* ─── ESTADO GLOBAL ─────────────────────────────────────── */
let products  = [];   // Se carga desde Google Sheets
let topP      = [];   // Productos destacados (top === true)
let cats      = [];   // Categorías únicas
let cart      = [];
let activeCat = "Todos";
let cIdx      = 0;
let cTimer    = null;
let selId     = null;
let mQty      = 1;

/* ─── HELPERS ───────────────────────────────────────────── */
const $ = id => document.getElementById(id);

function fmt(n) {
  return "$ " + Math.round(n).toLocaleString("es-CO");
}

function overlayOn(on) {
  $("overlay").classList.toggle("on", on);
}

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3000);
}

/* ════════════════════════════════════════════════════════════
   CARGA DE PRODUCTOS DESDE GOOGLE SHEETS
═══════════════════════════════════════════════════════════ */

/**
 * Muestra tarjetas esqueleto (skeleton) mientras carga
 */
function showSkeletons(count = 8) {
  $("prodGrid").innerHTML = Array(count).fill(
    `<div class="skeleton skel-card"></div>`
  ).join("");
}

/**
 * Muestra banner de error con botón de reintento
 */
function showError(msg) {
  $("prodGrid").innerHTML = `
    <div class="error-banner">
      <strong>⚠️ ${msg}</strong>
      <br>
      <button onclick="loadProducts()">🔄 Reintentar</button>
    </div>`;
}

/**
 * Obtiene los productos del Apps Script de Google Sheets.
 * Espera que el script devuelva JSON con la estructura:
 * { ok: true, data: [ { id, nombre, tamaño, precio, categoria, destacado, emoji, descripcion }, ... ] }
 */
async function loadProducts() {
  showSkeletons();

  // Si aún no configuraron la URL, usa los datos de demostración
  if (CONFIG.APPS_SCRIPT_URL === "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT") {
    console.warn("⚠️ Apps Script URL no configurada. Usando datos de demostración.");
    await simulateDelay(600);
    products = DEMO_PRODUCTS;
    onProductsLoaded();
    return;
  }

  try {
    const url  = `${CONFIG.APPS_SCRIPT_URL}?action=productos&t=${Date.now()}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.ok || !Array.isArray(json.data)) throw new Error("Respuesta inesperada del servidor");

    // Normalizar los campos que vienen del Sheet
    products = json.data.map((row, i) => ({
      id:   Number(row.id)   || i + 1,
      name: String(row.nombre   || ""),
      size: String(row["tamaño"] || row.tamano || ""),
      price:Number(String(row.precio).replace(/[^0-9.]/g, "")) || 0,
      cat:  String(row.categoria  || "General"),
      top:  String(row.destacado).toLowerCase() === "true" || row.destacado === true,
      e:    String(row.emoji      || "🧴"),
      desc: String(row.descripcion|| "Producto de limpieza de alta calidad."),
    }));

    onProductsLoaded();

  } catch (err) {
    console.error("Error cargando productos:", err);
    showError("No se pudieron cargar los productos. Verifica tu conexión o la URL del Apps Script.");
  }
}

/**
 * Se llama cuando los productos están listos (sea de Sheets o de demo)
 */
function onProductsLoaded() {
  topP = products.filter(p => p.top);
  cats = ["Todos", ...new Set(products.map(p => p.cat))];

  // Actualizar contador en stats del hero
  const statEl = document.querySelector(".stat-num");
  if (statEl) statEl.textContent = products.length + "+";

  buildCarousel();
  buildCats();
  renderProds();
}

function simulateDelay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ════════════════════════════════════════════════════════════
   GUARDAR PEDIDO EN GOOGLE SHEETS
═══════════════════════════════════════════════════════════ */

/**
 * Envía los datos del pedido al Apps Script para guardarlo en Sheets.
 * Si la URL no está configurada, omite el guardado (solo WhatsApp).
 */
async function saveOrderToSheets(orderData) {
  if (CONFIG.APPS_SCRIPT_URL === "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT") {
    console.warn("⚠️ Apps Script URL no configurada. El pedido no se guardará en Sheets.");
    return;
  }
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" }, // evita preflight CORS
      body:    JSON.stringify(orderData),
    });
  } catch (err) {
    console.error("Error guardando pedido en Sheets:", err);
    // No bloqueamos el flujo — el pedido por WhatsApp ya se envió
  }
}

/* ════════════════════════════════════════════════════════════
   CARRUSEL
═══════════════════════════════════════════════════════════ */
function buildCarousel() {
  const track = $("cTrack");
  const dots  = $("cDots");

  if (!topP.length) {
    track.innerHTML = `<div class="carousel-slide"><p style="color:var(--gray)">Sin productos destacados aún.</p></div>`;
    return;
  }

  track.innerHTML = topP.map(p => `
    <div class="carousel-slide" onclick="openModal(${p.id})">
      <div class="c-icon">${p.e}</div>
      <div class="top-chip">⭐ DESTACADO</div>
      <div class="c-name">${p.name}<br><span class="c-size">${p.size}</span></div>
      <div class="c-price">${fmt(p.price)}</div>
      <button class="c-add" onclick="event.stopPropagation(); quickAdd(${p.id})">
        + Agregar al carrito
      </button>
    </div>`).join("");

  dots.innerHTML = topP.map((_, i) =>
    `<div class="c-dot ${i === 0 ? "on" : ""}" onclick="goSlide(${i})"></div>`
  ).join("");

  clearInterval(cTimer);
  cTimer = setInterval(cNext, CONFIG.AUTOPLAY_MS);
}

function goSlide(i) {
  cIdx = i;
  $("cTrack").style.transform = `translateX(-${i * 100}%)`;
  document.querySelectorAll(".c-dot").forEach((d, j) => d.classList.toggle("on", j === i));
}
function cNext() { goSlide((cIdx + 1) % topP.length); }
function cPrev() {
  goSlide((cIdx - 1 + topP.length) % topP.length);
  clearInterval(cTimer);
  cTimer = setInterval(cNext, CONFIG.AUTOPLAY_MS);
}

/* ════════════════════════════════════════════════════════════
   CATEGORÍAS + GRID DE PRODUCTOS
═══════════════════════════════════════════════════════════ */
function buildCats() {
  $("catFilter").innerHTML = cats.map(c =>
    `<button class="f-btn ${c === activeCat ? "on" : ""}" onclick="setCat('${c}')">${c}</button>`
  ).join("");
}

function setCat(c) {
  activeCat = c;
  buildCats();
  renderProds();
}

function renderProds() {
  const list = activeCat === "Todos"
    ? products
    : products.filter(p => p.cat === activeCat);

  if (!list.length) {
    $("prodGrid").innerHTML = `<p style="color:var(--gray);grid-column:1/-1;text-align:center;padding:40px 0">No hay productos en esta categoría.</p>`;
    return;
  }

  $("prodGrid").innerHTML = list.map(p => `
    <div class="prod-card" onclick="openModal(${p.id})">
      ${p.top ? `<div class="prod-chip top-chip">⭐ TOP</div>` : ""}
      <div class="p-icon">${p.e}</div>
      <div class="p-name">${p.name} ${p.size}</div>
      <div class="p-price">${fmt(p.price)}</div>
      <button class="p-addbtn" onclick="event.stopPropagation(); quickAdd(${p.id})">
        + Agregar al carrito
      </button>
    </div>`).join("");
}

/* ════════════════════════════════════════════════════════════
   MODAL DE PRODUCTO
═══════════════════════════════════════════════════════════ */
function openModal(id) {
  selId = id;
  mQty  = 1;
  const p = products.find(x => x.id === id);
  if (!p) return;

  $("modalGrid").innerHTML = `
    <div class="m-img">${p.e}</div>
    <div>
      ${p.top ? `<div class="top-chip" style="display:inline-block;margin-bottom:10px">⭐ Producto Destacado</div>` : ""}
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

  $("prodModal").classList.add("on");
  overlayOn(true);
}

function chQty(d) {
  mQty = Math.max(1, mQty + d);
  $("mQtyNum").textContent = mQty;
}
function addFromModal() { addById(selId, mQty); closeModal(); openCart(); }
function closeModal()   { $("prodModal").classList.remove("on"); overlayOn(false); }
function quickAdd(id)   { addById(id, 1); showToast("✅ Producto agregado al carrito"); }

/* ════════════════════════════════════════════════════════════
   CARRITO
═══════════════════════════════════════════════════════════ */
function addById(id, qty) {
  const ex = cart.find(x => x.id === id);
  ex ? ex.qty += qty : cart.push({ id, qty });
  refreshCart();
}

function refreshCart() {
  // Badge
  const tot   = cart.reduce((s, i) => s + i.qty, 0);
  const badge = $("cartBadge");
  badge.textContent    = tot;
  badge.style.display  = tot > 0 ? "flex" : "none";

  // Subtotal y botón
  $("cartSub").textContent    = fmt(subtotal());
  $("btnOrder").disabled      = cart.length === 0;

  // Cuerpo del carrito
  const body = $("cartBody");
  if (!cart.length) {
    body.innerHTML = `
      <div class="cart-empty-msg">
        <div style="font-size:3rem">🛒</div>
        <p>Tu carrito está vacío</p>
        <p style="font-size:.8rem;margin-top:4px">¡Agrega productos para comenzar!</p>
      </div>`;
    return;
  }

  body.innerHTML = cart.map(it => {
    const p = products.find(x => x.id === it.id);
    if (!p) return "";
    return `
      <div class="cart-item">
        <div class="ci-icon">${p.e}</div>
        <div class="ci-info">
          <div class="ci-name">${p.name} ${p.size}</div>
          <div class="ci-price">${fmt(p.price * it.qty)}</div>
        </div>
        <div class="ci-qty">
          <button class="qm-btn" onclick="updQty(${it.id}, -1)">−</button>
          <span style="font-weight:700;font-size:.88rem">${it.qty}</span>
          <button class="qm-btn" onclick="updQty(${it.id}, 1)">+</button>
          <button class="qm-btn" onclick="remItem(${it.id})" style="color:#EF4444">✕</button>
        </div>
      </div>`;
  }).join("");
}

function updQty(id, d) {
  const it = cart.find(x => x.id === id);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) remItem(id);
  else refreshCart();
}
function remItem(id) { cart = cart.filter(x => x.id !== id); refreshCart(); }
function subtotal()  { return cart.reduce((s, it) => s + products.find(x => x.id === it.id).price * it.qty, 0); }
function openCart()  { $("cartSidebar").classList.add("on"); overlayOn(true); $("prodModal").classList.remove("on"); refreshCart(); }
function closeCart() { $("cartSidebar").classList.remove("on"); overlayOn(false); }

/* ════════════════════════════════════════════════════════════
   MODAL DE PEDIDO
═══════════════════════════════════════════════════════════ */
function openOrder() {
  $("sumItems").innerHTML = cart.map(it => {
    const p = products.find(x => x.id === it.id);
    return `<div class="si"><span>${p.name} ${p.size} ×${it.qty}</span><span>${fmt(p.price * it.qty)}</span></div>`;
  }).join("");
  $("sumTotal").textContent = fmt(subtotal());
  closeCart();
  $("orderModal").classList.add("on");
  overlayOn(true);
}
function closeOrder() { $("orderModal").classList.remove("on"); overlayOn(false); }

async function confirmOrder() {
  const nom = $("fNombre").value.trim();
  const bar = $("fBarrio").value.trim();
  const dir = $("fDir").value.trim();
  const cas = $("fCasa").value.trim();
  const con = $("fConj").value.trim();
  const not = $("fNota").value.trim();
  const pag = document.querySelector('input[name="pago"]:checked');

  if (!nom || !bar || !dir) {
    alert("⚠️ Por favor completa: Nombre, Barrio y Dirección.");
    return;
  }
  if (!pag) {
    alert("⚠️ Por favor selecciona un medio de pago.");
    return;
  }

  // Deshabilitar botón mientras guarda
  const btn = document.querySelector(".btn-confirm");
  btn.disabled  = true;
  btn.classList.add("saving");
  btn.textContent = "⏳ Guardando pedido...";

  // Armar resumen de productos como texto
  const productosTexto = cart.map(it => {
    const p = products.find(x => x.id === it.id);
    return `${p.name} ${p.size} x${it.qty} = ${fmt(p.price * it.qty)}`;
  }).join(" | ");

  // Datos para Google Sheets
  const orderData = {
    nombre:    nom,
    barrio:    bar,
    direccion: dir,
    casa:      cas,
    conjunto:  con,
    nota:      not,
    pago:      pag.value,
    productos: productosTexto,
    total:     subtotal(),
  };

  // 1. Guardar en Google Sheets (no bloquea si falla)
  await saveOrderToSheets(orderData);

  // 2. Armar mensaje de WhatsApp
  let msg = `🧹 *NUEVO PEDIDO – Limpieza RR*\n\n`;
  msg += `📦 *Productos:*\n`;
  cart.forEach(it => {
    const p = products.find(x => x.id === it.id);
    msg += `• ${p.name} ${p.size} ×${it.qty} → ${fmt(p.price * it.qty)}\n`;
  });
  msg += `\n💰 *TOTAL: ${fmt(subtotal())}*\n\n`;
  msg += `📍 *Datos de entrega:*\n`;
  msg += `• Nombre: ${nom}\n• Barrio: ${bar}\n• Dirección: ${dir}\n`;
  if (cas) msg += `• Casa/Apto: ${cas}\n`;
  if (con) msg += `• Conjunto: ${con}\n`;
  if (not) msg += `• Nota: ${not}\n`;
  msg += `\n💳 *Medio de pago:* ${pag.value}`;

  // 3. Abrir WhatsApp
  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");

  // 4. Limpiar carrito y cerrar
  cart = [];
  refreshCart();
  closeOrder();
  showToast("✅ ¡Pedido enviado por WhatsApp y guardado!");

  // Resetear formulario y botón
  ["fNombre","fBarrio","fDir","fCasa","fConj","fNota"].forEach(id => $(id).value = "");
  document.querySelectorAll('input[name="pago"]').forEach(r => r.checked = false);
  btn.disabled  = false;
  btn.classList.remove("saving");
  btn.innerHTML = `
    <svg width="21" height="21" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
    Confirmar pedido por WhatsApp`;
}

/* ════════════════════════════════════════════════════════════
   OVERLAY CLICK
═══════════════════════════════════════════════════════════ */
function overlayClick() {
  if ($("prodModal").classList.contains("on"))     closeModal();
  else if ($("cartSidebar").classList.contains("on")) closeCart();
  // El modal de pedido no se cierra con overlay para no perder el formulario
}

/* ════════════════════════════════════════════════════════════
   SCROLL FADE-IN
═══════════════════════════════════════════════════════════ */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("vis"); });
}, { threshold: 0.08 });

document.querySelectorAll(".fi").forEach(el => observer.observe(el));

/* ════════════════════════════════════════════════════════════
   DATOS DE DEMOSTRACIÓN
   (Se usan solo si APPS_SCRIPT_URL no está configurada)
═══════════════════════════════════════════════════════════ */
const DEMO_PRODUCTS = [
  { id:1,  name:"Cera Autobrillante Envase",                  size:"1 Kg",    price:16000,    cat:"Ceras",           top:false, e:"✨", desc:"Cera autobrillante de alta calidad para pisos. Brinda protección y brillo duradero. Fácil aplicación y secado rápido." },
  { id:2,  name:"Cera Autobrillante Galón",                   size:"4 Kg",    price:46333.68, cat:"Ceras",           top:false, e:"✨", desc:"Presentación galón para uso intensivo. Ideal para negocios o grandes superficies. Excelente rendimiento y brillo profesional." },
  { id:3,  name:"Detergente Textil Galón",                    size:"4 Kg",    price:26743.72, cat:"Detergentes",     top:false, e:"🧺", desc:"Potente fórmula para ropa de todo tipo. Elimina manchas difíciles y cuida las fibras del tejido con gran rendimiento." },
  { id:4,  name:"Desengrasante Multiusos Línea Hogar Envase", size:"1 Kg",    price:10700,    cat:"Detergentes",     top:true,  e:"🧽", desc:"Desengrasante multiusos para cocinas, baños y superficies. Elimina grasa y suciedad incrustada eficazmente." },
  { id:5,  name:"Desengrasante Multiusos Línea Hogar Galón",  size:"4 Kg",    price:37300,    cat:"Detergentes",     top:false, e:"🧽", desc:"Presentación galón del desengrasante multiusos. Rendimiento profesional para limpieza intensa en grandes espacios." },
  { id:6,  name:"Detergente Textil",                          size:"1 Kg",    price:16000,    cat:"Detergentes",     top:false, e:"🧺", desc:"Detergente textil ideal para el lavado a mano y máquina. Suave con las prendas, duro con las manchas." },
  { id:7,  name:"Detergente Textil",                          size:"2 Kg",    price:15000,    cat:"Detergentes",     top:true,  e:"🧺", desc:"Presentación de 2 Kg perfecta para familias. Fórmula concentrada que rinde mucho más por cada lavado." },
  { id:8,  name:"Fragancia Irresistible Dude",                size:"100 ml",  price:38034.99, cat:"Fragancias",      top:false, e:"🌸", desc:"Fragancia masculina intensa y seductora. Notas amaderadas con toques frescos que perduran todo el día." },
  { id:9,  name:"Fragancia Happiness",                        size:"100 ml",  price:49004.21, cat:"Fragancias",      top:false, e:"🌸", desc:"Fragancia alegre y fresca que evoca momentos de felicidad. Floral y vibrante para todo el día." },
  { id:10, name:"Fragancia Millonaire",                       size:"100 ml",  price:57093.81, cat:"Fragancias",      top:false, e:"🌸", desc:"La fragancia más lujosa de la colección. Opulenta y exclusiva, para quienes buscan lo mejor." },
  { id:11, name:"Fragancia Bad Girl Gone Good",               size:"100 ml",  price:52195.74, cat:"Fragancias",      top:false, e:"🌸", desc:"Fragancia audaz y sofisticada. Combinación perfecta entre dulzura y misterio irresistible." },
  { id:12, name:"Fragancia Pomelo & Granada",                 size:"100 ml",  price:29750,    cat:"Fragancias",      top:false, e:"🌸", desc:"Combinación frutal vibrante de pomelo y granada. Energizante y refrescante para cualquier momento." },
  { id:13, name:"Fragancia The Boss Perfume",                 size:"100 ml",  price:35700,    cat:"Fragancias",      top:false, e:"🌸", desc:"Para el verdadero líder. Fragancia poderosa, elegante y dominante con notas profundas e intensas." },
  { id:14, name:"Gel Antibacterial Para Manos Galón",         size:"3.5 Kg",  price:35590.89, cat:"Antibacteriales", top:false, e:"🤲", desc:"Gel antibacterial de gran rendimiento. Elimina el 99.9% de gérmenes. Ideal para dispensadores de uso frecuente." },
  { id:15, name:"Gel Antibacterial Para Manos",               size:"500 gr",  price:7735,     cat:"Antibacteriales", top:false, e:"🤲", desc:"Gel antibacterial en presentación personal. Fórmula suave con el cutis y efectiva contra gérmenes." },
  { id:16, name:"Jabón Antibacterial Para Manos Galón",       size:"4 Kg",    price:28560,    cat:"Antibacteriales", top:false, e:"🧼", desc:"Jabón líquido antibacterial en galón. Para dispensadores de uso intensivo en hogares, oficinas y comercios." },
  { id:17, name:"Jabón Antibacterial Para Manos",             size:"1000 gr", price:11971.40, cat:"Antibacteriales", top:false, e:"🧼", desc:"Jabón líquido antibacterial familiar. Limpia profundamente y cuida la piel suave de tus manos." },
  { id:18, name:"Lavaloza Líquido Galón",                     size:"4 Kg",    price:31953.28, cat:"Lavaloza",        top:false, e:"🍽️", desc:"Lavaloza líquido de alta concentración. Elimina la grasa de platos y utensilios con facilidad y aroma agradable." },
  { id:19, name:"Lavaloza Líquido Envase",                    size:"500 gr",  price:6000,     cat:"Lavaloza",        top:false, e:"🍽️", desc:"Presentación individual de lavaloza. Ideal para tu cocina diaria, deja platos y ollas brillantes." },
  { id:20, name:"Lavaloza Líquido Envase",                    size:"1000 gr", price:10000,    cat:"Lavaloza",        top:false, e:"🍽️", desc:"Presentación de 1 Kg de lavaloza líquido. Excelente rendimiento para familias numerosas y uso frecuente." },
  { id:21, name:"Limpiapisos Encanto Tropical Envase",        size:"1 Kg",    price:9000,     cat:"Limpiapisos",     top:true,  e:"🌿", desc:"Limpiapisos con aroma tropical encantador. Limpia y desinfecta pisos duros dejando un olor fresco y duradero." },
  { id:22, name:"Limpiapisos Encanto Tropical Galón",         size:"4 Kg",    price:24370.43, cat:"Limpiapisos",     top:false, e:"🌿", desc:"Presentación galón del limpiapisos tropical. Rendimiento profesional para comercios y grandes espacios." },
  { id:23, name:"Limpiapisos Encanto Tropical Envase",        size:"500 gr",  price:6500,     cat:"Limpiapisos",     top:true,  e:"🌿", desc:"Presentación pequeña del limpiapisos tropical. Práctica y económica para el uso diario en el hogar." },
  { id:24, name:"Limpia Vidrios Envase",                      size:"500 gr",  price:5500,     cat:"Limpia Vidrios",  top:false, e:"🪟", desc:"Limpiador de vidrios sin rayas ni residuos. Deja ventanas, espejos y superficies de vidrio completamente cristalinas." },
  { id:25, name:"Limpia Vidrios Envase",                      size:"1 Kg",    price:8000,     cat:"Limpia Vidrios",  top:true,  e:"🪟", desc:"Presentación de 1 Kg para limpieza de vidrios. Fórmula antivaho que brinda claridad total sin esfuerzo." },
  { id:26, name:"Limpia Vidrios Galón",                       size:"4 Kg",    price:27370,    cat:"Limpia Vidrios",  top:false, e:"🪟", desc:"Galón de limpiador para vidrios. Ideal para edificios, negocios o quienes necesitan gran volumen de limpieza." },
  { id:27, name:"Oxígeno Activo",                             size:"1 Kg",    price:12500,    cat:"Otros",           top:true,  e:"💧", desc:"Blanqueador y desinfectante de oxígeno activo. Sin cloro, cuida el color de las prendas y respeta el medio ambiente." },
  { id:28, name:"Suavizante Galón",                           size:"4 Kg",    price:21420,    cat:"Otros",           top:false, e:"🌺", desc:"Suavizante textil de larga duración. Deja la ropa suave, esponjosa y con un aroma fresco y agradable por días." },
  { id:29, name:"Suavizante Galón",                           size:"2000 gr", price:17000,    cat:"Otros",           top:true,  e:"🌺", desc:"Suavizante de 2 Kg para familias. Excelente relación precio-rendimiento con fragancia duradera." },
];

/* ════════════════════════════════════════════════════════════
   INICIALIZACIÓN
═══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  refreshCart();
  loadProducts(); // Carga productos desde Sheets (o demo si no está configurado)
});
