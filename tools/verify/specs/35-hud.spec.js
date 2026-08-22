import { test, expect } from '@playwright/test';

// Warum es diese Datei gibt (am laufenden Spiel gesehen, 2026-08-22):
//
// Die Engine zeichnet Munition, Granaten, Waffenname und Kapitelkarte
// RECHTSBUENDIG an der unteren bzw. rechten Kante. Genau dort liegen die
// Knoepfe der Web-Shell. Auf dem Handy stand "8/32" damit unter FEUER und
// LADEN -- ein Spieler konnte seinen Munitionsstand nicht sehen.
//
// Fuer den Punkteblock links war das laengst geloest (GetTouchLift /
// GetTouchShift, gefuettert aus ts_hudlift / ts_hudx); rechts fehlte es
// schlicht. Jetzt misst die Shell ihre eigene Knopfspalte und meldet sie als
// ts_hudright. Dieser Test haelt die Messung fest -- nicht die Pixel im
// Spiel, sondern die Zusage: der reservierte Streifen deckt ALLES ab, was in
// der rechten Bildhaelfte liegt.
//
// Der Stick gehoert ausdruecklich dazu: im Linkshaender-Modus wandert er nach
// rechts und stand in der ersten Fassung wieder ueber der Anzeige.

test.setTimeout(120_000);

async function messen(page, lefty) {
  await page.setViewportSize({ width: 844, height: 390 });   // Querformat (Footgun 17)
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  return page.evaluate((lefty) => {
    const ui = document.getElementById('touchui');
    if (!ui) return null;
    ui.style.display = 'block';                // ohne laufendes Spiel sonst unsichtbar
    ui.classList.toggle('lefty', !!lefty);
    if (!window.__ts_hudRand) return { fehlt: true };
    const ergebnis = window.__ts_hudRand();    // setzt ts_hudright und gibt die Rechnung zurueck
    const breit = window.innerWidth;
    let linkeste = breit, teile = [];
    ui.querySelectorAll('.tbtn, #stick').forEach((e) => {
      if (getComputedStyle(e).display === 'none') return;
      const r = e.getBoundingClientRect();
      if (!r.width) return;
      if (r.left + r.width / 2 < breit / 2) return;
      teile.push({ id: e.id || (e.textContent || '').trim().slice(0, 8), left: Math.round(r.left) });
      if (r.left < linkeste) linkeste = r.left;
    });
    // NICHT runden: die Shell rechnet mit Subpixeln, und ein gerundetes
    // Vergleichsmass liess den Test um 0,4 px scheitern, ohne dass am Bild
    // irgendetwas falsch war.
    return { ergebnis, breit, linkeste, teile };
  }, lefty);
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === 'chromium-desktop',
    'Der reservierte Streifen gilt nur fuer das Touch-Layout.');
});

test('Der reservierte Streifen deckt die ganze rechte Knopfspalte', async ({ page }) => {
  const m = await messen(page, false);
  expect(m, '#touchui vorhanden').not.toBeNull();
  expect(m.fehlt, '__ts_hudRand muss von der Shell bereitgestellt werden').toBeUndefined();
  expect(m.teile.length, 'in der rechten Haelfte stehen Knoepfe').toBeGreaterThan(3);
  expect(m.ergebnis.cssRand,
    'reservierter Streifen (' + m.ergebnis.cssRand + ' px) muss bis zum linkesten Element reichen ('
    + JSON.stringify(m.teile) + ')').toBeGreaterThanOrEqual(m.breit - m.linkeste - 0.01);
  expect(m.ergebnis.rand, 'in HUD-Einheiten, an die Engine gemeldet').toBeGreaterThan(0);
});

test('Linkshaender: der Stick zaehlt mit', async ({ page }) => {
  const m = await messen(page, true);
  expect(m.fehlt).toBeUndefined();
  // Im gespiegelten Layout liegt der Stick rechts -- er MUSS in der Messung
  // auftauchen, sonst zeichnet die Engine die Munition wieder darunter.
  expect(m.teile.map((t) => t.id), 'Stick in der rechten Haelfte').toContain('stick');
  expect(m.ergebnis.cssRand, 'Streifen deckt auch den Stick')
    .toBeGreaterThanOrEqual(m.breit - m.linkeste - 0.01);
});
