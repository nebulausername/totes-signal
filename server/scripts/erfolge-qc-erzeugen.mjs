// Erzeugt die T()-Faelle fuer shared/localization.qc aus data/erfolge.json.
//
// Die Engine-Schrift kann NUR ASCII 33..126 (conchars + gfx/kerning_map.txt) --
// Umlaute werden transliteriert. Im Web zeigt die Oberflaeche dieselben Texte
// mit echten Umlauten, die Quelle ist dieselbe Datei.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.join(root, '..');
const d = JSON.parse(fs.readFileSync(path.join(root, 'data/erfolge.json'), 'utf8'));

const MAP = { 'ä':'ae','ö':'oe','ü':'ue','Ä':'Ae','Ö':'Oe','Ü':'Ue','ß':'ss','–':'-','—':'-','…':'...','„':'"','"':'"','‚':"'",'’':"'" };
const ascii = (s) => String(s)
  .replace(/[äöüÄÖÜß–—…„""‚’]/g, (c) => MAP[c] ?? c)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^\x20-\x7e]/g, '');

// Englische Originale aus achievements.qc lesen -- T() nimmt das Original als
// Schluessel, nicht eine eigene Kennung.
const qc = fs.readFileSync(path.join(repo, 'quakec/source/client/achievements.qc'), 'utf8');
const orig = new Map();
for (const m of qc.matchAll(/Achievement_Create\(\s*(\d+),\s*"[^"]+",\s*"([^"]*)",\s*"([^"]*)"\)/g))
  orig.set(Number(m[1]), { name: m[2], desc: m[3] });

const zeilen = [];
for (const e of d.erfolge) {
  const o = orig.get(e.id);
  if (!o) { console.error(`Kein Original fuer ID ${e.id}`); process.exit(1); }
  const nDe = ascii(e.de.name), dDe = ascii(e.de.desc);
  // Nur aufnehmen, wenn sich der Text ueberhaupt unterscheidet.
  if (o.name !== nDe) zeilen.push(`\tcase "${o.name.replace(/"/g, '\\"')}": return "${nDe}";`);
  if (o.desc !== dDe) zeilen.push(`\tcase "${o.desc.replace(/"/g, '\\"')}": return "${dDe}";`);
}

const block = `\t// === Erfolge (erzeugt aus server/data/erfolge.json) ===\n` +
  `\t// Nicht von Hand aendern -- neu erzeugen mit\n` +
  `\t//   node server/scripts/erfolge-qc-erzeugen.mjs\n` +
  `\t// ASCII 33..126, weil die Spielschrift nichts anderes kann.\n` +
  zeilen.join('\n') + '\n';

// Direkt in localization.qc zwischen Markierungen einsetzen. Ein #include
// waere eleganter, kommt in dieser Codebasis aber nirgends vor -- und die
// Uebersetzung ist ohnehin EIN grosser switch, in den das hineingehoert.
const AUF  = '\t// >>> ERFOLGE-ANFANG (erzeugt) <<<';
const ZU   = '\t// <<< ERFOLGE-ENDE (erzeugt) >>>';
const locDatei = path.join(repo, 'quakec/source/shared/localization.qc');
let loc = fs.readFileSync(locDatei, 'utf8');
const neuerBlock = `${AUF}\n${block}${ZU}`;

if (loc.includes(AUF) && loc.includes(ZU)) {
  loc = loc.slice(0, loc.indexOf(AUF)) + neuerBlock + loc.slice(loc.indexOf(ZU) + ZU.length);
} else {
  const anker = '\tdefault: return english;';
  if (!loc.includes(anker)) { console.error('Anker in localization.qc nicht gefunden'); process.exit(1); }
  loc = loc.replace(anker, `${neuerBlock}\n\n${anker}`);
}
fs.writeFileSync(locDatei, loc);
console.log(`eingesetzt in ${path.relative(repo, locDatei)} (${zeilen.length} Faelle)`);

const nichtAscii = zeilen.filter((z) => /[^\x09\x20-\x7e]/.test(z));
if (nichtAscii.length) { console.error('NICHT-ASCII gefunden:', nichtAscii); process.exit(1); }
console.log('ASCII-Pruefung: bestanden');
