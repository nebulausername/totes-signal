import { test, expect } from '@playwright/test';
import { booten, geometrie, SOLO_START } from '../lib/boot.js';

// Bei einem Fehlschlag zaehlt die Marker-Reihenfolge -- ohne sie raet man.
const spur = (m) => 'Marker: ' + m.all().map((x) => x.text.trim()).join(' | ');

// Gegen die Produktion faellt der ~90-MB-Erstdownload IN die Messung, danach
// kommt noch ein Kartenladevorgang. 300 s reichten dafuer nicht (der
// Zustandswechsel-Test lief genau ins Datei-Timeout).
test.setTimeout(600_000);

// Warum es diese Datei gibt (beides an der Live-Engine nachgemessen, 2026-08-22):
//
// 1. Der Touch-Pfad der Engine uebergibt rohe CSS-Koordinaten (t.pageX/t.pageY)
//    an eine Schnittstelle, die BACKBUFFER-Pixel erwartet. Der Maus-Pfad daneben
//    rechnet korrekt mit canvas.width/rect.width um. Solange der Backbuffer
//    groesser ist als die CSS-Flaeche, landet jeder Fingertipp bei 1/eff seines
//    wahren Abstands zur linken oberen Ecke -- bei eff 1.5 auf zwei Dritteln.
//    Menue und Pausemenue positionieren den Cursor absolut, sind also betroffen.
//    Die Shell zwingt deshalb im Menuezustand auf 1:1.
//
// 2. sendKey() dispatchte auf den Canvas. Die Engine haengt ihre
//    Tastatur-Listener an document UND an den Canvas (jeweils capture), das
//    Ereignis lief also durch beide und wurde ZWEIMAL verarbeitet. Der
//    MENUE-Knopf oeffnete das Pausemenue und schloss es im selben Tipp.

test('Menue rendert 1:1 -- sonst trifft der Finger daneben', async ({ page }) => {
  await booten(page);
  const g = await geometrie(page);
  expect(g.bufW, 'Backbuffer-Breite muss der CSS-Breite entsprechen').toBe(g.cssW);
  expect(g.bufH, 'Backbuffer-Hoehe muss der CSS-Hoehe entsprechen').toBe(g.cssH);
});

test('Einstellungsschirm liegt im Bild -- nicht unter dem Canvas', async ({ page }) => {
  await booten(page);

  // #settingsui fehlte im Sammelselektor der Overlays und war deshalb
  // position:static. z-index wirkt auf statische Elemente nicht, der ganze
  // Schirm lag als normaler Block UNTER dem 100%-hohen Canvas (gemessen:
  // top 408 bei 390 px Viewport, body hat overflow:hidden). Der Spieler kam
  // nie an Empfindlichkeit, Knopfgroesse oder Linkshaender-Modus.
  const lage = await page.evaluate(() => {
    const el = document.getElementById('settingsui');
    el.style.display = 'flex';
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), hoehe: Math.round(r.height),
             position: getComputedStyle(el).position, viewport: window.innerHeight };
  });
  expect(lage.position, '#settingsui muss positioniert sein, sonst greift z-index nicht').toBe('fixed');
  expect(lage.top, 'Oberkante im Bild').toBeLessThan(lage.viewport);
  expect(lage.hoehe, 'fuellt den Bildschirm').toBeGreaterThan(lage.viewport * 0.8);
});

test('Zustandswechsel Menue -> Spiel -> Pause -> Spiel schaltet die Aufloesung mit',
  async ({ page }) => {
    const markers = await booten(page);

    const imMenue = await geometrie(page);
    expect(imMenue.bufW).toBe(imMenue.cssW);

    // Auf Nicht-Touch gibt es kein M9 -- dort ist nichts zu schalten.
    test.skip(imMenue.on !== true, 'M9 ist nur auf Touch-Geraeten aktiv');
    expect(imMenue.lock, 'im Menue muss die Sperre stehen').toBe(true);

    await page.evaluate((cmds) => window.tsCmd(cmds + 'map ndu\n'), SOLO_START);
    const gestartet = await markers.waitFor('TSUI:game', 300_000);
    expect(gestartet, 'Spiel startet. Marker bisher: ' + spur(markers)).toBe(true);

    // Nicht auf eine feste Wartezeit setzen: der Kartenladevorgang dauert auf
    // der Produktion sehr unterschiedlich lang, und die Shell schaltet ihren
    // Spielzustand erst danach. Das sichtbare Touch-HUD IST dieser Zustand.
    await expect(page.locator('#touchui'), 'Touch-HUD wird im Spiel sichtbar')
      .toBeVisible({ timeout: 120_000 });

    // Die Dyn-Res kann waehrend des Ladens noch eine Stufe schalten -- auf
    // Deckungsgleichheit warten statt einen Augenblick herausgreifen.
    await expect.poll(async () => {
      const g = await geometrie(page);
      return g.lock === false && Math.abs(g.eff - g.dyn) < 0.01;
    }, { message: 'im Spiel gilt wieder die Dyn-Res-Stufe, ohne Sperre', timeout: 30_000 }).toBe(true);

    // MENUE-Knopf im Touch-Overlay. Ein Tipp muss GENAU eine Umschaltung
    // ausloesen -- vorher kamen pause:1 und pause:0 im selben Tipp, weil
    // sendKey() auf den Canvas dispatchte und die Engine dort UND auf document
    // lauscht.
    //
    // dispatchEvent statt tap(): der Knopf haengt am pointerdown-Handler, und
    // die Aktionspruefung von tap() koppelt den Test zusaetzlich an Orientierung
    // und Todes-Overlay -- Zustaende, die dieser Test gar nicht pruefen will.
    await page.locator('.tbtn[data-code="Escape"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(3_000);

    const auf = markers.all().filter((m) => m.text.includes('TSUI:pause:1')).length;
    const zu  = markers.all().filter((m) => m.text.includes('TSUI:pause:0')).length;
    expect(auf, 'ein Tipp auf MENUE oeffnet das Pausemenue einmal. ' + spur(markers)).toBe(1);
    expect(zu,  'und schliesst es NICHT im selben Tipp wieder. ' + spur(markers)).toBe(0);

    const inPause = await geometrie(page);
    expect(inPause.bufW, 'im Pausemenue wieder 1:1').toBe(inPause.cssW);
    expect(inPause.lock).toBe(true);

    await page.locator('.tbtn[data-code="Escape"]').dispatchEvent('pointerdown');
    await page.waitForTimeout(3_000);
    const zurueck = await geometrie(page);
    expect(zurueck.lock, 'zurueck im Spiel faellt die Sperre').toBe(false);
    expect(zurueck.eff).toBeCloseTo(zurueck.dyn, 2);
  });
