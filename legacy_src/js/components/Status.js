import { CONFIG } from '../config.js';
import { fmt } from '../utils/format.js';
import { $, showToast } from '../utils/dom.js';

export function openStatus() {
  $("statusModal")?.classList.add("on");
  $("overlay")?.classList.add("on");
  if ($("statusResult")) $("statusResult").innerHTML = "";
  if ($("statusPhone")) $("statusPhone").value = "";
}

export function closeStatus() {
  $("statusModal")?.classList.remove("on");
  $("overlay")?.classList.remove("on");
}

export async function searchStatus() {
  const tel = ($("statusPhone")?.value || "").trim().replace(/\\D/g, "");
  if (!tel || tel.length < 7) { showToast("⚠️ Ingresa un teléfono válido"); return; }
  const btn = $("statusSearchBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳"; }
  const res = $("statusResult");
  if (!res) return;
  res.innerHTML = '<div class="hist-loading">Consultando...</div>';
  try {
    const url  = `${CONFIG.APPS_SCRIPT_URL}?action=estado&telefono=${encodeURIComponent(tel)}&t=${Date.now()}`;
    const raw  = await fetch(url);
    const text = await raw.text();
    let data;
    try { data = JSON.parse(text); } catch(e) {
      res.innerHTML = '<div class="hist-empty">⚠️ Error del servidor. Intenta de nuevo.</div>';
      if (btn) { btn.disabled = false; btn.textContent = "Consultar"; }
      return;
    }
    if (!data.ok || !data.pedidos || !data.pedidos.length) {
      res.innerHTML = '<div class="hist-empty">📭 No encontramos pedidos con ese número.<br><small>Verifica que sea el mismo número con el que hiciste el pedido.</small></div>';
    } else {
      const STEPS = ["Recibido","En preparación","En camino","Entregado"];
      res.innerHTML = data.pedidos.slice(0,3).map(p => {
        const stepIdx = STEPS.indexOf(p.estado_envio || "Recibido");
        const current = stepIdx >= 0 ? stepIdx : 0;
        return `
          <div class="status-card">
            <div class="status-card-hd">
              <span>📅 ${p.fecha}</span>
              <span class="hist-status hist-status--${(p.estado_pago||'').toLowerCase().replace(/\\s/g,'-')}">${p.estado_pago||'Pendiente'}</span>
            </div>
            <div class="status-steps">
              ${STEPS.map((s, i) => `
                <div class="status-step ${i <= current ? 'done' : ''} ${i === current ? 'active' : ''}">
                  <div class="step-dot"></div>
                  <div class="step-lbl">${s}</div>
                </div>`).join('<div class="step-line"></div>')}
            </div>
            <div class="hist-total">Total: <strong>${typeof p.total === 'number' ? fmt(p.total) : p.total}</strong></div>
          </div>`;
      }).join("");
    }
  } catch {
    res.innerHTML = '<div class="hist-empty">⚠️ Error al consultar. Intenta de nuevo.</div>';
  }
  if (btn) { btn.disabled = false; btn.textContent = "Consultar"; }
}
