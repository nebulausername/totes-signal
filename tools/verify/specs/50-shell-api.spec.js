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
  const touch = await page.evaluate(() => !!window.IS_TOUCH);
  if (touch) await page.locator('#mstart').click();
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
  const name = await page.evaluate(async () => (await TS_API.kontoAnlegen()).user.display_name);
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
