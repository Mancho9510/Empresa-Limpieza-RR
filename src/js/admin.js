/* ══════════════════════════════════════════
   ADMIN.JS — Entry point del panel admin
   Limpieza RR v2 · Vite 6 + Tailwind 4
══════════════════════════════════════════ */
import '../css/admin/index.css';
import { inject } from '@vercel/analytics';

import { initAuth }         from './admin/auth.js';
import { initTabs, switchTab, getTabActivo } from './admin/tabs.js';
import { initPedidos,     loadPedidos }       from './admin/pedidos.js';
import { initInventario,  loadProductos }     from './admin/inventario.js';
import { initClientes,    loadClientes }      from './admin/clientes.js';
import { initProveedores, loadProveedores }   from './admin/proveedores.js';
import { initDashboard,   loadDashboard, hasDashData }     from './admin/dashboard.js';
import { initRentabilidad, loadRentabilidad, hasRentData } from './admin/rentabilidad.js';
import { showToast }        from './admin/admin-toast.js';

/* ── Initialize Vercel Analytics ── */
inject();

/* ── Init widgets siempre (DOM listo) ── */
initAuth({
  onLogin:  handleLogin,
  onLogout: () => { /* limpieza si hace falta */ },
});

initTabs(onTabSwitch);
initPedidos();
initInventario();
initClientes();
initProveedores();
initDashboard();
initRentabilidad();

/* Botón "Actualizar todo" del topbar */
document.getElementById('refreshBtn')?.addEventListener('click', refreshActivo);

/* ── Al hacer login: cargar datos iniciales ── */
async function handleLogin() {
  switchTab('pedidos');
  await Promise.allSettled([
    loadPedidos(),
    loadProductos(),
    loadClientes(true),
    loadProveedores(true),
  ]);
}

/* ── Al cambiar de pestaña: carga lazy ── */
function onTabSwitch(tab) {
  if (tab === 'dashboard'    && !hasDashData())   loadDashboard();
  if (tab === 'rentabilidad' && !hasRentData())   loadRentabilidad();
}

/* ── Botón "Actualizar" del topbar ── */
async function refreshActivo() {
  const ico = document.getElementById('refreshIco');
  ico?.classList.add('animate-spin-slow');
  await Promise.allSettled([
    loadPedidos(),
    loadProductos(),
    loadClientes(true),
    loadProveedores(true),
    hasDashData()  ? loadDashboard()      : Promise.resolve(),
    hasRentData()  ? loadRentabilidad()   : Promise.resolve(),
  ]);
  ico?.classList.remove('animate-spin-slow');
  showToast('✅ Todo actualizado');
}

/* ══ Toggle Dark / Light mode admin ══ */
function toggleAdminTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-admin-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-admin-theme', next);
  localStorage.setItem('lrr-admin-theme', next);
}

// Conectar el botón
document.getElementById('adminThemeToggle')
  ?.addEventListener('click', toggleAdminTheme);