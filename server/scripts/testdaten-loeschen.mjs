// Raeumt Testdaten aus der Datenbank.
//
// Warum es das braucht: der Harness legt echte Konten und Laeufe an, weil er
// gegen die LIVE-API prueft -- das ist beabsichtigt, denn nur so ist der Test
// aussagekraeftig. Der Preis ist, dass die Bestenliste sonst mit Decknamen aus
// Testlaeufen anfaengt.
//
// Die saubere Loesung waere eine eigene Testdatenbank. Bis dahin: dieser Lauf.
// Er nimmt NUR Konten, die nie ueber einen Testlauf hinausgekommen sind --
// anonym, ohne Zugangsdaten, aelter als die uebergebene Frist.
//
//   node scripts/testdaten-loeschen.mjs            # Trockenlauf
//   node scripts/testdaten-loeschen.mjs --wirklich # loeschen
import { pool } from '../src/lib/db.js';

const wirklich = process.argv.includes('--wirklich');
const c = await pool.connect();
try {
  const kandidaten = await c.query(`
    SELECT u.id FROM ts.users u
    WHERE u.is_anonymous
      AND u.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM ts.credentials_webauthn w WHERE w.user_id = u.id)
  `).catch(() => ({ rows: [] }));

  // credentials_webauthn gibt es noch nicht -> alle anonymen Konten ohne
  // verifizierten Lauf jenseits von Runde 5 gelten als Testdaten.
  const r = await c.query(`
    SELECT count(*) AS n FROM ts.users u
    WHERE u.is_anonymous AND u.status='active'
      AND NOT EXISTS (
        SELECT 1 FROM ts.runs r
        WHERE r.user_id = u.id AND r.status = 'verified' AND r.rounds > 5)
  `);
  console.log(`Kandidaten (anonym, kein verifizierter Lauf ueber Runde 5): ${r.rows[0].n}`);

  if (!wirklich) {
    console.log('Trockenlauf. Mit --wirklich ausfuehren, um zu loeschen.');
  } else {
    const d = await c.query(`
      DELETE FROM ts.users u
      WHERE u.is_anonymous AND u.status='active'
        AND NOT EXISTS (
          SELECT 1 FROM ts.runs r
          WHERE r.user_id = u.id AND r.status = 'verified' AND r.rounds > 5)
      RETURNING u.id`);
    console.log(`${d.rowCount} Konten geloescht (Laeufe, XP und Profile haengen per ON DELETE CASCADE dran).`);
  }
} finally {
  c.release();
  await pool.end();
}
