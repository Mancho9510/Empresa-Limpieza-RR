import { $ } from '../utils/dom.js';

let deferredPrompt = null;

export function initPWA() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!sessionStorage.getItem("pwa-dismissed")) {
      $("pwaBanner")?.classList.add("show");
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    $("pwaBanner")?.classList.remove("show");
    sessionStorage.setItem("pwa-dismissed", "1");
  });

  if ("serviceWorker" in navigator) {
    const isProd = location.protocol === "https:";
    if (isProd) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" })
          .then(reg => console.log("SW registrado ✅", reg.scope))
          .catch(() => {});
      });
    }
  }
}

export function installPWA() {
  const banner = $("pwaBanner");
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      if (banner) banner.classList.remove("show");
    });
  } else {
    if (banner) banner.classList.remove("show");
  }
}

export function dismissPWA() {
  sessionStorage.setItem("pwa-dismissed", "1");
  $("pwaBanner")?.classList.remove("show");
}

export function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("lrr-theme", next);
}
