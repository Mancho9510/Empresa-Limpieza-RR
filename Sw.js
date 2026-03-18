/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Service Worker v1
   Estrategia: Cache First para assets estáticos,
               Network First para datos dinámicos
═══════════════════════════════════════════════════════════ */

const CACHE_NAME    = "lrr-v2";
const CACHE_TIMEOUT = 5000; // ms antes de usar caché si la red tarda

// Assets que se cachean al instalar
const PRECACHE = [
  "./index.html",
  "./Admin.html",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./admin/api.js",
  "./admin/admin.ui.js",
  "./admin/admin.logic.js",
  "./manifest.json",
  "./tools/GenerateIcons.html",
];

/* ── Instalación: pre-cachear assets estáticos ── */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ── Activación: limpiar cachés antiguas ── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: estrategia por tipo de recurso ── */
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Apps Script: siempre red (datos en tiempo real)
  if (url.hostname.includes("script.google.com")) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(
          JSON.stringify({ ok: false, error: "Sin conexión" }),
          { headers: { "Content-Type": "application/json" } }
        ))
    );
    return;
  }

  // Google Fonts: caché primero
  if (url.hostname.includes("fonts.gstatic.com") || url.hostname.includes("fonts.googleapis.com")) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Google Drive (imágenes de productos): red con fallback a caché
  if (url.hostname.includes("drive.google.com") || url.hostname.includes("lh3.googleusercontent.com")) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets locales (HTML, CSS, JS): caché con actualización en background
  if (url.pathname.match(/\.(html|css|js|json|png|jpg|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Todo lo demás: red directa
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
