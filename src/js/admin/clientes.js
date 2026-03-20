/* ══════════════════════════════════════════
   CLIENTES — Panel admin
══════════════════════════════════════════ */
import { adminApi }  from './admin-api.js';
import { showToast } from './admin-toast.js';
import { fmt, escapeHtml } from './helpers.js';

let clientes = [];

export function initClientes() {
  document.getElementById('cliSearchAdmin')?.addEventListener('input',  renderClientesAdmin);
  document.getElementById('cliTipoAdmin')?.addEventListener('change',   renderClientesAdmin);
  document.getElementById('btnRefreshClientes')?.addEventListener('click', () => loadClientes());
}

export async function loadClientes(silent = false) {
  const wrap = document.getElementById('clientesWrap');
  if (!silent) wrap.innerHTML = '<div class="text-center text-slate-500 py-16 animate-pulse">Cargando clientes...</div>';
  try {
    const data = await adminApi.getClientes({ pagina: 1, por: 500 });
    clientes = data.clientes || [];
    renderClientesAdmin();
    if (!silent) showToast('Clientes cargados: ' + clientes.length);
  } catch (err) {
    wrap.innerHTML = `<div class="text-center text-red-400 py-16">${err.message}</div>`;
  }
}

export function renderClientesAdmin() {
  const wrap = document.getElementById('clientesWrap');
  const q    = (document.getElementById('cliSearchAdmin')?.value || '').toLowerCase();
  const tipo = (document.getElementById('cliTipoAdmin')?.value    || '').toLowerCase();

  const lista = clientes.filter(c => {
    const txt = [c.nombre, c.telefono, c.ciudad, c.barrio, c.segmento_retencion].join(' ').toLowerCase();
    if (q    && !txt.includes(q)) return false;
    if (tipo && String(c.tipo||'').toLowerCase() !== tipo) return false;
    return true;
  });

  // KPIs
  document.getElementById('cTotalAdmin').textContent    = clientes.length;
  document.getElementById('cVipAdmin').textContent      = clientes.filter(c => String(c.tipo||'').toLowerCase().includes('vip')).length;
  document.getElementById('cRecAdmin').textContent      = clientes.filter(c => String(c.tipo||'').toLowerCase().includes('recurrente')).length;
  document.getElementById('cDormidosAdmin').textContent = clientes.filter(c => String(c.segmento_retencion||'').toLowerCase().includes('dormid')).length;
  document.getElementById('cliCount').textContent       = `${lista.length} de ${clientes.length}`;

  wrap.innerHTML = lista.length
    ? lista.map(renderClienteCard).join('')
    : '<div class="text-center text-slate-500 py-16">Sin clientes para este filtro</div>';
}

function typeBadge(tipo) {
  const t = String(tipo||'').toLowerCase();
  if (t.includes('vip'))        return 'bg-yellow-900/50 text-yellow-300 border border-yellow-600/40';
  if (t.includes('recurrente')) return 'bg-green-900/50 text-green-300 border border-green-600/40';
  return 'bg-blue-900/50 text-blue-300 border border-blue-600/40';
}

function segBadge(seg) {
  const s = String(seg||'').toLowerCase();
  if (s.includes('activo'))    return 'bg-teal-900/40 text-teal-300 border border-teal-600/40';
  if (s.includes('riesgo'))    return 'bg-yellow-900/40 text-yellow-300 border border-yellow-600/40';
  if (s.includes('dormido'))   return 'bg-red-900/40 text-red-300 border border-red-600/40';
  return 'bg-slate-700/50 text-slate-300 border border-slate-600/40';
}

function renderClienteCard(c) {
  const ubicacion  = [c.ciudad, c.barrio].filter(Boolean).join(' — ') || 'Sin ubicación';
  const topProds   = (c.top_productos||[]).map(p =>
    `<div class="flex items-center justify-between gap-3 text-xs"><span class="text-slate-300 truncate">${escapeHtml(p.nombre||p.producto||'')}</span><span class="text-teal-300 font-bold flex-shrink-0">${p.veces||p.cant||0}x</span></div>`
  ).join('') || '<div class="text-xs text-slate-500">Sin productos frecuentes</div>';

  const ultPedidos = (c.ultimos_pedidos||[]).map(p =>
    `<div class="rounded-lg bg-slate-900/60 border border-slate-700/60 px-3 py-2">
      <div class="flex items-center justify-between gap-3 text-xs"><span class="text-slate-400">${escapeHtml(p.fecha||'')}</span><span class="text-teal-300 font-bold">${fmt(p.total||0)}</span></div>
      <div class="text-xs text-slate-300 mt-1">${escapeHtml(p.productos||p.productos_resumen||'')}</div>
    </div>`
  ).join('') || '<div class="text-xs text-slate-500">Sin compras recientes</div>';

  return `
  <article class="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-4 animate-fade-up">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="font-semibold text-white truncate">${escapeHtml(c.nombre)}</div>
        <div class="text-xs text-slate-400 mt-1">${escapeHtml(c.telefono||'Sin teléfono')}</div>
        <div class="text-xs text-slate-500 mt-1">${escapeHtml(ubicacion)}</div>
      </div>
      <div class="text-right flex-shrink-0">
        <div class="text-sm font-display font-bold text-teal-300">${fmt(c.total_gastado||0)}</div>
        <div class="text-xs text-slate-500">${c.total_pedidos||0} pedidos</div>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <span class="text-xs rounded-full px-2.5 py-1 font-bold ${typeBadge(c.tipo)}">${escapeHtml(c.tipo||'Sin tipo')}</span>
      <span class="text-xs rounded-full px-2.5 py-1 font-bold ${segBadge(c.segmento_retencion)}">${escapeHtml(c.segmento_retencion||'Sin estado')}</span>
      <span class="text-xs rounded-full px-2.5 py-1 font-bold bg-slate-700/60 text-slate-200 border border-slate-600/40">${escapeHtml(c.frecuencia||'—')}</span>
    </div>
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3"><div class="text-slate-500 mb-1">Última compra</div><div class="text-white">${escapeHtml(c.ultima_compra||'Sin fecha')}</div></div>
      <div class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3"><div class="text-slate-500 mb-1">Días sin comprar</div><div class="text-white">${c.dias_sin_compra != null ? c.dias_sin_compra+' días' : '—'}</div></div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <section class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3"><div class="text-xs text-slate-500 font-semibold mb-2">Productos más frecuentes</div>${topProds}</section>
      <section class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3"><div class="text-xs text-slate-500 font-semibold mb-2">Últimos pedidos</div>${ultPedidos}</section>
    </div>
  </article>`;
}