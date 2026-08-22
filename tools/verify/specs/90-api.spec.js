import { test, expect, request } from '@playwright/test';

// API-Tests brauchen keinen Browser -> nur einmal laufen lassen.
test.describe.configure({ mode: 'serial' });
// browserName ist fuer chromium-desktop UND chromium-mobile 'chromium' --
// danach zu filtern liesse diese reine HTTP-Suite ZWEIMAL laufen, und der
// zweite Lauf faellt zuverlaessig ins Rate-Limit. Deshalb ueber den
// Projektnamen, und zwar in beforeEach: die Kurzform test.skip(fn) bekommt
// kein testInfo.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop',
    'reine HTTP-Pruefung -- genau einmal, nicht je Browser');
});

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

// ---------------------------------------------------------------------------
// Laeufe und Bestenliste
// ---------------------------------------------------------------------------

// Ein glaubwuerdiger KURZER Lauf.
//
// Wichtig zu verstehen, warum die Zahlen so klein sind: der Server verankert
// die Spielzeit an SEINER Uhr (C5). Ein Test laeuft in Sekunden ab, kann also
// keinen 15-Minuten-Lauf behaupten -- genau das ist der Sinn der Pruefung.
// Ein erster Entwurf dieses Tests behauptete Runde 12 in 900 Sekunden und
// wurde zu Recht abgewiesen.
//
// Die Grenzen kommen aus den echten Formeln in server/rounds.qc:
//   Zombies bis R5 ~ 75  ->  Mindestdauer 75 * 0,08 = 6 s (C7)
//                        ->  Kill-Obergrenze 1,15 * 75 + 10 = 96 (C2)
//   C5 erlaubt Spielzeit <= Echtzeit + 30 s Toleranz.
function laufDaten(runde = 5) {
  return {
    rounds: runde,
    score: runde * 620,
    kills: Math.floor(runde * 13),
    headshots: Math.floor(runde * 4),
    downs: 1, revives: 0,
    secs: 25,
  };
}

async function starteLauf(ctx, token, map = 'ndu') {
  const r = await ctx.post(`${BASE}/api/runs/start`, {
    headers: { ...ORIGIN, Authorization: `Bearer ${token}` },
    data: { map_key: map, map_pretty: 'Nacht der Untoten', difficulty: 0, gamemode: 0,
            start_round: 0, player_count: 1, aim_assist: 1, shell_build: 'test' },
  });
  expect(r.status(), await r.text()).toBe(201);
  return r.json();
}

test('Lauf: starten, Herzschlag, abschliessen, verifiziert', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const auth = { ...ORIGIN, Authorization: `Bearer ${a.access_token}` };
  const lauf = await starteLauf(ctx, a.access_token);
  expect(lauf.run_token, 'kein Lauf-Token').toBeTruthy();

  const hb = await ctx.post(`${BASE}/api/runs/${lauf.run_id}/heartbeat`, {
    headers: { ...auth, 'X-Run-Token': lauf.run_token },
    data: { beats: [
      { seq: 1, round: 2, score: 1200, kills: 20, headshots: 6,  secs: 9 },
      { seq: 2, round: 4, score: 2400, kills: 45, headshots: 14, secs: 18 },
      { seq: 3, round: 5, score: 3100, kills: 65, headshots: 20, secs: 25 },
    ] },
  });
  expect(hb.status()).toBe(204);

  const fin = await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, {
    headers: { ...auth, 'X-Run-Token': lauf.run_token },
    data: { ...laufDaten(5), difficulty: 0, gamemode: 0, map_key: 'ndu' },
  });
  expect(fin.status(), await fin.text()).toBe(200);
  const j = await fin.json();
  expect(j.status, `Lauf abgewiesen: ${j.reason}`).toBe('verified');
  expect(j.xp_gained).toBeGreaterThan(0);
  expect(j.rank.map).toBeGreaterThanOrEqual(1);
  await ctx.dispose();
});

test('Lauf ohne gueltiges Token wird abgewiesen', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const lauf = await starteLauf(ctx, a.access_token);
  const r = await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, {
    headers: { ...ORIGIN, Authorization: `Bearer ${a.access_token}`, 'X-Run-Token': 'falsch' },
    data: laufDaten(5),
  });
  expect(r.status()).toBe(403);
  expect((await r.json()).error.code).toBe('RUN_TOKEN_INVALID');
  await ctx.dispose();
});

test('unmoegliche Kill-Zahl wird abgewiesen', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const lauf = await starteLauf(ctx, a.access_token);
  const r = await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, {
    headers: { ...ORIGIN, Authorization: `Bearer ${a.access_token}`, 'X-Run-Token': lauf.run_token },
    data: { ...laufDaten(3), kills: 500000, headshots: 400000 },
  });
  const j = await r.json();
  expect(j.status, 'ein unmoeglicher Lauf wurde akzeptiert').toBe('rejected');
  expect(j.xp_gained).toBe(0);
  await ctx.dispose();
});

test('Runde 40 in 20 Sekunden wird abgewiesen (Echtzeit-Anker)', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const lauf = await starteLauf(ctx, a.access_token);
  const r = await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, {
    headers: { ...ORIGIN, Authorization: `Bearer ${a.access_token}`, 'X-Run-Token': lauf.run_token },
    data: { rounds: 40, score: 999999, kills: 1200, headshots: 400, downs: 0, revives: 0, secs: 20 },
  });
  const j = await r.json();
  expect(j.status).toBe('rejected');
  await ctx.dispose();
});

test('doppelter Abschluss zaehlt nicht doppelt', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const auth = { ...ORIGIN, Authorization: `Bearer ${a.access_token}` };
  const lauf = await starteLauf(ctx, a.access_token);
  const kopf = { ...auth, 'X-Run-Token': lauf.run_token };

  // Runde 5, damit die Deckungspruefung (C14) nicht anspringt: fuer laengere
  // Laeufe OHNE Herzschlag-Spur markiert der Server zu Recht, und ein
  // markierter Lauf zaehlt nicht als verifiziert.
  const r1 = await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, { headers: kopf, data: laufDaten(5) });
  expect((await r1.json()).status, 'Grundlauf nicht verifiziert').toBe('verified');
  const r2 = await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, { headers: kopf, data: laufDaten(5) });
  const j2 = await r2.json();
  expect(j2.bereits_eingereicht, 'zweiter Abschluss wurde erneut gewertet').toBe(true);

  const me = await (await ctx.get(`${BASE}/api/auth/me`, { headers: auth })).json();
  expect(me.stats.runs, 'Lauf wurde doppelt gezaehlt').toBe(1);
  await ctx.dispose();
});

test('Bestenliste zeigt den Lauf und eine Zeile je Spieler', async () => {
  const ctx = await request.newContext();
  const r = await ctx.get(`${BASE}/api/leaderboard?metric=rounds&window=all&map=ndu`);
  expect(r.status()).toBe(200);
  const j = await r.json();
  expect(Array.isArray(j.entries)).toBe(true);
  expect(j.entries.length, 'Bestenliste ist leer, obwohl Laeufe eingereicht wurden').toBeGreaterThan(0);

  const nutzer = j.entries.map((e) => e.user_id);
  expect(new Set(nutzer).size, 'ein Spieler taucht mehrfach auf').toBe(nutzer.length);
  for (let i = 1; i < j.entries.length; i++)
    expect(j.entries[i].rounds).toBeLessThanOrEqual(j.entries[i - 1].rounds);
  await ctx.dispose();
});

test('abgewiesene Laeufe stehen NICHT auf der Bestenliste', async () => {
  const ctx = await request.newContext();
  const r = await ctx.get(`${BASE}/api/leaderboard?metric=rounds&window=all&map=ndu&limit=100`);
  const j = await r.json();
  // Runde 40 in 20 Sekunden war einer der Testlaeufe oben.
  const unmoeglich = j.entries.filter((e) => e.rounds >= 40 && e.in_game_secs < 60);
  expect(unmoeglich, `abgewiesener Lauf ist sichtbar: ${JSON.stringify(unmoeglich)}`).toHaveLength(0);
  await ctx.dispose();
});

// ---------------------------------------------------------------------------
// Erfolge
// ---------------------------------------------------------------------------

test('Erfolgs-Definitionen sind oeffentlich und deutsch', async () => {
  const ctx = await request.newContext();
  const r = await ctx.get(`${BASE}/api/achievements`);
  expect(r.status()).toBe(200);
  const d = (await r.json()).defs;
  expect(d.length, 'nicht alle 42 Erfolge').toBe(42);
  expect(d[0].name_de).toBeTruthy();
  // Nicht erreichbare Erfolge muessen als solche gekennzeichnet sein -- drei
  // verweisen auf Kino der Toten, eine Karte die wir gar nicht ausliefern.
  expect(d.some((x) => !x.verfuegbar), 'kein Erfolg als unerreichbar markiert').toBe(true);
  await ctx.dispose();
});

test('abgeleitete Erfolge wirken RUECKWIRKEND aus den Laufdaten', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const auth = { ...ORIGIN, Authorization: `Bearer ${a.access_token}` };

  // Vorher: nichts freigeschaltet.
  let mein = await (await ctx.get(`${BASE}/api/profile/achievements`, { headers: auth })).json();
  expect(mein.freigeschaltet).toBe(0);

  // Ein Lauf bis Runde 5 -- der Server muss daraus Erfolg 0 ableiten, ohne
  // dass das Spiel irgendetwas gemeldet haette.
  const lauf = await starteLauf(ctx, a.access_token);
  const kopf = { ...auth, 'X-Run-Token': lauf.run_token };
  await ctx.post(`${BASE}/api/runs/${lauf.run_id}/heartbeat`, {
    headers: kopf, data: { beats: [
      { seq: 1, round: 3, score: 1500, kills: 30, headshots: 10, secs: 12 },
      { seq: 2, round: 5, score: 3100, kills: 65, headshots: 20, secs: 25 } ] } });
  const fin = await (await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, {
    headers: kopf, data: laufDaten(5) })).json();
  expect(fin.status, `Lauf abgewiesen: ${fin.reason}`).toBe('verified');

  const neu = (fin.achievements_neu || []).map((x) => x.id);
  expect(neu, `Erfolg 0 nicht abgeleitet. Neu: ${JSON.stringify(fin.achievements_neu)}`).toContain(0);

  mein = await (await ctx.get(`${BASE}/api/profile/achievements`, { headers: auth })).json();
  expect(mein.freigeschaltet).toBeGreaterThanOrEqual(1);
  const e0 = mein.defs.find((x) => x.id === 0);
  expect(e0.unlocked_at, 'Erfolg 0 ist nicht als freigeschaltet gespeichert').toBeTruthy();
  await ctx.dispose();
});

test('Client kann NUR ingame-Erfolge melden, keine abgeleiteten', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const auth = { ...ORIGIN, Authorization: `Bearer ${a.access_token}` };

  // Versuch, sich Erfolg 34 ("1.000.000 Punkte", abgeleitet) und 41 (Meta)
  // zu erschwindeln -- beide muessen ignoriert werden. 3 ist ingame und darf.
  const r = await ctx.post(`${BASE}/api/profile/achievements/sync`, {
    headers: auth,
    data: { unlocked: [{ id: 34, progress: 1 }, { id: 41, progress: 1 }, { id: 3, progress: 1 }] },
  });
  expect(r.status()).toBe(200);
  expect((await r.json()).uebernommen, 'mehr als der ingame-Erfolg wurde uebernommen').toBe(1);

  const mein = await (await ctx.get(`${BASE}/api/profile/achievements`, { headers: auth })).json();
  const holen = (id) => mein.defs.find((x) => x.id === id);
  expect(holen(3).unlocked_at, 'ingame-Erfolg wurde nicht uebernommen').toBeTruthy();
  expect(holen(34).unlocked_at, 'abgeleiteter Erfolg war frei erfindbar!').toBeNull();
  expect(holen(41).unlocked_at, 'Meta-Erfolg war frei erfindbar!').toBeNull();
  await ctx.dispose();
});

test('Erfolge bringen XP, und der Zaehler bleibt konsistent', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const auth = { ...ORIGIN, Authorization: `Bearer ${a.access_token}` };
  const lauf = await starteLauf(ctx, a.access_token);
  const kopf = { ...auth, 'X-Run-Token': lauf.run_token };
  await ctx.post(`${BASE}/api/runs/${lauf.run_id}/heartbeat`, {
    headers: kopf, data: { beats: [{ seq: 1, round: 5, score: 3100, kills: 65, headshots: 20, secs: 25 }] } });
  const fin = await (await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, {
    headers: kopf, data: laufDaten(5) })).json();

  // Lauf-XP plus die XP des abgeleiteten Erfolgs.
  const erfolgsXp = (fin.achievements_neu || []).reduce((s, x) => s + x.xp, 0);
  expect(erfolgsXp, 'Erfolg brachte keine XP').toBeGreaterThan(0);
  expect(fin.xp_total, 'xp_total deckt Lauf und Erfolg nicht ab')
    .toBeGreaterThanOrEqual(fin.xp_gained + erfolgsXp);
  await ctx.dispose();
});

test('Bestenliste liefert die eigene Zeile mit, auch weit ausserhalb der Liste', async () => {
  const ctx = await request.newContext();
  const a = await anon(ctx);
  const auth = { ...ORIGIN, Authorization: `Bearer ${a.access_token}` };

  // Ein schwacher Lauf -- er landet garantiert nicht in den ersten Plaetzen,
  // sobald andere Spieler weiter kommen.
  const lauf = await starteLauf(ctx, a.access_token);
  const kopf = { ...auth, 'X-Run-Token': lauf.run_token };
  await ctx.post(`${BASE}/api/runs/${lauf.run_id}/heartbeat`, {
    headers: kopf, data: { beats: [{ seq: 1, round: 2, score: 700, kills: 12, headshots: 3, secs: 12 }] } });
  const fin = await (await ctx.post(`${BASE}/api/runs/${lauf.run_id}/finish`, {
    headers: kopf, data: { rounds: 2, score: 700, kills: 12, headshots: 3, downs: 1, revives: 0, secs: 12 } })).json();
  expect(fin.status, `Lauf abgewiesen: ${fin.reason}`).toBe('verified');

  // Ohne Anmeldung: kein me-Block, und die Antwort darf gecacht werden.
  const ohne = await ctx.get(`${BASE}/api/leaderboard?map=ndu&limit=1`);
  expect((await ohne.json()).me).toBeNull();
  expect(ohne.headers()['cache-control']).toMatch(/public/);

  // Mit Anmeldung: eigene Zeile samt Platz, egal wie weit hinten.
  const mit = await ctx.get(`${BASE}/api/leaderboard?map=ndu&limit=1`, { headers: auth });
  const d = await mit.json();
  expect(d.me, 'kein me-Block trotz Anmeldung').toBeTruthy();
  expect(d.me.user_id).toBe(a.user.id);
  expect(d.me.rank, 'kein Platz fuer die eigene Zeile').toBeGreaterThanOrEqual(1);
  // Persoenliche Antwort darf nicht in einem gemeinsamen Zwischenspeicher landen.
  expect(mit.headers()['cache-control']).toMatch(/private|no-store/);
  await ctx.dispose();
});
