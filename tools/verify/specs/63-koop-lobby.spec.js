// Der Gastgeber-Bildschirm und die Adresspruefung des Beitritts.
//
// Reines DOM: die Engine wird BEWUSST nicht gebootet. Was hier geprueft wird,
// ist Geometrie und Logik der Shell -- ein Boot kostete den 90-MB-Download je
// Test und bewiese nichts, was diese Messungen nicht zeigen. Das Zusammen-
// spielen selbst deckt 61-koop-rtc ab.
import { test, expect } from '@playwright/test';

test.setTimeout(120_000);

async function auf(page, groesse) {
  await page.setViewportSize(groesse);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const cmds = [];
    window.tsCmd = (c) => { cmds.push(c); return true; };
    // Ohne Engine-Boot bleibt das Gate ueber allem stehen und verdeckt jedes
    // Overlay -- das ist Testaufbau, nicht Produkt (siehe 30-bestenliste).
    document.getElementById('mstart').style.display = 'none';
    TS_LOBBY.zeigen();
    const el  = document.getElementById('lobbyui');
    const cs  = getComputedStyle(el);
    const box = el.querySelector('.box').getBoundingClientRect();
    const akt = el.querySelector('.death-actions').getBoundingClientRect();
    return {
      position: cs.position, zIndex: cs.zIndex, display: cs.display,
      hoehe: window.innerHeight, breite: window.innerWidth,
      knopfUnten: Math.round(akt.bottom), knopfOben: Math.round(akt.top),
      boxRechts: Math.round(box.right),
      code: document.getElementById('raum-code').textContent,
      // Der Schalter fuer die oeffentliche Sichtbarkeit muss OHNE Rollen zu
      // sehen sein. Als der Koerper anfing zu rollen, lag er unter der Kante
      // -- und ein Schalter, den niemand findet, ist so gut wie keiner.
      schalterUnten: Math.round(document.getElementById('raum-oeff-zeile').getBoundingClientRect().bottom),
      rollt: (() => { const k = el.querySelector('.lb-koerper');
                      return k ? k.scrollHeight > k.clientHeight + 1 : false; })(),
      cmds,
    };
  });
}

for (const [name, groesse] of [
  ['quer 844x390', { width: 844, height: 390 }],
  ['hoch 390x844', { width: 390, height: 844 }],
]) {
  test(`Gastgeber-Bildschirm haelt sich im Bild -- ${name}`, async ({ page }) => {
    const r = await auf(page, groesse);

    // Footgun 16: ein Overlay, das nicht im Sammelselektor steht, bekommt kein
    // position:fixed -- und z-index wirkt auf statische Elemente nicht. Genau
    // so lag der Einstellungsschirm ueber seine ganze Auslieferungszeit
    // unsichtbar unter dem Canvas.
    expect(r.position, 'ohne position:fixed liegt das Overlay unter dem Canvas').toBe('fixed');
    expect(r.display).toBe('flex');
    expect(Number(r.zIndex), 'z-index kommt aus dem Stapelregister').toBeGreaterThan(0);

    // Footgun 20: eine Box, die mit ihrem Inhalt waechst, schiebt ihre eigenen
    // Knoepfe aus dem Bild. Auf WebKit reichte dafuer einmal EIN Erfolg.
    expect(r.knopfUnten, `KARTE WAEHLEN unter dem Bildrand (${r.knopfUnten} > ${r.hoehe})`)
      .toBeLessThanOrEqual(r.hoehe);
    expect(r.knopfOben, 'Knopfreihe darf nicht oberhalb des Bildes beginnen').toBeGreaterThanOrEqual(0);
    expect(r.boxRechts, 'die Karte darf nicht seitlich hinauslaufen').toBeLessThanOrEqual(r.breite + 1);

    expect(r.schalterUnten, 'der Sichtbarkeits-Schalter muss im Bild liegen')
      .toBeLessThanOrEqual(r.hoehe);
    expect(r.rollt, 'im Gastgeber-Schirm darf nichts weggerollt sein').toBe(false);

    // Ein Code, den man am Telefon vorlesen kann.
    expect(r.code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  });
}

test('KARTE WAEHLEN schickt Code und Befehl in EINEM Aufruf', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const cmds = [];
    window.tsCmd = (c) => { cmds.push(c); return true; };
    document.getElementById('mstart').style.display = 'none';
    TS_LOBBY.zeigen();
    const code = TS_LOBBY.code;
    TS_LOBBY.starten();
    return { code, cmds, chip: document.getElementById('raumchip').textContent };
  });
  // Jeder cbufadd-Aufruf loest window.focus() aus; eine Salve davon reisst auf
  // dem Handy den Finger vom Joystick. Deshalb EIN Aufruf, nicht zwei.
  expect(r.cmds.length, `erwartet genau ein tsCmd, bekam ${JSON.stringify(r.cmds)}`).toBe(1);
  expect(r.cmds[0]).toContain('set ts_raum "' + r.code + '"');
  expect(r.cmds[0]).toContain('ts_koop');
  expect(r.chip, 'der Code muss im Spiel sichtbar bleiben').toContain(r.code.slice(0, 3));
});

test('Die Beitrittspruefung laesst die Raumform durch und Einschleusung nicht', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({
    // Die RELATIVE Form ist die einzige, die den Raum des Gastgebers trifft.
    // Das alte Muster wies sie ab -- der einzig funktionierende Weg war
    // gesperrt.
    raum:      TS_JOIN.gueltig('/ABC234'),
    wss:       TS_JOIN.gueltig('wss://totersignal.de/spiel1'),
    hostname:  TS_JOIN.gueltig('totersignal.de:27500'),
    // Die Adresse wandert in eine Konsolenzeile, und tsCmd fuehrt JEDE aus.
    semikolon: TS_JOIN.gueltig('/ABC; map ndu'),
    zeile:     TS_JOIN.gueltig('/ABC\nmap ndu'),
    leer:      TS_JOIN.gueltig('/ABC map'),
    anfuehr:   TS_JOIN.gueltig('/ABC"x'),
  }));
  expect(r.raum, 'die relative Raumform muss durch').toBe(true);
  expect(r.wss).toBe(true);
  expect(r.hostname).toBe(true);
  for (const k of ['semikolon', 'zeile', 'leer', 'anfuehr'])
    expect(r[k], `Einschleusung ueber "${k}" muss abgewiesen werden`).toBe(false);
});

// Der Overlay-Vertrag, generisch ueber ALLE .ts-ov -- nicht ueber eine Liste
// von IDs. Der Unterschied ist der ganze Punkt: das naechste Overlay ist an
// dem Tag mitgeprueft, an dem es die Klasse traegt, und nicht an dem Tag, an
// dem jemand daran denkt, es hier einzutragen.
test('Jedes Overlay traegt den gemeinsamen Vertrag', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    return [...document.querySelectorAll('.ts-ov')].map((el) => {
      const alt = el.style.display;
      el.style.display = 'flex';                  // ohne Anzeige ist nichts berechnet
      const cs = getComputedStyle(el);
      const vorher = getComputedStyle(el, '::before');
      const nachher = getComputedStyle(el, '::after');
      const o = {
        id: el.id, position: cs.position, z: parseInt(cs.zIndex, 10),
        // Bildroehren-Optik: hing frueher an einer ID-Liste, vier Overlays
        // hatten sie nicht und sahen aus wie aus einem anderen Spiel.
        scanlines: vorher.backgroundImage !== 'none',
        koernung:  nachher.backgroundImage !== 'none',
      };
      el.style.display = alt;
      return o;
    });
  });
  expect(r.length, 'es muss Overlays geben').toBeGreaterThanOrEqual(8);
  for (const o of r) {
    expect(o.position, `#${o.id} ohne position:fixed liegt unter dem Canvas`).toBe('fixed');
    expect(Number.isFinite(o.z), `#${o.id} ohne z-index aus dem Register`).toBe(true);
    expect(o.scanlines, `#${o.id} ohne Scanlines -- sieht aus wie ein fremdes Spiel`).toBe(true);
    expect(o.koernung, `#${o.id} ohne Koernung`).toBe(true);
  }
});

// Die Wartezone. Sie entsteht aus dem Marker TSUI:mp:<anzahl>|<lobby> -- die
// Shell kann beides nicht selbst wissen: player_count lebt in CSQC, und
// ts_lobby steht als Cvar nur auf der Maschine des Gastgebers (deshalb reist
// es als serverinfo mit).
test('Wartezone zeigt Stand, sperrt den Start fuer Gaeste und blockiert das Spiel nicht', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const cmds = [];
    window.tsCmd = (c) => { cmds.push(c); return true; };
    document.getElementById('mstart').style.display = 'none';
    const bar = document.getElementById('lobbybar');
    const cs = () => getComputedStyle(bar);

    TS_LOBBY.code = 'ABC234'; TS_LOBBY.aktiv = true;
    TS_LOBBY.mp('2|1');
    const gastgeber = {
      sichtbar: cs().display !== 'none',
      // Die Leiste liegt UEBER dem Spiel und darf trotzdem keine Beruehrung
      // abfangen -- wer wartet, will sich umsehen koennen.
      durchlaessig: cs().pointerEvents === 'none',
      knopfKlickbar: getComputedStyle(document.getElementById('lb-los')).pointerEvents === 'auto',
      knopfSichtbar: getComputedStyle(document.getElementById('lb-los')).display !== 'none',
      zahl: document.getElementById('lb-zahl').textContent,
      code: document.getElementById('lb-code').textContent,
      unten: Math.round(bar.getBoundingClientRect().bottom),
      rechts: Math.round(bar.getBoundingClientRect().right),
    };

    TS_LOBBY.aktiv = false; TS_LOBBY.code = null;
    TS_LOBBY.mp('2|1');
    const gast = {
      sichtbar: cs().display !== 'none',
      knopfSichtbar: getComputedStyle(document.getElementById('lb-los')).display !== 'none',
      code: document.getElementById('lb-code').textContent,
    };

    TS_LOBBY.mp('2|0');
    const laeuft = { sichtbar: cs().display !== 'none' };

    cmds.length = 0;
    TS_LOBBY.aktiv = true; TS_LOBBY.code = 'ABC234';
    TS_LOBBY.losgehts();
    return { gastgeber, gast, laeuft, cmds, hoehe: window.innerHeight, breite: window.innerWidth };
  });

  expect(r.gastgeber.sichtbar).toBe(true);
  expect(r.gastgeber.durchlaessig, 'die Leiste darf das Spiel nicht abfangen').toBe(true);
  expect(r.gastgeber.knopfKlickbar, 'ihr Knopf schon').toBe(true);
  expect(r.gastgeber.knopfSichtbar).toBe(true);
  expect(r.gastgeber.zahl).toBe('2 Spieler');
  expect(r.gastgeber.code).toContain('ABC-234');
  expect(r.gastgeber.unten, 'die Leiste muss im Bild liegen').toBeLessThanOrEqual(r.hoehe);
  expect(r.gastgeber.rechts).toBeLessThanOrEqual(r.breite + 1);

  expect(r.gast.sichtbar, 'auch der Gast sieht den Stand').toBe(true);
  // Ein Startknopf, der beim Gast nichts tut, waere schlimmer als keiner.
  expect(r.gast.knopfSichtbar, 'nur der Gastgeber darf starten').toBe(false);
  expect(r.gast.code, 'ohne eigenen Code steht dort der Hinweis').toMatch(/Warte|Waiting/);

  expect(r.laeuft.sichtbar, 'laeuft die Runde, hat die Leiste nichts mehr zu sagen').toBe(false);

  // `set`, nicht `ts_lobby 0`: die Cvar wird erst vom Server-QuakeC
  // registriert -- eine unbekannte Cvar ist fuer die Konsole ein unbekannter
  // BEFEHL und lautlos wirkungslos.
  expect(r.cmds.join(' ')).toContain('set ts_lobby 0');
});

// Der Raumcode darf eine Runde nicht ueberleben. Ohne dieses Aufraeumen zeigte
// ein anschliessendes SOLO-Spiel "Beitritt bis Runde 3" -- fuer einen Raum,
// den es nicht mehr gibt. Gefunden, weil die Markerausgabe im Solo-Lauf
// TSUI:mp:1|0|1|3|0 zeigte und die Bedingung fuer die Einstiegsleiste damit
// erfuellt gewesen waere.
test('Der Raumcode wird beim Rueckweg ins Menue geraeumt', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    window.tsCmd = () => true;
    TS_LOBBY.code = 'ABC234'; TS_LOBBY.aktiv = true;
    const vorher = { code: TS_LOBBY.code, aktiv: TS_LOBBY.aktiv };
    tsMarker('\nTSUI:menu\n');
    const nachher = { code: TS_LOBBY.code, aktiv: TS_LOBBY.aktiv };

    // Gegenprobe: solange der Gastgeber-Schirm OFFEN ist, darf nicht geraeumt
    // werden -- dort ist der Code gerade erst entstanden.
    TS_LOBBY.code = 'XYZ789'; TS_LOBBY.aktiv = true;
    document.getElementById('lobbyui').style.display = 'flex';
    tsMarker('\nTSUI:menu\n');
    const beiOffenemSchirm = TS_LOBBY.code;
    document.getElementById('lobbyui').style.display = 'none';
    return { vorher, nachher, beiOffenemSchirm };
  });
  expect(r.vorher.code).toBe('ABC234');
  expect(r.nachher.code, 'im Menue ist die Koop-Runde vorbei').toBe(null);
  expect(r.nachher.aktiv).toBe(false);
  expect(r.beiOffenemSchirm, 'ein frisch erzeugter Code darf nicht weggeraeumt werden').toBe('XYZ789');
});

// Die Liste offener Runden. Reines DOM mit gestubbtem fetch -- der echte
// Endpunkt hat seine eigene Pruefung (65-koop-api).
test('Offene Runden: echte Zeilen, ehrlicher Leerzustand, Knoepfe im Bild', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const cmds = [];
    window.tsCmd = (c) => { cmds.push(c); return true; };
    window.TS_ORIGIN_OK = true;
    document.getElementById('mstart').style.display = 'none';
    const echt = window.fetch;

    window.fetch = async () => ({ ok: true, json: async () => ({ raeume: [
      { code: 'ABC234', name: 'Nacht der Untoten', host_name: 'Kurzwelle-5295',
        map_key: 'ndu', max_spieler: 4, spieler: 2, runde: 0, status: 'offen' },
      // Ein Name mit Markup: er kommt von einem fremden Spieler und ist DATEN.
      { code: 'XYZ789', name: '<img src=x onerror=alert(1)>', host_name: 'Boese',
        map_key: 'ndu', max_spieler: 4, spieler: 1, runde: 4, status: 'laeuft' },
    ] }) });
    TS_BROWSE.zeigen();
    await new Promise((r) => setTimeout(r, 300));
    const el = document.getElementById('browseui');
    const akt = el.querySelector('.death-actions').getBoundingClientRect();
    const zeilen = [...el.querySelectorAll('.br-liste .br-zeile')];
    const voll = {
      anzahl: zeilen.length,
      knopfSind: zeilen.every((z) => z.tagName === 'BUTTON'),
      erstesText: zeilen[0].textContent,
      // textContent statt innerHTML: ein Spielername darf kein Markup werden.
      keinMarkup: !el.querySelector('.br-liste img'),
      knopfUnten: Math.round(akt.bottom),
    };

    window.fetch = async () => ({ ok: true, json: async () => ({ raeume: [] }) });
    await TS_BROWSE.laden();
    const leer = document.querySelector('#browse-liste .br-leer').textContent;

    window.fetch = async () => { throw new Error('offline'); };
    await TS_BROWSE.laden();
    const fehler = document.querySelector('#browse-liste .br-leer').textContent;

    // Beitreten schickt die RELATIVE Raumform -- alles andere traefe einen
    // anderen Raum als den, den der Gastgeber registriert hat.
    cmds.length = 0;
    TS_BROWSE.beitreten('ABC234');
    const beitritt = cmds.join(' ');
    TS_BROWSE.beitreten('ABC; map ndu');       // muss folgenlos bleiben
    const nachBoese = cmds.join(' ');

    window.fetch = echt;
    return { voll, leer, fehler, beitritt, nachBoese, hoehe: window.innerHeight };
  });

  expect(r.voll.anzahl).toBe(2);
  expect(r.voll.knopfSind, 'Zeilen muessen echte <button> sein -- sonst ist die Liste per Tastatur unerreichbar').toBe(true);
  expect(r.voll.erstesText).toContain('Nacht der Untoten');
  expect(r.voll.erstesText).toContain('2/4');
  expect(r.voll.keinMarkup, 'ein fremder Spielername darf kein Markup werden').toBe(true);
  expect(r.voll.knopfUnten, 'die Knopfreihe muss im Bild bleiben').toBeLessThanOrEqual(r.hoehe);

  // Der Leerzustand sagt die Wahrheit und bietet den einzigen Weg an, der
  // dann hilft. Erfundene Eintraege gibt es hier ausdruecklich nicht.
  expect(r.leer).toMatch(/niemand|Nobody/);
  expect(r.fehler).toMatch(/erreichbar|unreachable/);

  expect(r.beitritt).toContain('connect /ABC234');
  expect(r.nachBoese, 'ein Code mit Semikolon darf keine Konsolenzeile erzeugen')
    .not.toContain('map ndu');
});
