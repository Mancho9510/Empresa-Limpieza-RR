export const $ = id => document.getElementById(id);

export function overlayOn(on) {
  const el = $("overlay");
  if (el) el.classList.toggle("on", on);
}

export function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3000);
}
