import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Warum es diese Datei gibt:
//
// Die 42 Erfolge stehen an DREI Stellen, die auseinanderlaufen koennen:
//
//   1. server/data/erfolge.json  -- die Quelle: Text, XP, Regel, `verfuegbar`
//   2. quakec/source/client/achievements.qc -- Achievement_Create(id, ...)
//   3. irgendwo im Server-QuakeC -- GiveAchievement(id) als Vergabestelle
//
// Am 24.08. waren 19 von 42 als `verfuegbar: false` markiert. Bei dreien
// liegt es an einer Karte, die wir gar nicht ausliefern; bei den uebrigen 16
// fehlte schlicht die Vergabestelle -- der Erfolg stand vollstaendig
// beschrieben in der Tabelle und war im Spiel unerreichbar.
//
// Genau diese Divergenz faengt dieser Test: ein ingame-Erfolg, der sich als
// `verfuegbar` ausgibt, MUSS irgendwo im Server-QuakeC vergeben werden.
// Umgekehrt gilt es NICHT -- eine Vergabestelle fuer einen noch nicht
// freigeschalteten Erfolg ist Vorarbeit, kein Fehler.
//
// Rein statisch, kein Browser noetig: laeuft deshalb nur auf chromium-desktop.

const WURZEL = path.resolve(process.cwd(), '..', '..');

function erfolge() {
  return JSON.parse(
    fs.readFileSync(path.join(WURZEL, 'server/data/erfolge.json'), 'utf8'),
  ).erfolge;
}

// Alle GiveAchievement(<zahl>...)-Aufrufe im gesamten Server-QuakeC.
// Rekursiv, weil die Vergabestellen absichtlich dort stehen, wo das Ereignis
// entsteht -- ueber ein Dutzend Dateien verteilt und nicht gesammelt.
function vergabestellen() {
  const wurzel = path.join(WURZEL, 'quakec/source/server');
  const ids = new Map();

  const lauf = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { lauf(p); continue; }
      if (!e.name.endsWith('.qc')) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(/\bGiveAchievement\s*\(\s*(\d+)/g)) {
        const id = Number(m[1]);
        if (!ids.has(id)) ids.set(id, []);
        ids.get(id).push(path.relative(WURZEL, p));
      }
    }
  };
  lauf(wurzel);
  return ids;
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop',
    'Statischer Abgleich -- einmal genuegt.');
});

test('jeder erreichbare ingame-Erfolg hat eine Vergabestelle im QuakeC', async () => {
  const stellen = vergabestellen();
  const fehlend = erfolge()
    .filter((e) => e.art === 'ingame' && e.verfuegbar)
    .filter((e) => !stellen.has(e.id))
    .map((e) => `${e.id} ${e.key} ("${e.de.name}")`);

  expect(fehlend, 'als erreichbar ausgewiesen, aber nirgends vergeben').toEqual([]);
});

test('die CSQC-Tabelle kennt jeden Erfolg aus der Quelle', async () => {
  const qc = fs.readFileSync(
    path.join(WURZEL, 'quakec/source/client/achievements.qc'), 'utf8');
  const bekannt = new Set(
    [...qc.matchAll(/Achievement_Create\s*\(\s*(\d+)\s*,\s*"([^"]+)"/g)]
      .map((m) => `${m[1]}:${m[2]}`),
  );

  const fehlend = erfolge()
    .filter((e) => !bekannt.has(`${e.id}:${e.key}`))
    .map((e) => `${e.id} ${e.key}`);

  // Ein Erfolg ohne Eintrag hier bekaeme beim Freischalten eine leere
  // Einblendung: HUD_Achievements liest Name und Bild aus genau dieser Tabelle.
  expect(fehlend, 'in erfolge.json, aber nicht in Achievement_Create').toEqual([]);
});

test('die Vergabestellen zeigen auf Erfolge, die es gibt', async () => {
  const gueltig = new Set(erfolge().map((e) => e.id));
  const unbekannt = [...vergabestellen().entries()]
    .filter(([id]) => !gueltig.has(id))
    .map(([id, wo]) => `${id} (${wo.join(', ')})`);

  expect(unbekannt, 'GiveAchievement mit unbekannter ID').toEqual([]);
});
