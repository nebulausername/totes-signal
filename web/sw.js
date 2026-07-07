// Totes Signal — Service Worker (PWA / Offline, M8).
// Zwei-Tier-Cache: kleine Boot-Shell wird beim Install precached, die ~90 MB
// game.pk3 wird NUR lazy (cache-first + put-on-miss) nach dem ersten Spiel
// persistiert. Bewusst KEIN COOP/COEP (Engine ist single-threaded; Isolation
// wuerde den kaufmeinewebsite.de-iframe-Embed brechen) — der SW braucht keine.
// Alles laeuft unter dem relativen Scope (./), damit /zombie/, GitHub Pages und
// local dev denselben Code teilen.

const SW_VERSION = 'v5';                 // v5: M1 Movement-Fix (Pointer-Registry) + M2 Controls 2.0 (9er-Set, Auto-Sprint, Gear-Sheet)
const SHELL = 'totes-shell-' + SW_VERSION;
const DATA  = 'totes-data-'  + SW_VERSION;
const ALLOW = [SHELL, DATA];

// Boot-kritisch (~5.4 MB). game.pk3 ist ABSICHTLICH NICHT dabei — ein einziges
// Fehlbyte wuerde den ganzen install() scheitern lassen.
const SHELL_ASSETS = [
  './',
  'index.html',
  'ftewebgl.js',
  'ftewebgl.wasm',
  'default.fmf',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'favicon.ico',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return cache.addAll(SHELL_ASSETS);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        // Nur unsere eigenen Caches verwalten; die engine-eigene CacheStorage
        // (andere Namen) NIE anfassen.
        if ((k.indexOf('totes-') === 0 || k.indexOf('endzeit-') === 0) && ALLOW.indexOf(k) === -1) {
          return caches.delete(k);
        }
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Nur same-origin GETs innerhalb des SW-Scopes bedienen.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf(new URL(self.registration.scope).pathname) !== 0) return;

  // Range-Requests NIE aus dem Cache bedienen — die Cache API kann kein 206;
  // ein volles 200-aus-Cache wuerde den 90-MB-Stream korrumpieren.
  if (req.headers.has('range')) { event.respondWith(fetch(req)); return; }

  // game.pk3 (~90 MB, immutable) -> cache-first, lazy put on miss (offline replay).
  if (/\/nzp\/game\.pk3$/.test(url.pathname)) {
    event.respondWith(
      caches.open(DATA).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.ok && res.status === 200) cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // progs.pk3 (kompilierte Spiellogik, aendert sich bei JEDEM Repack) ->
  // network-first: immer frisch holen, Cache nur als Offline-Fallback.
  if (/\/nzp\/progs\.pk3$/.test(url.pathname)) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok && res.status === 200) {
          var copy = res.clone(); caches.open(DATA).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.open(DATA).then(function (c) { return c.match(req); });
      })
    );
    return;
  }

  // Navigation (./ bzw. index.html) -> network-first, damit Rebrand-Updates
  // ausgeliefert werden; Offline-Fallback auf die gecachte index.html.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match('index.html', { ignoreSearch: true })
          .then(function (hit) { return hit || caches.match('./'); });
      })
    );
    return;
  }

  // Restliche Shell-Assets -> cache-first (instant offline boot), Netz-Fallback.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
