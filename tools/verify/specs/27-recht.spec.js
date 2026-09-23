// Credits, Recht und Einwilligung (23.09.2026).
//
// Drei Dinge, die vorher live falsch waren und nur am Bild zu sehen sind:
// - Die Startseite nannte weder NZ:P noch die Lizenz noch den Quelltext.
// - KONTO & FORTSCHRITT oeffnete den Schirm UNTER dem Gate (z 47 gegen 50).
// - `age_confirmed: true` ging ohne jede Frage an den Server.
// Die Kontoanlage wird hier abgefangen: kein Test legt ein echtes Konto an.
import { test, expect } from '@playwright/test';

async function gateBereit(page) {
  await page.route('**/api/auth/anon', (r) => r.fulfill({ status: 500, body: '{}', contentType: 'application/json' }));
  await page.goto('/', { waitUntil: 'load' });
  await page.locator('#mstart').waitFor({ state: 'visible', timeout: 20_000 });
}

// Liegt das Element am Schirm OBEN? Mittelpunkt-Treffer plus Deckkraft entlang
// der Vorfahren (Betriebsregel 26g: isVisible zaehlt Verdecktes mit).
function obenAuf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel); if (!el) return 'fehlt';
    const r = el.getBoundingClientRect(); if (!r.width) return 'unsichtbar';
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 20));
    let o = 1; for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
    return t && (el === t || el.contains(t)) && o > 0.5 ? 'oben' : 'verdeckt von ' + ((t && t.closest('[id]')) || {}).id;
  }, sel);
}

test('Startseite nennt NZ:P, Lizenz, Quelltext, Impressum und Datenschutz', async ({ page }) => {
  await gateBereit(page);
  const f = page.locator('#gate-fuss');
  await expect(f).toContainText('Nazi Zombies: Portable');
  await expect(f).toContainText('GPL-2.0');
  const hrefs = await f.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(expect.arrayContaining([
    'https://github.com/nebulausername/totes-signal',
    'https://kaufmeinewebsite.de/legal#impressum',
    'datenschutz.html',
  ]));
  const r = await f.boundingBox(); const vp = page.viewportSize();
  expect(r.y + r.height, 'Fusszeile liegt im Fenster').toBeLessThanOrEqual(vp.height);
});

test('Ein Klick auf einen Fusszeilen-Link startet das Spiel nicht', async ({ page, context }) => {
  await gateBereit(page);
  const [tab] = await Promise.all([context.waitForEvent('page'), page.click('#gate-fuss a[href="datenschutz.html"]')]);
  await tab.close();
  expect(await page.evaluate(() => document.getElementById('mstart').style.display)).not.toBe('none');
});

test('KONTO & FORTSCHRITT liegt vom Gate aus OBEN', async ({ page }) => {
  await gateBereit(page);
  await page.click('#gate-konto');
  await expect.poll(() => obenAuf(page, '#accountui .box')).toBe('oben');
});

test('Kein Konto ohne Einwilligung -- Abbrechen und Escape senden nichts', async ({ page }) => {
  const anon = [];
  page.on('request', (q) => { if (q.url().includes('/api/auth/anon')) anon.push(q.postData()); });
  await gateBereit(page);
  await page.click('#gate-konto');
  await page.click('#acc-an');
  await expect.poll(() => obenAuf(page, '#einwui .box')).toBe('oben');
  await page.click('#einw-nein');
  await page.click('#acc-an'); await page.keyboard.press('Escape');
  expect(anon, 'ohne Zustimmung darf nichts an den Server').toHaveLength(0);
  await page.click('#acc-an'); await page.click('#einw-ja');
  await expect.poll(() => anon.length).toBe(1);
  const body = JSON.parse(anon[0]);
  expect(body.age_confirmed).toBe(true);
  expect(body.privacy_version).toBe(await page.evaluate(() => TS_EINWILLIGUNG.FASSUNG));
});

test('Datenschutzerklaerung ist ausgeliefert und vollstaendig', async ({ page }) => {
  const r = await page.goto('/datenschutz.html');
  expect(r.status()).toBe(200);
  const t = await page.locator('body').innerText();
  expect(t).not.toContain('ANSCHRIFT_FEHLT');
  expect(t).toMatch(/koop/i);
  expect(t).toContain('Fassung ' + '1.1');
});
