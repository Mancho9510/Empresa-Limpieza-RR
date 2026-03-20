/* ══════════════════════════════════════════
   DASHBOARD — Panel admin
══════════════════════════════════════════ */
import { adminApi }  from './admin-api.js';
import { showToast } from './admin-toast.js';
import { fmt } from './helpers.js';

let dashData = null;

export function initDashboard() {
  document.getElementById('btnDashRefresh')?.addEventListener('click', () => loadDashboard(false));
  document.getElementById('btnDashForce')?.addEventListener('click',   () => loadDashboard(true));
}

export function hasDashData() { return !!dashData; }

export async function loadDashboard(forceRefresh = false) {
  const loading = document.getElementById('dashLoading');
  const content = document.getElementById('dashContent');
  loading.classList.remove('hidden'); loading.classList.add('animate-pulse');
  content.classList.add('hidden');
  try {
    const data = await adminApi.getDashboard(forceRefresh);
    dashData = data;
    renderDashboard(data);
    loading.classList.add('hidden');
    content.classList.remove('hidden');
    const meta = document.getElementById('dashMeta');
    if (meta) {
      meta.classList.remove('hidden');
      meta.textContent = data.fromCache
        ? `⚡ Desde caché · Generado: ${data.generadoEn||'—'}`
        : `🔄 Datos frescos · ${data.generadoEn||'—'}`;
    }
  } catch (err) {
    loading.textContent = '⚠️ ' + err.message;
    loading.classList.remove('animate-pulse');
  }
}

function renderDashboard(d) {
  const k = d.kpis;

  // KPIs
  document.getElementById('dCntHoy').textContent = k.cntHoy + ' pedidos';
  document.getElementById('dTotHoy').textContent = fmt(k.totHoy);
  document.getElementById('dCntMes').textContent = k.cntMes + ' pedidos';
  document.getElementById('dTotMes').textContent = fmt(k.totMes);
  document.getElementById('dTotPed').textContent = k.totalPedidos;
  document.getElementById('dTicket').textContent  = fmt(k.ticket);
  document.getElementById('dTotGen').textContent  = fmt(k.totGen);
  document.getElementById('dPend').textContent    = k.pend;
  document.getElementById('dCli').textContent     = k.numClientes;
  document.getElementById('dVip').textContent     = k.vip;

  const avg = k.avgRating;
  document.getElementById('dRatingNum').textContent  = avg > 0 ? avg.toFixed(1) : '—';
  document.getElementById('dStarsVis').textContent   = avg > 0 ? '★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg)) : '—';
  document.getElementById('dRatingInfo').textContent = k.numResenas > 0 ? k.numResenas + ' reseñas' : 'Sin reseñas aún';

  // Ventas por semana
  const semOrder = ['Esta semana','Sem anterior','Hace 2 sem','Hace 3 sem','Hace 4 sem','Hace 5 sem','Hace 6 sem','Hace 7 sem'];
  const semVals  = semOrder.map(s => d.semanas[s] || 0);
  const maxSem   = Math.max(...semVals, 1);
  document.getElementById('dSemanas').innerHTML = semOrder.map((sem, i) => {
    const val = semVals[i]; const pct = Math.round(val / maxSem * 100);
    return `<div class="flex items-center gap-2">
      <span class="text-xs text-slate-400 w-24 flex-shrink-0 text-right">${sem}</span>
      <div class="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden relative">
        <div class="h-full rounded-full transition-all duration-700 ${i===0?'bg-teal-500':'bg-teal-700/60'}" style="width:${pct}%"></div>
        ${val > 0 ? `<span class="absolute inset-0 flex items-center pl-2 text-xs font-semibold text-white">${fmt(val)}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  // Top productos
  const totU = d.topProd.reduce((s,p)=>s+p.cant,0)||1;
  document.getElementById('dTopProd').innerHTML = d.topProd.length
    ? d.topProd.map((p,i) => {
        const pct = Math.round(p.cant/totU*100);
        return `<div class="flex items-center gap-2">
          <span class="text-base flex-shrink-0">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]||'▪'}</span>
          <div class="flex-1 min-w-0"><div class="text-xs text-white font-medium truncate">${p.nombre}</div>
          <div class="mt-1 bg-slate-700 rounded-full h-1.5 overflow-hidden"><div class="h-full bg-teal-500 rounded-full" style="width:${pct}%"></div></div></div>
          <span class="text-xs text-teal-300 font-bold flex-shrink-0">${p.cant} uds</span></div>`;
      }).join('')
    : '<div class="text-xs text-slate-500">Sin pedidos aún</div>';

  // Top clientes
  document.getElementById('dTopCli').innerHTML = d.topCli.length
    ? d.topCli.map((cl,i) =>
        `<div class="flex items-center justify-between gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
          <div class="flex items-center gap-2 min-w-0"><span class="flex-shrink-0">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]||'▪'}</span>
          <span class="text-xs text-white truncate">${cl.nombre}</span></div>
          <span class="text-xs font-bold text-teal-300 flex-shrink-0">${cl.pedidos} pedidos</span></div>`
      ).join('')
    : '<div class="text-xs text-slate-500">Sin datos</div>';

  // Zonas
  const totZ = d.topZonas.reduce((s,z)=>s+z.cnt,0)||1;
  document.getElementById('dTopZonas').innerHTML = d.topZonas.length
    ? d.topZonas.map(z => `<div class="flex items-center justify-between text-xs"><span class="text-slate-300 truncate flex-1 pr-2">${z.zona}</span><span class="text-teal-400 font-bold flex-shrink-0">${z.cnt} · ${Math.round(z.cnt/totZ*100)}%</span></div>`).join('')
    : '<div class="text-xs text-slate-500">Sin datos</div>';

  // Pagos
  const totP = k.totalPedidos || 1;
  const iconosPago = { 'Nequi':'💜','Breb':'💙','Daviplata':'❤️','Transferencia bancaria':'🏦','Contra entrega':'🚪' };
  document.getElementById('dTopPagos').innerHTML = d.topPagos.length
    ? d.topPagos.map(p => {
        const ico = Object.keys(iconosPago).find(k => p.metodo.toLowerCase().includes(k.toLowerCase()));
        return `<div class="flex items-center justify-between text-xs"><span class="text-slate-300 flex-1 pr-2">${iconosPago[ico]||'💳'} ${p.metodo}</span><span class="text-teal-400 font-bold flex-shrink-0">${p.cnt} · ${Math.round(p.cnt/totP*100)}%</span></div>`;
      }).join('')
    : '<div class="text-xs text-slate-500">Sin datos</div>';

  // Alertas stock
  const alertasWrap = document.getElementById('dAlertasWrap');
  if (d.alertasStock?.length > 0) {
    alertasWrap.classList.remove('hidden');
    document.getElementById('dAlertas').innerHTML = d.alertasStock.map(a =>
      `<div class="text-xs ${a.nivel==='agotado'?'text-red-300':'text-yellow-300'}">${a.nivel==='agotado'?'🔴 AGOTADO':'🟡 BAJO'}: ${a.nombre} (stock: ${a.stock})</div>`
    ).join('');
  } else { alertasWrap.classList.add('hidden'); }

  // Estado de pedidos
  const totPed = k.totalPedidos || 1;
  document.getElementById('dEstados').innerHTML = [
    { lbl: 'Pendientes de pago', val: k.pend,      cls: 'bg-red-900/40 text-red-300' },
    { lbl: 'Pagados',            val: k.pagados,    cls: 'bg-green-900/40 text-green-300' },
    { lbl: 'Entregados',         val: k.entregados, cls: 'bg-blue-900/40 text-blue-300' },
  ].map(e => {
    const pct = Math.round(e.val / totPed * 100);
    return `<div class="flex items-center gap-3">
      <span class="text-xs text-slate-400 w-36 flex-shrink-0">${e.lbl}</span>
      <div class="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden relative">
        <div class="h-full rounded-full transition-all duration-700 ${e.cls}" style="width:${pct}%"></div>
      </div>
      <span class="text-xs font-bold text-slate-300 w-16 text-right flex-shrink-0">${e.val} (${pct}%)</span></div>`;
  }).join('');
}