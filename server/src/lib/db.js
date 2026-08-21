import pg from 'pg';
import { need } from './env.js';

// Pool bewusst klein: der Server traegt daneben acht PM2-Apps, Postgres selbst,
// zwei Redis-Instanzen und ein Minecraft-Netz. Arbeitsspeicher ist hier die
// knappe Ressource, nicht die Verbindungsanzahl -- diese API sieht zweistellige
// Anfragen pro Minute, keine Lastspitzen.
export const pool = new pg.Pool({
  connectionString: need('DATABASE_URL'),
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'ts-api',
});

pool.on('error', (err) => {
  // Ein Fehler auf einer ruhenden Verbindung darf den Prozess nicht mitnehmen.
  console.error('[db] Fehler auf ruhender Verbindung:', err.message);
});

export const q = (text, params) => pool.query(text, params);

export async function healthy() {
  try {
    const r = await pool.query('SELECT 1 AS ok');
    return r.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}
