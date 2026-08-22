import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Warum es diese Datei gibt:
//
// Die Liste der noch nicht ausgelieferten Karten steht ZWEIMAL -- in
// quakec/source/menu/defs/menu_defs.qc als wip_maps[] und in web/index.html
// als TS_WEITER.WIP. Die Doppelung ist Absicht: die Shell kann die
// QC-Tabelle nicht lesen, und ohne ihre Kopie boete WEITERSPIELEN weiter eine
// Karte an, die das Menue daneben sperrt. Absicht schuetzt aber nicht vor
// Vergesslichkeit -- deshalb dieser Abgleich.
//
// Ausserdem muessen stock_maps[] und wip_maps[] zusammen JEDE .bsp in
// game.pk3 abdecken und sich nicht ueberschneiden. Eine Karte in beiden Listen
// waere gesperrt UND beworben; eine in keiner faellt durch und ist wieder
// still startbar -- genau der Zustand, den diese Sitzung beseitigt hat.
//
// Rein statisch, kein Browser noetig: laeuft deshalb nur auf chromium-desktop.

const WURZEL = path.resolve(process.cwd(), '..', '..');

function qcTabelle(name) {
  const qc = fs.readFileSync(path.join(WURZEL, 'quakec/source/menu/defs/menu_defs.qc'), 'utf8');
  const m = qc.match(new RegExp(name + '\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\};'));
  if (!m) throw new Error(`${name}[] nicht gefunden`);
  return [...m[1].matchAll(/\{"([^"]+)"/g)].map((x) => x[1]);
}

function shellListe() {
  const html = fs.readFileSync(path.join(WURZEL, 'web/index.html'), 'utf8');
  const m = html.match(/WIP: (\[[\s\S]*?\]),/);
  if (!m) throw new Error('TS_WEITER.WIP nicht gefunden');
  return JSON.parse(m[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
}

// Die Dateinamen stehen im Zentralverzeichnis der pk3 im Klartext. Das
// Verzeichnis wird ueber den End-of-Central-Directory-Satz gefunden und genau
// in seiner Laenge gelesen -- blind die letzten 64 KB zu nehmen reichte NICHT
// (das Verzeichnis ist groesser, und die maps/-Eintraege stehen nicht an
// seinem Ende). Ein 90-MB-Entpacken bleibt trotzdem erspart.
function bspNamen() {
  const datei = path.join(WURZEL, 'web/nzp/game.pk3');
  const fd = fs.openSync(datei, 'r');
  try {
    const groesse = fs.fstatSync(fd).size;
    const schwanz = Buffer.alloc(Math.min(65536, groesse));
    fs.readSync(fd, schwanz, 0, schwanz.length, groesse - schwanz.length);
    let eocd = -1;
    for (let i = schwanz.length - 22; i >= 0; i--) {
      if (schwanz.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('kein End-of-Central-Directory in game.pk3');
    const vzGroesse = schwanz.readUInt32LE(eocd + 12);
    const vzVersatz = schwanz.readUInt32LE(eocd + 16);
    const vz = Buffer.alloc(vzGroesse);
    fs.readSync(fd, vz, 0, vzGroesse, vzVersatz);
    return [...new Set([...vz.toString('latin1').matchAll(/maps\/([A-Za-z0-9_.-]+)\.bsp/g)].map((m) => m[1]))];
  } finally {
    fs.closeSync(fd);
  }
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop',
    'Rein statische Pruefung -- ein Lauf genuegt.');
});

test('Die gedoppelte Sperrliste stimmt auf beiden Seiten ueberein', () => {
  const qc = qcTabelle('wip_maps').sort();
  const shell = shellListe().sort();
  expect(shell, 'TS_WEITER.WIP muss wip_maps[] entsprechen -- sonst bietet WEITERSPIELEN eine gesperrte Karte an').toEqual(qc);
});

test('Keine Karte ist gleichzeitig gesperrt und beworben', () => {
  const stock = new Set(qcTabelle('stock_maps'));
  const doppelt = qcTabelle('wip_maps').filter((k) => stock.has(k));
  expect(doppelt, 'in stock_maps[] UND wip_maps[]').toEqual([]);
});

test('Jede .bsp in game.pk3 ist entweder ausgeliefert oder ausdruecklich gesperrt', () => {
  const bsp = bspNamen();
  expect(bsp.length, 'Zentralverzeichnis der pk3 gelesen').toBeGreaterThan(10);
  const bekannt = new Set([...qcTabelle('stock_maps'), ...qcTabelle('wip_maps')]);
  const uebersehen = bsp.filter((k) => !bekannt.has(k));
  expect(uebersehen, 'weder in stock_maps[] noch in wip_maps[] -- waere still startbar').toEqual([]);
});
