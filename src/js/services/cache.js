const CACHE_KEY = "lrr_prods_v1";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export function getCachedProducts(allowStale = false) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (!allowStale && Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

export function setCachedProducts(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export function clearProductCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}
