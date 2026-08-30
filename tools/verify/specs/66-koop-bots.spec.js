// KI-Mitspieler (ts_bot.qc).
//
// Sie sind ECHTE Clients (spawnclient) und zaehlen damit in player_count -- an
// dem haengt die Zombiezahl ((player_count - 1) * 6). Ein Bot, der nur dasteht,
// macht das Spiel also SCHWERER statt leichter. Deshalb prueft dieser Test nicht,
// ob ein Bot existiert, sondern ob er das tut, wofuer es ihn gibt: kaempfen und
// aufhelfen.
//
// Jede Behauptung hier hat einen Fehler ueberlebt, der ohne sie unbemerkt
// zurueckkaeme:
//   kaempft  -> TraceAttack richtet KEINEN Schaden an, es bucht ihn auf
//               `hitamount`; erst Parse_Damage() loest ihn ein. Ohne die Zeile
//               traf der Bot sauber und der Zombie blieb bei 150 Leben --
//               seine Punkte standen die ganze Runde auf 500.
//   hilft    -> zwei stille Fehler zugleich: vectoangles gibt das Nicken
//               positiv nach OBEN und makevectors liest es positiv nach UNTEN
//               (der Bot schaute um denselben Winkel daneben), und die
//               Wiederbelebung lebt in einer BERUEHRUNGsfunktion, die ein
//               stehender MOVETYPE_STEP-Koerper nie wieder ausloest.
import { test, expect } from '@playwright/test';
import { booten, SOLO_START } from '../lib/boot.js';

test.describe.configure({ mode: 'serial' });
test.setTimeout(320_000);

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop',
    'lange Spielmessung -- genau einmal, nicht je Geraeteprofil');
});

const START = SOLO_START + 'sv_cheats 1\nmaxclients 4\nmap ndu\n';

// Die Bot-Zahl gehoert der SHELL, nicht der Konsole. Sie schreibt bei jedem
// TSUI:game ihren ganzen Satz Einstellungen in die Engine (Cvars sind aus JS
// nicht lesbar, also ist localStorage die Wahrheit) -- ein per Konsole
// gesetztes `ts_bots 1` wird dabei zuverlaessig wieder auf den gespeicherten
// Wert gezogen. Genau darauf ist diese Pruefung beim ersten Anlauf
// hereingefallen: sie mass gegen die Konsole und bekam still eine 0.
const botsSetzen = (page, n) => page.evaluate((v) => {
  TS_SET.setzen(TS_SET.defs.find((d) => d.id === 'bots'), v);
}, n);

test('ein Bot spielt mit, kaempft und hilft wieder auf', async ({ page }) => {
  const m = await booten(page);
  await botsSetzen(page, 1);
  await page.evaluate((c) => window.tsCmd(c), START);
  await page.waitForTimeout(40_000);

  const marker = () => m.all().map((x) => x.text.trim());
  const zeilen = () => {
    const o = {};
    for (const z of marker()) if (z.startsWith('TSUI:mprow:')) {
      const t = z.slice(11).split('|');
      o[t.slice(4).join('|')] = { punkte: +t[1], bits: +t[3] };
    }
    return o;
  };

  // 1. Der Bot ist ein echter Mitspieler.
  const namen = Object.keys(zeilen());
  const botname = namen.find((n) => n.startsWith('Bot-'));
  expect(botname, `kein Bot in ${JSON.stringify(namen)}`).toBeTruthy();
  expect(marker().filter((z) => z.startsWith('TSUI:mp:')).pop()).toMatch(/^TSUI:mp:2\|/);

  // 2. Er kaempft. 500 sind die Startpunkte -- wer nichts trifft, bleibt dort
  //    stehen. Genau das war der Zustand ohne Parse_Damage().
  await page.waitForTimeout(35_000);
  expect(zeilen()[botname].punkte,
    'der Bot hat in 75 s keinen Zombie getoetet').toBeGreaterThan(500);

  // 3. Er hilft wieder auf.
  //
  // `kill` geht im Koop ueber DamageHandler in den Last Stand, nicht in den
  // Tod -- das ist der verlaessliche Weg, einen Sturz herzustellen.
  //
  // Belegt wird die Wiederbelebung POSITIV, ueber das Feld `revives` in
  // TSUI:dstats. Der erste Anlauf schloss nur zurueck ("die Runde laeuft noch,
  // also wurde ich aufgehoben") -- und fiel prompt, als der Bot selbst zu
  // Boden ging. Ein Umkehrschluss ueber einen Zustand, den auch etwas anderes
  // herstellen kann, ist kein Nachweis.
  await page.evaluate(() => window.tsCmd('kill\n'));
  await page.waitForTimeout(22_000);

  // Runde geordnet beenden: ohne Bot ist niemand mehr auf den Beinen, sobald
  // der Spieler faellt -- dann kommt die Endwertung.
  await botsSetzen(page, 0);
  await page.waitForTimeout(9_000);
  await page.evaluate(() => window.tsCmd('kill\n'));
  expect(await m.waitFor('TSUI:dstats:', 60_000), 'keine Endwertung').toBe(true);

  const stats = marker().filter((z) => z.startsWith('TSUI:dstats:')).pop().slice(12).split('|');
  expect(+stats[4], 'der Sturz wurde nicht gezaehlt').toBeGreaterThanOrEqual(1);
  expect(+stats[5], 'niemand hat den Spieler aufgehoben').toBeGreaterThanOrEqual(1);
});


test('ts_bots 0 entfernt den Bot wieder', async ({ page }) => {
  const m = await booten(page);
  const marker = () => m.all().map((x) => x.text.trim());
  await botsSetzen(page, 1);
  await page.evaluate((c) => window.tsCmd(c), START);
  await page.waitForTimeout(35_000);
  expect(marker().filter((z) => z.startsWith('TSUI:mp:')).pop()).toMatch(/^TSUI:mp:2\|/);

  await botsSetzen(page, 0);
  await page.waitForTimeout(12_000);
  expect(marker().filter((z) => z.startsWith('TSUI:mp:')).pop()).toMatch(/^TSUI:mp:1\|/);
});

// Bots duerfen den letzten Platz nicht besetzen, solange noch jemand beitreten
// kann. maxclients ist 4; ein Gastgeber mit drei Bots wuerde sonst seine
// eigenen Freunde aussperren -- und die Engine weist die Verbindung ab, bevor
// QuakeC davon erfaehrt, der Freund saehe also nur, dass es nicht geht.
//
// Unterschieden wird an `ts_raum`: die setzt die Shell nur beim Anbieten und
// raeumt sie beim Rueckweg ins Menue. Wer allein spielt, bekommt seine drei.
// Zwei Faelle, zwei frische Seiten -- ausdruecklich NICHT nacheinander auf
// derselben. TSUI:mp: wird nur bei AENDERUNG gesendet; nach einem zweiten
// `map` mit demselben Endstand kommt kein neuer Marker, und man liest den Wert
// des vorigen Spiels. Genau daran ist der erste Anlauf gescheitert (Footgun 29
// in klein: der Marker steht still, waehrend sich die Lage aendert).
for (const [name, raum, erwartet] of [
  ['Solo: alle drei Bots',                '""',        4],
  ['Koop: einer weniger, damit ein Freund hereinkommt', 'PRUEFRAUM', 3],
]) {
  test(name, async ({ page }) => {
    const m = await booten(page);
    await botsSetzen(page, 3);
    await page.evaluate((c) => window.tsCmd(c),
      START.replace('map ndu', `set ts_raum ${raum}\nset ts_joinround 3\nmap ndu`));
    await page.waitForTimeout(42_000);
    const z = m.all().map((x) => x.text.trim()).filter((t) => t.startsWith('TSUI:mp:'));
    expect(z.length, 'kein Spielerstand gemeldet').toBeGreaterThan(0);
    expect(+z[z.length - 1].split(':')[2].split('|')[0]).toBe(erwartet);
  });
}


// Die Zeile in den Einstellungen. Sie schreibt eine SERVER-Cvar -- in einer
// fremden Runde waere sie ein Regler, der nichts tut, und genau das soll sie
// dort nicht sein.
test('KI-Mitspieler stehen in den Einstellungen, aber nicht als Gast', async ({ page }) => {
  await booten(page);
  const sichtbar = () => page.evaluate(() =>
    TS_SET.sichtbar().map((d) => d.id).includes('bots'));

  expect(await sichtbar(), 'die Zeile fehlt im eigenen Spiel').toBe(true);

  await page.evaluate(() => { window.TS_JOIN.alsGast = true; });
  expect(await sichtbar(), 'als Gast wird ein wirkungsloser Regler angeboten').toBe(false);

  // Und der Regler schreibt wirklich etwas.
  await page.evaluate(() => { window.TS_JOIN.alsGast = false; });
  const cmds = await page.evaluate(() => {
    const echt = window.tsCmd; const gesehen = [];
    window.tsCmd = (c) => { gesehen.push(c); };
    TS_SET.defs.find((d) => d.id === 'bots').anwenden(2);
    window.tsCmd = echt; return gesehen;
  });
  expect(cmds.join('')).toContain('set ts_bots 2');
});
