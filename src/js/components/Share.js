import { state } from '../store/state.js';
import { fmt } from '../utils/format.js';
import { showToast } from '../utils/dom.js';

export function compartirProducto(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  const url   = window.location.origin + window.location.pathname + "#productos";
  const texto = `🧴 *${p.name} ${p.size}* — ${fmt(p.price)}\n\n${p.desc}\n\n📦 Pide en Limpieza RR:\n${url}`;

  if (navigator.share) {
    navigator.share({
      title: `${p.name} — Limpieza RR`,
      text:  texto,
      url:   url,
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(texto).then(() => {
      showToast("📋 ¡Texto del producto copiado!");
    }).catch(() => {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    });
  }
}
