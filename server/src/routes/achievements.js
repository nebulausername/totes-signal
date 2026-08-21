import { q } from '../lib/db.js';
import { requireUser } from './auth.js';
import { erfolgePruefen } from '../lib/erfolge.js';

function fail(code, message, status = 400) {
  const e = new Error(message); e.statusCode = status; e.tsCode = code; return e;
}

export default async function routes(app) {
  // Definitionen -- oeffentlich und gut cachebar, sie aendern sich fast nie.
  app.get('/api/achievements', async (req, reply) => {
    const r = await q(
      `SELECT id, key, art, xp_reward, verfuegbar, name_de, desc_de, icon
       FROM ts.achievement_defs ORDER BY id`);
    reply.header('Cache-Control', 'public, max-age=300');
    return { defs: r.rows };
  });

  // Eigener Stand
  app.get('/api/profile/achievements', async (req) => {
    const { userId } = await requireUser(req);
    const defs = (await q(
      `SELECT id, key, art, xp_reward, verfuegbar, name_de, desc_de, icon
       FROM ts.achievement_defs ORDER BY id`)).rows;
    const mine = (await q(
      `SELECT achievement_id, unlocked_at, progress FROM ts.user_achievements
       WHERE user_id = $1`, [userId])).rows;
    const nach = new Map(mine.map(m => [m.achievement_id, m]));
    return {
      defs: defs.map(d => ({
        ...d,
        unlocked_at: nach.get(d.id)?.unlocked_at ?? null,
        progress: nach.get(d.id)?.progress ?? 0,
      })),
      freigeschaltet: mine.filter(m => m.unlocked_at).length,
      gesamt: defs.length,
      erreichbar: defs.filter(d => d.verfuegbar).length,
    };
  });

  // Meldung aus dem Spiel (TSUI:ach -> Shell -> hierher).
  //
  // Angenommen werden NUR Erfolge der Art 'ingame'. 'derived' und 'meta'
  // rechnet der Server selbst aus -- wuerde er hier Client-Behauptungen
  // annehmen, waere jeder davon frei erfindbar.
  app.post('/api/profile/achievements/sync', async (req) => {
    const { userId } = await requireUser(req);
    const gemeldet = Array.isArray(req.body?.unlocked) ? req.body.unlocked.slice(0, 42) : [];
    if (!gemeldet.length) return { uebernommen: 0, neu: [] };

    const ingame = new Set((await q(
      `SELECT id FROM ts.achievement_defs WHERE art = 'ingame'`)).rows.map(r => r.id));

    let uebernommen = 0;
    for (const e of gemeldet) {
      const id = Number(e.id);
      if (!Number.isInteger(id) || !ingame.has(id)) continue;
      const fortschritt = Math.max(0, Math.min(1e9, Number(e.progress) || 0));
      await q(
        `INSERT INTO ts.user_achievements (user_id, achievement_id, unlocked_at, progress, quelle)
         VALUES ($1, $2, now(), $3, 'client')
         ON CONFLICT (user_id, achievement_id) DO UPDATE
           SET unlocked_at = coalesce(ts.user_achievements.unlocked_at, now()),
               progress    = GREATEST(ts.user_achievements.progress, EXCLUDED.progress)`,
        [userId, id, fortschritt]);
      uebernommen++;
    }

    // Ein neuer Erfolg kann eine Meta-Stufe faellig machen.
    const neu = await erfolgePruefen(userId);
    return { uebernommen, neu };
  });
}
