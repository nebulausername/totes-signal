import { test, expect } from '@playwright/test';
import { collectMarkers } from '../lib/markers.js';

// Warum es diese Datei gibt (24.08.2026):
//
// Der Desktop war zweiter Klasse, und zwar aus EINEM strukturellen Grund:
// alles, was die Shell an Diensten anbietet, lag in einer touch-gesperrten
// Klammer (web/index.html, frueher Zeile 2441-3115). Ein Rechner-Spieler
// hatte deshalb:
//
//   - kein Start-Gate  -> und damit kein WEITERSPIELEN, keinen Konto-Zugang
//                         und keine Nutzergeste vor dem AudioContext
//   - keine HUD-Groesse, keine Helligkeit
//   - keinen Zugang zu den Shell-Einstellungen (Empfindlichkeit, Zielhilfe)
//   - kein Onboarding
//
// Ein Kommentar im Quelltext behauptete sogar, das Start-Gate SEI der
// Desktop-Weg zum Konto. Es erschien dort nur nie. Genau diese Klasse von
// Fehler -- eine Annahme, die im Kommentar steht und die niemand am Bild
// geprueft hat -- faengt dieser Test.
//
// Zwei Zusagen gelten dabei GEGENLAEUFIG und beide sind wichtig:
//   1. Der Rechner bekommt dieselben DIENSTE.
//   2. Er bekommt NICHT dieselbe BEDIENUNG -- ts_touchui muss 0 bleiben,
//      sonst reserviert GetTouchRightInset dort Rand fuer Knoepfe, die es
//      nicht gibt, und die Munition rutscht grundlos nach innen.

test.setTimeout(300_000);

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop',
    'Diese Zusagen gelten fuer den Rechner.');
});

test('Das Start-Gate steht auch am Rechner und traegt seine Angebote', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  await expect(page.locator('#mstart'), 'Start-Gate sichtbar').toBeVisible();

  // Ohne Gate laeuft begin() beim Parsen des Skripts -- die Engine darf hier
  // also noch NICHT gestartet sein.
  const begonnen = await page.evaluate(() => !!(window.Module && window.Module.began));
  expect(begonnen, 'Engine wartet auf die Nutzergeste').toBe(false);

  // Am Rechner tippt niemand. Umgesetzt wird das data-i18n-Attribut, damit ein
  // Sprachwechsel die Beschriftung nicht wieder auf "TIPPEN" zurueckdreht.
  const knopf = page.locator('#mstart .play[data-i18n="playDesk"]');
  await expect(knopf, 'Startknopf traegt die Desktop-Beschriftung').toHaveCount(1);
  expect((await knopf.textContent()).toUpperCase()).toContain('CLICK');

  // Der Zugang zum Konto haengt am Gate -- deshalb war er am Rechner weg.
  await expect(page.locator('#gate-konto'), 'Konto-Einstieg vorhanden').toBeVisible();
});

test('Die Einstellungen sind da und zeigen nur, was am Rechner Sinn ergibt', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const zeilen = await page.evaluate(() => {
    TS_SET.zeigen();
    const l = [...document.querySelectorAll('#set-inhalt .set-row label')].map((e) => e.textContent);
    TS_SET.schliessen();
    return l;
  });

  // Knopfgroesse, Deckkraft und Linkshaender beschreiben Bedienelemente, die
  // es am Rechner nicht gibt. Sie duerfen dort nicht als tote Regler stehen.
  const ids = await page.evaluate(() => TS_SET.sichtbar().map((d) => d.id));
  expect(ids, 'touch-eigene Zeilen bleiben weg').not.toContain('btnsize');
  expect(ids).not.toContain('btnalpha');
  expect(ids).not.toContain('lefty');

  // Und das, was der Rechner vorher GAR NICHT erreichen konnte:
  expect(ids, 'HUD-Groesse erreichbar').toContain('hud');
  expect(ids, 'Helligkeit erreichbar').toContain('hell');
  // in_aimassist ist auf 1 vorbelegt (mobile-first) und wirkt auch mit der
  // Maus -- ohne diese Zeile koennte man es am Rechner nicht abschalten.
  expect(ids, 'Zielhilfe abschaltbar').toContain('aim');

  expect(zeilen.length, 'jede sichtbare Einstellung hat eine Beschriftung')
    .toBe(ids.length);
});

test('Die plattformneutralen Haken existieren am Rechner', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const da = await page.evaluate(() => ({
    hud:    typeof window.__ts_applyHud === 'function',
    hell:   typeof window.__ts_applyBright === 'function',
    hints:  typeof window.__ts_hints === 'function',
    // Die MESSUNG der Knopfspalte gehoert der Touch-Schicht und darf am
    // Rechner fehlen -- TS_VIEW fragt sie deshalb nur, wenn es sie gibt.
    messen: typeof window.__ts_randMessen === 'function',
    touch:  !!window.IS_TOUCH,
  }));

  expect(da.touch, 'Testlauf ist wirklich ohne Touch').toBe(false);
  expect(da.hud,   '__ts_applyHud war am Rechner undefiniert').toBe(true);
  expect(da.hell,  '__ts_applyBright war am Rechner undefiniert').toBe(true);
  expect(da.hints, 'Onboarding gab es am Rechner gar nicht').toBe(true);
  expect(da.messen, 'die Touch-Messung bleibt touch-eigen').toBe(false);
});

test('Das Onboarding nennt Tasten, keine Gesten', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const text = await page.evaluate(() => {
    window.__ts_hints(true);
    const t = document.getElementById('hints').textContent.replace(/\s+/g, ' ');
    window.__ts_hintsWeg();
    return t;
  });

  expect(text, 'Tastenbelegung statt Stick').toMatch(/WASD/);
  expect(text).toMatch(/ESC/);
  expect(text, 'kein Touch-Text am Rechner').not.toMatch(/Stick|stick/);
});
