/* Helpers compartidos del admin */

export const fmt = n => '$ ' + Math.round(n).toLocaleString('es-CO');

export function badgePago(val) {
  const v = String(val || '').toUpperCase();
  if (v === 'PAGADO')         return 'bg-green-900/50 text-green-300 border border-green-600/40';
  if (v === 'CONTRA ENTREGA') return 'bg-yellow-900/50 text-yellow-300 border border-yellow-600/40';
  return 'bg-red-900/50 text-red-300 border border-red-600/40';
}

export function badgeEnvio(val) {
  const v = String(val || '');
  if (v === 'Entregado')      return 'bg-green-900/50 text-green-300 border border-green-600/40';
  if (v === 'En camino')      return 'bg-blue-900/50 text-blue-300 border border-blue-600/40';
  if (v === 'En preparación') return 'bg-yellow-900/50 text-yellow-300 border border-yellow-600/40';
  return 'bg-slate-700/60 text-slate-300 border border-slate-600/40';
}

export function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function getStockStatus(p) {
  if (p.stock === '' || p.stock === null || p.stock === undefined) return 'sin';
  const s = Number(p.stock);
  if (isNaN(s)) return 'sin';
  if (s === 0)  return 'agotado';
  if (s <= 5)   return 'bajo';
  return 'ok';
}

export function stockPillClass(status) {
  return {
    agotado: 'bg-red-900/50 text-red-300 border border-red-600/40',
    bajo:    'bg-yellow-900/50 text-yellow-300 border border-yellow-600/40',
    ok:      'bg-green-900/50 text-green-300 border border-green-600/40',
    sin:     'bg-slate-700/50 text-slate-400 border border-slate-600/40',
  }[status];
}