/* ══════════════════════════════════════════
   TABS — Navegación del panel admin
   Sin onclick en HTML: todo via addEventListener
══════════════════════════════════════════ */

const TABS = ['pedidos', 'inventario', 'clientes', 'proveedores', 'dashboard', 'rentabilidad'];
let _tabActivo = 'pedidos';
let _menuOpen  = false;
let _onSwitch  = null;

export function initTabs(onSwitch) {
  _onSwitch = onSwitch;

  // Tabs superiores (desktop)
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Nav inferior (mobile)
  document.querySelectorAll('.nav-btn[data-navtab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.navtab));
  });

  // Menú mobile
  document.querySelectorAll('.admin-menu-btn[data-menutab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.menutab));
  });

  // Botón hamburguesa
  document.getElementById('adminMenuBtn')?.addEventListener('click', toggleMenu);

  // Cerrar menú al hacer clic fuera
  document.addEventListener('click', e => {
    if (!_menuOpen) return;
    const wrap = document.getElementById('adminMenuWrap');
    const btn  = document.getElementById('adminMenuBtn');
    if (!wrap?.contains(e.target) && !btn?.contains(e.target)) closeMenu();
  });

  // Cerrar con Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // Cerrar al agrandar la ventana
  window.addEventListener('resize', () => { if (window.innerWidth >= 640) closeMenu(); });
}

export function switchTab(tab) {
  if (!TABS.includes(tab)) return;
  _tabActivo = tab;

  // Actualizar tab buttons (desktop)
  document.querySelectorAll('.tab-btn[data-tab]').forEach(b => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('border-teal-500', active);
    b.classList.toggle('text-teal-400',   active);
    b.classList.toggle('border-transparent', !active);
    b.classList.toggle('text-slate-400',  !active);
  });

  // Actualizar nav inferior (mobile)
  document.querySelectorAll('.nav-btn[data-navtab]').forEach(b => {
    b.classList.toggle('text-teal-400',  b.dataset.navtab === tab);
    b.classList.toggle('text-slate-400', b.dataset.navtab !== tab);
  });

  // Actualizar menú mobile
  document.querySelectorAll('.admin-menu-btn[data-menutab]').forEach(b => {
    const active = b.dataset.menutab === tab;
    b.classList.toggle('bg-teal-500/10',    active);
    b.classList.toggle('border-teal-500/30', active);
    b.classList.toggle('text-teal-300',     active);
    b.classList.toggle('text-slate-300',    !active);
    b.classList.toggle('border-transparent', !active);
  });

  // Mostrar/ocultar panels
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('flex');
  });
  const panel = document.getElementById('panel-' + tab);
  if (panel) {
    panel.classList.remove('hidden');
    panel.classList.add('flex');
  }

  closeMenu();
  _onSwitch?.(tab);
}

export function getTabActivo() { return _tabActivo; }

function toggleMenu() { _menuOpen ? closeMenu() : openMenu(); }

function openMenu() {
  _menuOpen = true;
  const wrap = document.getElementById('adminMenuWrap');
  const btn  = document.getElementById('adminMenuBtn');
  wrap?.classList.remove('hidden');
  btn?.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  _menuOpen = false;
  const wrap = document.getElementById('adminMenuWrap');
  const btn  = document.getElementById('adminMenuBtn');
  wrap?.classList.add('hidden');
  btn?.setAttribute('aria-expanded', 'false');
}