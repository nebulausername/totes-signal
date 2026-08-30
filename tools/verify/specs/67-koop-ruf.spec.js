// Schnellrufe und Chat.
//
// `say` ist ein echtes Kommando dieser Engine -- am 2026-08-30 am gepinnten
// Build gemessen: `say <text>` UND `cmd say <text>` erreichen den Server und
// erscheinen bei allen. Es braucht dafuer kein QuakeC.
//
// Der Chat gehoert der SHELL (Marker TSUI:chat:, ts_shell_chat 1). Die Engine
// setzt ihn in der Konsolenschrift -- auf dem Handy rund 8 CSS-Pixel, ohne
// Umbruch -- auf genau der Flaeche, auf der "ich brauche Hilfe" steht.
import { test, expect } from '@playwright/test';

const frisch = () => '/?t=' + Date.now() + Math.random().toString(36).slice(2, 7);
test.setTimeout(90_000);

async function auf(page) {
  await page.goto(frisch(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
}

test('der RUF-Knopf erscheint nur im Koop', async ({ page }) => {
  await auf(page);
  const klasse = () => page.evaluate(() =>
    document.getElementById('touchui').classList.contains('koop'));

  expect(await klasse(), 'im Alleingang gibt es niemanden zu rufen').toBe(false);
  await page.evaluate(() => TS_RUF.koop(true));
  expect(await klasse()).toBe(true);
  // Und beim Rueckweg ins Menue wieder weg.
  await page.evaluate(() => TS_RUF.koop(false));
  expect(await klasse()).toBe(false);
});

test('ein Ruf geht als EIN Kommando hinaus und traegt nichts Zweites mit', async ({ page }) => {
  await auf(page);
  const cmds = await page.evaluate(() => {
    const gesehen = [];
    window.tsCmd = (c) => { gesehen.push(c); return true; };
    TS_RUF.senden('HILFE!');
    // Der Text landet in einer Konsolenzeile, und tsCmd fuehrt JEDE Zeile aus.
    // Ein Zeilenumbruch oder ein Semikolon darin waere ein zweiter Befehl.
    // Die Rufe sind fest verdrahtet -- aber eine Uebersetzung ist Text, den
    // irgendwann jemand anfasst.
    TS_RUF.senden('Hilfe\nquit');
    TS_RUF.senden('Hilfe; map ndu');
    TS_RUF.senden('Grüße');          // Nicht-ASCII: die Spielschrift kann es nicht
    return gesehen;
  });

  expect(cmds[0]).toBe('cmd say HILFE!\n');
  // DAS ist die Zusage: eine Zeile, ein Kommando. Nicht "das Wort quit kommt
  // nicht vor" -- der Umbruch ist entfernt, also ist "quit" nur noch Text, und
  // ein Ruf darf Text enthalten.
  for (const c of cmds) expect(c.trim().split('\n').length,
    `mehr als ein Kommando in "${c.trim()}"`).toBe(1);
  expect(cmds.join(''), 'Semikolon trennt Befehle').not.toContain(';');
  expect(cmds[1], 'aus zwei Woertern darf kein neues werden').toBe('cmd say Hilfe quit\n');
  expect(cmds[3], 'Nicht-ASCII kann die Spielschrift nicht zeichnen').toBe('cmd say Gr e\n');
});

test('der Chat zeigt fremden Text als TEXT, nicht als Markup', async ({ page }) => {
  await auf(page);
  const r = await page.evaluate(() => {
    TS_CHAT.anzeigen(true);
    // Der Text kommt von einem fremden Mitspieler -- spaeter womoeglich aus
    // einem nativen Client, den wir nicht gebaut haben. Er darf niemals
    // Markup in diese Seite tragen.
    TS_CHAT.empfangen('1|Signal-1|<img src=x onerror="window.__boese=1">');
    // Und der TEXT steht ganz hinten, weil er ein '|' enthalten darf.
    TS_CHAT.empfangen('2|Signal-2|links | rechts');
    const el = document.getElementById('chatlog');
    return { html: el.innerHTML, texte: [...el.querySelectorAll('.cl-zeile')].map((z) => z.textContent),
             bilder: el.querySelectorAll('img').length, boese: !!window.__boese };
  });
  expect(r.bilder, 'fremder Text wurde als Markup gebaut').toBe(0);
  expect(r.boese).toBe(false);
  expect(r.texte[1], 'ein Pipe im Text darf die Felder nicht verschieben')
    .toBe('Signal-2: links | rechts');
});

test('der Chat vergisst und raeumt', async ({ page }) => {
  await auf(page);
  const n = await page.evaluate(() => {
    TS_CHAT.anzeigen(true);
    for (let i = 0; i < 9; i++) TS_CHAT.empfangen(`1|S${i}|Zeile ${i}`);
    const viele = document.querySelectorAll('#chatlog .cl-zeile').length;
    TS_CHAT.leeren();
    return { viele, nach: document.querySelectorAll('#chatlog .cl-zeile').length };
  });
  // Mehr als vier Zeilen verdecken das Spiel; weniger verschluckt Antworten.
  expect(n.viele).toBeLessThanOrEqual(4);
  expect(n.nach).toBe(0);
});
