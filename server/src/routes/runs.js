import crypto from 'node:crypto';
import { q, pool } from '../lib/db.js';
import { sha256, ipPrefix } from '../lib/tokens.js';
import { requireUser } from './auth.js';
import { bewerte, xpForRun } from '../lib/plausibility.js';
import { erfolgePruefen } from '../lib/erfolge.js';

function fail(code, message, status = 400) {
  const e = new Error(message); e.statusCode = status; e.tsCode = code; return e;
}

const zahl = (v, min, max, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : def;
};

export default async function routes(app) {
  // --- Lauf beginnen ------------------------------------------------------
  // Der Server vergibt ein Token und merkt sich SEINE Uhrzeit. Damit ist die
  // verstrichene Echtzeit nicht mehr client-kontrolliert -- ein gefaelschter
  // Rekord kostet dadurch echte Wartezeit, was praktisch jeden
  // Gelegenheits-Cheat aussortiert.
  app.post('/api/runs/start', async (req, reply) => {
    const { userId } = await requireUser(req);
    const b = req.body || {};
    const mapKey = String(b.map_key || '').trim().slice(0, 64);
    if (!/^[a-z0-9_\-]{2,64}$/i.test(mapKey))
      throw fail('VALIDATION', 'map_key fehlt oder ist unplausibel.', 400);

    const raw = crypto.randomBytes(32).toString('base64url');
    const r = await q(
      `INSERT INTO ts.runs (user_id, status, map_key, map_pretty, gamemode, difficulty,
                            start_round, flags, player_count, aim_assist,
                            run_token_hash, ip_prefix, shell_build)
       VALUES ($1,'open',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, started_at`,
      [userId, mapKey, String(b.map_pretty || '').slice(0, 96),
       zahl(b.gamemode, 0, 32), zahl(b.difficulty, 0, 8), zahl(b.start_round, 0, 999),
       zahl(b.flags, 0, 65535), zahl(b.player_count, 1, 8, 1), zahl(b.aim_assist, 0, 2, 1),
       sha256(raw), ipPrefix(req.ip), String(b.shell_build || '').slice(0, 32)],
    );
    reply.code(201);
    return { run_id: r.rows[0].id, run_token: raw, server_time: r.rows[0].started_at };
  });

  async function ladeOffenenLauf(runId, userId, token) {
    const r = await q(
      `SELECT * FROM ts.runs WHERE id = $1 AND user_id = $2`, [runId, userId]);
    const run = r.rows[0];
    if (!run) throw fail('NOT_FOUND', 'Lauf nicht gefunden.', 404);
    if (!crypto.timingSafeEqual(run.run_token_hash, sha256(token || '')))
      throw fail('RUN_TOKEN_INVALID', 'Falsches Lauf-Token.', 403);
    return run;
  }

  // --- Herzschlag ---------------------------------------------------------
  // Gebuendelt: die Shell schickt alle drei Runden oder alle 45 Sekunden.
  // Eine Anfrage pro Runde waere auf dem Handy Verschwendung und kollidiert
  // mit den Asset-Ladevorgaengen beim Rundenwechsel.
  app.post('/api/runs/:id/heartbeat', async (req, reply) => {
    const { userId } = await requireUser(req);
    const run = await ladeOffenenLauf(req.params.id, userId, req.headers['x-run-token']);
    if (run.status !== 'open') throw fail('RUN_NOT_OPEN', 'Lauf ist bereits abgeschlossen.', 409);

    const beats = Array.isArray(req.body?.beats) ? req.body.beats.slice(0, 20) : [];
    if (!beats.length) { reply.code(204); return null; }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const s of beats) {
        await client.query(
          `INSERT INTO ts.run_heartbeats (run_id, seq, round, score, kills, headshots, in_game_secs)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (run_id, seq) DO NOTHING`,
          [run.id, zahl(s.seq, 0, 100000), zahl(s.round, 0, 100000), zahl(s.score, 0, 1e12),
           zahl(s.kills, 0, 1e7), zahl(s.headshots, 0, 1e7), zahl(s.secs, 0, 1e7)]);
      }
      await client.query(
        `UPDATE ts.runs SET heartbeat_count = (SELECT count(*) FROM ts.run_heartbeats WHERE run_id = $1),
                            max_hb_round    = (SELECT coalesce(max(round),0) FROM ts.run_heartbeats WHERE run_id = $1)
         WHERE id = $1`, [run.id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }

    reply.code(204);
    return null;
  });

  // --- Lauf abschliessen --------------------------------------------------
  app.post('/api/runs/:id/finish', async (req) => {
    const { userId } = await requireUser(req);
    const run = await ladeOffenenLauf(req.params.id, userId, req.headers['x-run-token']);

    // Doppelt eingereicht: dasselbe Ergebnis zurueckgeben statt zu zaehlen.
    if (run.status !== 'open') {
      return { status: run.status, run: oeffentlich(run), bereits_eingereicht: true };
    }

    const b = req.body || {};
    const wall = Math.max(0, Math.round((Date.now() - new Date(run.started_at).getTime()) / 1000));

    const fertig = {
      ...run,
      rounds: zahl(b.rounds, 0, 100000),
      score: zahl(b.score, 0, 1e12),
      kills: zahl(b.kills, 0, 1e7),
      headshots: zahl(b.headshots, 0, 1e7),
      downs: zahl(b.downs, 0, 1e5),
      revives: zahl(b.revives, 0, 1e5),
      in_game_secs: zahl(b.secs, 0, 1e7),
      wall_secs: wall,
      // Das Cheat-Flag kommt aus dem TSUI:dmeta-Marker. Der Riegel im Spiel
      // rastet einbahnig ein: sv_cheats 0 loescht ihn nicht mehr.
      cheat_flag: b.cheat === 1 || b.cheat === true || (zahl(b.flags, 0, 65535) & 16) !== 0,
      // Beim START stand oft noch nicht fest, wie viele mitspielen: die
      // Konfiguration wird beim Kartenladen veroeffentlicht, und da ist der
      // Gastgeber allein. Massgeblich ist deshalb der Stand am ENDE -- und
      // zwar der HOECHSTE, den es waehrend des Laufs gab. Beide Werte stammen
      // aus dem Spiel (ts_flag_bits, Bit 3 = Koop), nicht aus einer
      // Behauptung der Shell.
      flags: zahl(b.flags, 0, 65535) || run.flags,
      player_count: Math.max(zahl(b.player_count, 1, 8, 1), run.player_count || 1),
    };

    // Die beim START gemeldete Konfiguration gegen die beim ENDE gemeldete
    // pruefen. Schliesst "auf Leicht starten, auf Schwer einreichen", ohne
    // einer der beiden Seiten allein zu glauben.
    const abweichung =
      (b.difficulty !== undefined && zahl(b.difficulty, 0, 8) !== run.difficulty) ||
      (b.gamemode   !== undefined && zahl(b.gamemode, 0, 32) !== run.gamemode) ||
      (b.map_key    !== undefined && String(b.map_key) !== run.map_key);

    const hb = (await q(
      `SELECT round, score, kills, headshots, in_game_secs FROM ts.run_heartbeats
       WHERE run_id = $1 ORDER BY seq`, [run.id])).rows;

    const urteil = bewerte(fertig, hb);
    if (abweichung) {
      urteil.status = 'rejected';
      urteil.reason = 'C11_konfiguration_geaendert';
      urteil.checks.push({ name: 'C11_konfiguration_geaendert', ok: false,
        severity: 'rejected',
        why: 'Konfiguration bei Start und Abschluss unterschiedlich.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query(
        `UPDATE ts.runs SET status=$2, rounds=$3, score=$4, kills=$5, headshots=$6,
                            downs=$7, revives=$8, in_game_secs=$9, wall_secs=$10,
                            cheat_flag=$11, plausibility=$12, reject_reason=$13,
                            flags=$14, player_count=$15,
                            submitted_at=now()
         WHERE id=$1 AND status='open' RETURNING *`,
        [run.id, urteil.status, fertig.rounds, fertig.score, fertig.kills, fertig.headshots,
         fertig.downs, fertig.revives, fertig.in_game_secs, wall, fertig.cheat_flag,
         JSON.stringify(urteil.checks), urteil.reason,
         fertig.flags, fertig.player_count]);

      if (!upd.rows[0]) { await client.query('ROLLBACK'); throw fail('RUN_NOT_OPEN', 'Lauf wurde inzwischen abgeschlossen.', 409); }
      const gespeichert = upd.rows[0];

      // XP nur fuer verifizierte Laeufe. Der Unique-Index auf run_id macht
      // das idempotent -- ein doppelter Abschluss kann nichts zweimal
      // gutschreiben.
      let xp = 0;
      if (urteil.status === 'verified') {
        xp = xpForRun(gespeichert);
        if (xp > 0) {
          await client.query(
            `INSERT INTO ts.xp_events (user_id, run_id, delta, reason)
             VALUES ($1,$2,$3,'run') ON CONFLICT (run_id) WHERE reason='run' DO NOTHING`,
            [userId, run.id, xp]);
          // xp_total ist ein Zwischenspeicher; die Wahrheit steht in xp_events.
          await client.query(
            `UPDATE ts.profiles SET xp_total =
               (SELECT coalesce(sum(delta),0) FROM ts.xp_events WHERE user_id=$1),
               updated_at = now() WHERE user_id=$1`, [userId]);
        }
      }
      await client.query('UPDATE ts.users SET last_seen_at = now() WHERE id=$1', [userId]);
      await client.query('COMMIT');

      // Erfolge NACH dem Commit auswerten: sie lesen die frisch gespeicherten
      // Laufdaten und wirken rueckwirkend ueber die gesamte Historie.
      let neueErfolge = [];
      if (urteil.status === 'verified') {
        try { neueErfolge = await erfolgePruefen(userId, run.id); }
        catch (e) { req.log.error({ err: e }, 'Erfolgspruefung fehlgeschlagen'); }
      }

      const prof = (await q('SELECT level, xp_total FROM ts.profiles WHERE user_id=$1', [userId])).rows[0];
      const rang = urteil.status === 'verified' ? await rangFuer(gespeichert) : null;

      return {
        status: urteil.status,
        reason: urteil.reason,
        run: oeffentlich(gespeichert),
        xp_gained: xp,
        level: prof?.level ?? 1,
        xp_total: Number(prof?.xp_total ?? 0),
        rank: rang,
        achievements_neu: neueErfolge,
      };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  });

  // --- Eigene Laeufe ------------------------------------------------------
  app.get('/api/runs/mine', async (req) => {
    const { userId } = await requireUser(req);
    const limit = zahl(req.query.limit, 1, 50, 20);
    const r = await q(
      `SELECT * FROM ts.runs WHERE user_id=$1 AND status <> 'open'
       ORDER BY submitted_at DESC NULLS LAST LIMIT $2`, [userId, limit]);
    return { runs: r.rows.map(oeffentlich) };
  });

  // --- Bestenliste --------------------------------------------------------
  // Eine Zeile je Spieler (sein bester Lauf) -- sonst fuellt ein einzelner
  // Vielspieler die ganze Liste.
  app.get('/api/leaderboard', async (req, reply) => {
    const metric = req.query.metric === 'score' ? 'score' : 'rounds';
    const window = ['today', 'week', 'all'].includes(req.query.window) ? req.query.window : 'all';
    const map    = req.query.map && req.query.map !== '*' ? String(req.query.map).slice(0, 64) : null;
    const diff   = req.query.difficulty !== undefined && req.query.difficulty !== '-1'
      ? zahl(req.query.difficulty, 0, 8) : null;
    const limit  = zahl(req.query.limit, 1, 100, 25);

    const seit = window === 'today' ? "now() - interval '1 day'"
              : window === 'week'  ? "now() - interval '7 days'" : null;

    // Sortierung je Metrik: bei Runden entscheidet die kuerzere Spielzeit,
    // bei Punkten der frueheste Zeitpunkt (wer zuerst da war).
    const ordnung = metric === 'score'
      ? 'b.score DESC, b.submitted_at ASC'
      : 'b.rounds DESC, b.in_game_secs ASC NULLS LAST';
    const bestesJeSpieler = metric === 'score'
      ? 'r.score DESC, r.submitted_at ASC'
      : 'r.rounds DESC, r.in_game_secs ASC NULLS LAST';

    const params = [];
    const wo = ['ts.run_is_eligible(r.*)'];
    if (seit) wo.push(`r.submitted_at >= ${seit}`);
    if (map)  { params.push(map);  wo.push(`r.map_key = $${params.length}`); }
    if (diff !== null) { params.push(diff); wo.push(`r.difficulty = $${params.length}`); }
    params.push(limit);

    const sql = `
      WITH best AS (
        SELECT DISTINCT ON (r.user_id)
               r.user_id, r.id AS run_id, r.score, r.rounds, r.kills, r.headshots,
               r.in_game_secs, r.map_key, r.map_pretty, r.difficulty, r.submitted_at
        FROM ts.runs r
        WHERE ${wo.join(' AND ')}
        ORDER BY r.user_id, ${bestesJeSpieler}
      )
      SELECT rank() OVER (ORDER BY ${ordnung}) AS rank,
             b.*, p.display_name, p.level, p.title_id
      FROM best b JOIN ts.profiles p ON p.user_id = b.user_id
      ORDER BY rank LIMIT $${params.length}`;

    const r = await q(sql, params);

    // Die EIGENE Zeile immer mitliefern, auch wenn sie ausserhalb der
    // angeforderten Menge liegt. Sonst zeigt die Liste einem Spieler auf
    // Platz 47 nur fremde Namen, und die eine Zahl, die ihn interessiert,
    // muesste er sich aus einer Textzeile zusammenreimen.
    let mich = null;
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      try {
        const { userId } = await requireUser(req);
        // Dieselben Filter wie oben, nur ohne das LIMIT: es steht als letzter
        // Parameter in `params` und gehoert hier nicht dazu.
        const filter = params.slice(0, -1);
        const eigen = await q(`
          WITH best AS (
            SELECT DISTINCT ON (r.user_id)
                   r.user_id, r.score, r.rounds, r.kills, r.headshots, r.in_game_secs,
                   r.map_key, r.map_pretty, r.difficulty, r.submitted_at
            FROM ts.runs r WHERE ${wo.join(' AND ')}
            ORDER BY r.user_id, ${bestesJeSpieler}
          ), gereiht AS (
            SELECT rank() OVER (ORDER BY ${ordnung}) AS rank, b.* FROM best b
          )
          SELECT g.*, p.display_name, p.level, p.title_id
          FROM gereiht g JOIN ts.profiles p ON p.user_id = g.user_id
          WHERE g.user_id = $${filter.length + 1}`,
          [...filter, userId]);
        mich = eigen.rows[0] || null;
      } catch { /* nicht angemeldet oder Token abgelaufen -> einfach ohne */ }
    }

    const auf = (e) => ({
      rank: Number(e.rank), user_id: e.user_id, display_name: e.display_name,
      level: e.level, title_id: e.title_id,
      rounds: e.rounds, score: Number(e.score), kills: e.kills, headshots: e.headshots,
      in_game_secs: e.in_game_secs, map_key: e.map_key, map_pretty: e.map_pretty,
      difficulty: e.difficulty, submitted_at: e.submitted_at,
    });

    // Mit eigener Zeile ist die Antwort persoenlich -- dann darf sie nicht in
    // einem gemeinsamen Zwischenspeicher landen.
    reply.header('Cache-Control', mich ? 'private, no-store' : 'public, max-age=30');

    return {
      segment: { metric, window, map: map || '*', difficulty: diff === null ? -1 : diff },
      me: mich ? auf(mich) : null,
      entries: r.rows.map((e) => ({
        rank: Number(e.rank), user_id: e.user_id, display_name: e.display_name,
        level: e.level, title_id: e.title_id,
        rounds: e.rounds, score: Number(e.score), kills: e.kills, headshots: e.headshots,
        in_game_secs: e.in_game_secs, map_key: e.map_key, map_pretty: e.map_pretty,
        difficulty: e.difficulty, submitted_at: e.submitted_at,
      })),
      generated_at: new Date().toISOString(),
    };
  });
}

function oeffentlich(r) {
  return {
    id: r.id, status: r.status, map_key: r.map_key, map_pretty: r.map_pretty,
    difficulty: r.difficulty, gamemode: r.gamemode,
    rounds: r.rounds, score: r.score === null ? null : Number(r.score),
    kills: r.kills, headshots: r.headshots, downs: r.downs, revives: r.revives,
    in_game_secs: r.in_game_secs, submitted_at: r.submitted_at,
    reject_reason: r.reject_reason,
  };
}

// Rang ohne die ganze Liste zu lesen: nur zaehlen, wer besser ist.
async function rangFuer(run) {
  const r = await q(
    `SELECT count(DISTINCT x.user_id) + 1 AS rang
     FROM ts.runs x
     WHERE ts.run_is_eligible(x.*) AND x.map_key = $1 AND x.difficulty = $2
       AND (x.rounds > $3 OR (x.rounds = $3 AND x.score > $4))`,
    [run.map_key, run.difficulty, run.rounds, run.score]);
  return { map: Number(r.rows[0].rang) };
}
