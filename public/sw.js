/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Service Worker v3
   Para Vite V2 — archivo en public/sw.js
   Se sirve desde /sw.js en producción y dev con HTTPS

   Estrategias:
   - Apps Script    → Network Only (datos siempre frescos)
   - Google Fonts   → Cache First
   - Google Drive   → Network First con fallback a caché
   - Assets Vite    → Cache First + actualización en background
   - Todo lo demás  → Network First
═══════════════════════════════════════════════════════════ */

const CACHE_NAME = "lrr-v3";

/* ── Instalación ── */
self.addEventListener("install", event => {
  // Activar inmediatamente sin esperar a que se cierre la pestaña
  self.skipWaiting();
  // Cachear solo el index — los assets de Vite tienen hash y se cachean solos
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(["/", "/index.html"]).catch(() => {})
    )
  );
});

/* ── Activación: limpiar cachés viejas ── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: estrategia por origen ── */
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo interceptar GET
  if (req.method !== "GET") return;

  // Apps Script: siempre red — datos en tiempo real
  if (url.hostname.includes("script.google.com")) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ ok: false, error: "Sin conexión" }), {
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Google Fonts: caché primero — cambian muy poco
  if (url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.match(req).then(cached =>
        cached || fetch(req).then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          }
          return res;
        })
      )
    );
    return;
  }

  // Google Drive / imágenes productos: red primero, caché como fallback
  if (url.hostname.includes("drive.google.com") ||
      url.hostname.includes("lh3.googleusercontent.com")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Assets con hash de Vite (.js, .css, imágenes): caché first — el hash garantiza frescura
  if (url.pathname.match(/\/assets\/.+\.(js|css|png|svg|webp|jpg|woff2?)(\?.*)?$/)) {
    event.respondWith(
      caches.match(req).then(cached =>
        cached || fetch(req).then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          }
          return res;
        })
      )
    );
    return;
  }

  // Navegación (HTML pages): network first con fallback offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match("/index.html") || caches.match("/"))
    );
    return;
  }

  // Resto: red directa
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});