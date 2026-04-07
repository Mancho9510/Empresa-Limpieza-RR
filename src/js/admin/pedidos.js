/* ══════════════════════════════════════════
   PEDIDOS — Panel admin
   v3: Archivar/Recuperar + Ocultar completados + Markup/Margen
══════════════════════════════════════════ */
import { adminApi }  from './admin-api.js';
import { showToast } from './admin-toast.js';
import { fmt, badgePago, badgeEnvio } from './helpers.js';
import { WA_NUMBER } from './config.js';
import { getProductos } from './inventario.js';

let pedidos         = [];
let currentEditProducts = [];
let pedidosArchivados = [];
let verArchivados   = false;       // false = lista normal | true = archivados
let ocultarCompletados = false;    // filtra PAGADO+ENTREGADO de la lista
let paginaActual    = 1;
let totalPaginas    = 1;
let totalPedidos    = 0;
let porPagina       = 50;
let _searchTimer    = null;

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

  // Toggle ocultar completados
  document.getElementById('btnOcultarCompletados')?.addEventListener('click', () => {
    ocultarCompletados = !ocultarCompletados;
    const btn = document.getElementById('btnOcultarCompletados');
    btn.classList.toggle('active-toggle', ocultarCompletados);
    btn.title = ocultarCompletados ? 'Mostrando solo en curso' : 'Mostrando todos';
    renderPedidos();
  });

  // Toggle ver archivados
  document.getElementById('btnVerArchivados')?.addEventListener('click', () => {
    verArchivados = !verArchivados;
    const btn = document.getElementById('btnVerArchivados');
    btn.classList.toggle('active-toggle', verArchivados);
    btn.textContent = verArchivados ? '📋 Activos' : '🗄️ Archivados';
    loadPedidos(1);
  });

  // Init Modal Events
  initModalEdicion();
}

export async function loadPedidos(pagina) {
  if (pagina !== undefined) paginaActual = pagina;
  const wrap = document.getElementById('pedidosWrap');
  wrap.innerHTML = '<div class="text-center text-slate-500 py-10 animate-pulse">⏳ Cargando pedidos...</div>';

  try {
    const q    = document.getElementById('filterSearch')?.value.trim() || '';
    const apiFn = verArchivados ? adminApi.getPedidosArchivados : adminApi.getPedidos;
    const data  = await apiFn({ pagina: paginaActual, por: porPagina, q: q || undefined });

    if (verArchivados) {
      pedidosArchivados = data.pedidos || [];
    } else {
      pedidos = data.pedidos || [];
    }

    if (data.paginacion) {
      paginaActual = data.paginacion.pagina;
      totalPaginas = data.paginacion.totalPaginas;
      totalPedidos = data.paginacion.total;
      porPagina    = data.paginacion.porPagina;
    }

    actualizarPaginacion();
    updateStats();
    renderPedidos();

    const lista = verArchivados ? pedidosArchivados : pedidos;
    showToast(`✅ ${lista.length} pedidos ${verArchivados ? 'archivados' : 'cargados'}`);
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
  const lista = verArchivados ? pedidosArchivados : pedidos;
  document.getElementById('sTotPed').textContent    = lista.length;
  document.getElementById('sPend').textContent      = lista.filter(p => p.estado_pago?.toUpperCase() === 'PENDIENTE').length;
  document.getElementById('sCamino').textContent    = lista.filter(p => p.estado_envio === 'En camino').length;
  document.getElementById('sEntregado').textContent = lista.filter(p => p.estado_envio === 'Entregado').length;
  document.getElementById('sTotal').textContent     = fmt(lista.reduce((s, p) => s + (Number(p.total) || 0), 0));
}

export function renderPedidos() {
  const lista = verArchivados ? pedidosArchivados : pedidos;
  const q       = (document.getElementById('filterSearch')?.value || '').toLowerCase();
  const fP      = document.getElementById('filterPago')?.value || '';
  const fE      = document.getElementById('filterEnvio')?.value || '';
  const fDesde  = document.getElementById('filterFechaDesde')?.value || '';
  const fHasta  = document.getElementById('filterFechaHasta')?.value || '';

  const filtrada = lista.filter(p => {
    // Ocultar completados (PAGADO + Entregado)
    if (ocultarCompletados && !verArchivados) {
      const pagado    = (p.estado_pago || '').toUpperCase() === 'PAGADO';
      const entregado = (p.estado_envio || '') === 'Entregado';
      if (pagado && entregado) return false;
    }
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
    filtrada.length !== lista.length ? `${filtrada.length}/${lista.length}` : `${lista.length}`;

  if (!filtrada.length) {
    document.getElementById('pedidosWrap').innerHTML = `
      <div class="text-center text-slate-500 py-16 space-y-3">
        <div class="text-4xl">${verArchivados ? '🗄️' : '📭'}</div>
        <div>${verArchivados ? 'No hay pedidos archivados' : 'Sin resultados'}</div>
        ${ocultarCompletados && !verArchivados ? '<div class="text-xs text-slate-600">Los pedidos completados están ocultos</div>' : ''}
      </div>`;
    return;
  }

  document.getElementById('pedidosWrap').innerHTML = filtrada.map(p => buildCard(p)).join('');
  attachCardEvents();
}

function buildCard(p) {
  const totalStr  = !isNaN(Number(p.total)) ? fmt(Number(p.total)) : (p.total || '');
  const prodLines = String(p.productos||'').split(/\n|\\n/).filter(l=>l.trim())
    .map(l => `<div class="text-xs text-slate-400 py-0.5 border-b border-slate-700/50 last:border-0">▪ ${l.trim()}</div>`).join('');
  const selPago  = ['PENDIENTE','PAGADO','CONTRA ENTREGA','CANCELADO'].map(v =>
    `<option value="${v}" ${(p.estado_pago||'')=== v?'selected':''}>${v}</option>`).join('');
  const selEnvio = ['Recibido','En preparación','En camino','Entregado','Cancelado'].map(v =>
    `<option value="${v}" ${(p.estado_envio||'Recibido')===v?'selected':''}>${v}</option>`).join('');
  const waMsg     = encodeURIComponent(`Hola ${p.nombre||''}, tu pedido de Limpieza RR está: ${p.estado_envio||'Recibido'}`);
  const telLimpio = String(p.telefono||'').replace(/[^0-9]/g,'');

  const esCompletado = (p.estado_pago||'').toUpperCase() === 'PAGADO' && p.estado_envio === 'Entregado';

  // Colores de borde para estados urgentes
  const borderClass = (p.estado_pago||'').toUpperCase() === 'PENDIENTE'
    ? 'border-yellow-600/40 hover:border-yellow-500/60'
    : esCompletado
      ? 'border-green-700/30 hover:border-green-600/40 opacity-75'
      : 'border-slate-700 hover:border-teal-600/50';

  const archivedBadge = p.archivado
    ? '<span class="text-[10px] bg-slate-700 text-slate-400 rounded-full px-2 py-0.5 font-semibold">ARCHIVADO</span>'
    : '';

  const actionBtn = p.archivado
    ? `<button class="btn-recuperar flex items-center gap-1.5 bg-teal-900/40 hover:bg-teal-700/60 border border-teal-700/40 text-teal-300 rounded-lg px-3 py-2 text-xs font-bold transition-all" data-fila="${p.fila}" title="Mover de vuelta a activos">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12l6-6m-6 6l6 6m-6-6h18"/></svg>
        Recuperar
       </button>`
    : `<button class="btn-archivar flex items-center gap-1.5 bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600/40 text-slate-400 hover:text-slate-200 rounded-lg px-3 py-2 text-xs font-bold transition-all" data-fila="${p.fila}" title="Archivar pedido (no se elimina)">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>
        Archivar
       </button>`;

  const btnModificar = !p.archivado
    ? `<button class="btn-modificar-pedido flex items-center gap-1.5 bg-blue-900/40 hover:bg-blue-700/60 border border-blue-700/40 text-blue-300 rounded-lg px-3 py-2 text-xs font-bold transition-all" data-fila="${p.fila}" title="Modificar datos del pedido">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        Modificar
       </button>`
    : '';

  const btnCancelar = !p.archivado
    ? `<button class="btn-cancelar-pedido flex items-center gap-1.5 bg-red-900/40 hover:bg-red-700/60 border border-red-700/40 text-red-300 rounded-lg px-3 py-2 text-xs font-bold transition-all" data-fila="${p.fila}" title="Cancelar pedido">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Cancelar
       </button>`
    : '';

  return `
  <div class="bg-slate-800 border ${borderClass} rounded-2xl overflow-hidden transition-all animate-fade-up" id="card-${p.fila}">
    <button class="card-toggle w-full text-left p-4 flex items-start justify-between gap-3" data-fila="${p.fila}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold text-sm truncate">${p.nombre||'Sin nombre'}</span>
          ${archivedBadge}
        </div>
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
        ${p.nota ? `<div class="col-span-2"><div class="text-xs text-slate-500 font-semibold mb-0.5">NOTA</div><div class="text-xs text-yellow-300">${p.nota}</div></div>` : ''}
      </div>
      <div>
        <div class="text-xs text-slate-500 font-semibold mb-2">PRODUCTOS</div>
        <div class="bg-slate-900/50 rounded-xl p-3">${prodLines||"<div class='text-xs text-slate-500'>Sin detalle</div>"}</div>
      </div>
      <div class="flex justify-between items-center bg-teal-900/20 border border-teal-800/40 rounded-xl px-4 py-3">
        <span class="text-sm text-slate-400 font-semibold">Total a pagar</span>
        <span class="font-display font-bold text-teal-300 text-lg">${totalStr}</span>
      </div>
      ${!p.archivado ? `
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
          <button class="btn-guardar-estado flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-lg px-4 py-2.5 text-xs transition-all" data-fila="${p.fila}">💾 Guardar cambios</button>
          <span class="save-msg-${p.fila} text-xs"></span>
          ${telLimpio ? `<a class="wa-link flex items-center gap-1.5 bg-green-900/40 hover:bg-green-900/60 border border-green-600/40 text-green-400 rounded-lg px-3 py-2.5 text-xs font-semibold transition" href="https://wa.me/57${telLimpio}?text=${waMsg}" target="_blank" rel="noopener noreferrer" data-fila="${p.fila}">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            Avisar
          </a>` : ''}
        </div>
      </div>
      ` : `<div class="bg-slate-900/30 rounded-xl p-3 text-center text-xs text-slate-500">📦 Este pedido está archivado. Recupéralo para editarlo.</div>`}
      <div class="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-700/50">
        ${btnCancelar}
        ${btnModificar}
        ${actionBtn}
      </div>
    </div>
  </div>`;
}

function attachCardEvents() {
  // Toggle cards
  document.querySelectorAll('.card-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleCard(btn.dataset.fila));
  });

  // Actualizar link WA al cambiar estado envío
  document.querySelectorAll('.sel-envio').forEach(sel => {
    sel.addEventListener('change', () => {
      const link = document.querySelector(`.wa-link[data-fila="${sel.dataset.fila}"]`);
      if (link) link.href = `https://wa.me/57${sel.dataset.tel}?text=${encodeURIComponent(`Hola ${decodeURIComponent(sel.dataset.nombre||'')}, tu pedido de Limpieza RR está: ${sel.value}`)}`;
    });
  });

  // Guardar estado
  document.querySelectorAll('.btn-guardar-estado').forEach(btn => {
    btn.addEventListener('click', () => guardarEstado(btn.dataset.fila, btn));
  });

  // Archivar
  document.querySelectorAll('.btn-archivar').forEach(btn => {
    btn.addEventListener('click', () => accionArchivar(btn.dataset.fila, btn));
  });

  // Recuperar
  document.querySelectorAll('.btn-recuperar').forEach(btn => {
    btn.addEventListener('click', () => accionRecuperar(btn.dataset.fila, btn));
  });
  // Cancelar
  document.querySelectorAll('.btn-cancelar-pedido').forEach(btn => {
    btn.addEventListener('click', () => accionCancelar(btn.dataset.fila, btn));
  });

  // Modificar
  document.querySelectorAll('.btn-modificar-pedido').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEdicion(btn.dataset.fila));
  });
}

function abrirModalEdicion(fila) {
  const p = (verArchivados ? pedidosArchivados : pedidos).find(x => x.fila === Number(fila));
  if (!p) return;
  document.getElementById('editPedFila').textContent = p.fila;
  document.getElementById('editPedId').value = p.fila;
  document.getElementById('editPedNombre').value = p.nombre || '';
  document.getElementById('editPedTelefono').value = p.telefono || '';
  document.getElementById('editPedCiudad').value = p.ciudad || '';
  document.getElementById('editPedBarrio').value = p.barrio || '';
  document.getElementById('editPedDireccion').value = p.direccion || '';
  document.getElementById('editPedNota').value = p.nota || '';
  document.getElementById('editPedTotal').value = p.total || 0;
  
  // Parsear productos existentes
  currentEditProducts = [];
  const prodLines = String(p.productos || '').split(/\n|\\n/).filter(l => l.trim());
  prodLines.forEach(line => {
    // Expected format: "2x Producto A - $ 10.000"
    const match = line.match(/^(\d+)x\s+(.+?)(?:\s+-\s+\$\s*([\d.]+))?$/);
    if (match) {
      const qty = parseInt(match[1], 10);
      const name = match[2].trim();
      let price = 0;
      if (match[3]) {
        price = parseFloat(match[3].replace(/\./g, ''));
      }
      currentEditProducts.push({ qty, name, price, totalItem: qty * price });
    } else {
      // Fallback para líneas sin el formato exacto
      currentEditProducts.push({ qty: 1, name: line.trim(), price: 0, totalItem: 0 });
    }
  });

  // Poblar select de inventario
  const selProd = document.getElementById('editPedSelProd');
  const invProds = getProductos();
  selProd.innerHTML = '<option value="">— Seleccionar —</option>' + invProds.map(invP => {
    return `<option value="${invP.nombre}" data-precio="${invP.precio || 0}">${invP.nombre} - $ ${fmt(invP.precio || 0)}</option>`;
  }).join('');
  document.getElementById('editPedSelCant').value = 1;

  renderEditProductList();
  
  document.getElementById('modalEditarPedido').showModal();
}

function renderEditProductList() {
  const container = document.getElementById('editPedProductList');
  if (currentEditProducts.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-500 text-xs py-2 italic">Sin productos agregados</div>';
    return;
  }
  
  container.innerHTML = currentEditProducts.map((prod, index) => `
    <div class="flex items-center justify-between bg-slate-800/80 border border-slate-700/50 rounded-lg p-2">
      <div class="min-w-0 flex-1">
        <div class="text-xs font-bold text-slate-200 truncate">${prod.qty}x ${prod.name}</div>
        <div class="text-[10px] text-teal-400">Total: $ ${fmt(prod.totalItem)}</div>
      </div>
      <button type="button" class="btn-remove-edit-prod text-slate-500 hover:text-red-400 p-1 transition" data-index="${index}">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6v-6M14 11v6v-6"/></svg>
      </button>
    </div>
  `).join('');

  // Attach delete handlers
  container.querySelectorAll('.btn-remove-edit-prod').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      currentEditProducts.splice(idx, 1);
      recalculateModalTotal();
      renderEditProductList();
    });
  });
}

function recalculateModalTotal() {
  const subtotal = currentEditProducts.reduce((sum, item) => sum + item.totalItem, 0);
  document.getElementById('editPedTotal').value = subtotal;
}

function initModalEdicion() {
  const form = document.getElementById('formEditarPedido');
  if (!form) return;

  // Add Product Button Logic
  document.getElementById('btnEditPedAddProd')?.addEventListener('click', () => {
    const selProd = document.getElementById('editPedSelProd');
    const selOpt = selProd.options[selProd.selectedIndex];
    const qty = parseInt(document.getElementById('editPedSelCant').value, 10) || 1;
    
    if (!selOpt || !selOpt.value) {
      showToast('⚠️ Selecciona un producto del inventario');
      return;
    }
    
    const name = selOpt.value;
    const price = parseFloat(selOpt.dataset.precio || 0);
    currentEditProducts.push({ qty, name, price, totalItem: qty * price });
    
    recalculateModalTotal();
    renderEditProductList();
    selProd.value = '';
    document.getElementById('editPedSelCant').value = 1;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarEdicionPedido');
    const fila = document.getElementById('editPedId').value;
    
    // Serializar productos a string
    const stringProductos = currentEditProducts.map(p => {
      if (p.price > 0) return `${p.qty}x ${p.name} - $ ${fmt(p.price)}`;
      return `${p.qty}x ${p.name}`;
    }).join('\\n');

    const datos = {
      nombre: document.getElementById('editPedNombre').value.trim(),
      telefono: document.getElementById('editPedTelefono').value.trim(),
      ciudad: document.getElementById('editPedCiudad').value.trim(),
      barrio: document.getElementById('editPedBarrio').value.trim(),
      direccion: document.getElementById('editPedDireccion').value.trim(),
      nota: document.getElementById('editPedNota').value.trim(),
      productos: stringProductos,
      total: Number(document.getElementById('editPedTotal').value) || 0
    };
    
    btn.disabled = true; btn.textContent = '⏳ Guardando...';
    try {
      const res = await adminApi.modificarPedido({ fila: Number(fila), datos });
      if (res.ok) {
        showToast('✅ Pedido actualizado correctamente');
        document.getElementById('modalEditarPedido').close();
        loadPedidos(); // Recargar datos
      } else {
        throw new Error(res.error || 'Error');
      }
    } catch(err) {
      showToast('❌ Error: ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = '💾 Guardar';
    }
  });
}

function toggleCard(fila) {
  document.querySelectorAll('.card-body').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.card-chev').forEach(el => el.style.transform = '');
  const body = document.querySelector(`.card-body[data-fila="${fila}"]`);
  const chev = document.querySelector(`#card-${fila} .card-chev`);
  if (body && body.classList.contains('hidden')) {
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

async function accionArchivar(fila, btn) {
  if (!confirm('¿Archivar este pedido?\n\nEl pedido no se eliminará y podrás recuperarlo en cualquier momento desde la vista de Archivados.')) return;
  btn.disabled = true; btn.textContent = '⏳';
  try {
    await adminApi.archivarPedido({ fila: Number(fila) });
    // Remover de la lista local y del DOM
    pedidos = pedidos.filter(p => p.fila !== Number(fila));
    document.getElementById(`card-${fila}`)?.animate([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.95)' }
    ], { duration: 250, fill: 'forwards' });
    setTimeout(() => {
      document.getElementById(`card-${fila}`)?.remove();
      updateStats();
    }, 260);
    showToast('🗄️ Pedido archivado — puedes recuperarlo en Archivados');
  } catch (err) {
    showToast('❌ Error al archivar: ' + err.message);
    btn.disabled = false; btn.textContent = 'Archivar';
  }
}

async function accionRecuperar(fila, btn) {
  btn.disabled = true; btn.textContent = '⏳';
  try {
    await adminApi.recuperarPedido({ fila: Number(fila) });
    pedidosArchivados = pedidosArchivados.filter(p => p.fila !== Number(fila));
    document.getElementById(`card-${fila}`)?.animate([
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(40px)' }
    ], { duration: 250, fill: 'forwards' });
    setTimeout(() => {
      document.getElementById(`card-${fila}`)?.remove();
      updateStats();
    }, 260);
    showToast('✅ Pedido recuperado y visible en la lista principal');
  } catch (err) {
    showToast('❌ Error al recuperar: ' + err.message);
    btn.disabled = false; btn.textContent = 'Recuperar';
  }
}

async function accionCancelar(fila, btn) {
  if (!confirm('¿Estás seguro de que deseas cancelar este pedido? Se mercará la orden como CANCELADA.')) return;
  const msg = document.querySelector(`.save-msg-${fila}`);
  btn.disabled = true; btn.textContent = '⏳';
  if (msg) { msg.className = 'text-xs text-yellow-400'; msg.textContent = 'Cancelando...'; }
  try {
    const res = await adminApi.updateEstado({ fila: Number(fila), estado_pago: 'CANCELADO', estado_envio: 'Cancelado' });
    if (res.ok) {
      showToast('🚫 Pedido cancelado correctamente');
      if (msg) { msg.className = 'text-xs text-red-500 font-bold'; msg.textContent = '🚫 Cancelado'; }
      const p = (verArchivados ? pedidosArchivados : pedidos).find(x => x.fila === Number(fila));
      if (p) { p.estado_pago = 'CANCELADO'; p.estado_envio = 'Cancelado'; }
      const selP = document.querySelector(`.sel-pago[data-fila="${fila}"]`);
      const selE = document.querySelector(`.sel-envio[data-fila="${fila}"]`);
      if (selP) selP.value = 'CANCELADO';
      if (selE) selE.value = 'Cancelado';
      updateStats();
    } else throw new Error(res.error||'Error desconocido');
  } catch(err) {
    showToast('❌ Error: ' + err.message);
    if (msg) { msg.className = 'text-xs text-red-400'; msg.textContent = '❌ Error'; }
  }
  btn.disabled = false; btn.textContent = '🚫 Cancelar';
}

function limpiarFiltros() {
  ['filterSearch','filterPago','filterEnvio','filterFechaDesde','filterFechaHasta']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderPedidos();
}

function exportarCSV() {
  const lista = verArchivados ? pedidosArchivados : pedidos;
  if (!lista.length) { showToast('⚠️ Sin pedidos para exportar'); return; }
  const cols = ['fecha','nombre','telefono','barrio','pago','zona_envio','total','estado_pago','estado_envio','productos','archivado'];
  const bom  = '\uFEFF';
  const rows = lista.map(p => cols.map(c => `"${String(p[c]||'').replace(/"/g,"'").replace(/\n|\\n/g,' | ')}"`).join(','));
  const csv  = bom + cols.join(',') + '\n' + rows.join('\n');
  const link = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
    download: `pedidos_LimpiezaRR_${verArchivados?'archivados_':''}${new Date().toISOString().slice(0,10)}.csv`,
  });
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('✅ CSV exportado: ' + lista.length + ' pedidos');
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