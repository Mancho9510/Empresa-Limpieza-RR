/* ══════════════════════════════════════════
   PEDIDOS — Panel admin
══════════════════════════════════════════ */
import { adminApi }  from './admin-api.js';
import { showToast } from './admin-toast.js';
import { fmt, badgePago, badgeEnvio } from './helpers.js';
import { WA_NUMBER } from './config.js';

let pedidos      = [];
let paginaActual = 1;
let totalPaginas = 1;
let totalPedidos = 0;
let porPagina    = 50;
let _searchTimer = null;

export function initPedidos() {
  document.getElementById('filterSearch')?.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => loadPedidos(1), 500);
  });
  document.getElementById('filterPago')?.addEventListener('change',  () => renderPedidos());
  document.getElementById('filterEnvio')?.addEventListener('change', () => renderPedidos());
  document.getElementById('filterFechaDesde')?.addEventListener('change', () => renderPedidos());
  document.getElementById('filterFechaHasta')?.addEventListener('change', () => renderPedidos());
  document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);
  document.getElementById('btnExportarCSV')?.addEventListener('click',    exportarCSV);
  document.getElementById('btnPagAnterior')?.addEventListener('click',  () => cambiarPagina(-1));
  document.getElementById('btnPagSiguiente')?.addEventListener('click', () => cambiarPagina(1));
}

export async function loadPedidos(pagina) {
  if (pagina !== undefined) paginaActual = pagina;
  const wrap = document.getElementById('pedidosWrap');
  wrap.innerHTML = '<div class="text-center text-slate-500 py-10 animate-pulse">⏳ Cargando pedidos...</div>';
  try {
    const q   = document.getElementById('filterSearch')?.value.trim() || '';
    const data = await adminApi.getPedidos({ pagina: paginaActual, por: porPagina, q: q || undefined });
    pedidos = data.pedidos || [];
    if (data.paginacion) {
      paginaActual  = data.paginacion.pagina;
      totalPaginas  = data.paginacion.totalPaginas;
      totalPedidos  = data.paginacion.total;
      porPagina     = data.paginacion.porPagina;
    }
    actualizarPaginacion();
    updateStats();
    renderPedidos();
    showToast('✅ ' + pedidos.length + ' pedidos cargados');
  } catch (err) {
    wrap.innerHTML = `
      <div class="text-center py-16 space-y-2">
        <div class="text-4xl">⚠️</div>
        <div class="text-red-400 font-semibold">${err.message}</div>
        <button id="btnRetryPedidos" class="mt-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition">🔄 Reintentar</button>
      </div>`;
    document.getElementById('btnRetryPedidos')?.addEventListener('click', () => loadPedidos());
  }
}

function updateStats() {
  document.getElementById('sTotPed').textContent    = pedidos.length;
  document.getElementById('sPend').textContent      = pedidos.filter(p => p.estado_pago?.toUpperCase() === 'PENDIENTE').length;
  document.getElementById('sCamino').textContent    = pedidos.filter(p => p.estado_envio === 'En camino').length;
  document.getElementById('sEntregado').textContent = pedidos.filter(p => p.estado_envio === 'Entregado').length;
  document.getElementById('sTotal').textContent     = fmt(pedidos.reduce((s, p) => s + (Number(p.total) || 0), 0));
}

export function renderPedidos() {
  const q      = (document.getElementById('filterSearch')?.value || '').toLowerCase();
  const fP     = document.getElementById('filterPago')?.value || '';
  const fE     = document.getElementById('filterEnvio')?.value || '';
  const fDesde = document.getElementById('filterFechaDesde')?.value || '';
  const fHasta = document.getElementById('filterFechaHasta')?.value || '';

  const lista = pedidos.filter(p => {
    if (q && ![(p.nombre||''),(String(p.telefono||'')),(p.barrio||'')].join(' ').toLowerCase().includes(q)) return false;
    if (fP && (p.estado_pago||'').toUpperCase() !== fP) return false;
    if (fE && (p.estado_envio||'') !== fE) return false;
    if (fDesde || fHasta) {
      try {
        const fp = new Date(String(p.fecha||''));
        if (!isNaN(fp.getTime())) {
          if (fDesde && fp < new Date(fDesde)) return false;
          if (fHasta && fp > new Date(fHasta + 'T23:59:59')) return false;
        }
      } catch {}
    }
    return true;
  });

  document.getElementById('filterCount').textContent =
    lista.length !== pedidos.length ? `${lista.length}/${pedidos.length}` : `${pedidos.length}`;

  if (!lista.length) {
    document.getElementById('pedidosWrap').innerHTML = '<div class="text-center text-slate-500 py-16">📭 Sin resultados</div>';
    return;
  }

  document.getElementById('pedidosWrap').innerHTML = lista.map(p => {
    const totalStr  = !isNaN(Number(p.total)) ? fmt(Number(p.total)) : (p.total || '');
    const prodLines = String(p.productos||'').split(/\n|\\n/).filter(l=>l.trim())
      .map(l => `<div class="text-xs text-slate-400 py-0.5 border-b border-slate-700/50 last:border-0">▪ ${l.trim()}</div>`).join('');
    const selPago  = ['PENDIENTE','PAGADO','CONTRA ENTREGA'].map(v =>
      `<option value="${v}" ${(p.estado_pago||'')===v?'selected':''}>${v}</option>`).join('');
    const selEnvio = ['Recibido','En preparación','En camino','Entregado'].map(v =>
      `<option value="${v}" ${(p.estado_envio||'Recibido')===v?'selected':''}>${v}</option>`).join('');
    const waMsg = encodeURIComponent(`Hola ${p.nombre||''}, tu pedido de Limpieza RR está: ${p.estado_envio||'Recibido'}`);
    const telLimpio = String(p.telefono||'').replace(/[^0-9]/g,'');

    return `
    <div class="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-teal-600/50 transition-all animate-fade-up" id="card-${p.fila}">
      <button class="card-toggle w-full text-left p-4 flex items-start justify-between gap-3" data-fila="${p.fila}">
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">${p.nombre||'Sin nombre'}</div>
          <div class="text-xs text-slate-400 mt-0.5 truncate">${String(p.telefono||'')} · ${p.barrio||''}</div>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span class="text-xs rounded-full px-2.5 py-0.5 font-bold ${badgePago(p.estado_pago)}">${p.estado_pago||'Pendiente'}</span>
            <span class="text-xs rounded-full px-2.5 py-0.5 font-bold ${badgeEnvio(p.estado_envio)}">${p.estado_envio||'Recibido'}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2 flex-shrink-0">
          <span class="font-display font-bold text-teal-300 text-sm">${totalStr}</span>
          <svg class="card-chev w-4 h-4 text-slate-500 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </button>
      <div class="card-body hidden border-t border-slate-700 p-4 space-y-4 animate-fade-up" data-fila="${p.fila}">
        <div class="grid grid-cols-2 gap-3">
          <div><div class="text-xs text-slate-500 font-semibold mb-0.5">FECHA</div><div class="text-xs">${p.fecha||''}</div></div>
          <div><div class="text-xs text-slate-500 font-semibold mb-0.5">PAGO</div><div class="text-xs">${p.pago||''}</div></div>
          <div class="col-span-2"><div class="text-xs text-slate-500 font-semibold mb-0.5">DIRECCIÓN</div><div class="text-xs">${p.barrio||''}, ${p.direccion||''} ${p.casa?'· '+p.casa:''}</div></div>
        </div>
        <div>
          <div class="text-xs text-slate-500 font-semibold mb-2">PRODUCTOS</div>
          <div class="bg-slate-900/50 rounded-xl p-3">${prodLines||"<div class='text-xs text-slate-500'>Sin detalle</div>"}</div>
        </div>
        <div class="flex justify-between items-center bg-teal-900/20 border border-teal-800/40 rounded-xl px-4 py-3">
          <span class="text-sm text-slate-400 font-semibold">Total a pagar</span>
          <span class="font-display font-bold text-teal-300 text-lg">${totalStr}</span>
        </div>
        <div class="bg-slate-900/40 rounded-xl p-4 space-y-3">
          <div class="text-xs text-slate-400 font-bold tracking-wide">ACTUALIZAR ESTADO</div>
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex-1">
              <label class="text-xs text-slate-500 mb-1 block">💳 Estado de pago</label>
              <select class="sel-pago w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition" data-fila="${p.fila}">${selPago}</select>
            </div>
            <div class="flex-1">
              <label class="text-xs text-slate-500 mb-1 block">🚚 Estado de envío</label>
              <select class="sel-envio w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition" data-fila="${p.fila}" data-nombre="${encodeURIComponent(p.nombre||'')}" data-tel="${telLimpio}">${selEnvio}</select>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 items-center">
            <button class="btn-guardar-estado flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-lg px-4 py-2.5 text-sm transition-all" data-fila="${p.fila}">💾 Guardar cambios</button>
            <span class="save-msg-${p.fila} text-xs"></span>
            ${telLimpio ? `<a class="wa-link flex items-center gap-1.5 bg-green-900/40 hover:bg-green-900/60 border border-green-600/40 text-green-400 rounded-lg px-3 py-2.5 text-sm font-semibold transition" href="https://wa.me/57${telLimpio}?text=${waMsg}" target="_blank" rel="noopener noreferrer" data-fila="${p.fila}">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Avisar cliente
            </a>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Eventos: toggle cards
  document.querySelectorAll('.card-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleCard(btn.dataset.fila));
  });

  // Eventos: actualizar link WA al cambiar estado envío
  document.querySelectorAll('.sel-envio').forEach(sel => {
    sel.addEventListener('change', () => {
      const fila   = sel.dataset.fila;
      const nombre = decodeURIComponent(sel.dataset.nombre || '');
      const tel    = sel.dataset.tel;
      const link   = document.querySelector(`.wa-link[data-fila="${fila}"]`);
      if (link) link.href = `https://wa.me/57${tel}?text=${encodeURIComponent(`Hola ${nombre}, tu pedido de Limpieza RR está: ${sel.value}`)}`;
    });
  });

  // Eventos: guardar estado
  document.querySelectorAll('.btn-guardar-estado').forEach(btn => {
    btn.addEventListener('click', () => guardarEstado(btn.dataset.fila, btn));
  });
}

function toggleCard(fila) {
  document.querySelectorAll('.card-body').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.card-chev').forEach(el => el.style.transform = '');
  const body = document.querySelector(`.card-body[data-fila="${fila}"]`);
  const chev = document.querySelector(`#card-${fila} .card-chev`);
  const open = !body.classList.contains('hidden');
  if (!open) {
    body.classList.remove('hidden');
    if (chev) chev.style.transform = 'rotate(180deg)';
  }
}

async function guardarEstado(fila, btn) {
  const selP = document.querySelector(`.sel-pago[data-fila="${fila}"]`);
  const selE = document.querySelector(`.sel-envio[data-fila="${fila}"]`);
  const msg  = document.querySelector(`.save-msg-${fila}`);
  if (!selP || !selE) return;
  btn.disabled = true; btn.textContent = '⏳ Guardando...';
  try {
    await adminApi.updateEstado({ fila: Number(fila), estado_pago: selP.value, estado_envio: selE.value });
    if (msg) { msg.className = 'text-xs text-green-400'; msg.textContent = '✅ Guardado'; }
    const p = pedidos.find(x => x.fila === Number(fila));
    if (p) { p.estado_pago = selP.value; p.estado_envio = selE.value; }
    updateStats();
    showToast('✅ Estado actualizado');
    setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
  } catch {
    if (msg) { msg.className = 'text-xs text-red-400'; msg.textContent = '❌ Error'; }
  }
  btn.disabled = false; btn.textContent = '💾 Guardar cambios';
}

function limpiarFiltros() {
  ['filterSearch','filterPago','filterEnvio','filterFechaDesde','filterFechaHasta']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderPedidos();
}

function exportarCSV() {
  if (!pedidos.length) { showToast('⚠️ Sin pedidos para exportar'); return; }
  const cols = ['fecha','nombre','telefono','barrio','pago','zona_envio','total','estado_pago','estado_envio','productos'];
  const bom  = '\uFEFF';
  const rows = pedidos.map(p => cols.map(c => `"${String(p[c]||'').replace(/"/g,"'").replace(/\n|\\n/g,' | ')}"`).join(','));
  const csv  = bom + cols.join(',') + '\n' + rows.join('\n');
  const link = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
    download: `pedidos_LimpiezaRR_${new Date().toISOString().slice(0,10)}.csv`,
  });
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('✅ CSV exportado: ' + pedidos.length + ' pedidos');
}

function actualizarPaginacion() {
  const wrap = document.getElementById('paginacionWrap');
  if (!wrap) return;
  if (totalPaginas <= 1) { wrap.classList.add('hidden'); wrap.classList.remove('flex'); return; }
  wrap.classList.remove('hidden'); wrap.classList.add('flex');
  document.getElementById('paginaInfo').textContent  = `Pág ${paginaActual} de ${totalPaginas}`;
  document.getElementById('totalInfo').textContent   = `${totalPedidos} pedidos en total`;
  document.getElementById('btnPagAnterior').disabled = paginaActual <= 1;
  document.getElementById('btnPagSiguiente').disabled= paginaActual >= totalPaginas;
}

function cambiarPagina(delta) {
  const nueva = paginaActual + delta;
  if (nueva < 1 || nueva > totalPaginas) return;
  loadPedidos(nueva);
  document.getElementById('pedidosWrap')?.scrollTo({ top: 0, behavior: 'smooth' });
}