/* ══════════════════════════════════════════
   PROVEEDORES — Panel admin
══════════════════════════════════════════ */
import { adminApi }  from './admin-api.js';
import { showToast } from './admin-toast.js';
import { escapeHtml } from './helpers.js';

let proveedores = [];

export function initProveedores() {
  document.getElementById('provSearchAdmin')?.addEventListener('input',  renderProveedoresAdmin);
  document.getElementById('provEstadoAdmin')?.addEventListener('change', renderProveedoresAdmin);
  document.getElementById('btnRefreshProveedores')?.addEventListener('click', () => loadProveedores());
}

export async function loadProveedores(silent = false) {
  const wrap = document.getElementById('proveedoresWrap');
  if (!silent) wrap.innerHTML = '<div class="text-center text-slate-500 py-16 animate-pulse">Cargando proveedores...</div>';
  try {
    const data = await adminApi.getProveedores({ pagina: 1, por: 200 });
    proveedores = data.proveedores || [];
    renderProveedoresAdmin();
    if (!silent) showToast('Proveedores cargados: ' + proveedores.length);
  } catch (err) {
    wrap.innerHTML = `<div class="text-center text-red-400 py-16">${err.message}</div>`;
  }
}

export function renderProveedoresAdmin() {
  const wrap   = document.getElementById('proveedoresWrap');
  const q      = (document.getElementById('provSearchAdmin')?.value || '').toLowerCase();
  const estado = document.getElementById('provEstadoAdmin')?.value || '';

  const lista = proveedores.filter(p => {
    const txt = [p.nombre, p.contacto_nombre, p.telefono, p.productos].join(' ').toLowerCase();
    if (q && !txt.includes(q)) return false;
    if (estado === 'activos'   && !p.activo) return false;
    if (estado === 'inactivos' &&  p.activo) return false;
    return true;
  });

  document.getElementById('pTotalAdmin').textContent   = proveedores.length;
  document.getElementById('pActivosAdmin').textContent = proveedores.filter(p => p.activo).length;
  document.getElementById('pConMovAdmin').textContent  = proveedores.filter(p => Number(p.ventas_relacionadas||0) > 0).length;
  document.getElementById('pSinMovAdmin').textContent  = proveedores.filter(p => Number(p.ventas_relacionadas||0) === 0).length;
  document.getElementById('provCount').textContent     = `${lista.length} de ${proveedores.length}`;

  wrap.innerHTML = lista.length
    ? lista.map(renderProveedorCard).join('')
    : '<div class="text-center text-slate-500 py-16">Sin proveedores para este filtro</div>';
}

function renderProveedorCard(p) {
  const productosList = String(p.productos||'').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  const productosHtml = productosList.length
    ? productosList.map(item => `<span class="text-xs rounded-full px-2.5 py-1 bg-slate-900/70 border border-slate-700/70 text-slate-300">${escapeHtml(item)}</span>`).join('')
    : '<span class="text-xs text-slate-500">Sin productos relacionados</span>';

  const topProds = (p.productos_top||[]).map(item =>
    `<div class="flex items-center justify-between gap-3 text-xs"><span class="text-slate-300 truncate">${escapeHtml(item.nombre||'')}</span><span class="text-teal-300 font-bold flex-shrink-0">${item.unidades||item.veces||0} uds</span></div>`
  ).join('') || '<div class="text-xs text-slate-500">Sin ventas asociadas</div>';

  return `
  <article class="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-4 animate-fade-up">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="font-semibold text-white truncate">${escapeHtml(p.nombre)}</div>
        <div class="text-xs text-slate-400 mt-1">${escapeHtml(p.contacto_nombre||'Sin contacto')}</div>
        <div class="text-xs text-slate-500 mt-1">${escapeHtml(p.telefono||p.email||'Sin contacto')}</div>
      </div>
      <div class="text-right flex-shrink-0">
        <div class="text-sm font-display font-bold text-teal-300">${Number(p.ventas_relacionadas||0)} mov.</div>
        <div class="text-xs text-slate-500">${escapeHtml(p.ultima_venta_relacionada||p.fecha_registro||'Sin fecha')}</div>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <span class="text-xs rounded-full px-2.5 py-1 font-bold ${p.activo ? 'bg-green-900/40 text-green-300 border border-green-600/40' : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'}">${p.activo ? 'Activo' : 'Inactivo'}</span>
      <span class="text-xs rounded-full px-2.5 py-1 font-bold ${Number(p.catalogo_activo||0) > 0 ? 'bg-teal-900/40 text-teal-300 border border-teal-600/40' : 'bg-yellow-900/40 text-yellow-300 border border-yellow-600/40'}">${Number(p.catalogo_activo||0) > 0 ? 'Con movimiento' : 'Sin movimiento'}</span>
    </div>
    <section class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
      <div class="text-xs text-slate-500 font-semibold mb-2">Portafolio</div>
      <div class="flex flex-wrap gap-2">${productosHtml}</div>
    </section>
    <section class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
      <div class="text-xs text-slate-500 font-semibold mb-2">Productos con más movimiento</div>
      ${topProds}
    </section>
  </article>`;
}