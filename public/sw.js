/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Service Worker v4
   Fix: "Response body is already used" en todas las estrategias

   Regla de oro para cachear sin errores:
     const copy = safeClone(res);
     if (copy) cache.put(req, copy);
     return res;   ← siempre el original, nunca el clone

   Estrategias:
   - Apps Script    → Network Only
   - Google Fonts   → Cache First
   - Google Drive   → Network First + fallback caché (sin crash en redirect)
   - Assets /assets/→ Cache First (hash de Vite garantiza frescura)
   - Navegación     → Network First + fallback offline
   - Resto          → Network First
═══════════════════════════════════════════════════════════ */

const CACHE_NAME = "lrr-v4";

/* ──────────────────────────────────────────────────────────
   HELPER: clonar solo si es seguro hacerlo
   Retorna el clone listo para cachear, o null si no se puede.

   No se puede clonar cuando:
   - bodyUsed = true  (el body ya fue leído)
   - type = 'opaque'  (cross-origin sin CORS — no se puede inspeccionar)
   - type = 'error'   (respuesta de error de red)
   - status = 0       (opaque + error)
────────────────────────────────────────────────────────── */
function safeClone(response) {
  if (!response) return null;
  if (response.bodyUsed) return null;
  if (response.type === "opaque") return null;
  if (response.type === "error") return null;
  if (response.status === 0) return null;
  try {
    return response.clone();
  } catch (_) {
    return null;
  }
}

/* Helper: cachear en background sin bloquear la respuesta */
function cachePut(request, response) {
  const copy = safeClone(response);
  if (!copy) return;
  caches.open(CACHE_NAME)
    .then(cache => cache.put(request, copy))
    .catch(() => {});
}

/* ── Instalación ── */
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(["/", "/index.html"]).catch(() => {}))
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

/* ── Fetch ── */
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  /* ── EXCLUSIONES CRÍTICAS ── */
if (
  url.pathname === "/manifest.json" ||
  url.pathname === "/favicon.ico" ||
  url.pathname.startsWith("/icons/")||
  url.pathname.endsWith(".webmanifest")
) {
  return;
}

  // Solo GET
  if (req.method !== "GET") return;

  /* ── 1. Apps Script: siempre red, nunca caché ── */
  if (url.hostname.includes("script.google.com")) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(
          JSON.stringify({ ok: false, error: "Sin conexión" }),
          { headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  /* ── 2. Google Fonts: caché primero ── */
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          cachePut(req, res);
          return res;
        });
      })
    );
    return;
  }

  /* ── 3. Google Drive / imágenes de productos ──
     Drive SIEMPRE redirige (302 → lh3.googleusercontent.com).
     Después de la redirección la response puede ser opaque
     o tener bodyUsed = true. safeClone() lo maneja sin crash. ── */
  if (
    url.hostname.includes("drive.google.com") ||
    url.hostname.includes("lh3.googleusercontent.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {
    event.respondWith(
      fetch(req)
        .then(res => {
          cachePut(req, res);
          return res;
        })
        .catch(() => caches.match(req).then(c => c || Response.error()))
    );
    return;
  }

  /* ── 4. Assets de Vite (con hash en nombre): caché first ──
     /assets/main-ABC123.js → el hash cambia con cada build. ── */
  if (url.pathname.match(/^\/assets\/.+\.(js|css|png|svg|webp|jpg|jpeg|woff2?|ico)(\?.*)?$/)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res.ok && url.origin === self.location.origin) {
            cachePut(req, res);
          }
          return res;
        });
      })
    );
    return;
  }

  /* ── 5. Navegación (HTML): network first + fallback offline ── */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) cachePut(req, res);
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then(c => c || caches.match("/index.html"))
            .then(c => c || caches.match("/"))
        )
    );
    return;
  }

  /* ── 6. Todo lo demás: network first, sin cachear ── */
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then(c => c || Response.error()))
  );
});