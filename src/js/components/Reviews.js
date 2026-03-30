import { CONFIG } from '../config.js';
import { $, showToast } from '../utils/dom.js';

let ratingNombre = "";
let ratingTel    = "";
let ratingVal    = 0;

export function openRating(nombre, tel) {
  ratingNombre = nombre || "";
  ratingTel    = tel    || "";
  ratingVal    = 0;
  renderStars(0);
  if ($("ratingComment")) $("ratingComment").value = "";
  $("ratingModal")?.classList.add("on");
  $("overlay")?.classList.add("on");
}

export function closeRating() {
  $("ratingModal")?.classList.remove("on");
  $("overlay")?.classList.remove("on");
}

export function setRating(val) {
  ratingVal = val;
  renderStars(val);
}

export function renderStars(val) {
  document.querySelectorAll(".star-btn").forEach((s, i) => {
    s.classList.toggle("on", i < val);
  });
}

export async function submitRating() {
  if (!ratingVal) { showToast("⭐ Selecciona una calificación"); return; }
  const comment = $("ratingComment")?.value.trim() || "";
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        accion:     "calificacion",
        nombre:     ratingNombre,
        telefono:   ratingTel,
        estrellas:  ratingVal,
        comentario: comment,
      }),
    });
  } catch {}
  closeRating();
  showToast("⭐ ¡Gracias por tu calificación!");
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("vis"); });
}, { threshold: 0.08 });

export async function loadResenas() {
  const wrap  = $("resenasWrap");
  const stats = $("resenasStats");
  if (!wrap) return;

  if (CONFIG.APPS_SCRIPT_URL === "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT") return;

  try {
    const url  = `${CONFIG.APPS_SCRIPT_URL}?action=resenas&t=${Date.now()}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.ok || !data.resenas || !data.resenas.length) {
      wrap.innerHTML = `
        <div class="resenas-empty">
          <div style="font-size:2.5rem;margin-bottom:12px">⭐</div>
          <p style="font-weight:600;margin-bottom:4px">Aún no hay reseñas</p>
          <p style="font-size:.85rem;opacity:.7">¡Sé el primero en compartir tu experiencia!</p>
        </div>`;
      return;
    }

    const resenas  = data.resenas;
    const starsStr = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
    const avg      = resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length;

    if (stats) {
      stats.style.display = "flex";
      if($("resenaAvgNum")) $("resenaAvgNum").textContent   = avg.toFixed(1);
      if($("resenaAvgStars")) $("resenaAvgStars").textContent = starsStr(Math.round(avg));
      if($("resenaAvgCount")) $("resenaAvgCount").textContent = `${resenas.length} reseña${resenas.length !== 1 ? "s" : ""} verificadas`;
    }

    const sorted = [...resenas]
      .sort((a, b) => {
        const aHas = a.comentario && a.comentario.trim().length > 2 ? 1 : 0;
        const bHas = b.comentario && b.comentario.trim().length > 2 ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;           
        return b.estrellas - a.estrellas;                  
      })
      .slice(0, 9);                                        

    wrap.innerHTML = sorted.map(r => {
      let fechaStr = "";
      if (r.fecha) {
        const partes = String(r.fecha).split(" ")[0].split("/");
        if (partes.length === 3) {
          const meses = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
          fechaStr = `${partes[0]} ${meses[Number(partes[1])] || partes[1]} ${partes[2]}`;
        } else {
          fechaStr = String(r.fecha).split(" ")[0];
        }
      }

      const stars     = starsStr(r.estrellas);
      const numStars  = Number(r.estrellas) || 5;
      const comentario = (r.comentario || "").trim();
      const hasComment = comentario.length > 2;

      const iniciales = (r.nombre || "Cliente")
        .split(" ").slice(0, 2)
        .map(w => (w[0] || "").toUpperCase())
        .join("") || "C";

      const avatarColors = [
        "","",
        "linear-gradient(135deg,#EF4444,#B91C1C)",
        "linear-gradient(135deg,#F59E0B,#D97706)",
        "linear-gradient(135deg,#14B8A6,#0D9488)",
        "linear-gradient(135deg,#0D9488,#0F766E)",
      ];
      const avatarBg = avatarColors[Math.min(numStars, 5)] || "linear-gradient(135deg,#14B8A6,#0D9488)";

      return `
      <div class="resena-card fi ${hasComment ? "resena-card--con-texto" : "resena-card--sin-texto"}">
        <div class="resena-header">
          <div class="resena-avatar" style="background:${avatarBg}">${iniciales}</div>
          <div class="resena-info">
            <div class="resena-nombre">${r.nombre || "Cliente verificado"}</div>
            <div class="resena-fecha">${fechaStr || "Compra verificada"}</div>
          </div>
          <div class="resena-stars" aria-label="${numStars} estrellas">${stars}</div>
        </div>
        ${hasComment
          ? `<blockquote class="resena-texto">${comentario}</blockquote>`
          : `<p class="resena-sin-texto">Cliente verificado · ${numStars}★</p>`
        }
        <div class="resena-footer">
          <span class="resena-verificado">✅ Compra verificada</span>
          ${numStars === 5 ? '<span class="resena-top-badge">TOP</span>' : ""}
        </div>
      </div>`;
    }).join("");

    document.querySelectorAll(".resena-card.fi").forEach(el => observer.observe(el));

  } catch(e) {
    console.warn("Error cargando reseñas:", e);
    wrap.innerHTML = "";
  }
}
