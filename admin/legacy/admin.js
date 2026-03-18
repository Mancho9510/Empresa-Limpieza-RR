/* ════════════════════════════════════════════════════════════
   ADMIN.JS — PANEL COMPLETO Limpieza RR v1.0
   Funciona 100% INDEPENDIENTE del Apps Script
   ════════════════════════════════════════════════════════════ */

/* ── CONFIGURAR AQUÍ TU URL DE APPS SCRIPT ── */
const ADMIN_CONFIG = {
  APPS_URL:  "https://script.google.com/macros/s/AKfycbwntGswrb4Omm-O9jiX3FW0Lukjn5i-Zmcsrk2hf7seqGJbXvMvaI8xO2mt2oqgBhyczQ/exec", // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← 
  // Apps Script → Implementar → Nueva implementación → "Yo" + "Cualquier usuario" → Copiar URL
  ADMIN_KEY: "LIMPIEZARR2025"
};

/* ── DATA DEMO (para probar SIN servidor) ── */
const DEMO_PEDIDOS = [
  {"fila":1,"nombre":"María Pérez","telefono":"57300123456","fecha":"2024-01-15 14:30","estado_pago":"PAGADO","estado_envio":"Entregado","barrio":"Belén","direccion":"Cra 50 #45-20","total":34700,"productos":"Cera x2"},
  {"fila":2,"nombre":"Carlos López","telefono":"57300987654","fecha":"2024-01-16 10:15","estado_pago":"PENDIENTE","estado_envio":"En camino","barrio":"Laureles","direccion":"Cll 33 #75-120","total":47300,"productos":"Desengrasante x1"},
  {"fila":3,"nombre":"Ana Gómez","telefono":"57300543219","fecha":"2024-01-18 16:45","estado_pago":"PAGADO","estado_envio":"Recibido","barrio":"Poblado","direccion":"Dg 39A #8-50","total":54500,"productos":"Gel x1"}
];

const DEMO_CLIENTES = [
  {"fila":1,"nombre":"María Pérez","telefono":"57300123456","total_pedidos":5,"total_gastado":150000,"tipo":"VIP","frecuencia":"Alta","ciudad":"Medellín","barrio":"Belén"},
  {"fila":2,"nombre":"Carlos López","telefono":"57300987654","total_pedidos":8,"total_gastado":320000,"tipo":"VIP","frecuencia":"Alta","ciudad":"Medellín","barrio":"Laureles"},
  {"fila":3,"nombre":"Ana Gómez","telefono":"57300543219","total_pedidos":3,"total_gastado":93200,"tipo":"Recurrente","frecuencia":"Media","ciudad":"Medellín","barrio":"Poblado"},
  {"fila":4,"nombre":"Juan Ramírez","telefono":"57300234567","total_pedidos":1,"total_gastado":24000,"tipo":"Nuevo","frecuencia":"Baja","ciudad":"Medellín","barrio":"Belén"}
];

const DEMO_PROVEEDORES = [
  {"fila":1,"nombre":"Químicos del Sur Ltda","contacto_nombre":"Carlos Vargas","telefono":"57300112233","direccion":"Sabaneta","activo":"Sí"},
  {"fila":2,"nombre":"Limpieza Industrial SAS","contacto_nombre":"Laura Morales","telefono":"57300445566","direccion":"Envigado","activo":"Sí"},
  {"fila":3,"nombre":"Proveedora del Hogar","contacto_nombre":"Miguel Ángel","telefono":"57300778899","direccion":"Itagüí","activo":"No"}
];

/* ── ESTADO ── */
let pedidos     = [];
let clientes    = [];
let proveedores = [];
let tabActivo   = "pedidos";

const fmt = n => "$" + Math.round(n).toLocaleString("es-CO");

/* ── TOAST ── */
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("translate-y-48", "opacity-0");
  toast.classList.add("translate-y-0", "opacity-100");
  
  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-48", "opacity-0");
  }, 3500);
}

/* ── LOGIN ── */
function doLogin() {
  const input = document.getElementById("loginInput");
  if (input.value.trim() === ADMIN_CONFIG.ADMIN_KEY) {
    document.getElementById("loginWrap").style.display = "none";
    document.getElementById("app").style.display = "flex";
    switchTab("pedidos");
    // Cargar demo data si no hay servidor
    if (!ADMIN_CONFIG.APPS_URL.trim()) {
      pedidos = DEMO_PEDIDOS;
      clientes = DEMO_CLIENTES;
      proveedores = DEMO_PROVEEDORES;
      updateStatsPedidos();
      renderPedidos();
      updateKPIsClientes();
      renderClientes();
      updateKPIsProveedores();
      renderProveedores();
      showToast("🎉 DEMO MODE - Configura APPS_URL para datos reales");
    }
  } else {
    const err = document.getElementById("loginErr");
    err.textContent = "❌ Clave incorrecta";
    setTimeout(() => err.textContent = "", 2500);
  }
}

function doLogout() {
  document.getElementById("app").style.display = "none";
  document.getElementById("loginWrap").style.display = "flex";
  document.getElementById("loginInput").value = "";
}

/* ── TABS ── */
function switchTab(tab) {
  tabActivo = tab;
  
  // Top tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("border-teal-500", "text-teal-400");
    btn.classList.add("border-transparent", "text-slate-400");
  });
  const tabBtn = document.getElementById("tab-" + tab);
  if (tabBtn) {
    tabBtn.classList.add("border-teal-500", "text-teal-400");
    tabBtn.classList.remove("border-transparent", "text-slate-400");
  }
  
  // Panels
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.add("hidden");
  });
  const panel = document.getElementById("panel-" + tab);
  if (panel) panel.classList.remove("hidden");
  
  // Bottom nav
  document.querySelectorAll("[id^='nav-']").forEach(btn => btn.classList.add("text-slate-400"));
  const navBtn = document.getElementById("nav-" + tab);
  if (navBtn) navBtn.classList.remove("text-slate-400"), navBtn.classList.add("text-teal-400");
}

/* ── PEDIDOS ── */
function updateStatsPedidos() {
  document.getElementById("sTotPed").textContent    = pedidos.length;
  document.getElementById("sPend").textContent      = pedidos.filter(p => p.estado_pago === "PENDIENTE").length;
  document.getElementById("sCamino").textContent    = pedidos.filter(p => p.estado_envio === "En camino").length;
  document.getElementById("sEntregado").textContent = pedidos.filter(p => p.estado_envio === "Entregado").length;
  document.getElementById("sTotal").textContent     = fmt(pedidos.reduce((s,p) => s + (p.total || 0), 0));
}

function renderPedidos() {
  const wrap = document.getElementById("pedidosWrap");
  if (!pedidos.length) {
    wrap.innerHTML = '<div class="text-center py-16 text-slate-500">📭 Sin pedidos</div>';
    return;
  }
  
  wrap.innerHTML = pedidos.map(p => {
    return `
    <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-teal-500/50 transition-all">
      <div class="flex items-start gap-4 mb-2">
        <div class="flex-1">
          <div class="font-semibold text-sm text-white">${p.nombre}</div>
          <div class="text-xs text-slate-400">${p.telefono} • ${p.barrio}</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-teal-300 text-lg">${fmt(p.total)}</div>
          <div class="text-xs text-slate-400">${p.fecha}</div>
        </div>
      </div>
      <div class="text-xs text-slate-400">${p.productos}</div>
    </div>`;
  }).join("");
}

/* ── CLIENTES ── */
function updateKPIsClientes() {
  document.getElementById("cTotal").textContent = clientes.length;
  document.getElementById("cVip").textContent   = clientes.filter(c => c.tipo === "VIP").length;
  document.getElementById("cRec").textContent   = clientes.filter(c => c.tipo === "Recurrente").length;
  document.getElementById("cNew").textContent   = clientes.filter(c => c.tipo === "Nuevo").length;
}

function renderClientes() {
  const tbody = document.getElementById("cliList");
  if (!tbody) return;
  
  tbody.innerHTML = clientes.map(c => {
    const totalG = fmt(c.total_gastado);
    const tipoCls = {
      "VIP": "bg-yellow-900/50 text-yellow-300 border border-yellow-600/40",
      "Recurrente": "bg-green-900/50 text-green-300 border border-green-600/40",
      "Nuevo": "bg-blue-900/50 text-blue-300 border border-blue-600/40"
    }[c.tipo] || "bg-slate-700/50 text-slate-400 border border-slate-600/40";

    return `
    <tr class="hover:bg-slate-800/50 transition">
      <td class="py-3 px-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center font-bold text-sm">${c.nombre.charAt(0).toUpperCase()}</div>
          <div class="min-w-0">
            <div class="font-semibold text-sm">${c.nombre}</div>
            <div class="text-xs text-slate-400">${c.telefono}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-3 hidden sm:table-cell text-center">${c.total_pedidos}</td>
      <td class="py-3 px-3 text-right hidden md:table-cell">${totalG}</td>
      <td class="py-3 px-3 text-center hidden lg:table-cell">${c.frecuencia}</td>
      <td class="py-3 px-3">
        <span class="text-xs px-2.5 py-1 rounded-full font-bold ${tipoCls}">${c.tipo}</span>
      </td>
    </tr>`;
  }).join("");
}

/* ── PROVEEDORES ── */
function updateKPIsProveedores() {
  const total = proveedores.length;
  const activos = proveedores.filter(p => p.activo === "Sí").length;
  document.getElementById("pTotal").textContent    = total;
  document.getElementById("pActivos").textContent  = activos;
  document.getElementById("pInactivos").textContent= total - activos;
}

function renderProveedores() {
  const tbody = document.getElementById("provList");
  if (!tbody) return;
  
  tbody.innerHTML = proveedores.map(p => {
    const cls = p.activo === "Sí" 
      ? "bg-green-900/50 text-green-300" 
      : "bg-slate-700/50 text-slate-400";
      
    return `
    <tr class="hover:bg-slate-800/50 transition">
      <td class="py-3 px-3 font-semibold">${p.nombre}</td>
      <td class="py-3 px-3 hidden sm:table-cell">${p.contacto_nombre || "—"}</td>
      <td class="py-3 px-3 hidden md:table-cell">${p.direccion || "—"}</td>
      <td class="py-3 px-3 hidden lg:table-cell text-center">${p.telefono || "—"}</td>
      <td class="py-3 px-3 text-center">
        <span class="px-2.5 py-1 rounded-full font-bold text-xs ${cls}">${p.activo === "Sí" ? "🟢" : "🔴"}</span>
      </td>
    </tr>`;
  }).join("");
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("loginInput").focus();
  
  // Verificar configuración
  if (!ADMIN_CONFIG.APPS_URL.trim()) {
    showToast("⚠️ DEMO MODE - Edita admin.js línea 9 con tu URL de Apps Script");
  }
});

