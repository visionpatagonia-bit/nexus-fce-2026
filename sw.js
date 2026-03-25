// ═══════════════════════════════════════════════════════════════
//  SERVICE WORKER  ·  Portal FCE 2026
//  Estrategia: Network-first para materiales.json (siempre fresco)
//              Cache-first para el resto (offline)
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'fce-portal-v9.3.3';
const FONT_CACHE = 'fce-fonts-v9.3.3';

const SHELL_FILES = [
  './index.html',
  './manifest.json',
  /* v9.0: JSONs externos cacheados para modo offline en la Patagonia */
  './glossary.json',
  './comparativa.json',
  './noticias.json'
];
/* NOTA: materiales.json sigue siendo network-first por diseño —
   permite actualizar el contenido sin reinstalar la PWA. */

// ── INSTALL ─────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('NEXUS v9.3 — cacheando shell');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => {
        console.log('NEXUS v9.3 READY — shell listo, Itinerario VI integrado');
        return self.skipWaiting();
      })
      .catch(err => console.error('[FCE SW] Error en install:', err))
  );
});

// ── ACTIVATE ────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[FCE SW] Activate v9.3 — limpiando caches viejos');
  self.skipWaiting();
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => {
            console.log('[FCE SW] Eliminando cache viejo:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Fuentes Google → cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok && event.request.method === 'GET') cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // materiales.json → SIEMPRE network-first (nunca cacheado)
  // Así cada edición se refleja inmediatamente sin reinstalar la PWA
  if (url.pathname.endsWith('materiales.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))  // offline fallback
    );
    return;
  }

  // Todo lo demás → cache-first con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Clone IMMEDIATELY before any async operation consumes the body
        if (response.ok && event.request.method === 'GET') {
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
