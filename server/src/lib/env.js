// Zugangsdaten kommen aus /etc/ts-api/.env (chmod 600), nicht aus dem Repo.
// Bewusst ohne dotenv-Paket: eine Datei mit KEY=VALUE zu lesen rechtfertigt
// keine weitere Abhaengigkeit.
import fs from 'node:fs';

const FILE = process.env.TS_ENV_FILE || '/etc/ts-api/.env';

function load() {
  const out = {};
  try {
    for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  return out;
}

const fromFile = load();
export const env = { ...fromFile, ...process.env };

export function need(key) {
  const v = env[key];
  if (!v) throw new Error(`${key} fehlt (weder in ${FILE} noch in der Umgebung)`);
  return v;
}
