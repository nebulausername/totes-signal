import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { env } from './lib/env.js';
import { healthy } from './lib/db.js';
import authRoutes from './routes/auth.js';
import runRoutes from './routes/runs.js';
import achRoutes from './routes/achievements.js';
import spielRoutes from './routes/spiel.js';
import raumRoutes from './routes/raeume.js';

export function build() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL || 'info',
      // Keine vollen IP-Adressen und keine User-Agents ins Log: sie sind
      // personenbezogen, und wir wollen die Datenschutzerklaerung kurz halten.
      // nginx protokolliert ohnehin, was fuer den Betrieb noetig ist.
      redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], remove: true },
      serializers: {
        req: (r) => ({ method: r.method, url: r.url }),
        res: (r) => ({ statusCode: r.statusCode }),
      },
    },
    // nginx sitzt davor und setzt X-Forwarded-*.
    trustProxy: true,
    bodyLimit: 32 * 1024,
  });

  app.register(cookie, {});

  // Origin-Pruefung fuer alles, was Zustand aendert. Zusammen mit
  // SameSite=Lax die zweite, unabhaengige CSRF-Schicht -- und die einzige
  // ohne Browser-Versions-Vorbehalte.
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'GET' || req.method === 'HEAD') return;
    const origin = req.headers.origin;
    if (!origin) return;                       // native Clients / curl
    const erlaubt = env.ORIGIN || 'https://totersignal.de';
    if (origin !== erlaubt) {
      reply.code(403).send({ error: { code: 'CSRF_FAILED', message: 'Herkunft nicht erlaubt.' } });
    }
  });

  // Einheitliche Fehlerform, damit die Shell nur EINEN Fall behandeln muss.
  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, 'unbehandelter Fehler');
    reply.code(status).send({
      error: {
        code: err.tsCode || (status >= 500 ? 'INTERNAL' : 'REQUEST'),
        message: status >= 500 ? 'Interner Fehler.' : (err.message || 'Fehlerhafte Anfrage.'),
      },
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Nicht gefunden.' } });
  });

  app.register(authRoutes);
  app.register(runRoutes);
  app.register(achRoutes);
  app.register(spielRoutes);
  app.register(raumRoutes);

  const started = Date.now();

  app.get('/api/health', async (req, reply) => {
    const db = await healthy();
    // Ohne Datenbank ist die API nutzlos -> 503, damit der Watchdog und
    // StatusForge das als Ausfall sehen und nicht als "laeuft ja".
    reply.code(db ? 200 : 503);
    return {
      ok: db,
      db,
      version: env.TS_API_VERSION || '0.1.0',
      uptime_s: Math.round((Date.now() - started) / 1000),
    };
  });

  return app;
}
