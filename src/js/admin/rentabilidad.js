/* ══════════════════════════════════════════
   RENTABILIDAD v2 — Panel admin ERP
   Nuevos KPIs: margenGlobal, ROI, masVendidos,
   ganancia por categoría, acumulados históricos por producto
══════════════════════════════════════════ */
import { adminApi }  from './admin-api.js';
import { showToast } from './admin-toast.js';
import { fmt, escapeHtml } from './helpers.js';

let rentData  = null;
let rentTodos = [];
let _calcFilaActual = null;

export function initRentabilidad() {
  document.getElementById('btnRentRefresh')?.addEventListener('click', () => loadRentabilidad(true));
  document.getElementById('rentSearch')?.addEventListener('input', filtrarRentabilidad);
  document.getElementById('calcProd')?.addEventListener('change', onCalcProdChange);
  document.getElementById('calcCosto')?.addEventListener('input',  calcularPrecio);
  document.getElementById('calcMargen')?.addEventListener('input', calcularPrecio);
  document.getElementById('calcMargenGlobal')?.addEventListener('input', calcularPreviewMasivo);
  document.getElementById('btnPreviewMasivo')?.addEventListener('click', calcularPreviewMasivo);
  document.getElementById('btnAplicarPrecio')?.addEventListener('click', aplicarPrecioSugerido);
  document.getElementById('btnCopiarPrecio')?.addEventListener('click', copiarPrecio);

  const tbody = document.getElementById('rentTabla');
  if (tbody) {
    tbody.addEventListener('keydown', handleRentKeydown);
    tbody.addEventListener('click',   handleRentClick);
  }

  window.addEventListener('costo-actualizado', (e) => {
    const { fila, costo, precio, ganancia_pct, ganancia_pesos } = e.detail;
    const p = rentTodos.find(x => x.fila === fila);
    if (p) {
      p.costo          = costo;
      p.precio         = precio || p.precio;
      p.ganancia_pct   = ganancia_pct;
      p.ganancia_pesos = ganancia_pesos;
      _actualizarFilaDOM(fila, p);
      poblarCalcProductos();
    }
  });
}

export function hasRentData() { return !!rentData; }

export async function loadRentabilidad(forceRefresh = false) {
  const loading = document.getElementById('rentLoading');
  const content = document.getElementById('rentContent');
  loading.classList.remove('hidden');
  loading.classList.add('animate-pulse');
  content.classList.add('hidden');
  try {
    const data = await adminApi.getRentabilidad(forceRefresh);
    rentData  = data;
    rentTodos = data.todos || [];
    renderRentabilidad(data);
    loading.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (err) {
    loading.textContent = '⚠️ ' + err.message;
    loading.classList.remove('animate-pulse');
  }
}

/* ── Filtro de búsqueda ──────────────────────────────────── */
function filtrarRentabilidad() {
  const q = (document.getElementById('rentSearch')?.value || '').toLowerCase();
  renderTablaRent(q
    ? rentTodos.filter(p => (p.nombre+' '+p.tamano+' '+p.categoria).toLowerCase().includes(q))
    : rentTodos);
}

/* ══════════════════════════════════════════
   TABLA CON EDICIÓN INLINE
   Columnas: Producto | Precio | Costo | Margen | Gan/ud | % | Vendidos | Gan.Total | Guardar
══════════════════════════════════════════ */
function renderTablaRent(lista) {
  const tbody = document.getElementById('rentTabla');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-slate-500 py-8">Sin resultados</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map((p, i) => {
    // Markup = (P-C)/C × 100  — lo que ganas sobre tu inversión
    const markup   = (p.ganancia_pct != null && p.costo > 0 && p.precio > 0) ? Number(p.ganancia_pct) : null;
    // Margen = (P-C)/P × 100  — porcentaje del precio que es ganancia
    const margen   = (markup !== null && p.precio > 0)
      ? Math.round(((p.precio - p.costo) / p.precio) * 100 * 10) / 10
      : null;
    const ganPesos = (p.ganancia_pesos != null && p.costo > 0) ? Number(p.ganancia_pesos) : null;
    const ventas   = p.ventas       || 0;
    const ganTotal = p.ganancia_total || 0;

    // Colores basados en markup (la métrica principal del sistema)
    const colorMarkup = markup === null ? 'text-slate-500'
      : markup >= 30 ? 'text-teal-400' : markup >= 10 ? 'text-yellow-400' : 'text-red-400';
    const bgMarkup    = markup === null ? 'bg-slate-700/40'
      : markup >= 30 ? 'bg-teal-900/40' : markup >= 10 ? 'bg-yellow-900/40' : 'bg-red-900/40';
    const colorMargen = margen === null ? 'text-slate-500'
      : margen >= 25 ? 'text-emerald-400' : margen >= 8 ? 'text-amber-400' : 'text-rose-400';
    const bgMargen    = margen === null ? 'bg-slate-700/40'
      : margen >= 25 ? 'bg-emerald-900/40' : margen >= 8 ? 'bg-amber-900/40' : 'bg-rose-900/40';
    const rowBg = i % 2 === 0 ? '' : 'bg-slate-800/30';
    const markupStr = markup !== null ? markup.toFixed(1) : '';

    return `
    <tr class="${rowBg} hover:bg-teal-900/10 border-b border-slate-800/60" data-fila="${p.fila}">
      <td class="py-2 px-2">
        <div class="font-semibold text-white text-sm">${escapeHtml(p.nombre)}</div>
        <div class="text-xs text-slate-500">${escapeHtml(p.tamano)} · ${escapeHtml(p.categoria)}</div>
      </td>
      <td class="py-2 px-2 text-right">
        <span class="text-sm font-semibold text-teal-300" id="rent-precio-${p.fila}">
          ${p.precio > 0 ? fmt(p.precio) : '—'}
        </span>
      </td>
      <td class="py-2 px-2">
        <input type="number" min="0"
          class="rent-costo-input w-24 bg-slate-700 border border-yellow-600/50 hover:border-yellow-500
                 focus:border-yellow-400 rounded-lg px-2 py-1.5 text-xs text-white text-right
                 outline-none transition placeholder-slate-500"
          placeholder="${p.costo > 0 ? p.costo : 'ej: 3500'}"
          value="${p.costo > 0 ? p.costo : ''}"
          data-fila="${p.fila}"
          aria-label="Costo de ${escapeHtml(p.nombre)}">
      </td>
      <!-- MARKUP % (sobre costo) — campo editable -->
      <td class="py-2 px-2">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-1">
            <input type="number" min="0" max="1000"
              class="rent-margen-input w-18 bg-slate-700 border border-teal-600/50 hover:border-teal-500
                     focus:border-teal-400 rounded-lg px-2 py-1 text-xs text-center
                     outline-none transition placeholder-slate-500 ${colorMarkup}"
              placeholder="${markupStr || 'ej: 80'}"
              value="${markupStr}"
              data-fila="${p.fila}"
              aria-label="Markup de ${escapeHtml(p.nombre)}">
            <span class="text-xs text-slate-600 leading-none">%<br><span class="text-[9px] text-teal-700">mkup</span></span>
          </div>
          <!-- Margen sobre precio (solo lectura, auto calculado) -->
          <div class="text-[10px] text-center" id="rent-margen-${p.fila}">
            ${margen !== null
              ? `<span class="${bgMargen} ${colorMargen} rounded-full px-1.5 py-0.5 font-bold">${margen.toFixed(1)}% mg</span>`
              : '<span class="text-slate-700">— mg</span>'}
          </div>
        </div>
      </td>
      <td class="py-2 px-2 text-right ${colorMarkup} font-semibold text-sm" id="rent-ganpesos-${p.fila}">
        ${ganPesos !== null ? fmt(ganPesos) : '—'}
      </td>
      <!-- % markup badge -->
      <td class="py-2 px-2 text-center" id="rent-pct-${p.fila}">
        ${markup !== null
          ? `<span class="rounded-full px-2 py-0.5 font-bold text-xs ${bgMarkup} ${colorMarkup}">
               ${(Number.isFinite(markup) ? markup : 0).toFixed(1)}%
             </span>`
          : '<span class="text-slate-600 text-xs">—</span>'}
      </td>
      <!-- Unidades vendidas -->
      <td class="py-2 px-2 text-center text-xs font-semibold ${ventas > 0 ? 'text-blue-300' : 'text-slate-600'}">
        ${ventas > 0 ? ventas + ' ud' : '—'}
      </td>
      <!-- Ganancia total histórica -->
      <td class="py-2 px-2 text-right text-xs font-bold ${ganTotal > 0 ? 'text-teal-300' : 'text-slate-600'}">
        ${ganTotal > 0 ? fmt(ganTotal) : '—'}
      </td>
      <td class="py-2 px-2 text-center">
        <button class="btn-rent-guardar bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-40
               text-white text-xs font-bold rounded-lg px-3 py-1.5 transition-all whitespace-nowrap"
          data-fila="${p.fila}">💾 Guardar</button>
        <div class="rent-msg text-xs mt-1 min-h-[14px]" data-fila="${p.fila}"></div>
      </td>
    </tr>`;
  }).join('');
}

/* ── Delegación de eventos ───────────────────────────────── */
function handleRentClick(e) {
  const btn = e.target.closest('.btn-rent-guardar');
  if (btn) guardarFilaRent(btn.dataset.fila);
}
function handleRentKeydown(e) {
  if (e.key !== 'Enter') return;
  const input = e.target.closest('.rent-costo-input, .rent-margen-input');
  if (input) guardarFilaRent(input.dataset.fila);
}

/* ══════════════════════════════════════════
   GUARDAR FILA
══════════════════════════════════════════ */
async function guardarFilaRent(filaStr) {
  const fila = Number(filaStr);
  if (!fila || isNaN(fila)) return;

  const costoInp  = document.querySelector(`.rent-costo-input[data-fila="${fila}"]`);
  const margenInp = document.querySelector(`.rent-margen-input[data-fila="${fila}"]`);
  const btn       = document.querySelector(`.btn-rent-guardar[data-fila="${fila}"]`);
  const msgEl     = document.querySelector(`.rent-msg[data-fila="${fila}"]`);

  const costoVal  = costoInp?.value.trim();
  const margenVal = margenInp?.value.trim();

  if (!costoVal && !margenVal) { showToast('⚠️ Ingresa el costo o el margen para guardar'); return; }
  if (costoVal  && (isNaN(Number(costoVal))  || Number(costoVal)  < 0)) { showToast('⚠️ Costo inválido');  costoInp?.focus(); return; }
  if (margenVal && (isNaN(Number(margenVal)) || Number(margenVal) < 0)) { showToast('⚠️ Margen inválido'); margenInp?.focus(); return; }

  const p = rentTodos.find(x => x.fila === fila);
  if (!p) return;

  const nuevoCosto  = costoVal  ? Number(costoVal)  : (p.costo || 0);
  const nuevoMargen = margenVal ? Number(margenVal)  : null;
  const nuevoPrecio = (nuevoMargen !== null && nuevoCosto > 0)
    ? Math.ceil(nuevoCosto * (1 + nuevoMargen / 100)) : p.precio;

  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  if (msgEl) msgEl.textContent = '';

  const precioAnterior = p.precio;
  p.costo = nuevoCosto;
  if (nuevoPrecio > 0 && nuevoCosto > 0) {
    p.precio         = nuevoPrecio;
    p.ganancia_pct   = Math.round(((nuevoPrecio - nuevoCosto) / nuevoCosto) * 1000) / 10;
    p.ganancia_pesos = nuevoPrecio - nuevoCosto;
  } else if (nuevoCosto > 0 && p.precio > 0) {
    p.ganancia_pct   = Math.round(((p.precio - nuevoCosto) / nuevoCosto) * 1000) / 10;
    p.ganancia_pesos = p.precio - nuevoCosto;
  }
  _actualizarFilaDOM(fila, p);

  try {
    if (costoVal) await adminApi.updateCosto({ fila, costo: nuevoCosto });
    if (nuevoMargen !== null && nuevoPrecio !== precioAnterior) {
      await adminApi.updatePrecio({ fila, precio: nuevoPrecio });
    }
    const resumen = nuevoMargen !== null
      ? `Costo: ${fmt(nuevoCosto)} · Precio: ${fmt(nuevoPrecio)} · Margen: ${nuevoMargen}%`
      : `Costo: ${fmt(nuevoCosto)}`;
    showToast(`✅ ${p.nombre} — ${resumen}`);
    if (msgEl) { msgEl.textContent = '✅'; msgEl.className = 'rent-msg text-xs mt-1 text-green-400'; }
    window.dispatchEvent(new CustomEvent('costo-actualizado', {
      detail: { fila, nombre: p.nombre, tamano: p.tamano, costo: nuevoCosto,
                precio: nuevoPrecio, ganancia_pct: p.ganancia_pct, ganancia_pesos: p.ganancia_pesos }
    }));
    poblarCalcProductos();
  } catch (err) {
    p.precio = precioAnterior;
    if (p.precio > 0 && p.costo > 0) {
      p.ganancia_pct   = Math.round(((p.precio - p.costo) / p.costo) * 1000) / 10;
      p.ganancia_pesos = p.precio - p.costo;
    }
    _actualizarFilaDOM(fila, p);
    showToast('⚠️ No se pudo guardar: ' + err.message);
    if (msgEl) { msgEl.textContent = '❌ Error'; msgEl.className = 'rent-msg text-xs mt-1 text-red-400'; }
  }
  if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
  setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 4000);
}

/* ── Actualizar fila en DOM sin re-render ────────────────── */
function _actualizarFilaDOM(fila, p) {
  const markup   = (p.ganancia_pct != null && p.costo > 0 && p.precio > 0) ? Number(p.ganancia_pct) : null;
  const margen   = (markup !== null && p.precio > 0)
    ? Math.round(((p.precio - p.costo) / p.precio) * 100 * 10) / 10
    : null;
  const ganPesos = (p.ganancia_pesos != null && p.costo > 0) ? Number(p.ganancia_pesos) : null;

  const colorMarkup = markup === null ? 'text-slate-500'
    : markup >= 30 ? 'text-teal-400' : markup >= 10 ? 'text-yellow-400' : 'text-red-400';
  const bgMarkup    = markup === null ? 'bg-slate-700/40'
    : markup >= 30 ? 'bg-teal-900/40' : markup >= 10 ? 'bg-yellow-900/40' : 'bg-red-900/40';
  const colorMargen = margen === null ? 'text-slate-500'
    : margen >= 25 ? 'text-emerald-400' : margen >= 8 ? 'text-amber-400' : 'text-rose-400';
  const bgMargen    = margen === null ? 'bg-slate-700/40'
    : margen >= 25 ? 'bg-emerald-900/40' : margen >= 8 ? 'bg-amber-900/40' : 'bg-rose-900/40';

  const precioEl = document.getElementById(`rent-precio-${fila}`);
  if (precioEl) precioEl.textContent = p.precio > 0 ? fmt(p.precio) : '—';

  const pctEl = document.getElementById(`rent-pct-${fila}`);
  if (pctEl) pctEl.innerHTML = markup !== null
    ? `<span class="rounded-full px-2 py-0.5 font-bold text-xs ${bgMarkup} ${colorMarkup}">${(Number.isFinite(markup)?markup:0).toFixed(1)}%</span>`
    : '<span class="text-slate-600 text-xs">—</span>';

  const margenEl = document.getElementById(`rent-margen-${fila}`);
  if (margenEl) margenEl.innerHTML = margen !== null
    ? `<span class="${bgMargen} ${colorMargen} rounded-full px-1.5 py-0.5 font-bold">${margen.toFixed(1)}% mg</span>`
    : '<span class="text-slate-700">— mg</span>';

  const ganEl = document.getElementById(`rent-ganpesos-${fila}`);
  if (ganEl) { ganEl.textContent = ganPesos !== null ? fmt(ganPesos) : '—'; ganEl.className = `py-2 px-2 text-right font-semibold text-sm ${colorMarkup}`; }

  const costoInp = document.querySelector(`.rent-costo-input[data-fila="${fila}"]`);
  if (costoInp) { costoInp.value = p.costo > 0 ? p.costo : ''; costoInp.placeholder = p.costo > 0 ? String(p.costo) : 'ej: 3500'; }
  const margenInp = document.querySelector(`.rent-margen-input[data-fila="${fila}"]`);
  if (margenInp && markup !== null) { margenInp.value = markup.toFixed(1); margenInp.placeholder = markup.toFixed(1); }
}

/* ══════════════════════════════════════════
   RENDER GENERAL — KPIs + tops
══════════════════════════════════════════ */
function renderRentabilidad(d) {
  const r = d.resumen;

  // ── KPIs financieros ─────────────────────────────────────
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // Margen global ponderado (gross margin — ganancia/ingresos reales)
  const mgColor = r.margenGlobal >= 30 ? 'text-green-400'
    : r.margenGlobal >= 10 ? 'text-yellow-400'
    : r.margenGlobal > 0   ? 'text-red-400' : 'text-slate-400';
  const mgEl = document.getElementById('rentMargenGlobal');
  if (mgEl) {
    mgEl.textContent = r.margenGlobal > 0 ? r.margenGlobal.toFixed(1) + '%' : '—';
    mgEl.className   = 'font-display font-extrabold text-3xl ' + mgColor;
  }

  // Markup promedio sobre costo (consistencia con calculadora de precios)
  const avgColor = r.avgMarkupPct >= 30 ? 'text-green-400'
    : r.avgMarkupPct >= 10 ? 'text-yellow-400'
    : r.avgMarkupPct > 0   ? 'text-red-400' : 'text-slate-400';
  const avgEl = document.getElementById('rentAvgGan');
  if (avgEl) {
    avgEl.textContent = (r.avgMarkupPct > 0 && Number.isFinite(r.avgMarkupPct))
      ? r.avgMarkupPct.toFixed(1) + '%' : '—';
    avgEl.className = 'font-display font-extrabold text-3xl ' + avgColor;
  }

  // ROI inventario
  const roiEl = document.getElementById('rentROI');
  if (roiEl) {
    roiEl.textContent = r.roi > 0 ? r.roi.toFixed(1) + '%' : '—';
    roiEl.className   = 'font-display font-extrabold text-2xl ' + (r.roi >= 50 ? 'text-green-400' : r.roi > 0 ? 'text-yellow-400' : 'text-slate-400');
  }

  // Resto de KPIs
  set('rentGanReal',       r.totalGanancia  > 0 ? fmt(r.totalGanancia)  : '—');
  set('rentIngresos',      r.totalIngresos  > 0 ? fmt(r.totalIngresos)  : '—');
  set('rentConCosto',      r.conCosto);
  set('rentSinCosto',      r.sinCosto);
  set('rentInversion',     r.totalInversion > 0 ? fmt(r.totalInversion) : '—');
  // Total unidades vendidas — suma de masVendidos
  const totalUds = (d.masVendidos || []).reduce((s, p) => s + (p.ventas || 0), 0);
  set('rentTotalVendidos', totalUds > 0 ? totalUds + ' uds' : '—');

  // Alerta sin costo
  const alerta = document.getElementById('rentAlertaSinCosto');
  if (alerta) {
    r.sinCosto > 0 ? alerta.classList.remove('hidden') : alerta.classList.add('hidden');
    const numEl = document.getElementById('rentNumSinCosto');
    if (numEl) numEl.textContent = r.sinCosto;
  }

  // ── Top más rentables (por ganancia TOTAL real, no margen teórico) ──
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  const topEl  = document.getElementById('rentTopRent');
  if (topEl) {
    topEl.innerHTML = d.topRentables.length
      ? d.topRentables.map((p, i) => {
          const pct     = Number(p.ganancia_pct) || 0;
          const color   = pct>=30?'text-green-400':pct>=10?'text-yellow-400':'text-red-400';
          const bgBadge = pct>=30?'bg-green-900/40':pct>=10?'bg-yellow-900/40':'bg-red-900/40';
          return `<div class="flex items-center justify-between gap-3 py-2 border-b border-slate-700/50 last:border-0">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-base flex-shrink-0">${medals[i]||'▪'}</span>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-white truncate">${escapeHtml(p.nombre)}</div>
                <div class="text-xs text-slate-500">${escapeHtml(p.tamano)} · ${escapeHtml(p.categoria)}</div>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-xs font-bold text-teal-300">${fmt(p.ganancia_total||0)}</span>
              <div class="flex items-center gap-1">
                <span class="text-xs text-slate-500">${p.ventas||0} uds ·</span>
                <span class="text-xs font-bold rounded-full px-2 py-0.5 ${bgBadge} ${color}">
                  ${(Number.isFinite(pct)?pct:0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>`;
        }).join('')
      : '<div class="text-xs text-slate-500 py-4 text-center">Ingresa costos y hay ventas para ver el ranking</div>';
  }

  // ── Más vendidos (ranking por unidades) — NUEVO ──────────
  const mvEl = document.getElementById('rentMasVendidos');
  if (mvEl) {
    mvEl.innerHTML = (d.masVendidos||[]).length
      ? d.masVendidos.map((p, i) => `
          <div class="flex items-center justify-between gap-3 py-2 border-b border-slate-700/50 last:border-0">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-base flex-shrink-0">${medals[i]||'▪'}</span>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-white truncate">${escapeHtml(p.nombre)}</div>
                <div class="text-xs text-slate-500">${escapeHtml(p.tamano)}</div>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-sm font-bold text-blue-300">${p.ventas} uds</span>
              <span class="text-xs text-teal-400">${fmt(p.ingresos||0)}</span>
            </div>
          </div>`).join('')
      : '<div class="text-xs text-slate-500 py-4 text-center">Sin ventas registradas aún</div>';
  }

  // ── Ganancia por categoría — NUEVO ──────────────────────
  const catEl = document.getElementById('rentPorCategoria');
  if (catEl && (d.porCategoria||[]).length) {
    const maxGan = Math.max(...d.porCategoria.map(c => c.ganancia), 1);
    catEl.innerHTML = d.porCategoria.map(c => {
      const pct = Math.round((c.ganancia / maxGan) * 100);
      return `
      <div class="space-y-1">
        <div class="flex justify-between text-xs">
          <span class="text-slate-300 font-semibold">${escapeHtml(c.categoria)}</span>
          <span class="text-teal-300 font-bold">${fmt(c.ganancia)}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
            <div class="h-full bg-teal-500 rounded-full transition-all duration-500" style="width:${pct}%"></div>
          </div>
          <span class="text-xs text-slate-500 w-12 text-right">${c.ventas} uds</span>
        </div>
      </div>`;
    }).join('');
  }

  // ── Menos rentables ──────────────────────────────────────
  const menosEl = document.getElementById('rentMenosRent');
  if (menosEl) {
    menosEl.innerHTML = d.menosRentables.length
      ? d.menosRentables.map(p => {
          const pct   = Number(p.ganancia_pct) || 0;
          const color = pct < 10 ? 'text-red-400' : 'text-yellow-400';
          return `<div class="flex items-center justify-between gap-2 py-2 border-b border-slate-700/50 last:border-0">
            <div class="min-w-0">
              <div class="text-sm text-white truncate">${escapeHtml(p.nombre)} ${escapeHtml(p.tamano)}</div>
              <div class="text-xs text-slate-500">
                Vendes ${p.precio>0?fmt(p.precio):'—'} · Costo ${p.costo>0?fmt(p.costo):'—'}
                · ${p.ventas||0} uds · Gan total: ${p.ganancia_total>0?fmt(p.ganancia_total):'—'}
              </div>
            </div>
            <span class="text-sm font-bold flex-shrink-0 ${color}">${(Number.isFinite(pct)?pct:0).toFixed(1)}%</span>
          </div>`;
        }).join('')
      : '<div class="text-xs text-slate-500 py-2">Sin datos disponibles</div>';
  }

  renderTablaRent(d.todos || []);
  poblarCalcProductos();
}

/* ══════════════════════════════════════════
   CALCULADORA DE PRECIOS (sin cambios)
══════════════════════════════════════════ */
function poblarCalcProductos() {
  const sel = document.getElementById('calcProd');
  if (!sel || !rentTodos.length) return;
  sel.innerHTML = '<option value="">— Elegir producto —</option>' +
    rentTodos.filter(p => Number(p.costo) > 0).map((p, i) => {
      const key = encodeURIComponent(`${p.nombre}|||${p.tamano}`);
      return `<option value="${i}" data-idx="${i}" data-costo="${p.costo}" data-precio="${p.precio}" data-key="${key}">
        ${escapeHtml(p.nombre)} ${escapeHtml(p.tamano)} (costo: ${fmt(p.costo)})
      </option>`;
    }).join('');
}

function onCalcProdChange() {
  const sel   = document.getElementById('calcProd');
  const opt   = sel?.options[sel.selectedIndex];
  const costo = opt?.dataset?.costo;
  const inp   = document.getElementById('calcCosto');
  if (inp && costo) inp.value = costo;
  const idxRaw = parseInt(opt?.dataset?.idx, 10);
  _calcFilaActual = (!isNaN(idxRaw) && idxRaw >= 0) ? idxRaw : null;
  calcularPrecio();
}

function calcularPrecio() {
  const costo  = Number(document.getElementById('calcCosto')?.value)  || 0;
  const margen = Number(document.getElementById('calcMargen')?.value) || 0;
  const resEl  = document.getElementById('calcResultado');
  const detEl  = document.getElementById('calcDetalle');
  const accEl  = document.getElementById('calcAcciones');
  if (!costo || !margen || costo <= 0 || margen <= 0) {
    if (resEl) resEl.textContent = '—';
    detEl?.classList.add('hidden'); detEl?.classList.remove('grid');
    accEl?.classList.add('hidden'); accEl?.classList.remove('flex');
    return;
  }
  const sel        = document.getElementById('calcProd');
  const opt2       = sel?.options[sel?.selectedIndex];
  const idxRaw     = parseInt(opt2?.dataset?.idx, 10);
  _calcFilaActual  = (!isNaN(idxRaw) && idxRaw >= 0) ? idxRaw : null;
  const precioSug  = Math.ceil(costo * (1 + margen / 100));
  const gananciaUd = precioSug - costo;
  if (resEl) resEl.textContent = fmt(precioSug);
  const precioActual = Number(opt2?.dataset?.precio) || 0;
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('calcDetCosto', fmt(costo)); s('calcDetGan', fmt(gananciaUd)); s('calcDetPrecio', fmt(precioSug));
  const dact = document.getElementById('calcDetActual');
  if (dact && precioActual > 0) {
    const diff = precioSug - precioActual;
    dact.textContent = fmt(precioActual) + (diff !== 0 ? (diff > 0 ? ' (↑' : ' (↓') + fmt(Math.abs(diff)) + ')' : ' ✓');
    dact.className   = diff > 0 ? 'text-sm font-bold text-yellow-400' : diff < 0 ? 'text-sm font-bold text-red-400' : 'text-sm font-bold text-green-400';
  } else if (dact) dact.textContent = 'Sin precio';
  detEl?.classList.remove('hidden'); detEl?.classList.add('grid');
  accEl?.classList.remove('hidden'); accEl?.classList.add('flex');
  const btnAplicar = document.getElementById('btnAplicarPrecio');
  if (btnAplicar) btnAplicar.style.display = (_calcFilaActual !== null) ? '' : 'none';
}

async function aplicarPrecioSugerido() {
  if (_calcFilaActual === null || isNaN(_calcFilaActual)) { showToast('⚠️ Selecciona un producto primero'); return; }
  const costo  = Number(document.getElementById('calcCosto')?.value)  || 0;
  const margen = Number(document.getElementById('calcMargen')?.value) || 0;
  if (!costo || !margen) { showToast('⚠️ Ingresa costo y margen'); return; }
  const prodConCosto = rentTodos.filter(p => Number(p.costo) > 0);
  const prod         = prodConCosto[_calcFilaActual];
  if (!prod) { showToast('⚠️ Producto no encontrado'); return; }
  const precio = Math.ceil(costo * (1 + margen / 100));
  const btn    = document.getElementById('btnAplicarPrecio');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando fila...'; }
  try {
    const dataProd      = await adminApi.getProductos();
    const nombreBuscado = (prod.nombre + ' ' + prod.tamano).trim().toLowerCase();
    const prodReal      = dataProd.productos?.find(p => (p.nombre + ' ' + p.tamano).trim().toLowerCase() === nombreBuscado);
    if (!prodReal?.fila) { showToast('⚠️ No se encontró la fila del producto'); if (btn) { btn.disabled = false; btn.textContent = '✅ Aplicar este precio al producto'; } return; }
    if (btn) btn.textContent = '⏳ Aplicando...';
    prod.precio = precio; prod.ganancia_pct = margen; prod.ganancia_pesos = precio - costo;
    const pOrig = rentTodos.find(p => (p.nombre + ' ' + p.tamano).trim().toLowerCase() === nombreBuscado);
    if (pOrig) { pOrig.precio = precio; pOrig.ganancia_pct = margen; pOrig.ganancia_pesos = precio - costo; }
    await adminApi.updateCosto({ fila: prodReal.fila, costo });
    await adminApi.updatePrecio({ fila: prodReal.fila, precio });
    showToast('✅ Precio ' + fmt(precio) + ' aplicado');
    poblarCalcProductos(); renderTablaRent(rentTodos);
  } catch (err) { showToast('⚠️ Error: ' + err.message); }
  if (btn) { btn.disabled = false; btn.textContent = '✅ Aplicar este precio al producto'; }
}

function copiarPrecio() {
  const costo  = Number(document.getElementById('calcCosto')?.value) || 0;
  const margen = Number(document.getElementById('calcMargen')?.value) || 0;
  if (!costo || !margen) return;
  const precio = Math.ceil(costo * (1 + margen / 100));
  navigator.clipboard.writeText(String(precio))
    .then(() => showToast('📋 Precio ' + fmt(precio) + ' copiado'))
    .catch(() => showToast('Precio: ' + fmt(precio)));
}

function calcularPreviewMasivo() {
  const margen = Number(document.getElementById('calcMargenGlobal')?.value) || 0;
  const wrap   = document.getElementById('calcMasivoWrap');
  const tbody  = document.getElementById('calcMasivoTabla');
  if (!margen || !tbody) return;
  const conCosto = rentTodos.filter(p => Number(p.costo) > 0);
  if (!conCosto.length) { wrap?.classList.remove('hidden'); tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-4">No hay productos con costo ingresado</td></tr>'; return; }
  wrap?.classList.remove('hidden');
  tbody.innerHTML = conCosto.map((p, i) => {
    const sug = Math.ceil(Number(p.costo) * (1 + margen / 100));
    const act = Number(p.precio) || 0;
    const diff = sug - act;
    const diffStr = diff === 0 ? '<span class="text-green-400">Sin cambio</span>' : diff > 0 ? `<span class="text-yellow-400">+${fmt(diff)}</span>` : `<span class="text-red-400">${fmt(diff)}</span>`;
    const bg = i % 2 === 0 ? '' : 'bg-slate-800/30';
    return `<tr class="${bg} border-b border-slate-800/60">
      <td class="py-2 px-2"><div class="font-semibold text-white">${escapeHtml(p.nombre)}</div><div class="text-slate-500">${escapeHtml(p.tamano)}</div></td>
      <td class="py-2 px-2 text-right text-slate-400">${fmt(p.costo)}</td>
      <td class="py-2 px-2 text-right text-slate-300">${act > 0 ? fmt(act) : '—'}</td>
      <td class="py-2 px-2 text-right font-bold text-teal-300">${fmt(sug)}</td>
      <td class="py-2 px-2 text-center">${diffStr}</td>
    </tr>`;
  }).join('');
}