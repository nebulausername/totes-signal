import { build } from './app.js';
import { env } from './lib/env.js';
import { pool } from './lib/db.js';

const app = build();
const port = Number(env.PORT || 3120);
const host = env.HOST || '127.0.0.1';   // nur lokal; nach draussen geht nur nginx

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Sauberes Herunterfahren, damit PM2-Reloads keine Anfragen abschneiden.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    app.log.info(`${sig} empfangen, fahre herunter`);
    try { await app.close(); await pool.end(); } catch {}
    process.exit(0);
  });
}
