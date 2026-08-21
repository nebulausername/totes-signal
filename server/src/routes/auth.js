import { q, pool } from '../lib/db.js';
import { makeCodename, toAscii } from '../lib/codename.js';
import {
  signAccess, verifyAccess, newRefreshToken, sha256, uaHash, ipPrefix,
  ACCESS_TTL, REFRESH_TTL,
} from '../lib/tokens.js';

const COOKIE = '__Host-ts_rt';

// __Host- bindet das Cookie an genau diesen Host, ohne Domain-Attribut.
// SameSite=Lax statt None ist eine bewusste Aussage: der Portfolio-iframe
// wird NICHT unterstuetzt. Er koennte es auch nicht -- Passkeys sind
// origin-gebunden und Drittanbieter-Cookies werden von Safari ohnehin
// blockiert. Siehe README.
const COOKIE_OPTS = {
  path: '/api/auth',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: REFRESH_TTL,
};

function fail(code, message, status = 400) {
  const e = new Error(message);
  e.statusCode = status;
  e.tsCode = code;
  return e;
}

async function createSession(client, userId, req, { anonBootstrap = false, familyId = null, parentId = null } = {}) {
  const { raw, hash } = newRefreshToken();
  const r = await client.query(
    `INSERT INTO ts.sessions (user_id, family_id, parent_id, refresh_token_hash,
                              expires_at, ip_prefix, ua_hash, is_anon_bootstrap)
     VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, now() + ($5 || ' seconds')::interval, $6, $7, $8)
     RETURNING id, family_id`,
    [userId, familyId, parentId, hash, String(REFRESH_TTL),
     ipPrefix(req.ip), uaHash(req.headers['user-agent']), anonBootstrap],
  );
  return { raw, ...r.rows[0] };
}

export async function requireUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw fail('AUTH_REQUIRED', 'Nicht angemeldet.', 401);
  try {
    const p = await verifyAccess(h.slice(7));
    return { userId: p.sub, sessionId: p.jti };
  } catch {
    throw fail('TOKEN_EXPIRED', 'Sitzung abgelaufen.', 401);
  }
}

export default async function routes(app) {
  // --- Anonyme Identitaet -------------------------------------------------
  //
  // Wird BEWUSST nicht beim Seitenaufruf angelegt, sondern erst bei der ersten
  // ausdruecklichen Handlung des Spielers. Damit bleibt die Speicherung
  // "unbedingt erforderlich" (§25 Abs. 2 Nr. 2 TDDDG) und das Spiel braucht
  // KEIN Cookie-Banner. Kostet einen Tipp. Wird das je zurueckgedreht, ist ein
  // Banner Pflicht und das "sofort spielen"-Gefuehl dahin.
  app.post('/api/auth/anon', async (req, reply) => {
    const body = req.body || {};
    if (body.age_confirmed !== true)
      throw fail('VALIDATION', 'Altersbestaetigung fehlt.', 400);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const u = await client.query(
        `INSERT INTO ts.users (is_anonymous, locale, age_confirmed_at, privacy_version)
         VALUES (true, $1, now(), $2) RETURNING id, created_at`,
        [String(body.locale || 'de').slice(0, 8), String(body.privacy_version || '1.0').slice(0, 16)],
      );
      const userId = u.rows[0].id;

      // Namenskollisionen sind bei 18 Woertern x 9000 Zahlen selten, aber
      // moeglich -- ein paar Versuche statt einer Fehlermeldung.
      let name = null;
      for (let i = 0; i < 8 && !name; i++) {
        const cand = makeCodename();
        try {
          await client.query(
            `INSERT INTO ts.profiles (user_id, display_name, display_name_ascii)
             VALUES ($1, $2, $3)`,
            [userId, cand, toAscii(cand)],
          );
          name = cand;
        } catch (e) {
          if (e.code !== '23505') throw e;   // nur Unique-Verletzung erneut versuchen
        }
      }
      if (!name) throw fail('INTERNAL', 'Kein freier Deckname gefunden.', 500);

      const s = await createSession(client, userId, req, { anonBootstrap: true });
      await client.query('COMMIT');

      const access = await signAccess(userId, s.id);
      reply.setCookie(COOKIE, s.raw, COOKIE_OPTS);
      reply.code(201);
      return {
        user: { id: userId, display_name: name, display_name_ascii: toAscii(name),
                is_anonymous: true, level: 1, xp_total: 0 },
        access_token: access,
        expires_in: ACCESS_TTL,
        // Nur fuer ANONYME Konten: iOS Safari raeumt Cookies nach 7 Tagen ohne
        // Interaktion ab, und ein anonymer Spieler haette dann keinen Weg
        // zurueck. Die Shell spiegelt das in localStorage und LOESCHT die
        // Kopie, sobald ein Passkey oder eine E-Mail angehaengt wird.
        refresh_token: s.raw,
      };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  });

  // --- Erneuern (mit Rotation und Wiederverwendungs-Erkennung) ------------
  app.post('/api/auth/refresh', async (req, reply) => {
    const raw = req.cookies?.[COOKIE] || (req.body && req.body.refresh_token);
    if (!raw) throw fail('AUTH_REQUIRED', 'Kein Sitzungstoken.', 401);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `SELECT id, user_id, family_id, revoked_at, expires_at
         FROM ts.sessions WHERE refresh_token_hash = $1 FOR UPDATE`,
        [sha256(raw)],
      );
      const s = r.rows[0];
      if (!s) { await client.query('ROLLBACK'); throw fail('AUTH_REQUIRED', 'Unbekanntes Token.', 401); }

      // Ein bereits ersetztes Token wird noch einmal vorgelegt -> es wurde
      // kopiert. Die ganze Familie faellt, nicht nur diese Sitzung.
      if (s.revoked_at) {
        await client.query(
          `UPDATE ts.sessions SET revoked_at = now(), revoked_reason = 'reuse_detected'
           WHERE family_id = $1 AND revoked_at IS NULL`, [s.family_id]);
        await client.query(
          `INSERT INTO ts.audit_log (actor, action, subject_type, subject_id, detail)
           VALUES ('system', 'refresh_reuse', 'user', $1, $2)`,
          [s.user_id, JSON.stringify({ family: s.family_id })]);
        await client.query('COMMIT');
        throw fail('AUTH_REQUIRED', 'Sitzung wurde widerrufen.', 401);
      }
      if (new Date(s.expires_at) < new Date()) {
        await client.query('ROLLBACK');
        throw fail('TOKEN_EXPIRED', 'Sitzung abgelaufen.', 401);
      }

      await client.query(
        `UPDATE ts.sessions SET revoked_at = now(), revoked_reason = 'rotated' WHERE id = $1`, [s.id]);
      const next = await createSession(client, s.user_id, req,
        { familyId: s.family_id, parentId: s.id });
      await client.query('UPDATE ts.users SET last_seen_at = now() WHERE id = $1', [s.user_id]);
      await client.query('COMMIT');

      const access = await signAccess(s.user_id, next.id);
      reply.setCookie(COOKIE, next.raw, COOKIE_OPTS);
      return { access_token: access, expires_in: ACCESS_TTL, refresh_token: next.raw };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  });

  // --- Abmelden -----------------------------------------------------------
  app.post('/api/auth/logout', async (req, reply) => {
    const { userId, sessionId } = await requireUser(req);
    const all = req.body && req.body.all_devices === true;
    await q(
      all ? `UPDATE ts.sessions SET revoked_at = now(), revoked_reason = 'logout_all'
             WHERE user_id = $1 AND revoked_at IS NULL`
          : `UPDATE ts.sessions SET revoked_at = now(), revoked_reason = 'logout'
             WHERE id = $2 AND revoked_at IS NULL`,
      all ? [userId] : [userId, sessionId],
    );
    reply.clearCookie(COOKIE, { path: '/api/auth' });
    reply.code(204);
    return null;
  });

  // --- Wer bin ich --------------------------------------------------------
  app.get('/api/auth/me', async (req) => {
    const { userId } = await requireUser(req);
    const r = await q(
      `SELECT u.id, u.is_anonymous, u.locale, u.created_at,
              p.display_name, p.display_name_ascii, p.xp_total, p.level, p.title_id,
              (SELECT count(*) FROM ts.runs r WHERE r.user_id = u.id AND r.status = 'verified') AS runs,
              (SELECT max(r.rounds) FROM ts.runs r
                WHERE r.user_id = u.id AND ts.run_is_eligible(r.*)) AS best_round,
              (SELECT max(r.score) FROM ts.runs r
                WHERE r.user_id = u.id AND ts.run_is_eligible(r.*)) AS best_score
       FROM ts.users u JOIN ts.profiles p ON p.user_id = u.id
       WHERE u.id = $1 AND u.status = 'active'`, [userId]);
    if (!r.rows[0]) throw fail('NOT_FOUND', 'Konto nicht gefunden.', 404);
    const u = r.rows[0];
    return {
      user: {
        id: u.id, display_name: u.display_name, display_name_ascii: u.display_name_ascii,
        is_anonymous: u.is_anonymous, locale: u.locale, level: u.level,
        xp_total: Number(u.xp_total), title_id: u.title_id, created_at: u.created_at,
      },
      stats: {
        runs: Number(u.runs), best_round: u.best_round, best_score: u.best_score && Number(u.best_score),
      },
    };
  });

  // --- Namen aendern ------------------------------------------------------
  app.patch('/api/profile', async (req) => {
    const { userId } = await requireUser(req);
    const name = String((req.body || {}).display_name || '').trim();
    if (name.length < 3 || name.length > 20)
      throw fail('VALIDATION', 'Name muss 3 bis 20 Zeichen haben.', 400);
    const ascii = toAscii(name);
    try {
      const r = await q(
        `UPDATE ts.profiles SET display_name = $2, display_name_ascii = $3, updated_at = now()
         WHERE user_id = $1 RETURNING display_name, display_name_ascii, level, xp_total`,
        [userId, name, ascii]);
      return { profile: r.rows[0] };
    } catch (e) {
      if (e.code === '23505') throw fail('NAME_TAKEN', 'Der Name ist schon vergeben.', 409);
      throw e;
    }
  });
}
