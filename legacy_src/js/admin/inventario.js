/* ══════════════════════════════════════════
   INVENTARIO — Panel admin
══════════════════════════════════════════ */
import { adminApi }  from './admin-api.js';
import { showToast } from './admin-toast.js';
import { fmt, getStockStatus, stockPillClass, escapeHtml } from './helpers.js';

let productos = [];

export function initInventario() {
  document.getElementById('invSearch')?.addEventListener('input',   renderInventario);
  document.getElementById('invCat')?.addEventListener('change',     renderInventario);
  document.getElementById('invEstStock')?.addEventListener('change', renderInventario);
}

export async function loadProductos() {
  document.getElementById('invList').innerHTML =
    '<tr><td colspan="7" class="text-center text-slate-500 py-16 animate-pulse">⏳ Cargando...</td></tr>';
  try {
    const data = await adminApi.getProductos();
    productos = data.productos || [];
    updateStatsInv();
    poblarCatFilter();
    renderInventario();
  } catch (err) {
    document.getElementById('invList').innerHTML =
      `<tr><td colspan="7" class="text-center text-red-400 py-16">⚠️ ${err.message}</td></tr>`;
  }
}

export function getProductos() { return productos; }

function updateStatsInv() {
  document.getElementById('invTotal').textContent      = productos.length;
  document.getElementById('invAgotados').textContent   = productos.filter(p => getStockStatus(p) === 'agotado').length;
  document.getElementById('invBajos').textContent      = productos.filter(p => getStockStatus(p) === 'bajo').length;
  document.getElementById('invSinControl').textContent = productos.filter(p => getStockStatus(p) === 'sin').length;

  const alertas = productos.filter(p => ['agotado','bajo'].includes(getStockStatus(p)));
  const banner  = document.getElementById('alertaBanner');
  if (alertas.length > 0) {
    banner.classList.remove('hidden');
    document.getElementById('alertaItems').innerHTML = alertas.map(p =>
      `<div>${getStockStatus(p)==='agotado'?'🔴 AGOTADO':'🟡 BAJO'}: ${escapeHtml(p.nombre)} ${escapeHtml(p.tamano)} — Stock: ${p.stock}</div>`
    ).join('');
  } else {
    banner.classList.add('hidden');
  }
}

function poblarCatFilter() {
  const cats = [...new Set(productos.map(p => String(p.categoria||'')))].sort();
  const sel  = document.getElementById('invCat');
  sel.innerHTML = '<option value="">Todas las cats.</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

export function renderInventario() {
  const q   = (document.getElementById('invSearch')?.value||'').toLowerCase();
  const cat = document.getElementById('invCat')?.value || '';
  const est = document.getElementById('invEstStock')?.value || '';

  const lista = productos.filter(p => {
    if (q   && !(p.nombre+' '+p.tamano).toLowerCase().includes(q)) return false;
    if (cat && String(p.categoria||'') !== cat) return false;
    if (est && getStockStatus(p) !== est) return false;
    return true;
  });

  document.getElementById('invCount').textContent =
    lista.length !== productos.length
      ? `${lista.length} de ${productos.length}`
      : `${productos.length} productos`;

  const tbody = document.getElementById('invList');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500 py-16">📭 Sin productos</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map((p, idx) => {
    const st       = getStockStatus(p);
    const pillCls  = stockPillClass(st);
    const stockVal = (p.stock !== '' && p.stock !== null && p.stock !== undefined) ? p.stock : '—';
    const precioV  = p.precio > 0 ? fmt(p.precio) : '—';
    const costoV   = p.costo  > 0 ? fmt(p.costo)  : '—';
    const ganPct   = p.ganancia_calc != null ? Number(p.ganancia_calc) : null;
    const ganPesos = p.ganancia_pesos != null ? Number(p.ganancia_pesos) : null;
    const ganColor = ganPct === null ? 'text-slate-400'
      : ganPct >= 30 ? 'text-green-300' : ganPct >= 10 ? 'text-yellow-300' : 'text-red-300';
    const ganBg    = ganPct === null ? 'bg-slate-700/40'
      : ganPct >= 30 ? 'bg-green-900/40' : ganPct >= 10 ? 'bg-yellow-900/40' : 'bg-red-900/40';
    const rowBg    = idx % 2 === 0 ? '' : 'bg-slate-800/40';
    const imgSrc   = p.imagen || '';

    return `
    <tr class="${rowBg} hover:bg-teal-900/10 border-b border-slate-800 transition" data-fila="${p.fila}">
      <td class="py-3 px-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-teal-900/40 items-center justify-center hidden sm:flex">
            ${imgSrc
              ? `<img src="${imgSrc}" alt="${escapeHtml(p.nombre)}" class="w-full h-full object-cover"
                     onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'text-xl\\'>${p.emoji||'🧴'}</span>'">`
              : `<span class="text-xl">${p.emoji||'🧴'}</span>`}
          </div>
          <div class="min-w-0">
            <div class="font-semibold text-sm text-white">${escapeHtml(p.nombre)}</div>
            <div class="text-xs text-slate-400">${escapeHtml(p.tamano)}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-3 hidden sm:table-cell">
        <span class="text-xs bg-slate-700 text-slate-300 rounded-full px-2.5 py-1">${escapeHtml(p.categoria)}</span>
      </td>
      <td class="py-3 px-3 text-right hidden md:table-cell">
        <span class="text-sm font-semibold text-teal-300">${precioV}</span>
      </td>
      <td class="py-3 px-3 text-right hidden lg:table-cell">
        <span class="text-sm text-slate-300">${costoV}</span>
      </td>
      <td class="py-3 px-3 text-center hidden lg:table-cell">
        ${ganPct !== null
          ? `<div>
               <span class="text-xs font-bold rounded-full px-2.5 py-1 ${ganBg} ${ganColor}">${(Number.isFinite(ganPct)?ganPct:0).toFixed(1)}%</span>
               <div class="text-xs text-slate-500 mt-0.5">${ganPesos !== null ? fmt(ganPesos) : ''} / ud</div>
             </div>`
          : `<span class="text-xs text-slate-600">Sin costo</span>`}
      </td>
      <td class="py-3 px-3 text-center">
        <span class="text-xs rounded-full px-3 py-1 font-bold ${pillCls}">${stockVal}</span>
      </td>
      <td class="py-3 px-3">
        <div class="flex items-center justify-center gap-2">
          <input type="number" min="0"
                 placeholder="${stockVal !== '—' ? stockVal : 'vacío'}"
                 aria-label="Nuevo stock para ${escapeHtml(p.nombre)}"
                 class="stock-input w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white text-center outline-none focus:border-teal-500 transition"
                 data-fila="${p.fila}">
          <button class="btn-save-stock bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-lg px-3 py-2 transition-all"
                  data-fila="${p.fila}">Stock</button>
        </div>
        <div class="flex items-center gap-1 mt-1.5">
          <input type="number" min="0"
                 placeholder="${p.costo > 0 ? p.costo : 'costo'}"
                 aria-label="Costo para ${escapeHtml(p.nombre)}"
                 class="costo-input w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-yellow-500 transition"
                 data-fila="${p.fila}">
          <button class="btn-save-costo bg-yellow-600 hover:bg-yellow-700 active:scale-95 text-white text-xs font-bold rounded-lg px-2 py-1.5 transition-all"
                  data-fila="${p.fila}">Costo</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Delegar eventos en tbody (sobrevive a re-renders)
  tbody.addEventListener('click', handleTbodyClick, { once: true });
  tbody.addEventListener('keydown', handleTbodyKeydown, { once: true });
}

function handleTbodyClick(e) {
  // Re-registrar para el siguiente click
  document.getElementById('invList')?.addEventListener('click', handleTbodyClick, { once: true });

  const btnStock = e.target.closest('.btn-save-stock');
  const btnCosto = e.target.closest('.btn-save-costo');
  if (btnStock) guardarStock(btnStock.dataset.fila);
  if (btnCosto) guardarCosto(btnCosto.dataset.fila);
}

function handleTbodyKeydown(e) {
  document.getElementById('invList')?.addEventListener('keydown', handleTbodyKeydown, { once: true });
  if (e.key !== 'Enter') return;
  const stockInp = e.target.closest('.stock-input');
  const costoInp = e.target.closest('.costo-input');
  if (stockInp) guardarStock(stockInp.dataset.fila);
  if (costoInp) guardarCosto(costoInp.dataset.fila);
}

async function guardarStock(fila) {
  const inp = document.querySelector(`.stock-input[data-fila="${fila}"]`);
  const btn = document.querySelector(`.btn-save-stock[data-fila="${fila}"]`);
  if (!inp) return;

  const val      = inp.value.trim();
  const nuevoStock = val === '' ? '' : Number(val);

  // Actualizar datos locales ANTES de re-renderizar
  const p = productos.find(x => String(x.fila) === String(fila));
  if (p) p.stock = nuevoStock;

  // Re-renderizar (destruye el btn del DOM)
  updateStatsInv();
  renderInventario();
  showToast('💾 Guardando stock...');

  try {
    await adminApi.updateStock({ fila: Number(fila), stock: nuevoStock });
    showToast('✅ Stock guardado en Sheets');
  } catch {
    showToast('⚠️ Sin confirmación — verifica en Sheets');
  }
}

async function guardarCosto(fila) {
  const inp = document.querySelector(`.costo-input[data-fila="${fila}"]`);
  if (!inp) return;

  const val = inp.value.trim();
  if (!val || isNaN(Number(val)) || Number(val) < 0) {
    showToast('⚠️ Ingresa un costo válido');
    return;
  }

  const nuevoCosto = Number(val);

  // Actualizar datos locales ANTES de re-renderizar
  const p = productos.find(x => String(x.fila) === String(fila));
  if (p) {
    p.costo = nuevoCosto;
    if (p.precio > 0) {
      p.ganancia_calc  = Math.round(((p.precio - nuevoCosto) / nuevoCosto) * 1000) / 10;
      p.ganancia_pesos = p.precio - nuevoCosto;
    }
  }

  // Re-renderizar (destruye el btn del DOM)
  updateStatsInv();
  renderInventario();
  showToast('💾 Guardando costo...');

  try {
    const res = await adminApi.updateCosto({ fila: Number(fila), costo: nuevoCosto });
    showToast('✅ Costo guardado en Sheets');

    // El backend devuelve ganancia_pct y ganancia_pesos recalculados
    // Notificar a rentabilidad con los valores reales del servidor
    const ganReal  = res?.ganancia_pct   ?? (p?.precio > 0 ? Math.round(((p.precio - nuevoCosto) / nuevoCosto) * 1000) / 10 : null);
    const pesosReal= res?.ganancia_pesos ?? (p?.precio > 0 ? p.precio - nuevoCosto : null);
    window.dispatchEvent(new CustomEvent('costo-actualizado', {
      detail: {
        fila:          Number(fila),
        nombre:        p?.nombre,
        tamano:        p?.tamano,
        costo:         nuevoCosto,
        precio:        res?.precio ?? p?.precio ?? 0,
        ganancia_pct:  ganReal,
        ganancia_pesos: pesosReal,
      }
    }));
  } catch {
    showToast('⚠️ Sin confirmación — verifica en Sheets');
    // Notificar igual con los valores calculados localmente
    const ganLocal   = p?.precio > 0 ? Math.round(((p.precio - nuevoCosto) / nuevoCosto) * 1000) / 10 : null;
    const pesosLocal = p?.precio > 0 ? p.precio - nuevoCosto : null;
    window.dispatchEvent(new CustomEvent('costo-actualizado', {
      detail: {
        fila:          Number(fila),
        nombre:        p?.nombre,
        tamano:        p?.tamano,
        costo:         nuevoCosto,
        precio:        p?.precio ?? 0,
        ganancia_pct:  ganLocal,
        ganancia_pesos: pesosLocal,
      }
    }));
  }
}