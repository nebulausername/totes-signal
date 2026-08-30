// Die Raum-API. Sie ist der einzige Teil des Koop, dem ein Fremder etwas
// schicken kann -- deshalb wird hier vor allem geprueft, was sie ABLEHNT.
//
// Der Beitritt selbst braucht sie nicht: bei einem im Browser angebotenen Raum
// IST der Code die Adresse. Was hier dazukommt, ist die Sichtbarkeit.
//
// Legt echte Konten und Raeume in der PRODUKTIONSDATENBANK an (die API hat
// keine Testinstanz). Beides raeumt sich selbst wieder ab; ausserdem greift
// serverseitig eine Bremse von acht Raeumen je IP-Praefix und Stunde --
// dieser Lauf verbraucht davon zwei.
import { test, expect, request } from '@playwright/test';

const BASIS = 'https://totersignal.de';
const KOPF = { Origin: BASIS, 'Content-Type': 'application/json' };

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

// Ueber den Projektnamen in beforeEach -- die Kurzform test.skip(fn) bekommt
// kein testInfo, und browserName ist fuer Desktop UND Mobile 'chromium'.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop',
    'reine HTTP-Pruefung -- genau einmal, nicht je Browser');
});

let ctx, token, code, raumToken;

test.beforeAll(async () => {
  ctx = await request.newContext({ baseURL: BASIS });
  const r = await ctx.post('/api/auth/anon', { headers: KOPF, data: { age_confirmed: true } });
  expect(r.status(), 'Konto anlegen').toBe(201);
  token = (await r.json()).access_token;
  // Codes aus dem Alphabet ohne O/I/L/S/0/1, wie die Shell sie erzeugt.
  code = 'T' + Math.floor(Math.random() * 89999 + 10000).toString().replace(/[01]/g, '2');
});

test.afterAll(async () => {
  if (raumToken) await ctx.delete('/api/raum/' + code,
    { headers: { Origin: BASIS, 'X-Raum-Token': raumToken } }).catch(() => {});
  await ctx.dispose();
});

test('ohne Konto kein Eintrag', async () => {
  const r = await ctx.post('/api/raum', { headers: KOPF, data: { code: 'AAAA22' } });
  expect(r.status()).toBe(401);
});

test('ein mitgeschicktes Adressfeld wird ignoriert', async () => {
  const r = await ctx.post('/api/raum', {
    headers: { ...KOPF, Authorization: 'Bearer ' + token },
    data: { code, adresse: 'wss://fremder.example/x', name: 'Pruefrunde', map_key: 'ndu' },
  });
  expect(r.status()).toBe(201);
  const j = await r.json();
  // DAS ist der Kern: der Server bildet die Adresse aus dem Code. Ohne diese
  // Eigenschaft waere die API ein Weiterleitungsdienst fuer Fremde -- genau
  // der Einwand, mit dem Migration 0003 den Schreibweg verweigert hat.
  expect(j.adresse).toBe('/' + code);
  expect(j.raum_token, 'beim ERSTEN Eintragen gibt es ein Token').toBeTruthy();
  raumToken = j.raum_token;
});

test('unplausible Codes fallen durch', async () => {
  for (const schlecht of ['ab', 'AAAA;map ndu', 'AAAA/x', '../../etc', 'A'.repeat(40)]) {
    const r = await ctx.post('/api/raum', {
      headers: { ...KOPF, Authorization: 'Bearer ' + token }, data: { code: schlecht } });
    expect([400, 409], `Code "${schlecht}" wurde angenommen`).toContain(r.status());
  }
});

test('Auffrischen dreht das Token NICHT', async () => {
  // Das war ein echter Fehler: jedes Auffrischen vergab ein neues Token, und
  // das Schliessen traf danach keine Zeile mehr -- DELETE meldete 204, die
  // Runde blieb aber in der Liste stehen, obwohl der Gastgeber weg war.
  const r = await ctx.post('/api/raum', {
    headers: { ...KOPF, Authorization: 'Bearer ' + token },
    data: { code, name: 'Nacht der Untoten', map_key: 'ndu', spieler: 2 } });
  expect(r.status()).toBe(201);
  expect((await r.json()).raum_token, 'beim Auffrischen KEIN neues Token').toBeUndefined();

  const hb = await ctx.patch('/api/raum/' + code, {
    headers: { Origin: BASIS, 'Content-Type': 'application/json', 'X-Raum-Token': raumToken },
    data: { spieler: 2, runde: 1, status: 'laeuft' } });
  expect(hb.status(), 'das erste Token muss weiter gelten').toBe(204);
});

test('falsches Token wird abgewiesen', async () => {
  const hb = await ctx.patch('/api/raum/' + code, {
    headers: { Origin: BASIS, 'Content-Type': 'application/json', 'X-Raum-Token': 'falsch' },
    data: { spieler: 4 } });
  expect(hb.status()).toBe(404);
  const del = await ctx.delete('/api/raum/' + code,
    { headers: { Origin: BASIS, 'X-Raum-Token': 'falsch' } });
  // 404, nicht still 204: ein "erfolgreich" auf einen Aufruf, der nichts
  // getan hat, versteckt genau die Fehler, die man finden muss.
  expect(del.status()).toBe(404);
});

test('die Liste zeigt den Raum und danach nicht mehr', async () => {
  const l1 = await (await ctx.get('/api/raeume')).json();
  expect(l1.raeume.map((r) => r.code)).toContain(code);
  const eintrag = l1.raeume.find((r) => r.code === code);
  expect(eintrag.name).toBe('Nacht der Untoten');
  expect(eintrag.spieler).toBeLessThan(eintrag.max_spieler);

  const del = await ctx.delete('/api/raum/' + code,
    { headers: { Origin: BASIS, 'X-Raum-Token': raumToken } });
  expect(del.status()).toBe(204);
  raumToken = null;

  const l2 = await (await ctx.get('/api/raeume', { headers: { 'Cache-Control': 'no-cache' } })).json();
  expect(l2.raeume.map((r) => r.code),
    'ein geschlossener Raum darf niemandem mehr angeboten werden').not.toContain(code);
});

// Ein Koop-Lauf gehoert NICHT auf die Solo-Bestenliste.
//
// Bis 2026-08-29 war das offen: run_is_eligible prueft `player_count = 1`, und
// die Shell meldete diesen Wert HART als 1, weil sie die echte Spielerzahl nie
// kannte -- sie las das Flags-Feld aus TSUI:dmeta nicht einmal aus. Eine
// Vierer-Runde war damit von einem Solo-Lauf nicht zu unterscheiden.
//
// Das Koop-Bit (Bit 3, Wert 8) setzt das SERVER-QuakeC in ts_flag_bits(). Es
// ist damit die belastbarere Quelle als eine Zahl, die der Client behauptet --
// deshalb wird hier genau darauf geprueft.
test('ein Lauf mit Koop-Bit erscheint nicht auf der Solo-Liste', async () => {
  const auth = { ...KOPF, Authorization: 'Bearer ' + token };

  const start = await ctx.post('/api/runs/start', { headers: auth, data: {
    map_key: 'ndu', difficulty: 0, gamemode: 0, start_round: 0,
    flags: 0, player_count: 1, shell_build: 'pruefung' } });
  expect(start.status()).toBe(201);
  const lauf = await start.json();

  // Werte, die die Plausibilitaetspruefung passieren: wenige Runden, Kills
  // innerhalb des Zombie-Budgets, Spielzeit im Rahmen der Echtzeit.
  const fin = await ctx.post('/api/runs/' + lauf.run_id + '/finish', {
    headers: { ...auth, 'X-Run-Token': lauf.run_token },
    data: { rounds: 3, score: 2400, kills: 22, headshots: 6, downs: 0, revives: 0,
            secs: 20, difficulty: 0, gamemode: 0, map_key: 'ndu',
            // Genau das ist der Punkt der Pruefung:
            flags: 8, player_count: 2 } });
  expect(fin.status()).toBe(200);
  const j = await fin.json();

  // Der Lauf darf gespeichert werden -- er ist ja echt gespielt. Er darf nur
  // nicht auf der SOLO-Liste stehen.
  expect(['verified', 'flagged', 'rejected']).toContain(j.status);

  const board = await (await ctx.get('/api/leaderboard?limit=100&map=ndu')).json();
  const drin = (board.entries || []).some((e) => e.run_id === lauf.run_id);
  expect(drin, 'ein Koop-Lauf steht auf der Solo-Bestenliste').toBe(false);

  // Und in der eigenen Historie taucht er sehr wohl auf -- er ist nicht
  // verschwunden, nur nicht wertungsfaehig.
  const meine = await (await ctx.get('/api/runs/mine', { headers: auth })).json();
  expect((meine.runs || []).some((r) => r.id === lauf.run_id || r.run_id === lauf.run_id),
    'der Lauf muss in der eigenen Historie stehen').toBe(true);

  // ... und er steht auf der KOOP-Liste. Ohne diese Haelfte war der Ausschluss
  // aus 0006 kein Gewinn, sondern ein Verlust: der Lauf stand danach auf gar
  // keiner Liste. Getrennt nach Spielerzahl, weil zwei und vier nicht dasselbe
  // Spiel sind.
  // `Cache-Control: no-cache` ist hier PFLICHT: die Bestenliste antwortet ohne
  // Anmeldung mit `public, max-age=30`, und ein dreissig Sekunden alter Stand
  // kennt den eben abgeschlossenen Lauf nicht. Die Raum-Pruefung oben macht
  // es aus demselben Grund -- und trotzdem bin ich hier hineingelaufen.
  const frisch = { 'Cache-Control': 'no-cache' };
  const koop = await (await ctx.get('/api/leaderboard?koop=1&spieler=2&limit=100&map=ndu',
    { headers: frisch })).json();
  expect(koop.segment.koop, 'die Antwort sagt nicht, welche Liste sie ist').toBe(true);
  expect(koop.segment.spieler).toBe(2);
  expect((koop.entries || []).every((e) => e.player_count === 2),
    'auf der Zweier-Liste steht ein Lauf mit anderer Spielerzahl').toBe(true);
  expect((koop.entries || []).some((e) => e.run_id === lauf.run_id),
    'der Koop-Lauf steht auf gar keiner Liste').toBe(true);

  // Die Vierer-Liste darf ihn NICHT enthalten.
  const vier = await (await ctx.get('/api/leaderboard?koop=1&spieler=4&limit=100&map=ndu',
    { headers: frisch })).json();
  expect((vier.entries || []).some((e) => e.run_id === lauf.run_id),
    'ein Zweier-Lauf steht auf der Vierer-Liste').toBe(false);
});

// Was die API meldet, muss zu dem passen, was sie geliefert hat. Solo- und
// Koop-Antwort sahen vorher identisch aus -- ein Aufrufer konnte nicht
// pruefen, was er bekommen hat.
test('die Bestenliste sagt, welche Liste sie ist', async () => {
  const kopf = { 'Cache-Control': 'no-cache' };
  const solo = await (await ctx.get('/api/leaderboard?limit=5', { headers: kopf })).json();
  expect(solo.segment.koop).toBe(false);
  expect(solo.segment.spieler).toBe(1);
  expect((solo.entries || []).every((e) => e.player_count === 1),
    'auf der Solo-Liste steht ein Lauf mit mehreren Spielern').toBe(true);

  // Eine unplausible Spielerzahl wird GEKLEMMT -- und das steht dann auch da,
  // statt still eine andere Liste zu liefern als angefragt.
  const wild = await (await ctx.get('/api/leaderboard?koop=1&spieler=99&limit=5', { headers: kopf })).json();
  expect(wild.segment.spieler).toBe(4);
});
