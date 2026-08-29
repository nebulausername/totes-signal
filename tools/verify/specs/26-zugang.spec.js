// Barrierefreiheit der Shell -- die Teile, die ohne Zeigegeraet zaehlen.
//
// Der Anlass: das Start-Gate war ein <div> mit click-Zuhoerer, und der Knopf
// darin ein <span>. Nichts davon war fokussierbar. An einem Rechner ohne Maus
// liess sich TOTES SIGNAL damit ueberhaupt nicht starten -- WCAG 2.1.1, auf
// dem allerersten Bildschirm. Gegen die Produktion vom 2026-08-24 faellt
// dieser Test durch; das ist der Zweck.
import { test, expect } from '@playwright/test';

// Cache-Brecher. Nicht Kosmetik: dieser Test ist dreimal direkt nach einem
// Deploy rot geworden, und der gemeldete Wert war jedes Mal exakt der aus dem
// Build DAVOR -- die Seite war veraltet, nicht der Code falsch. Ein Test, den
// eine alte Seite taeuschen kann, meldet Fehler, die es nicht gibt, und
// verdeckt damit die, die es gibt.
const frisch = () => '/?t=' + Date.now() + Math.random().toString(36).slice(2, 7);

test.describe('Zugang ohne Maus', () => {
  test.setTimeout(240_000);

  test('das Spiel laesst sich allein mit der Tastatur starten', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(frisch(), { waitUntil: 'domcontentloaded' });
    await page.locator('#mstart').waitFor({ state: 'visible', timeout: 30_000 });

    // Bis zu 12 Mal Tab: mehr Bedienelemente hat das Gate nicht, und wenn der
    // Fokus danach immer noch nicht drin ist, ist er es nie.
    let drin = false;
    for (let i = 0; i < 12 && !drin; i++) {
      await page.keyboard.press('Tab');
      drin = await page.evaluate(() => {
        const a = document.activeElement;
        const g = document.getElementById('mstart');
        return !!(a && g && g.contains(a) && a !== document.body);
      });
    }
    expect(drin, 'der Fokus muss per Tab in das Start-Gate gelangen').toBe(true);

    // Sichtbar muss er auch sein -- ein Fokus, den niemand sieht, hilft
    // niemandem. Geprueft wird, dass ueberhaupt eine Kontur entsteht.
    const kontur = await page.evaluate(() => {
      const cs = getComputedStyle(document.activeElement);
      return { w: cs.outlineWidth, st: cs.outlineStyle, sh: cs.boxShadow };
    });
    expect(kontur.st !== 'none' || (kontur.sh && kontur.sh !== 'none'),
      `fokussiertes Element ohne sichtbare Kontur: ${JSON.stringify(kontur)}`).toBe(true);

    // Und jetzt der eigentliche Beweis: Enter startet das Spiel.
    // Auf dem echten Knopf, nicht irgendwo -- deshalb erst dorthin fokussieren.
    await page.evaluate(() => {
      const b = document.querySelector('#mstart .play[data-i18n]');
      if (b && b.focus) b.focus();
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.Module && window.Module.began === true,
      null, { timeout: 120_000 });
    expect(await page.evaluate(() => document.getElementById('mstart').style.display))
      .toBe('none');
  });

  test('der Dreh-Hinweis liegt unter allem, was Inhalt zeigt', async ({ page }) => {
    await page.goto(frisch(), { waitUntil: 'domcontentloaded' });
    const z = await page.evaluate(() => {
      const w = (id) => {
        const e = document.getElementById(id);
        if (!e) return null;
        const alt = e.style.display;
        e.style.display = 'flex';                 // z-index ist ohne Anzeige nicht berechnet
        const v = parseInt(getComputedStyle(e).zIndex, 10);
        e.style.display = alt;
        return v;
      };
      return { rotate: w('rotate'), death: w('deathui'), konto: w('accountui'),
               set: w('settingsui'), join: w('joinui'), gate: w('mstart') };
    });
    // Wer sein Handy nach dem Tod dreht, darf seine Auswertung nicht verlieren.
    for (const k of ['death', 'konto', 'set', 'join', 'gate']) {
      expect(z.rotate, `#rotate (${z.rotate}) muss unter #${k} (${z[k]}) liegen`)
        .toBeLessThan(z[k]);
    }
  });
});
