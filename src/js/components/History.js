import { CONFIG } from '../config.js';
import { fmt } from '../utils/format.js';
import { $, showToast } from '../utils/dom.js';

export function openHistory() {
  $("historyModal")?.classList.add("on");
  $("overlay")?.classList.add("on");
  if ($("historyResult")) $("historyResult").innerHTML = "";
  if ($("historyPhone")) $("historyPhone").value = "";
}

export function closeHistory() {
  $("historyModal")?.classList.remove("on");
  $("overlay")?.classList.remove("on");
}

export async function searchHistory() {
  const tel = ($("historyPhone")?.value || "").trim().replace(/[^0-9]/g, "");
  if (!tel || tel.length < 7) { showToast("⚠️ Ingresa un teléfono válido"); return; }
  const btn = $("historySearchBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Buscando..."; }
  const res = $("historyResult");
  if (!res) return;
  res.innerHTML = '<div class="hist-loading">Consultando pedidos...</div>';
  try {
    const url  = `${CONFIG.APPS_SCRIPT_URL}?action=historial&telefono=${encodeURIComponent(tel)}&t=${Date.now()}`;
    const raw  = await fetch(url);
    const text = await raw.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e) {
      res.innerHTML = '<div class="hist-empty">⚠️ Error del servidor. Intenta de nuevo.</div>';
      if (btn) { btn.disabled = false; btn.textContent = "🔍 Buscar"; }
      return;
    }
    if (!data.ok || !data.pedidos || !data.pedidos.length) {
      res.innerHTML = '<div class="hist-empty">📭 No encontramos pedidos con ese número.<br><small>Verifica que sea el mismo número con el que hiciste el pedido.</small></div>';
    } else {
      res.innerHTML = data.pedidos.map(p => {
        const prods = String(p.productos || "").split("\\n")
          .filter(l => l.trim())
          .map(l => `<div class="hist-prod-line">▪ ${l.trim()}</div>`)
          .join("");
        const totalStr = (typeof p.total === "number" || !isNaN(Number(p.total)))
          ? fmt(Number(p.total)) : String(p.total || "");
        const estadoClass = String(p.estado_pago || "").toLowerCase().replace(/[^a-z]/g, "-");
        return `
        <div class="hist-item">
          <div class="hist-item-hd">
            <span class="hist-date">📅 ${p.fecha || ""}</span>
            <span class="hist-status hist-status--${estadoClass}">${p.estado_pago || "Pendiente"}</span>
          </div>
          <div class="hist-prods">${prods || "<div class='hist-prod-line'>Sin detalle</div>"}</div>
          <div class="hist-total">Total: <strong>${totalStr}</strong></div>
        </div>`;
      }).join("");
    }
  } catch(err) {
    res.innerHTML = '<div class="hist-empty">⚠️ Error al consultar. Verifica tu conexión.</div>';
  }
  if (btn) { btn.disabled = false; btn.textContent = "🔍 Buscar"; }
}
