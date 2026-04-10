export function fmt(n) {
  return "$ " + Math.round(n).toLocaleString("es-CO");
}

export function sanitizeImgUrl(url) {
  if (!url || url.trim() === "") return "";
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) return `https://drive.google.com/uc?export=view&id=${matchFile[1]}`;
  const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchOpen) return `https://drive.google.com/uc?export=view&id=${matchOpen[1]}`;
  if (url.startsWith("http")) return url;
  return "";
}

export function catBadgeClass(cat) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("detergente"))    return "p-cat-badge--detergentes";
  if (c.includes("limpiapisos"))   return "p-cat-badge--limpiapisos";
  if (c.includes("fragancia"))     return "p-cat-badge--fragancias";
  if (c.includes("antibacterial")) return "p-cat-badge--antibacteri";
  if (c.includes("lavaloza"))      return "p-cat-badge--lavaloza";
  if (c.includes("cera"))          return "p-cat-badge--ceras";
  if (c.includes("vidrio"))        return "p-cat-badge--vidrios";
  return "p-cat-badge--otros";
}

export function prodThumb(p, size = "md") {
  if (p.img) {
    const cls = size === "lg" ? "p-img p-img--lg" : "p-img";
    return `<img class="${cls}" src="${p.img}" alt="${p.name}" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="p-img-fallback ${size === 'lg' ? 'p-img-fallback--lg' : ''}" style="display:none">${p.e}</div>`;
  }
  return `<div class="p-icon">${p.e}</div>`;
}
