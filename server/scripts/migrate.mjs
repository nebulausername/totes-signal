// Migrations-Runner. Nummerierte .sql-Dateien, eine Tabelle mit dem Stand.
// Bewusst kein ORM: das hier ist alles, was ein Projekt dieser Groesse
// braucht, und es hat keine Abhaengigkeit ausser pg.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/lib/db.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const c = await pool.connect();
try {
  await c.query(`CREATE TABLE IF NOT EXISTS ts.schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now(),
    checksum text NOT NULL
  )`);

  const done = new Map(
    (await c.query('SELECT id, checksum FROM ts.schema_migrations')).rows.map(r => [r.id, r.checksum]),
  );

  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();
  let applied = 0;

  for (const f of files) {
    const sql = fs.readFileSync(path.join(DIR, f), 'utf8');
    const sum = (await import('node:crypto')).createHash('sha256').update(sql).digest('hex').slice(0, 16);

    if (done.has(f)) {
      // Eine bereits angewandte Migration nachtraeglich zu aendern faellt sonst
      // erst auf, wenn zwei Umgebungen auseinanderlaufen. Lieber sofort laut.
      if (done.get(f) !== sum) {
        console.error(`[FEHLER] ${f} wurde nach dem Anwenden veraendert.`);
        console.error(`         gespeichert: ${done.get(f)}  jetzt: ${sum}`);
        console.error('         Neue Migration anlegen statt eine alte zu editieren.');
        process.exit(1);
      }
      continue;
    }

    process.stdout.write(`  ${f} ... `);
    await c.query('BEGIN');
    try {
      await c.query(sql);
      await c.query('INSERT INTO ts.schema_migrations (id, checksum) VALUES ($1, $2)', [f, sum]);
      await c.query('COMMIT');
      console.log('ok');
      applied++;
    } catch (e) {
      await c.query('ROLLBACK');
      console.log('FEHLGESCHLAGEN');
      console.error(`  ${e.message}`);
      process.exit(1);
    }
  }
  console.log(applied ? `[OK] ${applied} Migration(en) angewandt.` : '[OK] Schema aktuell.');
} finally {
  c.release();
  await pool.end();
}
