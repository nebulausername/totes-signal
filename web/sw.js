// Totes Signal — Service Worker (PWA / Offline, M8).
// Zwei-Tier-Cache: kleine Boot-Shell wird beim Install precached, die ~90 MB
// game.pk3 wird NUR lazy (cache-first + put-on-miss) nach dem ersten Spiel
// persistiert. Bewusst KEIN COOP/COEP (Engine ist single-threaded; Isolation
// wuerde den kaufmeinewebsite.de-iframe-Embed brechen) — der SW braucht keine.
// Alles laeuft unter dem relativen Scope (./), damit /zombie/, GitHub Pages und
// local dev denselben Code teilen.

const SW_VERSION = 'v44';                // v13: Cache-Entkopplung + no-cache fuer progs.pk3
const SHELL = 'totes-shell-' + SW_VERSION;

// EINGEFROREN auf v12 -- absichtlich noch die alte Nummer.
//
// Hier liegen die ~90 MB game.pk3. Frueher hing dieser Name ebenfalls an
// SW_VERSION, und activate() loescht jeden totes-*-Cache ausserhalb von ALLOW.
// Die Dreifach-Bump-Regel VERLANGT aber einen SW_VERSION-Bump bei jeder
// index.html-Aenderung -> jeder Shell-Deploy hat den Spielern 90 MB
// Neu-Download aufgezwungen. Fuer einen wiederkehrenden Spieler war das
// teurer als das Update wert war.
//
// Ein Umbenennen auf 'totes-data-v1' wuerde den Cache EINMAL loeschen --
// also genau den Schaden anrichten, den wir beheben. Deshalb eingefroren.
//
// NUR aendern, wenn sich ein pk3-DATEINAME aendert. Das kostet dann jeden
// installierten Spieler einen 90-MB-Neu-Download, und zwar bewusst.
const DATA  = 'totes-data-v12';
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
  // Ohne diese beiden zeigt der erste OFFLINE-Start ein schwarzes Gate und
  // einen Death-Screen ohne Key-Art -- sie landeten bisher nur zufaellig
  // ueber den Catch-all im Cache.
  'img/gate-poster.jpg',
  'img/death-keyart.jpg',
  // gate-loop.mp4 BEWUSST NICHT: Video wird per Range-Request geholt, und
  // die Cache API kann kein 206.
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

  // API-Aufrufe gehen IMMER direkt ans Netz. Ohne diese Zeile wuerde der
  // Catch-all am Dateiende (cache-first) die Bestenliste fuer immer aus dem
  // Cache liefern.
  if (url.pathname.indexOf('/api/') !== -1) return;

  // Range-Requests NIE aus dem Cache bedienen — die Cache API kann kein 206;
  // ein volles 200-aus-Cache wuerde den 90-MB-Stream korrumpieren.
  if (req.headers.has('range')) { event.respondWith(fetch(req)); return; }

  // version.json: IMMER frisch vom Netz (Update-Erkennung) — nie aus dem Cache.
  if (/\/version\.json$/.test(url.pathname)) {
    event.respondWith(fetch(req).catch(function () {
      return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }

  // game.pk3 (~90 MB, immutable) -> cache-first, lazy put on miss (offline replay).
  if (/\/nzp\/game\.pk3$/.test(url.pathname)) {
    event.respondWith(
      caches.open(DATA).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            // 90 MB: bei vollem Speicherkontingent lehnt put() ab. Ohne catch
            // waere das eine unbehandelte Promise-Ablehnung.
            if (res && res.ok && res.status === 200)
              cache.put(req, res.clone()).catch(function () {});
            return res;
          });
        });
      })
    );
    return;
  }

  // progs.pk3 (kompilierte Spiellogik, aendert sich bei JEDEM Repack).
  //
  // `cache: 'no-cache'` ist hier der eigentliche Punkt und nicht Kosmetik:
  // ein blankes fetch(req) benutzt den HTTP-Cache des Browsers, und der hat
  // diese Datei bis 08/2026 mit `max-age=2592000` gespeichert bekommen. Ein
  // "network-first" im SW lief also ins Leere -- das Netz wurde nie gefragt,
  // und Spieler liefen bis zu 30 Tage mit alter Spiellogik. Diese Option
  // erzwingt eine bedingte Anfrage AM HTTP-Cache VORBEI und heilt damit auch
  // Geraete, die den alten Header noch gespeichert haben.
  //
  // Bewusst 'no-cache' und nicht 'reload': 'reload' laedt immer die vollen
  // ~1,8 MB, 'no-cache' laesst bei unveraendertem Build ein 304 zu.
  if (/\/nzp\/progs\.pk3$/.test(url.pathname)) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' }).then(function (res) {
        if (res && res.ok && res.status === 200) {
          var copy = res.clone();
          caches.open(DATA).then(function (c) { return c.put(req, copy); })
            .catch(function () {});          // Speicherkontingent voll: egal
        }
        return res;
      }).catch(function () {
        // Offline: gecachte Fassung, sonst ein ehrlicher Fehler. Ohne den
        // Fallback lieferte match() `undefined` an respondWith() -- das ist
        // ein harter Netzwerkfehler statt einer sauberen Meldung.
        return caches.open(DATA).then(function (c) { return c.match(req); })
          .then(function (hit) {
            return hit || new Response('progs.pk3 offline nicht verfuegbar',
              { status: 504, statusText: 'Gateway Timeout' });
          });
      })
    );
    return;
  }

  // Navigation (./ bzw. index.html) -> network-first, damit Rebrand-Updates
  // ausgeliefert werden; Offline-Fallback auf die gecachte index.html.
  if (req.mode === 'navigate') {
    // network-first, aber mit Zeitlimit: ohne das wartet ein Spieler bei
    // wackligem Mobilfunk unbegrenzt auf das Netz, obwohl die Shell offline
    // im Cache liegt. 4 s ist grosszuegig fuer 73 KB und deutlich kuerzer
    // als die gefuehlte Schmerzgrenze.
    var fromCache = function () {
      return caches.match('index.html', { ignoreSearch: true })
        .then(function (hit) { return hit || caches.match('./'); });
    };
    event.respondWith(
      new Promise(function (resolve) {
        var settled = false;
        var done = function (r) { if (!settled && r) { settled = true; resolve(r); } };
        var timer = setTimeout(function () {
          fromCache().then(function (hit) { done(hit); });
        }, 4000);
        fetch(req).then(function (res) {
          clearTimeout(timer); done(res);
        }).catch(function () {
          clearTimeout(timer);
          fromCache().then(function (hit) {
            done(hit || new Response('Offline', { status: 503 }));
          });
        });
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
