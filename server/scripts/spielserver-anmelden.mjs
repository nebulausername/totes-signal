#!/usr/bin/env node
// Meldet einen Spielserver an und gibt den kurzen Code aus, den der Host
// weitergibt. Bewusst ein Skript und kein API-Endpunkt: ein oeffentlicher
// Schreibweg wuerde die API zu einem Weiterleitungsdienst machen, in den jeder
// beliebige Adressen haengen kann.
//
//   node server/scripts/spielserver-anmelden.mjs wss://beispiel.de/spiel "Bunker"
//   node server/scripts/spielserver-anmelden.mjs --liste
//   node server/scripts/spielserver-anmelden.mjs --loeschen ABC-234
//
// Ohne --stunden laeuft der Eintrag nach 12 Stunden ab; eine Partie dauert
// keine zwoelf Stunden, und ein vergessener Eintrag soll nicht ewig zeigen.

import { q, pool } from '../src/lib/db.js';

// Von jedem verwechselbaren Paar bleibt genau EINER uebrig: O, I, L und S
// fallen weg, 0 und 1 ebenfalls -- 5 darf bleiben, weil kein S danebensteht.
const ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ23456789';

function codeErzeugen(laenge = 6) {
  let c = '';
  for (let i = 0; i < laenge; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}

const huebsch = (c) => c.slice(0, 3) + '-' + c.slice(3);

// Dieselbe Pruefung wie in der Shell: die Adresse landet spaeter in einer
// Konsolenzeile der Engine.
const adresseGueltig = (a) =>
  /^(wss?:\/\/)?[A-Za-z0-9.\-]{1,253}(:\d{1,5})?(\/[A-Za-z0-9._~\-\/]*)?$/.test(String(a || ''));

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--liste') {
    const r = await q(`SELECT code, adresse, name, laeuft_ab FROM ts.spielserver
                        WHERE laeuft_ab IS NULL OR laeuft_ab > now()
                        ORDER BY erstellt DESC`);
    if (!r.rows.length) { console.log('Kein angemeldeter Server.'); return; }
    for (const z of r.rows)
      console.log(`${huebsch(z.code)}  ${z.adresse}  ${z.name || ''}  ${z.laeuft_ab ? 'bis ' + z.laeuft_ab.toISOString() : 'ohne Ablauf'}`);
    return;
  }

  if (args[0] === '--loeschen') {
    const code = String(args[1] || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
    const r = await q('DELETE FROM ts.spielserver WHERE code = $1', [code]);
    console.log(r.rowCount ? `${huebsch(code)} geloescht.` : 'Code nicht gefunden.');
    return;
  }

  const adresse = args[0];
  const name = args[1] || null;
  const stundenArg = args.indexOf('--stunden');
  const stunden = stundenArg >= 0 ? Number(args[stundenArg + 1]) : 12;

  if (!adresse || !adresseGueltig(adresse)) {
    console.error('Adresse fehlt oder ist ungueltig.');
    console.error('  node server/scripts/spielserver-anmelden.mjs wss://beispiel.de/spiel "Bunker"');
    process.exitCode = 1;
    return;
  }

  // Sehr unwahrscheinlich, aber ein Zusammenstoss darf keinen fremden Eintrag
  // ueberschreiben: neu wuerfeln statt ueberschreiben.
  for (let versuch = 0; versuch < 8; versuch++) {
    const code = codeErzeugen();
    const r = await q(
      `INSERT INTO ts.spielserver (code, adresse, name, laeuft_ab)
       VALUES ($1, $2, $3, CASE WHEN $4::numeric > 0 THEN now() + ($4 || ' hours')::interval ELSE NULL END)
       ON CONFLICT (code) DO NOTHING
       RETURNING code`, [code, adresse, name, stunden]);
    if (r.rows.length) {
      console.log(`Code: ${huebsch(code)}`);
      console.log(`Adresse: ${adresse}`);
      console.log(stunden > 0 ? `Laeuft in ${stunden} Stunden ab.` : 'Ohne Ablauf.');
      return;
    }
  }
  console.error('Kein freier Code gefunden -- bitte erneut versuchen.');
  process.exitCode = 1;
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; })
      .finally(() => pool.end());
