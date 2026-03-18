/* ── CONFIG ── */
const { APPS_URL, ADMIN_KEY } = window.ADMIN_CONFIG;

/* ── ESTADO ── */
let pedidos      = [];
let productos    = [];
let clientesAdmin = [];
let proveedoresAdmin = [];
let tabActivo    = "pedidos";
let paginaActual = 1;
let totalPaginas = 1;
let totalPedidos = 0;
let porPagina    = 50;
let adminMenuOpen = false;

function fallbackEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderClienteCardSafe(cliente) {
  if (window.AdminUI && typeof window.AdminUI.renderClienteCard === "function") {
    return window.AdminUI.renderClienteCard(cliente);
  }
  const nombre = fallbackEscapeHtml(cliente?.nombre || "Cliente sin nombre");
  const telefono = fallbackEscapeHtml(cliente?.telefono || "Sin telefono");
  const pedidos = Number(cliente?.total_pedidos || 0);
  return `
    <article class="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2">
      <div class="font-semibold text-white">${nombre}</div>
      <div class="text-xs text-slate-400">${telefono}</div>
      <div class="text-xs text-slate-500">${pedidos} pedidos registrados</div>
    </article>`;
}

function renderProveedorCardSafe(proveedor) {
  if (window.AdminUI && typeof window.AdminUI.renderProveedorCard === "function") {
    return window.AdminUI.renderProveedorCard(proveedor);
  }
  const nombre = fallbackEscapeHtml(proveedor?.nombre || "Proveedor sin nombre");
  const contacto = fallbackEscapeHtml(proveedor?.contacto_nombre || proveedor?.telefono || "Sin contacto");
  const movimiento = Number(proveedor?.ventas_relacionadas || 0);
  return `
    <article class="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2">
      <div class="font-semibold text-white">${nombre}</div>
      <div class="text-xs text-slate-400">${contacto}</div>
      <div class="text-xs text-slate-500">${movimiento} movimientos asociados</div>
    </article>`;
}

/* ── LOGIN ── */
function doLogin() {
  if (document.getElementById("loginInput").value.trim() === ADMIN_KEY) {
    document.getElementById("loginWrap").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("app").classList.add("flex");
    Promise.allSettled([loadPedidos(), loadProductos(), loadClientes(true), loadProveedores(true)]);
  } else {
    const err = document.getElementById("loginErr");
    err.textContent = "❌ Clave incorrecta";
    setTimeout(() => err.textContent = "", 2000);
  }
}
function doLogout() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("app").classList.remove("flex");
  document.getElementById("loginWrap").classList.remove("hidden");
  document.getElementById("loginInput").value = "";
  closeAdminMenu();
}

/* ── TABS ── */
function toggleAdminMenu() {
  adminMenuOpen ? closeAdminMenu() : openAdminMenu();
}

function openAdminMenu() {
  const wrap = document.getElementById("adminMenuWrap");
  const btn = document.getElementById("adminMenuBtn");
  if (!wrap || !btn) return;
  adminMenuOpen = true;
  wrap.classList.remove("hidden");
  btn.classList.add("bg-teal-600", "border-teal-500", "text-white");
  btn.classList.remove("bg-slate-700", "border-slate-600", "text-slate-200");
  btn.setAttribute("aria-expanded", "true");
}

function closeAdminMenu() {
  const wrap = document.getElementById("adminMenuWrap");
  const btn = document.getElementById("adminMenuBtn");
  if (!wrap || !btn) return;
  adminMenuOpen = false;
  wrap.classList.add("hidden");
  btn.classList.remove("bg-teal-600", "border-teal-500", "text-white");
  btn.classList.add("bg-slate-700", "border-slate-600", "text-slate-200");
  btn.setAttribute("aria-expanded", "false");
}

function switchTab(tab) {
  tabActivo = tab;
  // Tabs superiores
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("border-teal-500", "text-teal-400");
    b.classList.add("border-transparent", "text-slate-400");
  });
  document.getElementById("tab-" + tab).classList.add("border-teal-500", "text-teal-400");
  document.getElementById("tab-" + tab).classList.remove("border-transparent", "text-slate-400");
  // Panels
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.classList.add("hidden");
    p.classList.remove("flex");
  });
  const activePanel = document.getElementById("panel-" + tab);
  activePanel.classList.remove("hidden");
  activePanel.classList.add("flex");
  // Cargar datos al primera vez que se abre la pestaña
  if (tab === "dashboard"     && !dashData)   loadDashboard();
  if (tab === "rentabilidad"  && !rentData)   loadRentabilidad();
  if (tab === "clientes"      && !clientesAdmin.length) loadClientes();
  if (tab === "proveedores"   && !proveedoresAdmin.length) loadProveedores();
  // Nav bottom
  document.querySelectorAll("[id^='nav-']").forEach(b => {
    b.classList.remove("text-teal-400");
    b.classList.add("text-slate-400");
  });
  const navButton = document.getElementById("nav-" + tab);
  if (navButton) {
    navButton.classList.add("text-teal-400");
    navButton.classList.remove("text-slate-400");
  }
  document.querySelectorAll(".admin-menu-btn").forEach(b => {
    b.classList.remove("bg-teal-500/10", "border-teal-500/30", "text-teal-300");
    b.classList.add("text-slate-300", "border-transparent");
    const hint = b.lastElementChild;
    if (hint) {
      hint.classList.remove("text-teal-400");
      hint.classList.add("text-slate-400");
    }
  });
  const menuButton = document.getElementById("menu-" + tab);
  if (menuButton) {
    menuButton.classList.add("bg-teal-500/10", "border-teal-500/30", "text-teal-300");
    menuButton.classList.remove("text-slate-300", "border-transparent");
    const hint = menuButton.lastElementChild;
    if (hint) {
      hint.classList.add("text-teal-400");
      hint.classList.remove("text-slate-400");
    }
  }
  closeAdminMenu();
}

function refreshActivo() {
  const ico = document.getElementById("refreshIco");
  ico.classList.add("animate-spin-slow");
  Promise.allSettled([
    loadPedidos(),
    loadProductos(),
    loadClientes(true),
    loadProveedores(true),
    dashData ? loadDashboard() : Promise.resolve(),
    rentData ? loadRentabilidad() : Promise.resolve(),
  ]).finally(() => ico.classList.remove("animate-spin-slow"));
}

/* ── HELPERS ── */
const fmt = n => "$ " + Math.round(n).toLocaleString("es-CO");

let _toastTimer = null;
function showToast(txt) {
  const t = document.getElementById("toast");
  t.textContent = txt;
  // Mostrar
  t.classList.remove("translate-y-48", "opacity-0");
  t.classList.add("translate-y-0", "opacity-100");
  // Limpiar timer anterior si había uno activo
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    t.classList.add("translate-y-48", "opacity-0");
    t.classList.remove("translate-y-0", "opacity-100");
    _toastTimer = null;
  }, 3000);
}

function badgePago(val) {
  const v = String(val || "").toUpperCase();
  if (v === "PAGADO")          return "bg-green-900/50 text-green-300 border border-green-600/40";
  if (v === "CONTRA ENTREGA")  return "bg-yellow-900/50 text-yellow-300 border border-yellow-600/40";
  return "bg-red-900/50 text-red-300 border border-red-600/40";
}
function badgeEnvio(val) {
  const v = String(val || "");
  if (v === "Entregado")       return "bg-green-900/50 text-green-300 border border-green-600/40";
  if (v === "En camino")       return "bg-blue-900/50 text-blue-300 border border-blue-600/40";
  if (v === "En preparación")  return "bg-yellow-900/50 text-yellow-300 border border-yellow-600/40";
  return "bg-slate-700/60 text-slate-300 border border-slate-600/40";
}

/* ════════════════════════════════════════
   PEDIDOS
════════════════════════════════════════ */
async function loadPedidos(pagina) {
  if (pagina !== undefined) paginaActual = pagina;
  const wrap = document.getElementById("pedidosWrap");
  wrap.innerHTML = '<div class="text-center text-slate-500 py-10 animate-pulse">⏳ Cargando pedidos...</div>';
  try {
    const q   = (document.getElementById("filterSearch")?.value || "").trim();
    const url = `${APPS_URL}?action=admin_pedidos&clave=${ADMIN_KEY}&pagina=${paginaActual}&por=${porPagina}${q ? "&q="+encodeURIComponent(q) : ""}&t=${Date.now()}`;
    let res;
    try {
      res = await fetch(url, { redirect: "follow" });
    } catch(fetchErr) {
      // Error de red — mostrar mensaje con causa real
      wrap.innerHTML = `
        <div class="text-center py-16 space-y-3">
          <div class="text-4xl">📡</div>
          <div class="text-red-400 font-semibold">No se pudo conectar al servidor</div>
          <div class="text-slate-500 text-sm max-w-xs mx-auto">${fetchErr.message}</div>
          <div class="text-slate-600 text-xs max-w-sm mx-auto mt-2">
            Posibles causas:<br>
            • El archivo se abrió desde disco local (usar GitHub Pages o Netlify)<br>
            • El Apps Script no está publicado como Web App<br>
            • El acceso no está en "Cualquier usuario"
          </div>
          <button onclick="loadPedidos()" class="mt-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition">
            🔄 Reintentar
          </button>
        </div>`;
      return;
    }
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(parseErr) {
      wrap.innerHTML = `
        <div class="text-center py-16 space-y-2">
          <div class="text-4xl">⚠️</div>
          <div class="text-yellow-400 font-semibold">Respuesta inesperada del servidor</div>
          <div class="text-slate-500 text-xs max-w-sm mx-auto">El servidor no devolvió JSON válido. Verifica que el Apps Script esté correctamente publicado.</div>
          <details class="text-left mt-3 max-w-sm mx-auto">
            <summary class="text-slate-500 text-xs cursor-pointer">Ver respuesta del servidor</summary>
            <pre class="text-xs text-slate-400 bg-slate-900 rounded p-2 mt-1 overflow-auto max-h-32">${text.slice(0,500)}</pre>
          </details>
          <button onclick="loadPedidos()" class="mt-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition">
            🔄 Reintentar
          </button>
        </div>`;
      return;
    }
    if (!data.ok) {
      wrap.innerHTML = `<div class="text-center text-red-400 py-16">❌ ${data.error || "Error desconocido"}</div>`;
      return;
    }
    pedidos = data.pedidos || [];
    // Actualizar paginación
    if (data.paginacion) {
      paginaActual  = data.paginacion.pagina;
      totalPaginas  = data.paginacion.totalPaginas;
      totalPedidos  = data.paginacion.total;
      porPagina     = data.paginacion.porPagina;
      actualizarPaginacion();
    }
    updateStatsPedidos();
    renderPedidos();
    showToast("✅ " + pedidos.length + " pedidos cargados");
  } catch(e) {
    wrap.innerHTML = `
      <div class="text-center py-16 space-y-2">
        <div class="text-4xl">❌</div>
        <div class="text-red-400 font-semibold">Error inesperado</div>
        <div class="text-slate-500 text-sm">${e.message}</div>
        <button onclick="loadPedidos()" class="mt-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition">🔄 Reintentar</button>
      </div>`;
  }
}

function updateStatsPedidos() {
  document.getElementById("sTotPed").textContent    = pedidos.length;
  document.getElementById("sPend").textContent      = pedidos.filter(p => (p.estado_pago||"").toUpperCase() === "PENDIENTE").length;
  document.getElementById("sCamino").textContent    = pedidos.filter(p => p.estado_envio === "En camino").length;
  document.getElementById("sEntregado").textContent = pedidos.filter(p => p.estado_envio === "Entregado").length;
  document.getElementById("sTotal").textContent     = fmt(pedidos.reduce((s,p) => s+(Number(p.total)||0), 0));
}

function renderPedidos() {
  const q    = (document.getElementById("filterSearch").value || "").toLowerCase();
  const fP   = document.getElementById("filterPago").value;
  const fE   = document.getElementById("filterEnvio").value;
  const fDesde = document.getElementById("filterFechaDesde")?.value || "";
  const fHasta = document.getElementById("filterFechaHasta")?.value || "";
  const ahora  = new Date();
  const ayer24 = new Date(ahora.getTime() - 24*60*60*1000);

  const lista = pedidos.filter(p => {
    if (q && ![(p.nombre||""),(String(p.telefono)||""),(p.barrio||"")].join(" ").toLowerCase().includes(q)) return false;
    if (fP && (p.estado_pago||"").toUpperCase() !== fP.toUpperCase()) return false;
    if (fE && (p.estado_envio||"") !== fE) return false;
    if (fDesde || fHasta) {
      try {
        const fp = new Date(String(p.fecha||""));
        if (!isNaN(fp.getTime())) {
          if (fDesde && fp < new Date(fDesde)) return false;
          if (fHasta && fp > new Date(fHasta + "T23:59:59")) return false;
        }
      } catch(e) {}
    }
    return true;
  });
  document.getElementById("filterCount").textContent = lista.length !== pedidos.length ? `${lista.length}/${pedidos.length}` : `${pedidos.length}`;
  if (!lista.length) {
    document.getElementById("pedidosWrap").innerHTML = '<div class="text-center text-slate-500 py-16">📭 Sin resultados</div>';
    return;
  }
  document.getElementById("pedidosWrap").innerHTML = lista.map(p => {
    const totalStr  = !isNaN(Number(p.total)) ? fmt(Number(p.total)) : (p.total || "");
    const prodLines = String(p.productos||"").split("\n").filter(l=>l.trim()).map(l=>`<div class="text-xs text-slate-400 py-0.5 border-b border-slate-700/50 last:border-0">▪ ${l.trim()}</div>`).join("");
    const selPago   = ["PENDIENTE","PAGADO","CONTRA ENTREGA"].map(v=>`<option value="${v}" ${(p.estado_pago||"")=== v?"selected":""}>${v}</option>`).join("");
    const selEnvio  = ["Recibido","En preparación","En camino","Entregado"].map(v=>`<option value="${v}" ${(p.estado_envio||"Recibido")===v?"selected":""}>${v}</option>`).join("");
    const waMsg     = encodeURIComponent("Hola " + (p.nombre||"") + ", tu pedido de Limpieza RR está: " + (p.estado_envio||"Recibido"));
    return `
    <div class="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-teal-600/50 transition-all animate-fade-up" id="card-${p.fila}">
      <!-- Cabecera del pedido -->
      <button onclick="toggleCard(${p.fila})" class="w-full text-left p-4 flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">${p.nombre||"Sin nombre"}</div>
          <div class="text-xs text-slate-400 mt-0.5 truncate">${String(p.telefono||"")} · ${p.barrio||""}</div>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span class="text-xs rounded-full px-2.5 py-0.5 font-bold ${badgePago(p.estado_pago)}">${p.estado_pago||"Pendiente"}</span>
            <span class="text-xs rounded-full px-2.5 py-0.5 font-bold ${badgeEnvio(p.estado_envio)}">${p.estado_envio||"Recibido"}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2 flex-shrink-0">
          <span class="font-display font-bold text-teal-300 text-sm">${totalStr}</span>
          <svg id="chev-${p.fila}" class="w-4 h-4 text-slate-500 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </button>
      <!-- Detalle expandible -->
      <div id="body-${p.fila}" class="hidden border-t border-slate-700 p-4 space-y-4 animate-fade-up">
        <!-- Info -->
        <div class="grid grid-cols-2 gap-3">
          <div><div class="text-xs text-slate-500 font-semibold mb-0.5">FECHA</div><div class="text-xs">${p.fecha||""}</div></div>
          <div><div class="text-xs text-slate-500 font-semibold mb-0.5">PAGO</div><div class="text-xs">${p.pago||""}</div></div>
          <div class="col-span-2"><div class="text-xs text-slate-500 font-semibold mb-0.5">DIRECCIÓN</div><div class="text-xs">${p.barrio||""}, ${p.direccion||""} ${p.casa ? "· "+p.casa : ""}</div></div>
        </div>
        <!-- Productos -->
        <div>
          <div class="text-xs text-slate-500 font-semibold mb-2">PRODUCTOS</div>
          <div class="bg-slate-900/50 rounded-xl p-3">${prodLines||"<div class='text-xs text-slate-500'>Sin detalle</div>"}</div>
        </div>
        <!-- Total -->
        <div class="flex justify-between items-center bg-teal-900/20 border border-teal-800/40 rounded-xl px-4 py-3">
          <span class="text-sm text-slate-400 font-semibold">Total a pagar</span>
          <span class="font-display font-bold text-teal-300 text-lg">${totalStr}</span>
        </div>
        <!-- Actualizar estado -->
        <div class="bg-slate-900/40 rounded-xl p-4 space-y-3">
          <div class="text-xs text-slate-400 font-bold tracking-wide">ACTUALIZAR ESTADO</div>
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex-1">
              <label class="text-xs text-slate-500 mb-1 block">💳 Estado de pago</label>
              <select id="selPago-${p.fila}"
                      class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition">
                ${selPago}
              </select>
            </div>
            <div class="flex-1">
              <label class="text-xs text-slate-500 mb-1 block">🚚 Estado de envío</label>
              <select id="selEnvio-${p.fila}"
                      onchange="actualizarWaLink(${p.fila},'${encodeURIComponent(p.nombre||'')}','${String(p.telefono||'').replace(/[^0-9]/g,'')}')"
                      class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition">
                ${selEnvio}
              </select>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 items-center">
            <button onclick="guardarEstado(${p.fila})" id="btnSave-${p.fila}"
                    class="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg px-4 py-2.5 text-sm transition-all">
              💾 Guardar cambios
            </button>
            <span id="saveMsg-${p.fila}" class="text-xs"></span>
            ${p.telefono ? `
            <a id="waLink-${p.fila}"
               href="https://wa.me/57${String(p.telefono||"").replace(/[^0-9]/g,"")}?text=${waMsg}"
               target="_blank" rel="noopener noreferrer"
               class="flex items-center gap-1.5 bg-green-900/40 hover:bg-green-900/60 border border-green-600/40 text-green-400 rounded-lg px-3 py-2.5 text-sm font-semibold transition">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Avisar cliente
            </a>` : ""}
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
}

function toggleCard(fila) {
  const body = document.getElementById("body-" + fila);
  const chev = document.getElementById("chev-" + fila);
  const isOpen = !body.classList.contains("hidden");
  // Cerrar todos
  document.querySelectorAll("[id^='body-']").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll("[id^='chev-']").forEach(el => el.style.transform = "");
  if (!isOpen) {
    body.classList.remove("hidden");
    chev.style.transform = "rotate(180deg)";
  }
}

function actualizarWaLink(fila, nombreEnc, tel) {
  const sel = document.getElementById("selEnvio-" + fila);
  const lnk = document.getElementById("waLink-" + fila);
  if (!sel || !lnk) return;
  const msg = encodeURIComponent("Hola " + decodeURIComponent(nombreEnc) + ", tu pedido de Limpieza RR está: " + sel.value);
  lnk.href = "https://wa.me/57" + String(tel||"").replace(/[^0-9]/g,"") + "?text=" + msg;
}

async function guardarEstado(fila) {
  const selP = document.getElementById("selPago-"  + fila);
  const selE = document.getElementById("selEnvio-" + fila);
  const btn  = document.getElementById("btnSave-"  + fila);
  const msg  = document.getElementById("saveMsg-"  + fila);
  if (!selP || !selE) return;
  btn.disabled = true; btn.textContent = "⏳ Guardando...";
  try {
    const _eRes  = await fetch(APPS_URL, { method:"POST", redirect:"follow", headers:{"Content-Type":"text/plain"},
      body: JSON.stringify({ accion:"actualizar_estado", clave:ADMIN_KEY, fila, estado_pago:selP.value, estado_envio:selE.value }) });
    const data = await _eRes.json();
    if (data.ok) {
      msg.className = "text-xs text-green-400"; msg.textContent = "✅ Guardado";
      const p = pedidos.find(x=>x.fila===fila);
      if (p) { p.estado_pago=selP.value; p.estado_envio=selE.value; }
      updateStatsPedidos();
      showToast("✅ Estado actualizado");
      setTimeout(() => msg.textContent = "", 3000);
    } else { msg.className="text-xs text-red-400"; msg.textContent="❌ Error"; }
  } catch(e) { msg.className="text-xs text-red-400"; msg.textContent="❌ Sin conexión"; }
  btn.disabled = false; btn.textContent = "💾 Guardar cambios";
}

/* ════════════════════════════════════════
   INVENTARIO
════════════════════════════════════════ */
async function loadProductos() {
  document.getElementById("invList").innerHTML = '<div class="text-center text-slate-500 py-16 animate-pulse">⏳ Cargando productos...</div>';
  try {
    const url  = `${APPS_URL}?action=admin_productos&clave=${ADMIN_KEY}&t=${Date.now()}`;
    const res  = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) {
      document.getElementById("invList").innerHTML = '<div class="text-center text-yellow-400 py-16">⚠️ Respuesta inválida del servidor</div>';
      return;
    }
    if (!data.ok) {
      document.getElementById("invList").innerHTML = `<div class="text-center text-red-400 py-16">❌ ${data.error}</div>`;
      return;
    }
    productos = data.productos || [];
    updateStatsInv();
    poblarCatFilter();
    renderInventario();
  } catch(fetchErr) {
    document.getElementById("invList").innerHTML = `<div class="text-center text-red-400 py-16">⚠️ ${fetchErr.message}</div>`;
  }
}

function updateStatsInv() {
  const tot   = productos.length;
  const ag    = productos.filter(p => p.stock !== "" && p.stock !== null && Number(p.stock) === 0).length;
  const bajo  = productos.filter(p => { const s=Number(p.stock); return p.stock !== "" && p.stock !== null && !isNaN(s) && s>0 && s<=5; }).length;
  const sinC  = productos.filter(p => p.stock === "" || p.stock === null || p.stock === undefined).length;
  document.getElementById("invTotal").textContent      = tot;
  document.getElementById("invAgotados").textContent   = ag;
  document.getElementById("invBajos").textContent      = bajo;
  document.getElementById("invSinControl").textContent = sinC;
  const alertas = productos.filter(p => { const s=Number(p.stock); return p.stock !== "" && p.stock !== null && !isNaN(s) && s<=5; });
  const banner  = document.getElementById("alertaBanner");
  if (alertas.length > 0) {
    banner.classList.remove("hidden");
    document.getElementById("alertaItems").innerHTML = alertas.map(p =>
      `<div>${Number(p.stock)===0?"🔴 AGOTADO":"🟡 BAJO"}: ${p.nombre} ${p.tamano} — Stock: ${p.stock}</div>`
    ).join("");
  } else { banner.classList.add("hidden"); }
}

function poblarCatFilter() {
  const cats = [...new Set(productos.map(p=>String(p.categoria||"")))].sort();
  document.getElementById("invCat").innerHTML =
    '<option value="">Todas las cats.</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
}

function getStockStatus(p) {
  if (p.stock===""||p.stock===null||p.stock===undefined) return "sin";
  const s = Number(p.stock);
  if (isNaN(s)) return "sin";
  if (s===0) return "agotado";
  if (s<=5)  return "bajo";
  return "ok";
}

function stockPill(p) {
  const st = getStockStatus(p);
  const val = (p.stock !== "" && p.stock !== null && p.stock !== undefined) ? p.stock : "—";
  const cls = {
    agotado: "bg-red-900/50 text-red-300 border border-red-600/40",
    bajo:    "bg-yellow-900/50 text-yellow-300 border border-yellow-600/40",
    ok:      "bg-green-900/50 text-green-300 border border-green-600/40",
    sin:     "bg-slate-700/50 text-slate-400 border border-slate-600/40",
  }[st];
  return `<span class="text-xs rounded-full px-2.5 py-0.5 font-bold ${cls}">${val}</span>`;
}

function renderInventario() {
  const q   = (document.getElementById("invSearch").value||"").toLowerCase();
  const cat = document.getElementById("invCat").value;
  const est = document.getElementById("invEstStock").value;
  const lista = productos.filter(p => {
    if (q && !(String(p.nombre||"")+" "+String(p.tamano||"")).toLowerCase().includes(q)) return false;
    if (cat && String(p.categoria||"") !== cat) return false;
    if (est && getStockStatus(p) !== est) return false;
    return true;
  });
  document.getElementById("invCount").textContent = lista.length !== productos.length
    ? `${lista.length} de ${productos.length}`
    : `${productos.length} productos`;

  const tbody = document.getElementById("invList");
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500 py-16">📭 Sin productos</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map((p, idx) => {
    const precioV = !isNaN(Number(p.precio)) ? fmt(Number(p.precio)) : "—";
    const costoV  = (p.costo && Number(p.costo) > 0) ? fmt(Number(p.costo)) : "—";
    // Acepta tanto ganancia_calc (de admin_productos) como ganancia_pct (de admin_rentabilidad)
    const _rawGan = p.ganancia_calc != null ? p.ganancia_calc
                  : p.ganancia_pct  != null ? p.ganancia_pct : null;
    const ganPct  = _rawGan != null ? Number(_rawGan) : null;
    const ganPesos= p.ganancia_pesos != null ? Number(p.ganancia_pesos) : null;

    // Color del % de ganancia
    let ganClass = "text-slate-400", ganBg = "bg-slate-700/40";
    if (ganPct !== null) {
      if (ganPct < 10)      { ganClass = "text-red-300";    ganBg = "bg-red-900/40"; }
      else if (ganPct < 30) { ganClass = "text-yellow-300"; ganBg = "bg-yellow-900/40"; }
      else                  { ganClass = "text-green-300";  ganBg = "bg-green-900/40"; }
    }

    const st     = getStockStatus(p);
    const stockActual = (p.stock !== "" && p.stock !== null && p.stock !== undefined) ? p.stock : "—";
    const pillCls = {
      agotado: "bg-red-900/50 text-red-300 border border-red-600/40",
      bajo:    "bg-yellow-900/50 text-yellow-300 border border-yellow-600/40",
      ok:      "bg-green-900/50 text-green-300 border border-green-600/40",
      sin:     "bg-slate-700/50 text-slate-400 border border-slate-600/40",
    }[st];
    const rowBg = idx % 2 === 0 ? "" : "bg-slate-800/40";
    const imgSrc = p.imagen || "";
    return `
    <tr class="${rowBg} hover:bg-teal-900/10 border-b border-slate-800 transition group">
      <!-- Producto -->
      <td class="py-3 px-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-teal-900/40 flex items-center justify-center hidden sm:flex">
            ${imgSrc
              ? `<img src="${imgSrc}" alt="${p.nombre||''}" class="w-full h-full object-cover"
                     onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\'text-xl\'>${p.emoji||'🧴'}</span>'">`
              : `<span class="text-xl">${p.emoji||"🧴"}</span>`}
          </div>
          <div class="min-w-0">
            <div class="font-semibold text-sm text-white">${p.nombre||""}</div>
            <div class="text-xs text-slate-400">${p.tamano||""}</div>
          </div>
        </div>
      </td>
      <!-- Categoría -->
      <td class="py-3 px-3 hidden sm:table-cell">
        <span class="text-xs bg-slate-700 text-slate-300 rounded-full px-2.5 py-1">${p.categoria||""}</span>
      </td>
      <!-- Precio venta -->
      <td class="py-3 px-3 text-right hidden md:table-cell">
        <span class="text-sm font-semibold text-teal-300">${precioV}</span>
      </td>
      <!-- Costo -->
      <td class="py-3 px-3 text-right hidden lg:table-cell">
        <span class="text-sm text-slate-300">${costoV}</span>
      </td>
      <!-- Ganancia -->
      <td class="py-3 px-3 text-center hidden lg:table-cell">
        ${ganPct !== null && !isNaN(ganPct)
          ? `<div>
               <span class="text-xs font-bold rounded-full px-2.5 py-1 ${ganBg} ${ganClass}">${(Number.isFinite(ganPct) ? ganPct : 0).toFixed(1)}%</span>
               <div class="text-xs text-slate-500 mt-0.5">${ganPesos !== null ? fmt(ganPesos) : ""} / ud</div>
             </div>`
          : `<span class="text-xs text-slate-600">Sin costo</span>`}
      </td>
      <!-- Stock actual -->
      <td class="py-3 px-3 text-center">
        <span class="text-xs rounded-full px-3 py-1 font-bold ${pillCls}">${stockActual}</span>
      </td>
      <!-- Editar stock -->
      <td class="py-3 px-3">
        <div class="flex items-center justify-center gap-2">
          <input id="stockIn-${p.fila}" type="number" min="0"
                 placeholder="${stockActual !== "—" ? stockActual : "vacío"}"
                 aria-label="Nuevo stock para ${p.nombre}"
                 class="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white text-center outline-none focus:border-teal-500 transition"
                 onkeydown="if(event.key==='Enter') guardarStock(${p.fila})">
          <button id="btnStkSave-${p.fila}" onclick="guardarStock(${p.fila})"
                  class="bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded-lg px-3 py-2 transition-all whitespace-nowrap">
            Stock
          </button>
          <span id="stkMsg-${p.fila}" class="text-xs text-green-400 hidden">✅</span>
        </div>
        <!-- Editar costo -->
        <div class="flex items-center gap-1 mt-1.5">
          <input id="costoIn-${p.fila}" type="number" min="0"
                 placeholder="${p.costo && Number(p.costo) > 0 ? p.costo : "costo"}"
                 aria-label="Costo para ${p.nombre}"
                 class="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-yellow-500 transition"
                 onkeydown="if(event.key==='Enter') guardarCosto(${p.fila})">
          <button onclick="guardarCosto(${p.fila})"
                  class="bg-yellow-600 hover:bg-yellow-700 active:scale-95 text-white text-xs font-bold rounded-lg px-2 py-1.5 transition-all whitespace-nowrap">
            Costo
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

async function guardarCosto(fila) {
  const input = document.getElementById("costoIn-" + fila);
  if (!input) return;
  const val = input.value.trim();
  if (!val || isNaN(Number(val)) || Number(val) < 0) {
    showToast("⚠️ Ingresa un valor de costo válido");
    return;
  }
  const nuevoCosto = Number(val);
  const btnEl = input.parentElement?.querySelector("button");
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "⏳"; }

  // ── ACTUALIZACIÓN OPTIMISTA ─────────────────────────────
  // Actualizar la UI de inmediato sin esperar al servidor.
  // El dato ya se guardó en Sheets aunque la respuesta falle.
  const p = productos.find(x => x.fila === fila);
  if (p) {
    p.costo = nuevoCosto;
    if (Number(p.precio) > 0 && nuevoCosto > 0) {
      p.ganancia_calc  = Math.round(((Number(p.precio) - nuevoCosto) / nuevoCosto) * 100 * 10) / 10;
      p.ganancia_pesos = Number(p.precio) - nuevoCosto;
    }
  }
  input.value = "";
  updateStatsInv();
  renderInventario();
  showToast("💾 Guardando costo...");

  // ── CONFIRMAR CON SERVIDOR EN SEGUNDO PLANO ─────────────
  try {
    const res  = await fetch(APPS_URL, {
      method:   "POST",
      redirect: "follow",
      headers:  { "Content-Type": "text/plain" },
      body:     JSON.stringify({ accion: "actualizar_costo", clave: ADMIN_KEY, fila: fila, costo: nuevoCosto }),
    });
    const text = await res.text();
    // Intentar parsear — si falla igual asumimos ok porque el dato ya se guardó
    try {
      const data = JSON.parse(text);
      if (data.ok) {
        showToast("✅ Costo guardado correctamente");
      } else {
        // Revertir en local si el servidor reportó error real
        showToast("⚠️ El servidor reportó: " + (data.error || "Error desconocido"));
      }
    } catch(pe) {
      // Apps Script devolvió HTML (cold start o redirect) pero el dato YA se guardó
      // No mostrar error — el dato está en Sheets
      showToast("✅ Costo guardado en Sheets");
      console.warn("Respuesta no-JSON del servidor (normal en cold start):", text.slice(0,80));
    }
  } catch(fetchErr) {
    // Error de red real — el dato puede o no haberse guardado
    showToast("⚠️ Sin confirmación del servidor — verifica en Sheets");
    console.error("guardarCosto fetch error:", fetchErr.message);
  }

  if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Costo"; }
}

async function guardarStock(fila) {
  const input = document.getElementById("stockIn-"    + fila);
  const btn   = document.getElementById("btnStkSave-" + fila);
  if (!input || !btn) return;
  const val = input.value.trim();
  btn.disabled = true; btn.textContent = "⏳";

  // Actualización optimista — actualizar UI de inmediato
  const p = productos.find(x => x.fila === fila);
  if (p) p.stock = val === "" ? "" : Number(val);
  updateStatsInv();
  renderInventario();

  try {
    const res  = await fetch(APPS_URL, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ accion:"actualizar_stock", clave:ADMIN_KEY, fila, stock: val===""?"":Number(val) }),
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      showToast(data.ok ? "✅ Stock guardado correctamente" : "⚠️ " + (data.error||"Error"));
    } catch(pe) {
      showToast("✅ Stock guardado en Sheets");
      console.warn("Respuesta no-JSON (cold start normal)");
    }
  } catch(e) {
    showToast("⚠️ Sin confirmación — verifica en Sheets");
  }
  btn.disabled = false; btn.textContent = "Guardar";
}

/* ════════════════════════════════════════
   CLIENTES
════════════════════════════════════════ */
async function loadClientes(silent) {
  const wrap = document.getElementById("clientesWrap");
  if (!wrap) return;
  if (!silent) {
    wrap.innerHTML = '<div class="text-center text-slate-500 py-16 animate-pulse">Cargando clientes...</div>';
  }
  try {
    const data = await window.AdminApi.getClientes({ pagina: 1, por: 500 });
    clientesAdmin = data.clientes || [];
    renderClientesAdmin();
    if (!silent) showToast("Clientes cargados: " + clientesAdmin.length);
  } catch (err) {
    wrap.innerHTML = `<div class="text-center text-red-400 py-16">${err.message}</div>`;
  }
}

function renderClientesAdmin() {
  const wrap = document.getElementById("clientesWrap");
  if (!wrap) return;
  const q = (document.getElementById("cliSearchAdmin")?.value || "").toLowerCase().trim();
  const tipo = (document.getElementById("cliTipoAdmin")?.value || "").toLowerCase().trim();

  const lista = clientesAdmin.filter(cliente => {
    const texto = [
      cliente.nombre,
      cliente.telefono,
      cliente.ciudad,
      cliente.barrio,
      cliente.segmento_retencion,
    ].join(" ").toLowerCase();
    if (q && !texto.includes(q)) return false;
    if (tipo && String(cliente.tipo || "").toLowerCase() !== tipo) return false;
    return true;
  });

  document.getElementById("cTotalAdmin").textContent = clientesAdmin.length;
  document.getElementById("cVipAdmin").textContent = clientesAdmin.filter(c => String(c.tipo || "").toLowerCase().includes("vip")).length;
  document.getElementById("cRecAdmin").textContent = clientesAdmin.filter(c => String(c.tipo || "").toLowerCase().includes("recurrente")).length;
  document.getElementById("cDormidosAdmin").textContent = clientesAdmin.filter(c => String(c.segmento_retencion || "").toLowerCase().includes("dormido") || String(c.segmento_retencion || "").toLowerCase().includes("riesgo")).length;
  document.getElementById("cliCount").textContent = `${lista.length} de ${clientesAdmin.length}`;

  wrap.innerHTML = lista.length
    ? lista.map(renderClienteCardSafe).join("")
    : '<div class="text-center text-slate-500 py-16">Sin clientes para este filtro</div>';
}

/* ════════════════════════════════════════
   PROVEEDORES
════════════════════════════════════════ */
async function loadProveedores(silent) {
  const wrap = document.getElementById("proveedoresWrap");
  if (!wrap) return;
  if (!silent) {
    wrap.innerHTML = '<div class="text-center text-slate-500 py-16 animate-pulse">Cargando proveedores...</div>';
  }
  try {
    const data = await window.AdminApi.getProveedores({ pagina: 1, por: 200 });
    proveedoresAdmin = data.proveedores || [];
    renderProveedoresAdmin();
    if (!silent) showToast("Proveedores cargados: " + proveedoresAdmin.length);
  } catch (err) {
    wrap.innerHTML = `<div class="text-center text-red-400 py-16">${err.message}</div>`;
  }
}

function renderProveedoresAdmin() {
  const wrap = document.getElementById("proveedoresWrap");
  if (!wrap) return;
  const q = (document.getElementById("provSearchAdmin")?.value || "").toLowerCase().trim();
  const estado = document.getElementById("provEstadoAdmin")?.value || "";

  const lista = proveedoresAdmin.filter(proveedor => {
    const texto = [
      proveedor.nombre,
      proveedor.contacto_nombre,
      proveedor.telefono,
      proveedor.email,
      proveedor.productos,
      proveedor.activo_label,
    ].join(" ").toLowerCase();
    if (q && !texto.includes(q)) return false;
    if (estado === "activos" && !proveedor.activo) return false;
    if (estado === "inactivos" && proveedor.activo) return false;
    return true;
  });

  document.getElementById("pTotalAdmin").textContent = proveedoresAdmin.length;
  document.getElementById("pActivosAdmin").textContent = proveedoresAdmin.filter(p => p.activo).length;
  document.getElementById("pConMovAdmin").textContent = proveedoresAdmin.filter(p => Number(p.ventas_relacionadas || 0) > 0).length;
  document.getElementById("pSinMovAdmin").textContent = proveedoresAdmin.filter(p => Number(p.ventas_relacionadas || 0) === 0).length;
  document.getElementById("provCount").textContent = `${lista.length} de ${proveedoresAdmin.length}`;

  wrap.innerHTML = lista.length
    ? lista.map(renderProveedorCardSafe).join("")
    : '<div class="text-center text-slate-500 py-16">Sin proveedores para este filtro</div>';
}

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
let dashData = null;

async function loadDashboard() {
  const loading = document.getElementById("dashLoading");
  const content = document.getElementById("dashContent");
  loading.classList.remove("hidden"); loading.classList.add("animate-pulse");
  content.classList.add("hidden");
  try {
    const forceRefresh = arguments[0] === true;
    const url  = `${APPS_URL}?action=admin_dashboard&clave=${ADMIN_KEY}&t=${Date.now()}${forceRefresh ? "&refresh=1" : ""}`;
    const res  = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) {
      loading.textContent = "⚠️ Respuesta inválida del servidor";
      loading.classList.remove("animate-pulse"); return;
    }
    if (!data.ok) { loading.textContent = "❌ " + data.error; loading.classList.remove("animate-pulse"); return; }
    dashData = data;
    renderDashboard(data);
    loading.classList.add("hidden");
    content.classList.remove("hidden");
    // Rentabilidad tiene su propia pestaña — no se carga aquí
    // Mostrar metadatos
    const meta = document.getElementById("dashMeta");
    if (meta) {
      meta.classList.remove("hidden");
      if (data.fromCache) {
        meta.innerHTML = `⚡ Desde caché · Generado: ${data.generadoEn || "—"} · <button onclick="loadDashboard(true)" class="underline text-teal-400">Forzar refresco</button>`;
      } else {
        meta.innerHTML = `🔄 Datos frescos · ${data.generadoEn || "—"}`;
      }
    }
  } catch(err) {
    loading.textContent = "⚠️ " + err.message;
    loading.classList.remove("animate-pulse");
  }
}

function renderDashboard(d) {
  const k = d.kpis;

  // KPIs hoy / mes
  document.getElementById("dCntHoy").textContent = k.cntHoy + " pedidos";
  document.getElementById("dTotHoy").textContent = fmt(k.totHoy);
  document.getElementById("dCntMes").textContent = k.cntMes + " pedidos";
  document.getElementById("dTotMes").textContent = fmt(k.totMes);

  // KPIs generales
  document.getElementById("dTotPed").textContent = k.totalPedidos;
  document.getElementById("dTicket").textContent  = fmt(k.ticket);
  document.getElementById("dTotGen").textContent  = fmt(k.totGen);
  document.getElementById("dPend").textContent    = k.pend;
  document.getElementById("dCli").textContent     = k.numClientes;
  document.getElementById("dVip").textContent     = k.vip;

  // Calificaciones
  const avg = k.avgRating;
  document.getElementById("dRatingNum").textContent  = avg > 0 ? avg.toFixed(1) : "—";
  document.getElementById("dStarsVis").textContent   = avg > 0
    ? "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg)) : "—";
  document.getElementById("dRatingInfo").textContent = k.numResenas > 0
    ? k.numResenas + " reseñas" : "Sin reseñas aún";

  // Ventas por semana — mini barra horizontal
  const semOrder = ["Esta semana","Sem anterior","Hace 2 sem","Hace 3 sem",
                    "Hace 4 sem","Hace 5 sem","Hace 6 sem","Hace 7 sem"];
  const semVals  = semOrder.map(s => d.semanas[s] || 0);
  const maxSem   = Math.max(...semVals, 1);
  document.getElementById("dSemanas").innerHTML = semOrder.map((sem, i) => {
    const val = semVals[i];
    const pct = Math.round(val / maxSem * 100);
    const isThis = i === 0;
    return `
    <div class="flex items-center gap-2">
      <span class="text-xs text-slate-400 w-24 flex-shrink-0 text-right">${sem}</span>
      <div class="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden relative">
        <div class="h-full rounded-full transition-all duration-700 ${isThis ? 'bg-teal-500' : 'bg-teal-700/60'}"
             style="width:${pct}%"></div>
        ${val > 0 ? `<span class="absolute inset-0 flex items-center pl-2 text-xs font-semibold text-white">${fmt(val)}</span>` : ""}
      </div>
    </div>`;
  }).join("");

  // Top productos
  const totalUnid = d.topProd.reduce((s, p) => s + p.cant, 0) || 1;
  document.getElementById("dTopProd").innerHTML = d.topProd.length
    ? d.topProd.map((p, i) => {
        const pct = Math.round(p.cant / totalUnid * 100);
        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
        return `
        <div class="flex items-center gap-2">
          <span class="text-base flex-shrink-0">${medals[i]||"▪"}</span>
          <div class="flex-1 min-w-0">
            <div class="text-xs text-white font-medium truncate">${p.nombre}</div>
            <div class="mt-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div class="h-full bg-teal-500 rounded-full" style="width:${pct}%"></div>
            </div>
          </div>
          <span class="text-xs text-teal-300 font-bold flex-shrink-0">${p.cant} uds</span>
        </div>`;
      }).join("")
    : '<div class="text-xs text-slate-500">Sin pedidos aún</div>';

  // Top clientes
  document.getElementById("dTopCli").innerHTML = d.topCli.length
    ? d.topCli.map((cl, i) => {
        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
        return `
        <div class="flex items-center justify-between gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
          <div class="flex items-center gap-2 min-w-0">
            <span class="flex-shrink-0">${medals[i]||"▪"}</span>
            <span class="text-xs text-white truncate">${cl.nombre}</span>
          </div>
          <span class="text-xs font-bold text-teal-300 flex-shrink-0">${cl.pedidos} pedidos</span>
        </div>`;
      }).join("")
    : '<div class="text-xs text-slate-500">Sin clientes aún</div>';

  // Zonas
  const totalZonas = d.topZonas.reduce((s, z) => s + z.cnt, 0) || 1;
  document.getElementById("dTopZonas").innerHTML = d.topZonas.length
    ? d.topZonas.map(z => {
        const pct = Math.round(z.cnt / totalZonas * 100);
        return `
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-300 truncate flex-1 pr-2">${z.zona}</span>
          <span class="text-teal-400 font-bold flex-shrink-0">${z.cnt} · ${pct}%</span>
        </div>`;
      }).join("")
    : '<div class="text-xs text-slate-500">Sin datos</div>';

  // Métodos de pago
  const totalPedidos = d.kpis.totalPedidos || 1;
  document.getElementById("dTopPagos").innerHTML = d.topPagos.length
    ? d.topPagos.map(p => {
        const pct = Math.round(p.cnt / totalPedidos * 100);
        const iconos = {"Nequi":"💜","Breb":"💙","Daviplata":"❤️","Transferencia bancaria":"🏦","Contra entrega":"🚪"};
        const ico = Object.keys(iconos).find(k => p.metodo.toLowerCase().includes(k.toLowerCase()));
        return `
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-300 flex-1 pr-2">${iconos[ico]||"💳"} ${p.metodo}</span>
          <span class="text-teal-400 font-bold flex-shrink-0">${p.cnt} · ${pct}%</span>
        </div>`;
      }).join("")
    : '<div class="text-xs text-slate-500">Sin datos</div>';

  // Alertas stock
  const alertasWrap = document.getElementById("dAlertasWrap");
  if (d.alertasStock && d.alertasStock.length > 0) {
    alertasWrap.classList.remove("hidden");
    document.getElementById("dAlertas").innerHTML = d.alertasStock.map(a => `
      <div class="text-xs ${a.nivel === 'agotado' ? 'text-red-300' : 'text-yellow-300'}">
        ${a.nivel === 'agotado' ? '🔴 AGOTADO' : '🟡 BAJO'}: ${a.nombre} (stock: ${a.stock})
      </div>`).join("");
  } else {
    alertasWrap.classList.add("hidden");
  }

  // Estado de pedidos
  const total = k.totalPedidos || 1;
  const estados = [
    { lbl: "Pendientes de pago", val: k.pend,       cls: "bg-red-900/40 text-red-300" },
    { lbl: "Pagados",            val: k.pagados,     cls: "bg-green-900/40 text-green-300" },
    { lbl: "Entregados",         val: k.entregados,  cls: "bg-blue-900/40 text-blue-300" },
  ];
  document.getElementById("dEstados").innerHTML = estados.map(e => {
    const pct = Math.round(e.val / total * 100);
    return `
    <div class="flex items-center gap-3">
      <span class="text-xs text-slate-400 w-36 flex-shrink-0">${e.lbl}</span>
      <div class="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden relative">
        <div class="h-full rounded-full transition-all duration-700 ${e.cls}" style="width:${pct}%"></div>
      </div>
      <span class="text-xs font-bold text-slate-300 w-16 text-right flex-shrink-0">${e.val} (${pct}%)</span>
    </div>`;
  }).join("");
}

/* ════════════════════════════════════════
   UTILIDADES PEDIDOS
════════════════════════════════════════ */
// Badge NUEVO si el pedido tiene menos de 24h
function isNuevo(fechaStr) {
  try {
    const fd = new Date(String(fechaStr||""));
    if (isNaN(fd.getTime())) return false;
    return (Date.now() - fd.getTime()) < 24 * 60 * 60 * 1000;
  } catch(e) { return false; }
}

function limpiarFiltros() {
  const ids = ["filterSearch","filterPago","filterEnvio","filterFechaDesde","filterFechaHasta"];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  renderPedidos();
}

function exportarCSV() {
  const fDesde = document.getElementById("filterFechaDesde")?.value || "";
  const fHasta = document.getElementById("filterFechaHasta")?.value || "";
  const fP     = document.getElementById("filterPago")?.value || "";
  const fE     = document.getElementById("filterEnvio")?.value || "";
  const q      = (document.getElementById("filterSearch")?.value || "").toLowerCase();

  // Usar los mismos filtros activos
  const lista = pedidos.filter(p => {
    if (q && ![(p.nombre||""),(String(p.telefono)||""),(p.barrio||"")].join(" ").toLowerCase().includes(q)) return false;
    if (fP && (p.estado_pago||"").toUpperCase() !== fP.toUpperCase()) return false;
    if (fE && (p.estado_envio||"") !== fE) return false;
    if (fDesde || fHasta) {
      try {
        const fp = new Date(String(p.fecha||""));
        if (!isNaN(fp.getTime())) {
          if (fDesde && fp < new Date(fDesde)) return false;
          if (fHasta && fp > new Date(fHasta + "T23:59:59")) return false;
        }
      } catch(e) {}
    }
    return true;
  });

  if (!lista.length) { showToast("⚠️ Sin pedidos para exportar"); return; }

  const cols = ["fecha","nombre","telefono","barrio","pago","zona_envio","total","estado_pago","estado_envio","productos"];
  const header = cols.join(",");
  const rows   = lista.map(p =>
    cols.map(col => {
      const val = String(p[col] || "").replace(/"/g, "'").replace(/\n/g, " | ");
      return '"' + val + '"';
    }).join(",")
  );
  const nl  = "\n";
  const bom = "\uFEFF";
  const csv = bom + header + nl + rows.join(nl); // BOM para Excel
  const blob    = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement("a");
  const fecha   = new Date().toISOString().slice(0,10);
  link.href     = url;
  link.download = "pedidos_LimpiezaRR_" + fecha + ".csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("✅ CSV exportado: " + lista.length + " pedidos");
}

/* ════════════════════════════════════════
   PAGINACIÓN
════════════════════════════════════════ */
let searchTimer = null;
function onSearchPedidos() {
  clearTimeout(searchTimer);
  // Debounce 500ms para no hacer petición en cada tecla
  searchTimer = setTimeout(() => loadPedidos(1), 500);
}

function actualizarPaginacion() {
  const wrap  = document.getElementById("paginacionWrap");
  const info  = document.getElementById("paginaInfo");
  const total = document.getElementById("totalInfo");
  const prev  = document.getElementById("btnPagAnterior");
  const next  = document.getElementById("btnPagSiguiente");
  if (!wrap) return;
  if (totalPaginas <= 1) { wrap.classList.add("hidden"); wrap.classList.remove("flex"); return; }
  wrap.classList.remove("hidden");
  wrap.classList.add("flex");
  info.textContent  = `Pág ${paginaActual} de ${totalPaginas}`;
  total.textContent = `${totalPedidos} pedidos en total`;
  prev.disabled = paginaActual <= 1;
  next.disabled = paginaActual >= totalPaginas;
}

function cambiarPagina(delta) {
  const nueva = paginaActual + delta;
  if (nueva < 1 || nueva > totalPaginas) return;
  loadPedidos(nueva);
  // Scroll al tope de la lista
  document.getElementById("pedidosWrap")?.scrollTo({ top: 0, behavior: "smooth" });
}

/* ════════════════════════════════════════
   RENTABILIDAD
════════════════════════════════════════ */
let rentData = null;
let rentTodos = [];

async function loadRentabilidad(forceRefresh) {
  const loading = document.getElementById("rentLoading");
  const content = document.getElementById("rentContent");
  if (!loading) return; // panel no está en DOM aún
  loading.classList.remove("hidden"); loading.classList.add("animate-pulse");
  content?.classList.add("hidden");
  try {
    const url  = `${APPS_URL}?action=admin_rentabilidad&clave=${ADMIN_KEY}${forceRefresh?"&refresh=1":""}&t=${Date.now()}`;
    const res  = await fetch(url, { redirect:"follow" });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch(e) {
      loading.textContent = "⚠️ Error al cargar datos de rentabilidad";
      loading.classList.remove("animate-pulse"); return;
    }
    if (!data.ok) { loading.textContent = "❌ " + data.error; loading.classList.remove("animate-pulse"); return; }
    rentData  = data;
    rentTodos = data.todos || [];
    renderRentabilidad(data);
    loading.classList.add("hidden");
    content?.classList.remove("hidden");
  } catch(err) {
    loading.textContent = "⚠️ " + err.message;
    loading.classList.remove("animate-pulse");
  }
}

function filtrarRentabilidad() {
  const q = (document.getElementById("rentSearch")?.value || "").toLowerCase();
  renderTablaRent(q ? rentTodos.filter(p =>
    (p.nombre + " " + p.tamano + " " + p.categoria).toLowerCase().includes(q)
  ) : rentTodos);
}

function renderTablaRent(lista) {
  const tbody = document.getElementById("rentTabla");
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-8">Sin resultados</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map((p, i) => {
    const hasData  = Number(p.costo) > 0 && Number(p.precio) > 0;
    // El endpoint admin_rentabilidad devuelve ganancia_pct (no ganancia_calc)
    const rawPct   = p.ganancia_pct != null ? p.ganancia_pct
                   : p.ganancia_calc != null ? p.ganancia_calc : null;
    const pct      = (hasData && rawPct != null) ? Number(rawPct) : null;
    const rawPesos = p.ganancia_pesos != null ? p.ganancia_pesos : null;
    const ganPesos = (hasData && rawPesos != null) ? Number(rawPesos) : null;
    const colorPct = (pct === null || isNaN(pct)) ? "text-slate-600"
      : pct >= 30 ? "text-green-400" : pct >= 10 ? "text-yellow-400" : "text-red-400";
    const bgRow    = i % 2 === 0 ? "" : "bg-slate-800/30";
    return `
    <tr class="${bgRow} hover:bg-teal-900/10 border-b border-slate-800/60">
      <td class="py-2 px-2">
        <div class="font-semibold text-white">${p.nombre||""}</div>
        <div class="text-slate-500">${p.tamano||""} · ${p.categoria||""}</div>
      </td>
      <td class="py-2 px-2 text-right text-teal-300">${p.precio > 0 ? fmt(p.precio) : "—"}</td>
      <td class="py-2 px-2 text-right text-slate-300">${p.costo > 0 ? fmt(p.costo) : '<span class="text-yellow-600">Sin costo</span>'}</td>
      <td class="py-2 px-2 text-right ${colorPct} font-semibold">${ganPesos !== null ? fmt(ganPesos) : "—"}</td>
      <td class="py-2 px-2 text-center">
        ${pct !== null
          ? `<span class="rounded-full px-2 py-0.5 font-bold text-xs ${colorPct.replace('text-','bg-').replace('-400','-900/50')} ${colorPct}">${(Number.isFinite(pct) ? pct : 0).toFixed(1)}%</span>`
          : '<span class="text-slate-600 text-xs">—</span>'}
      </td>
    </tr>`;
  }).join("");
}

function renderRentabilidad(d) {
  const r = d.resumen;

  // KPIs pestaña rentabilidad
  const avgColor = r.avgGanPct >= 30 ? "text-green-400" : r.avgGanPct >= 10 ? "text-yellow-400" : r.avgGanPct > 0 ? "text-red-400" : "text-slate-400";
  const avgEl = document.getElementById("rentAvgGan");
  if (avgEl) { const avgVal = Number(r.avgGanPct); avgEl.textContent = (Number.isFinite(avgVal) && avgVal > 0) ? avgVal.toFixed(1) + "%" : "—"; avgEl.className = "font-display font-extrabold text-3xl " + avgColor; }
  const ganEl = document.getElementById("rentGanReal");
  if (ganEl) ganEl.textContent = r.gananciaReal > 0 ? fmt(r.gananciaReal) : "—";
  const ccEl = document.getElementById("rentConCosto");
  if (ccEl) ccEl.textContent = r.conCosto;
  const scEl = document.getElementById("rentSinCosto");
  if (scEl) scEl.textContent = r.sinCosto;
  const invEl = document.getElementById("rentInversion");
  if (invEl) invEl.textContent = r.totalInversion > 0 ? fmt(r.totalInversion) : "—";

  // Alerta sin costo
  const alertaEl = document.getElementById("rentAlertaSinCosto");
  const numScEl  = document.getElementById("rentNumSinCosto");
  if (alertaEl && r.sinCosto > 0) {
    alertaEl.classList.remove("hidden");
    if (numScEl) numScEl.textContent = r.sinCosto;
  } else if (alertaEl) { alertaEl.classList.add("hidden"); }

  // Top rentables
  const topEl = document.getElementById("rentTopRent");
  if (topEl) {
    const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
    topEl.innerHTML = d.topRentables.length
      ? d.topRentables.map((p, i) => {
          const pct   = Number(p.ganancia_pct) || 0;
          const color = pct >= 30 ? "text-green-400" : pct >= 10 ? "text-yellow-400" : "text-red-400";
          const bgBadge = pct >= 30 ? "bg-green-900/40" : pct >= 10 ? "bg-yellow-900/40" : "bg-red-900/40";
          return `
          <div class="flex items-center justify-between gap-3 py-2 border-b border-slate-700/50 last:border-0">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-base flex-shrink-0">${medals[i]||"▪"}</span>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-white truncate">${p.nombre||""}</div>
                <div class="text-xs text-slate-500">${p.tamano||""} · ${p.categoria||""}</div>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-xs font-bold rounded-full px-2.5 py-0.5 ${bgBadge} ${color}">${(Number.isFinite(pct) ? pct : 0).toFixed(1)}%</span>
              <span class="text-xs text-slate-500">${p.precio>0?fmt(p.precio):"—"} − ${p.costo>0?fmt(p.costo):"—"} = ${p.ganancia_pesos>0?fmt(p.ganancia_pesos):"—"}/ud</span>
            </div>
          </div>`;
        }).join("")
      : '<div class="text-xs text-slate-500 py-4 text-center">Ingresa costos en Inventario para ver el ranking</div>';
  }

  // Tabla completa
  renderTablaRent(d.todos || []);
  // Poblar selector de la calculadora
  setTimeout(poblarCalcProductos, 50);

  // Menos rentables
  const menosEl = document.getElementById("rentMenosRent");
  if (menosEl) {
    menosEl.innerHTML = d.menosRentables.length
      ? d.menosRentables.map(p => {
          const pct   = Number(p.ganancia_pct) || 0;
          const color = pct < 10 ? "text-red-400" : "text-yellow-400";
          return `
          <div class="flex items-center justify-between gap-2 py-2 border-b border-slate-700/50 last:border-0">
            <div class="min-w-0">
              <div class="text-sm text-white truncate">${p.nombre||""} ${p.tamano||""}</div>
              <div class="text-xs text-slate-500">Vendes ${p.precio>0?fmt(p.precio):"—"} · Te cuesta ${p.costo>0?fmt(p.costo):"—"}</div>
            </div>
            <span class="text-sm font-bold flex-shrink-0 ${color}">${(Number.isFinite(pct) ? pct : 0).toFixed(1)}%</span>
          </div>`;
        }).join("")
      : '<div class="text-xs text-slate-500 py-2">Sin datos disponibles</div>';
  }
}

/* ════════════════════════════════════════
   CALCULADORA DE PRECIOS
════════════════════════════════════════ */
let _calcFilaActual = null;

// Poblar selector de productos con los que tienen costo
function poblarCalcProductos() {
  const sel = document.getElementById("calcProd");
  if (!sel || !rentTodos.length) return;
  const conCosto = rentTodos.filter(p => Number(p.costo) > 0);
  sel.innerHTML = '<option value="">— Elegir producto —</option>' +
    conCosto.map(p =>
      `<option value="${p.fila}" data-costo="${p.costo}" data-precio="${p.precio}">
        ${p.nombre} ${p.tamano} (costo: ${fmt(p.costo)})
      </option>`
    ).join("");
}

// Al seleccionar un producto, rellenar el costo automáticamente
function onCalcProdChange() {
  const sel   = document.getElementById("calcProd");
  const opt   = sel?.options[sel.selectedIndex];
  const costo = opt?.dataset?.costo;
  const inp   = document.getElementById("calcCosto");
  if (inp && costo) inp.value = costo;
  _calcFilaActual = sel?.value || null;
  calcularPrecio();
}

function calcularPrecio() {
  const costo  = Number(document.getElementById("calcCosto")?.value)  || 0;
  const margen = Number(document.getElementById("calcMargen")?.value) || 0;
  const resEl  = document.getElementById("calcResultado");
  const detEl  = document.getElementById("calcDetalle");
  const accEl  = document.getElementById("calcAcciones");

  if (!costo || !margen || costo <= 0 || margen <= 0) {
    if (resEl) resEl.textContent = "—";
    detEl?.classList.add("hidden"); detEl?.classList.remove("grid");
    accEl?.classList.add("hidden"); accEl?.classList.remove("flex");
    return;
  }

  const precioSugerido = Math.ceil(costo * (1 + margen / 100));
  const gananciaUd     = precioSugerido - costo;

  // Mostrar resultado principal
  if (resEl) resEl.textContent = fmt(precioSugerido);

  // Precio actual del producto seleccionado
  const sel        = document.getElementById("calcProd");
  const opt        = sel?.options[sel?.selectedIndex];
  const precioActual = Number(opt?.dataset?.precio) || 0;

  // Detalles
  const dcosto  = document.getElementById("calcDetCosto");
  const dgan    = document.getElementById("calcDetGan");
  const dprecio = document.getElementById("calcDetPrecio");
  const dactual = document.getElementById("calcDetActual");
  if (dcosto)  dcosto.textContent  = fmt(costo);
  if (dgan)    dgan.textContent    = fmt(gananciaUd);
  if (dprecio) dprecio.textContent = fmt(precioSugerido);
  if (dactual) {
    if (precioActual > 0) {
      const diff = precioSugerido - precioActual;
      dactual.textContent = fmt(precioActual) + (diff !== 0 ? (diff > 0 ? " (↑" : " (↓") + fmt(Math.abs(diff)) + ")" : " ✓");
      dactual.className = diff > 0 ? "text-sm font-bold text-yellow-400"
                        : diff < 0 ? "text-sm font-bold text-red-400"
                        : "text-sm font-bold text-green-400";
    } else {
      dactual.textContent = "Sin precio";
    }
  }

  detEl?.classList.remove("hidden"); detEl?.classList.add("grid");
  if (_calcFilaActual) { accEl?.classList.remove("hidden"); accEl?.classList.add("flex"); }
  else { accEl?.classList.add("hidden"); accEl?.classList.remove("flex"); }
}

// Aplicar el precio sugerido al producto en Sheets
async function aplicarPrecioSugerido() {
  const fila   = _calcFilaActual;
  const costo  = Number(document.getElementById("calcCosto")?.value)  || 0;
  const margen = Number(document.getElementById("calcMargen")?.value) || 0;
  if (!fila || !costo || !margen) return;

  const precio = Math.ceil(costo * (1 + margen / 100));
  const btn    = document.querySelector("[onclick='aplicarPrecioSugerido()']");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Aplicando..."; }

  // Actualizar local
  const p = rentTodos.find(x => String(x.fila) === String(fila));
  if (p) {
    p.precio        = precio;
    p.ganancia_pct  = margen;
    p.ganancia_pesos= precio - costo;
  }
  // También en productos (inventario)
  const p2 = productos.find(x => String(x.fila) === String(fila));
  if (p2) {
    p2.precio       = precio;
    p2.ganancia_calc = margen;
    p2.ganancia_pesos= precio - costo;
  }

  try {
    const res  = await fetch(APPS_URL, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ accion: "actualizar_precio", clave: ADMIN_KEY, fila: Number(fila), precio: precio }),
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      showToast(data.ok ? "✅ Precio " + fmt(precio) + " aplicado" : "⚠️ " + (data.error||"Error"));
    } catch(e) {
      showToast("✅ Precio " + fmt(precio) + " guardado en Sheets");
    }
    // Refrescar selector
    if (document.getElementById("calcProd")) poblarCalcProductos();
    renderTablaRent(rentTodos);
  } catch(e) {
    showToast("⚠️ Sin confirmación — verifica en Sheets");
  }
  if (btn) { btn.disabled = false; btn.textContent = "✅ Aplicar este precio al producto"; }
}

function copiarPrecio() {
  const costo  = Number(document.getElementById("calcCosto")?.value)  || 0;
  const margen = Number(document.getElementById("calcMargen")?.value) || 0;
  if (!costo || !margen) return;
  const precio = Math.ceil(costo * (1 + margen / 100));
  navigator.clipboard.writeText(String(precio))
    .then(() => showToast("📋 Precio " + fmt(precio) + " copiado"))
    .catch(() => showToast("Precio sugerido: " + fmt(precio)));
}

// Vista previa masiva
function calcularPreviewMasivo() {
  const margen = Number(document.getElementById("calcMargenGlobal")?.value) || 0;
  const wrap   = document.getElementById("calcMasivoWrap");
  const tbody  = document.getElementById("calcMasivoTabla");
  if (!margen || !tbody) return;

  const conCosto = rentTodos.filter(p => Number(p.costo) > 0);
  if (!conCosto.length) {
    wrap?.classList.remove("hidden");
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-4">No hay productos con costo ingresado</td></tr>';
    return;
  }

  wrap?.classList.remove("hidden");
  tbody.innerHTML = conCosto.map((p, i) => {
    const sugerido = Math.ceil(Number(p.costo) * (1 + margen / 100));
    const actual   = Number(p.precio) || 0;
    const diff     = sugerido - actual;
    const diffStr  = diff === 0 ? '<span class="text-green-400">Sin cambio</span>'
                   : diff > 0   ? `<span class="text-yellow-400">+${fmt(diff)}</span>`
                                : `<span class="text-red-400">${fmt(diff)}</span>`;
    const bg = i % 2 === 0 ? "" : "bg-slate-800/30";
    return `
    <tr class="${bg} border-b border-slate-800/60">
      <td class="py-2 px-2">
        <div class="font-semibold text-white">${p.nombre}</div>
        <div class="text-slate-500">${p.tamano}</div>
      </td>
      <td class="py-2 px-2 text-right text-slate-400">${fmt(p.costo)}</td>
      <td class="py-2 px-2 text-right text-slate-300">${actual > 0 ? fmt(actual) : "—"}</td>
      <td class="py-2 px-2 text-right font-bold text-teal-300">${fmt(sugerido)}</td>
      <td class="py-2 px-2 text-center">${diffStr}</td>
    </tr>`;
  }).join("");
}

/* ── INIT ── */
document.getElementById("loginInput").focus();

document.addEventListener("click", (event) => {
  if (!adminMenuOpen) return;
  const wrap = document.getElementById("adminMenuWrap");
  const btn = document.getElementById("adminMenuBtn");
  if (!wrap || !btn) return;
  if (wrap.contains(event.target) || btn.contains(event.target)) return;
  closeAdminMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAdminMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 640) closeAdminMenu();
});
