import { test, expect, request } from '@playwright/test';

// API-Tests brauchen keinen Browser -> nur einmal laufen lassen.
test.describe.configure({ mode: 'serial' });
test.skip(({ browserName }) => browserName !== 'chromium', 'nur einmal noetig');

const BASE = process.env.TS_API_BASE || 'https://totersignal.de';
const ORIGIN = { 'Origin': 'https://totersignal.de', 'Content-Type': 'application/json' };

// /api/auth/ laeuft in nginx unter zone=sensitive: 6 Anfragen pro Minute,
// burst 5. Das ist Absicht -- Kontoerstellung ist teuer und ein offener
// Endpunkt. Die Tests muessen sich danach richten statt die Produktionsregel
// aufzuweichen: bei 429 warten und erneut versuchen.
async function postAuth(ctx, pfad, daten, erwartet) {
  for (let versuch = 0; versuch < 6; versuch++) {
    const r = await ctx.post(`${BASE}${pfad}`, { headers: ORIGIN, data: daten });
    if (r.status() !== 429) return r;
    await new Promise((res) => setTimeout(res, 11_000));
  }
  throw new Error(`${pfad}: dauerhaft 429 -- Rate-Limit zu eng oder Endpunkt haengt`);
}

async function anon(ctx) {
  const r = await postAuth(ctx, '/api/auth/anon',
    { age_confirmed: true, locale: 'de', privacy_version: '1.0' });
  expect(r.status(), await r.text()).toBe(201);
  return r.json();
}

test('health meldet Datenbankzustand', async () => {
  const ctx = await request.newContext();
  const r = await ctx.get(`${BASE}/api/health`);
  expect(r.status()).toBe(200);
  const j = await r.json();
  expect(j.ok).toBe(true);
  expect(j.db, 'Datenbank nicht erreichbar').toBe(true);
  await ctx.dispose();
});

test('API-Antworten werden NICHT gecacht', async () => {
  const ctx = await request.newContext();
  const r = await ctx.get(`${BASE}/api/health`);
  const cc = r.headers()['cache-control'] || '';
  // Der grosse Fallstrick waere, dass die 30-Tage-Asset-Regel greift.
  expect(cc, `API haette 30-Tage-Cache bekommen: ${cc}`).not.toMatch(/max-age=2592000/);
  expect(r.headers()['x-content-type-options']).toBe('nosniff');
  await ctx.dispose();
});

test('anonymes Konto: sofort spielbereit, mit Deckname', async () => {
  const ctx = await request.newContext();
  const j = await anon(ctx);
  expect(j.user.is_anonymous).toBe(true);
  expect(j.user.display_name).toMatch(/^[A-Za-z]+-\d{4}$/);
  // Der Name geht per `seta name` in die Engine -- deren Schrift kann nur
  // ASCII 33..126, und '|' waere das Marker-Trennzeichen.
  expect(j.user.display_name_ascii).toMatch(/^[!-~]{3,20}$/);
  expect(j.user.display_name_ascii).not.toMatch(/[|^"';]/);
  expect(j.access_token.split('.').length).toBe(3);
  expect(j.expires_in).toBe(900);
  await ctx.dispose();
});

test('Altersbestaetigung ist Pflicht (Art. 8 DSGVO)', async () => {
  const ctx = await request.newContext();
  const r = await postAuth(ctx, '/api/auth/anon', { locale: 'de' });
  expect(r.status()).toBe(400);
  expect((await r.json()).error.code).toBe('VALIDATION');
  await ctx.dispose();
});

test('fremde Herkunft wird abgewiesen (CSRF)', async () => {
  const ctx = await request.newContext();
  const r = await ctx.post(`${BASE}/api/auth/anon`, {
    headers: { 'Origin': 'https://boeser-nachbar.example', 'Content-Type': 'application/json' },
    data: { age_confirmed: true },
  });
  expect(r.status()).toBe(403);
  expect((await r.json()).error.code).toBe('CSRF_FAILED');
  await ctx.dispose();
});

test('/auth/me braucht ein Token', async () => {
  const ctx = await request.newContext();
  const r = await ctx.get(`${BASE}/api/auth/me`);
  expect(r.status()).toBe(401);
  await ctx.dispose();
});

test('/auth/me liefert Profil und Statistik', async () => {
  const ctx = await request.newContext();
  const j = await anon(ctx);
  const r = await ctx.get(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${j.access_token}` },
  });
  expect(r.status()).toBe(200);
  const me = await r.json();
  expect(me.user.id).toBe(j.user.id);
  expect(me.user.level).toBe(1);
  expect(me.stats.runs).toBe(0);
  await ctx.dispose();
});

// WICHTIG fuer diese beiden Tests: der Server bevorzugt das Cookie vor dem
// Token im Body -- fuer einen Browser ist das der sichere Weg, das Body-Feld
// ist nur der Notanker fuer anonyme Konten (iOS raeumt Cookies ab). Ein
// Playwright-Kontext haelt Cookies aber fest, und dann wuerde die Rotation
// gegen das FRISCHE Cookie laufen statt gegen das alte Token. Deshalb je
// Schritt ein eigener, cookie-freier Kontext.
async function frischerKontext() {
  return request.newContext({ storageState: { cookies: [], origins: [] } });
}

test('Erneuern rotiert das Token und macht das alte ungueltig', async () => {
  const start = await frischerKontext();
  const j = await anon(start);
  await start.dispose();

  const c1 = await frischerKontext();
  const r1 = await postAuth(c1, '/api/auth/refresh', { refresh_token: j.refresh_token });
  expect(r1.status(), await r1.text()).toBe(200);
  const neu = await r1.json();
  expect(neu.refresh_token, 'Token wurde nicht rotiert').not.toBe(j.refresh_token);
  await c1.dispose();

  // Das ALTE Token darf nicht mehr funktionieren.
  const c2 = await frischerKontext();
  const r2 = await postAuth(c2, '/api/auth/refresh', { refresh_token: j.refresh_token });
  expect(r2.status(), 'altes Token wurde noch akzeptiert').toBe(401);
  await c2.dispose();
});

test('Wiederverwendung eines alten Tokens widerruft die ganze Familie', async () => {
  const start = await frischerKontext();
  const j = await anon(start);
  await start.dispose();

  const c1 = await frischerKontext();
  const neu = await (await postAuth(c1, '/api/auth/refresh', { refresh_token: j.refresh_token })).json();
  await c1.dispose();

  // Angreifer legt das kopierte, bereits ersetzte Token vor.
  const c2 = await frischerKontext();
  await postAuth(c2, '/api/auth/refresh', { refresh_token: j.refresh_token });
  await c2.dispose();

  // Damit muss auch das gueltige Token des echten Nutzers gefallen sein --
  // sonst koennte ein Dieb die Sitzung unbemerkt weiterlaufen lassen.
  const c3 = await frischerKontext();
  const r3 = await postAuth(c3, '/api/auth/refresh', { refresh_token: neu.refresh_token });
  expect(r3.status(), 'Familie wurde nicht widerrufen -> gestohlenes Token blieb nutzbar').toBe(401);
  await c3.dispose();
});

test('Namen aendern, Doppelvergabe wird abgelehnt', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const b = await anon(ctx);
  const name = 'Pruefling-' + Date.now().toString().slice(-6);

  const r1 = await ctx.patch(`${BASE}/api/profile`, {
    headers: { ...ORIGIN, Authorization: `Bearer ${a.access_token}` },
    data: { display_name: name },
  });
  expect(r1.status(), await r1.text()).toBe(200);
  expect((await r1.json()).profile.display_name).toBe(name);

  const r2 = await ctx.patch(`${BASE}/api/profile`, {
    headers: { ...ORIGIN, Authorization: `Bearer ${b.access_token}` },
    data: { display_name: name },
  });
  expect(r2.status()).toBe(409);
  expect((await r2.json()).error.code).toBe('NAME_TAKEN');
  await ctx.dispose();
});

test('Umlaute werden fuer die Engine transliteriert', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const r = await ctx.patch(`${BASE}/api/profile`, {
    headers: { ...ORIGIN, Authorization: `Bearer ${a.access_token}` },
    data: { display_name: 'Müller' + Date.now().toString().slice(-4) },
  });
  expect(r.status(), await r.text()).toBe(200);
  const p = (await r.json()).profile;
  expect(p.display_name).toMatch(/^Müller/);          // im Web echte Umlaute
  expect(p.display_name_ascii).toMatch(/^Mueller/);   // in der Engine transliteriert
  await ctx.dispose();
});

test('Rate-Limit greift auf /api/auth/ (Schutz, kein Nebeneffekt)', async () => {
  const ctx = await request.newContext();
  let sah429 = false;
  // Deutlich ueber burst 5 hinaus -- muss irgendwann 429 liefern.
  for (let i = 0; i < 14 && !sah429; i++) {
    const r = await ctx.post(`${BASE}/api/auth/anon`, {
      headers: ORIGIN, data: { age_confirmed: true },
    });
    if (r.status() === 429) sah429 = true;
  }
  expect(sah429, 'kein 429 -- der Endpunkt ist ungebremst offen').toBe(true);
  await ctx.dispose();
});
