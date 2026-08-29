import crypto from 'node:crypto';

// Decknamen fuer anonyme Konten. Bewusst ASCII-only und ohne Umlaute: der
// Name wird per `seta name` in die Engine geschoben, und deren Schrift kann
// nur ASCII 33..126. Kein '|' (Marker-Trennzeichen), kein '^' (Quake-
// Farbcodes), kein ';' oder '"' (cbuf-Injektion).
// Jedes Wort kommt OHNE Umlaut aus -- keines ist transliteriert. Das ist der
// Unterschied: "Nachzuegler-4821" liest sich wie ein Fehler, "Schlusslicht-4821"
// wie ein Name. Wo die Engine-Schrift ASCII erzwingt, waehlt man das Wort
// danach aus, statt ein anderes zu verstuemmeln.
const WOERTER = [
  'Funker', 'Schlusslicht', 'Sperrgebiet', 'Blackout', 'Nordwind', 'Signalgeber',
  'Kurzwelle', 'Trabant', 'Schattenmann', 'Rauschen', 'Peilsender', 'Letzter',
  'Sperrfeuer', 'Totmann', 'Horchposten', 'Nachtwache', 'Grenzposten', 'Relais',
];

export function makeCodename() {
  const w = WOERTER[crypto.randomInt(WOERTER.length)];
  return `${w}-${1000 + crypto.randomInt(9000)}`;
}

// Transliteration fuer Namen, die ein Mensch selbst waehlt.
const MAP = { 'ä':'ae','ö':'oe','ü':'ue','Ä':'Ae','Ö':'Oe','Ü':'Ue','ß':'ss' };

export function toAscii(name) {
  const s = String(name || '')
    .replace(/[äöüÄÖÜß]/g, (c) => MAP[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // restliche Diakritika
    .replace(/[^\x21-\x7e]/g, '')                        // Engine-Schrift: ASCII 33..126
    .replace(/[|^"';]/g, '')                             // Trennzeichen, Farbcodes, Injektion
    .slice(0, 20);
  // Rueckfall ebenfalls ohne Transliteration.
  return s.length >= 3 ? s : 'Signal';
}
