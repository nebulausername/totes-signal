import { test, expect } from '@playwright/test';
import { booten, geometrie, SOLO_START } from '../lib/boot.js';

// Erster Start laedt ~90 MB, danach kommt noch ein Kartenladevorgang.
test.setTimeout(300_000);

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

test('Zustandswechsel Menue -> Spiel -> Pause -> Spiel schaltet die Aufloesung mit',
  async ({ page }) => {
    const markers = await booten(page);

    const imMenue = await geometrie(page);
    expect(imMenue.bufW).toBe(imMenue.cssW);

    // Auf Nicht-Touch gibt es kein M9 -- dort ist nichts zu schalten.
    test.skip(imMenue.on !== true, 'M9 ist nur auf Touch-Geraeten aktiv');
    expect(imMenue.lock, 'im Menue muss die Sperre stehen').toBe(true);

    await page.evaluate((cmds) => window.tsCmd(cmds + 'map ndu\n'), SOLO_START);
    expect(await markers.waitFor('TSUI:game', 180_000), 'Spiel startet').toBe(true);
    await page.waitForTimeout(8_000);

    const imSpiel = await geometrie(page);
    expect(imSpiel.lock, 'im Spiel darf die Sperre nicht stehen').toBe(false);
    expect(imSpiel.eff, 'im Spiel gilt wieder die Dyn-Res-Stufe').toBeCloseTo(imSpiel.dyn, 2);

    // MENUE-Knopf im Touch-Overlay. Ein Tipp muss GENAU eine Umschaltung
    // ausloesen -- vorher kamen pause:1 und pause:0 im selben Tipp.
    await page.locator('.tbtn[data-code="Escape"]').tap();
    await page.waitForTimeout(3_000);

    const auf = markers.all().filter((m) => m.text.includes('TSUI:pause:1')).length;
    const zu  = markers.all().filter((m) => m.text.includes('TSUI:pause:0')).length;
    expect(auf, 'ein Tipp auf MENUE oeffnet das Pausemenue einmal').toBe(1);
    expect(zu,  'und schliesst es NICHT im selben Tipp wieder').toBe(0);

    const inPause = await geometrie(page);
    expect(inPause.bufW, 'im Pausemenue wieder 1:1').toBe(inPause.cssW);
    expect(inPause.lock).toBe(true);

    await page.locator('.tbtn[data-code="Escape"]').tap();
    await page.waitForTimeout(3_000);
    const zurueck = await geometrie(page);
    expect(zurueck.lock, 'zurueck im Spiel faellt die Sperre').toBe(false);
    expect(zurueck.eff).toBeCloseTo(zurueck.dyn, 2);
  });
