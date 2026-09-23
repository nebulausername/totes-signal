import { test, expect } from '@playwright/test';
import { collectMarkers } from '../lib/markers.js';

// Die Shell laedt beim ersten Start ~90 MB.
test.setTimeout(300_000);

async function bootenUndSpielen(page, url) {
  const markers = collectMarkers(page);
  const api = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.includes('/api/')) api.push(`${r.method()} ${u.host}${u.pathname}`);
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Gefragt wird das Gate, nicht die Plattform -- es steht seit 08/2026 auf
  // beiden.
  if (await page.locator('#mstart').isVisible()) await page.locator('#mstart').click();
  await page.waitForFunction(() => window.Module && window.Module.began === true, null, { timeout: 120_000 });
  await page.waitForTimeout(22_000);
  return { markers, api };
}

test('Identitaet entsteht NICHT beim Seitenaufruf', async ({ page }) => {
  await page.goto('https://totersignal.de/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  // Das ist die Grundlage dafuer, dass das Spiel ohne Cookie-Banner auskommt:
  // gespeichert wird erst, wenn der Spieler die Bestenliste ausdruecklich
  // einschaltet (§25 Abs. 2 Nr. 2 TDDDG).
  const konto = await page.evaluate(() => window.TS_API && TS_API.hatKonto());
  expect(konto, 'ohne Zutun des Spielers wurde ein Konto angelegt').toBe(false);
});

test('@full kanonische Domain: Lauf wird beim Server angemeldet', async ({ page }) => {
  const { markers, api } = await bootenUndSpielen(page, 'https://totersignal.de/');

  expect(await page.evaluate(() => window.TS_ORIGIN_OK)).toBe(true);
  // Seit 23.09.2026 fragt kontoAnlegen() erst nach der Einwilligung. Der Dialog
  // oeffnet synchron im Aufruf, also direkt danach zustimmen.
  const name = await page.evaluate(async () => { const w = TS_API.kontoAnlegen(); document.getElementById('einw-ja').click(); return (await w).user.display_name; });
  expect(name).toMatch(/^[A-Za-z]+-\d{4}$/);

  await page.evaluate(() => window.tsCmd('map ndu\n'));
  await page.waitForTimeout(40_000);

  expect(markers.has('TSUI:rstart:'), `kein rstart. Marker: ${JSON.stringify(markers.all())}`).toBe(true);
  expect(markers.has('TSUI:hb:'), 'kein Herzschlag').toBe(true);

  // rstart muss die ROHE Karten-Kennung tragen, nicht den deutschen
  // Anzeigenamen -- sonst zerfaellt die Bestenliste, sobald wir den Text aendern.
  expect(markers.first('TSUI:rstart:').text).toContain('ndu|');

  const runId = await page.evaluate(() => window.TS_RUN.lauf && TS_RUN.lauf.run_id);
  expect(runId, 'kein Lauf beim Server angelegt').toBeTruthy();
  expect(api.some((a) => a.includes('POST') && a.includes('/api/runs/start'))).toBe(true);
});

test('@full Demo-Kopie stellt KEINE einzige API-Anfrage', async ({ page }) => {
  // Dieselbe Datei, byte-identisch gespiegelt. Konten koennen dort prinzipiell
  // nicht funktionieren: Passkeys sind origin-gebunden, Cookies waeren
  // Drittanbieter-Cookies, localStorage ist partitioniert. Deshalb eine
  // Laufzeitpruefung statt einer zweiten Build-Variante -- und die muss
  // wasserdicht sein.
  const { api } = await bootenUndSpielen(page, 'https://demo.kaufmeinewebsite.de/zombie/');
  expect(await page.evaluate(() => window.TS_ORIGIN_OK)).toBe(false);

  await page.evaluate(() => window.tsCmd('map ndu\n'));
  await page.waitForTimeout(35_000);

  expect(api, `Demo-Kopie hat API-Anfragen gestellt: ${JSON.stringify(api)}`).toHaveLength(0);
  expect(await page.evaluate(() => !!(window.TS_RUN && TS_RUN.lauf))).toBe(false);
});

test('Todes-Bildschirm hat den Bestenlisten-Tab', async ({ page }) => {
  await page.goto('https://totersignal.de/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  expect(await page.locator('#dtab-rank').count(), 'Tab fehlt').toBe(1);
  expect(await page.locator('#dpage-rank').count(), 'Seite fehlt').toBe(1);
  // Die Tab-Logik muss N-Wege sein, sonst schaltet ein dritter Tab nichts um.
  const tabs = await page.evaluate(() => window.TS_DEATH && TS_DEATH.tabs);
  expect(tabs).toEqual(['stats', 'board', 'rank']);
});

test('Konto-Ansicht zeigt Stufe, Zahlen und Erfolge', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('https://totersignal.de/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Konto plus ein verifizierter Lauf, damit die Ansicht Inhalt hat.
  const d = await page.evaluate(async () => {
    const w = TS_API.kontoAnlegen(); document.getElementById('einw-ja').click(); await w;   // Einwilligung (seit 23.09.2026)
    const s = await TS_API.call('/runs/start', { method: 'POST',
      body: { map_key: 'ndu', difficulty: 0, gamemode: 0, player_count: 1 } });
    await TS_API.call('/runs/' + s.run_id + '/heartbeat', { method: 'POST',
      headers: { 'X-Run-Token': s.run_token },
      body: { beats: [{ seq: 1, round: 5, score: 3100, kills: 65, headshots: 22, secs: 25 }] } });
    return TS_API.call('/runs/' + s.run_id + '/finish', { method: 'POST',
      headers: { 'X-Run-Token': s.run_token },
      body: { rounds: 5, score: 3100, kills: 65, headshots: 22, downs: 1, revives: 0, secs: 25 } });
  });
  expect(d.status, `Lauf abgewiesen: ${d.reason}`).toBe('verified');

  await page.evaluate(() => TS_KONTO.zeigen());
  await page.waitForTimeout(1500);

  await expect(page.locator('#accountui')).toBeVisible();
  // Alle 42 Erfolge werden gezeigt -- auch die unerreichbaren, damit der
  // Spieler nicht raetselt, warum manche nie kommen.
  expect(await page.locator('.acc-a').count()).toBe(42);
  expect(await page.locator('.acc-a.auf').count(), 'kein Erfolg als freigeschaltet markiert')
    .toBeGreaterThanOrEqual(1);

  const text = await page.locator('#acc-inhalt').innerText();
  expect(text).toContain('XP');
  expect(text, 'Bestwert fehlt').toMatch(/3100/);
  // Unerreichbare muessen als solche benannt sein -- in BEIDEN Sprachen, denn
  // die Oberflaeche folgt der Browsersprache und der Harness laeuft mit
  // en-US. Ein erster Entwurf pruefte nur auf den deutschen Text und schlug
  // deshalb fehl, obwohl die Anzeige richtig war.
  expect(text, 'unerreichbare Erfolge sind nicht gekennzeichnet')
    .toMatch(/noch nicht erreichbar|not yet obtainable/);
});

test('Treffer-Rueckmeldung: was ruettelt, was pulst, und was BEIDES nicht darf', async ({ page }) => {
  // navigator.vibrate gibt es auf iOS Safari NICHT -- deshalb MUSS parallel
  // immer ein sichtbarer Puls laufen, sonst bekommt ein iPhone-Spieler gar
  // keine Rueckmeldung. Beide Kanaele haengen an denselben Markern.
  //
  // Der interessante Fall ist `r`. Dieser Test verlangte frueher DREI
  // Vibrationen fuer h/k/r und hat damit einen echten Fehler festgeschrieben:
  // TSUI:fx:r ist der GAMEPAD-Rumble der Engine, und von seinen neun Quellen
  // sind sieben Waffenaktionen (Feuern, Ziehen, Werfen, Waffengeraeusch, Betty
  // scharfmachen, Hechtrolle). Das Handy ruettelte also bei JEDEM SCHUSS mit
  // dem Treffer-Muster. Schaden am Spieler kommt seit 08/2026 als eigenes
  // Ereignis (CSQC_EVENT_HURTDIR -> TSUI:fx:d) aus DamageHandler -- dem
  // einzigen Punkt, an dem ein Spieler wirklich Schaden nimmt.
  await page.addInitScript(() => {
    window.__vib = [];
    navigator.vibrate = (m) => { window.__vib.push(JSON.stringify(m)); return true; };
  });
  await page.goto('https://totersignal.de/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const r = await page.evaluate(async () => {
    const raus = [];
    for (const art of ['h', 'k', 'd', 'r']) {
      const vorher = window.__vib.length;
      console.log('\nTSUI:fx:' + art + '\n');          // genau der Weg der Engine
      await new Promise((res) => setTimeout(res, 90));
      raus.push({ art,
        klasse: (document.getElementById('firebtn') || {}).className || '',
        geruettelt: window.__vib.length - vorher });
      await new Promise((res) => setTimeout(res, 300));
    }
    return raus;
  });
  const fall = (a) => r.find((x) => x.art === a);

  expect(fall('h').klasse, 'Treffer pulst nicht').toContain('fx-h');
  expect(fall('k').klasse, 'Abschuss pulst nicht anders als ein Treffer').toContain('fx-k');
  expect(fall('h').geruettelt + fall('k').geruettelt, 'Treffer ohne Haptik').toBe(2);

  // Schaden AM Spieler darf den Feuerknopf NICHT pulsen -- das lese sich wie
  // ein eigener Treffer, also genau falschherum. Ruetteln soll er sehr wohl.
  expect(fall('d').klasse, 'Schaden pulst faelschlich den Feuerknopf').not.toMatch(/fx-[hk]/);
  expect(fall('d').geruettelt, 'Schaden am Spieler ruettelt nicht').toBe(1);

  // Und der Waechter gegen die Rueckkehr des alten Fehlers.
  expect(fall('r').geruettelt, 'fx:r ruettelt wieder -- das ist jeder Schuss').toBe(0);
  expect(fall('r').klasse, 'fx:r pulst den Feuerknopf').not.toMatch(/fx-[hk]/);
});

