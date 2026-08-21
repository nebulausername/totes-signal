import { test, expect } from '@playwright/test';
import { collectMarkers } from '../lib/markers.js';

// Der erste Start laedt ~90 MB. Grosszuegiges Zeitlimit.
test.setTimeout(300_000);

test('Shell bootet, Engine startet, Menue-Marker kommt an', async ({ page, browserName }) => {
  const markers = collectMarkers(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Build-Tag beweist, welche Fassung wirklich laeuft
  const build = await page.evaluate(() => window.TS_BUILD);
  expect(build, 'TS_BUILD nicht gesetzt').toBeTruthy();

  // Auf Touch-Geraeten haelt das Start-Gate die Engine an, bis getippt wird.
  const isTouch = await page.evaluate(() => !!window.IS_TOUCH);
  if (isTouch) {
    await page.locator('#mstart').click();
  }

  // Engine geladen?
  await page.waitForFunction(() => window.Module && window.Module.began === true,
    null, { timeout: 60_000 });

  // Der Menue-Marker ist das Lebenszeichen der QuakeC-Bruecke.
  const gotMenu = await markers.waitFor('TSUI:menu', 240_000);
  expect(gotMenu, `kein TSUI:menu. Marker bisher: ${JSON.stringify(markers.all().slice(0, 5))}`).toBe(true);

  expect(errors, `JS-Fehler beim Start: ${errors.join(' | ')}`).toHaveLength(0);
});

test('Service Worker: Datencache ist vom Shell-Bump entkoppelt', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(2000);

  const names = await page.evaluate(() => caches.keys());

  // Shell-Cache muss existieren und die aktuelle SW_VERSION tragen.
  const shell = names.filter((n) => n.startsWith('totes-shell-'));
  expect(shell.length, `Shell-Cache fehlt. Gefunden: ${JSON.stringify(names)}`).toBe(1);

  // Der Datencache wird LAZY angelegt (put-on-miss beim ersten game.pk3).
  // Entscheidend ist deshalb nicht, dass er schon da ist, sondern dass es
  // keinen gibt, der an eine SW_VERSION gebunden waere: genau daran hingen
  // frueher die ~90 MB, und jeder Shell-Bump hat sie geloescht.
  const data = names.filter((n) => n.startsWith('totes-data-'));
  for (const n of data) {
    expect(n, `Datencache traegt eine SW_VERSION -> wird beim naechsten Bump geloescht`).toBe('totes-data-v12');
  }
});

test('@full Datencache ueberlebt einen Shell-Bump (die 90-MB-Frage)', async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => navigator.serviceWorker.ready);

  // game.pk3 durch den SW holen -> legt totes-data-v12 an und fuellt ihn.
  await page.evaluate(async () => {
    const r = await fetch('nzp/game.pk3');
    await r.arrayBuffer();
  });
  await page.waitForTimeout(3000);

  const before = await page.evaluate(async () => {
    const c = await caches.open('totes-data-v12');
    const keys = await c.keys();
    return keys.map((k) => new URL(k.url).pathname);
  });
  expect(before.some((p) => p.endsWith('game.pk3')),
    `game.pk3 nicht im Datencache: ${JSON.stringify(before)}`).toBe(true);

  // Jetzt genau das simulieren, was frueher die 90 MB gekostet hat: der SW
  // durchlaeuft activate() erneut und raeumt auf.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.update();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(3000);

  const after = await page.evaluate(async () => {
    if (!(await caches.has('totes-data-v12'))) return null;
    const c = await caches.open('totes-data-v12');
    const keys = await c.keys();
    return keys.map((k) => new URL(k.url).pathname);
  });
  expect(after, 'Datencache nach dem SW-Durchlauf komplett weg').not.toBeNull();
  expect(after.some((p) => p.endsWith('game.pk3')),
    'game.pk3 wurde aus dem Cache geworfen -> Spieler zahlt 90 MB erneut').toBe(true);
});
