// Die Cache- und Sicherheits-Header-Matrix als DATEN, nicht als Copy-Paste.
// Eine neue Regel ist damit eine Zeile, und die Abweichungen des demo-Vhosts
// sind sichtbar statt in Assertions vergraben.

export const HOSTS = {
  canonical: 'https://totersignal.de',
  mirror:    'https://zombie.kaufmeinewebsite.de',
  demo:      'https://demo.kaufmeinewebsite.de/zombie',
};

// Header, die auf JEDER Antwort stehen muessen. Der demo-Vhost hat eigene
// Werte (er wird im Portfolio eingebettet und traegt deshalb frame-ancestors).
export const REQUIRED = {
  canonical: ['x-content-type-options', 'referrer-policy', 'strict-transport-security', 'permissions-policy'],
  mirror:    ['x-content-type-options', 'referrer-policy', 'strict-transport-security', 'permissions-policy'],
  demo:      ['x-content-type-options', 'referrer-policy', 'strict-transport-security', 'content-security-policy'],
};

// pfad -> erwartete Cache-Control.
// Der wichtigste Eintrag ist progs.pk3: er fiel bis 08/2026 unter die
// 30-Tage-Regel, wodurch Spiellogik-Updates zurueckkehrende Spieler nie
// erreicht haben.
export const CACHE_MATRIX = [
  { path: '/',                 expect: /no-cache/,                        why: 'Shell muss revalidieren' },
  { path: '/version.json',     expect: /no-cache/,                        why: 'Update-Erkennung' },
  { path: '/sw.js',            expect: /no-cache/,                        why: 'Service Worker' },
  { path: '/default.fmf',      expect: /no-cache/,                        why: 'Engine-Manifest' },
  { path: '/nzp/progs.pk3',    expect: /no-cache/,                        why: 'Spiellogik, aendert sich bei jedem Build' },
  { path: '/nzp/game.pk3',     expect: /max-age=31536000.*immutable/,     why: 'sha-gepinnt, wird nie neu gepackt' },
  { path: '/ftewebgl.wasm',    expect: /max-age=2592000/,                 why: 'Engine, Wechsel ueber SW_VERSION' },
  { path: '/icons/icon-192.png', expect: /max-age=2592000/,               why: 'Icon' },
];
