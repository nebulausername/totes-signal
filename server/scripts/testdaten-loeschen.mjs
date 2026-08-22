// Raeumt Testdaten aus der Datenbank.
//
// Warum es das braucht: der Harness legt echte Konten und Laeufe an, weil er
// gegen die LIVE-API prueft -- das ist beabsichtigt, denn nur so ist der Test
// aussagekraeftig. Der Preis ist, dass die Bestenliste sonst mit Decknamen aus
// Testlaeufen anfaengt. Die saubere Loesung waere eine eigene Testdatenbank.
//
// ============================ ACHTUNG ============================
// Die erste Fassung dieses Skripts loeschte JEDES anonyme Konto ohne
// verifizierten Lauf ueber Runde 5. Solange es keine Passkeys gibt, ist aber
// JEDER Spieler anonym -- wer einmal vorbeischaut und in Runde 3 stirbt, war
// damit "Testdaten". Konto, XP, Erfolge und Bestenlisteneintrag weg.
//
// Nachgesehen (2026-08-22): in den 14 Tagen Zugriffsprotokoll kamen ALLE 1100
// Kontoanlagen von der eigenen Server-IP mit Playwright-Kennungen, es gab also
// noch keine echten Spieler und es ist nichts verlorengegangen. Verlassen darf
// man sich darauf kein zweites Mal.
//
// Deshalb jetzt: geloescht wird NUR, was nachweislich von hier kommt. Ein
// Konto zaehlt als Testkonto, wenn ALLE seine Sitzungen aus demselben
// IP-Praefix stammen wie der Harness. Ohne --von laeuft nichts.
//
//   node scripts/testdaten-loeschen.mjs                     # Trockenlauf, zeigt die Praefixe
//   node scripts/testdaten-loeschen.mjs --von <praefix> --wirklich
import { pool } from '../src/lib/db.js';

const argv = process.argv.slice(2);
const wirklich = argv.includes('--wirklich');
const vonIdx = argv.indexOf('--von');
const von = vonIdx >= 0 ? argv[vonIdx + 1] : null;

const c = await pool.connect();
try {
  // Woher kommen die Konten ueberhaupt? Das ist die Entscheidungsgrundlage,
  // nicht eine Heuristik ueber Rundenzahlen.
  const herkunft = await c.query(`
    SELECT s.ip_prefix::text AS praefix,
           count(DISTINCT s.user_id) AS konten,
           min(s.created_at) AS erste,
           max(s.created_at) AS letzte
    FROM ts.sessions s
    JOIN ts.users u ON u.id = s.user_id
    WHERE u.is_anonymous AND u.status = 'active'
    GROUP BY 1 ORDER BY konten DESC`);

  console.log('Anonyme aktive Konten nach IP-Praefix ihrer Sitzungen:');
  for (const r of herkunft.rows)
    console.log(`  ${String(r.praefix).padEnd(22)} ${String(r.konten).padStart(5)} Konten   ` +
                `${r.erste.toISOString().slice(0, 16)} .. ${r.letzte.toISOString().slice(0, 16)}`);
  if (!herkunft.rows.length) console.log('  (keine)');

  if (!von) {
    console.log('\nOhne --von <praefix> wird nichts geloescht.');
    console.log('Der Harness laeuft auf diesem Server; sein Praefix ist die Zeile mit den');
    console.log('meisten Konten in einem engen Zeitfenster. Ein Praefix, das du nicht');
    console.log('zuordnen kannst, gehoert einem echten Spieler -- Finger weg.');
  } else {
    // Nur Konten, deren SAEMTLICHE Sitzungen aus dem genannten Praefix kommen.
    // Ein Konto, das auch nur einmal von woanders benutzt wurde, ist keins.
    const bedingung = `
      u.is_anonymous AND u.status = 'active'
      AND EXISTS (SELECT 1 FROM ts.sessions s WHERE s.user_id = u.id AND s.ip_prefix = $1::inet)
      AND NOT EXISTS (SELECT 1 FROM ts.sessions s WHERE s.user_id = u.id AND s.ip_prefix IS DISTINCT FROM $1::inet)`;
    const n = await c.query(`SELECT count(*) AS n FROM ts.users u WHERE ${bedingung}`, [von]);
    console.log(`\nKandidaten aus ${von} (und nur von dort): ${n.rows[0].n}`);

    if (!wirklich) {
      console.log('Trockenlauf. Mit --wirklich ausfuehren, um zu loeschen.');
    } else {
      const d = await c.query(
        `DELETE FROM ts.users u WHERE ${bedingung} RETURNING u.id`, [von]);
      console.log(`${d.rowCount} Konten geloescht (Laeufe, XP und Profile haengen per ON DELETE CASCADE dran).`);
    }
  }
} finally {
  c.release();
  await pool.end();
}
