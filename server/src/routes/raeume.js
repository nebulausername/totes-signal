import crypto from 'node:crypto';
import { q } from '../lib/db.js';
import { sha256, ipPrefix } from '../lib/tokens.js';
import { requireUser } from './auth.js';

function fail(code, message, status = 400) {
  const e = new Error(message); e.statusCode = status; e.tsCode = code; return e;
}
const zahl = (v, min, max, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : def;
};
const sauber = (s, n) => String(s || '').trim().slice(0, n);

// Lebensdauer: drei Stunden, jeder Herzschlag verlaengert. Ein Raum, von dem
// zwei Minuten nichts kam, verschwindet aus der Liste -- sonst fuellt sie sich
// mit Runden, die es nicht mehr gibt, und jeder Beitritt endet im Nichts.
const TTL_MIN = 180;
const STILL_S = 120;

export default async function routes(app) {
  // --- Raum eintragen oder auffrischen -------------------------------------
  //
  // Warum das trotz des Kommentars in 0003 ("Es gibt KEINEN Schreibendpunkt")
  // vertretbar ist: der Einwand dort war, die API duerfe kein
  // Weiterleitungsdienst werden, in den jeder beliebige Adressen haengt.
  // Dieser Endpunkt nimmt **keine Adresse** entgegen -- er bildet sie aus dem
  // Code ('/'||code), und mehr als diesen Code gibt es bei einem Browser-Raum
  // ohnehin nicht. Das Schlimmste, was jemand anrichten kann, ist einen Code
  // in der eigenen Liste zu besetzen; drei unabhaengige Bremsen begrenzen das
  // (nginx-Rate-Limit, ein offener Raum je Konto, acht je IP-Praefix/Stunde).
  app.post('/api/raum', async (req, reply) => {
    const { userId } = await requireUser(req);
    const b = req.body || {};

    const code = String(b.code || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (!/^[A-Z2-9]{4,12}$/.test(code))
      throw fail('VALIDATION', 'Code fehlt oder ist unplausibel.', 400);

    // Missbrauchsbremse, aber keine Strafe fuer normales Spielen: drei Runden
    // in einer Stunde sind fuer jemanden, der mit Freunden ein paar Partien
    // spielt, voellig normal -- die erste Fassung sperrte genau dort aus (am
    // 2026-08-29 beim Testen selbst hineingelaufen). Ein Auffrischen desselben
    // Codes zaehlt nicht mit: ON CONFLICT aktualisiert die Zeile, es entsteht
    // keine neue. Die eigentliche Bremse ist ohnehin "ein offener Raum je
    // Konto" plus die nginx-Zone.
    const praefix = ipPrefix(req.ip);
    const jung = await q(
      `SELECT count(*)::int AS n FROM ts.raeume
        WHERE ip_prefix = $1 AND erstellt > now() - interval '1 hour'`, [praefix]);
    if (jung.rows[0].n >= 8)
      throw fail('RATE_LIMIT', 'Zu viele Raeume in kurzer Zeit.', 429);

    const roh = crypto.randomBytes(32).toString('base64url');
    const werte = [
      code, '/' + code, sauber(b.name, 40) || null, sauber(b.map_key, 64) || null,
      zahl(b.max_spieler, 2, 4, 4), zahl(b.spieler, 0, 8, 1), zahl(b.runde, 0, 999),
      userId, praefix, sha256(roh), String(TTL_MIN),
    ];

    // ON CONFLICT: derselbe Gastgeber darf denselben Code auffrischen (etwa
    // nach einem Neuladen). Ein FREMDER Code gehoert ihm nicht -- dann greift
    // die WHERE-Klausel nicht, es wird nichts geschrieben, und der Aufrufer
    // bekommt 409, statt still den Raum eines anderen zu uebernehmen.
    let r;
    try {
      r = await q(
        `INSERT INTO ts.raeume (code, adresse, name, map_key, max_spieler, spieler,
                                runde, host_user, ip_prefix, token_hash, status, laeuft_ab)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'offen', now() + ($11 || ' minutes')::interval)
         ON CONFLICT (code) DO UPDATE
            SET name = EXCLUDED.name, map_key = EXCLUDED.map_key,
                max_spieler = EXCLUDED.max_spieler, spieler = EXCLUDED.spieler,
                runde = EXCLUDED.runde, status = 'offen',
                gesehen = now(), laeuft_ab = EXCLUDED.laeuft_ab
                -- token_hash bleibt ABSICHTLICH stehen. Ein Auffrischen darf
                -- das Token nicht drehen: der Gastgeber traegt seinen Raum
                -- mehrfach ein (erst beim Sichtbarmachen, dann noch einmal,
                -- sobald der Kartenname feststeht), und jede Drehung machte
                -- alle bereits abgeschickten Herzschlaege und vor allem das
                -- SCHLIESSEN ungueltig. Genau das ist am 2026-08-29 passiert:
                -- DELETE meldete 204, traf aber keine Zeile, und die Runde
                -- blieb in der Liste stehen, obwohl der Gastgeber weg war.
          WHERE ts.raeume.host_user = EXCLUDED.host_user
         RETURNING code, adresse, laeuft_ab, (xmax = 0) AS neu`, werte);
    } catch (e) {
      // Ein offener Raum je Konto (Teilindex raeume_ein_host).
      if (e && e.code === '23505')
        throw fail('SCHON_OFFEN', 'Du hast bereits eine offene Runde.', 409);
      throw e;
    }
    if (!r.rows.length)
      throw fail('CODE_BELEGT', 'Dieser Code gehoert jemand anderem.', 409);

    reply.code(201);
    // Das Token gibt es NUR beim ersten Eintragen -- beim Auffrischen behaelt
    // der Aufrufer seins. So kann es nie zwischen zwei Aufrufen wechseln.
    return { code: r.rows[0].code, adresse: r.rows[0].adresse,
             raum_token: r.rows[0].neu ? roh : undefined,
             laeuft_ab: r.rows[0].laeuft_ab };
  });

  // --- Herzschlag / Stand melden -------------------------------------------
  app.patch('/api/raum/:code', async (req, reply) => {
    const code = String(req.params.code || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
    const token = String(req.headers['x-raum-token'] || '');
    if (!code || !token) throw fail('VALIDATION', 'Code oder Token fehlt.', 400);
    const b = req.body || {};

    const r = await q(
      `UPDATE ts.raeume
          SET spieler = $2, runde = $3, status = $4, gesehen = now(),
              laeuft_ab = now() + ($5 || ' minutes')::interval
        WHERE code = $1 AND token_hash = $6
        RETURNING code`,
      [code, zahl(b.spieler, 0, 8, 1), zahl(b.runde, 0, 999),
       b.status === 'laeuft' ? 'laeuft' : 'offen', String(TTL_MIN), sha256(token)]);
    if (!r.rows.length) throw fail('NOT_FOUND', 'Raum unbekannt oder Token falsch.', 404);
    reply.code(204);
  });

  // --- Raum schliessen -----------------------------------------------------
  app.delete('/api/raum/:code', async (req, reply) => {
    const code = String(req.params.code || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
    const token = String(req.headers['x-raum-token'] || '');
    if (!code || !token) throw fail('VALIDATION', 'Code oder Token fehlt.', 400);
    // 404 statt stillem 204, wenn nichts passte. Ein Code ist ausdruecklich
    // kein Geheimnis (siehe 0003), es gibt hier also nichts zu verbergen --
    // und ein "erfolgreich" auf einen Aufruf, der nichts getan hat, versteckt
    // genau die Fehler, die man finden muss. Ein bereits geschlossener Raum
    // trifft weiterhin zu und antwortet 204.
    const r = await q(`UPDATE ts.raeume SET status = 'zu', gesehen = now()
                        WHERE code = $1 AND token_hash = $2
                        RETURNING code`, [code, sha256(token)]);
    if (!r.rows.length) throw fail('NOT_FOUND', 'Raum unbekannt oder Token falsch.', 404);
    reply.code(204);
  });

  // --- Die oeffentliche Liste ----------------------------------------------
  //
  // Zeigt AUSSCHLIESSLICH echte, offene, kuerzlich gesehene Raeume mit freiem
  // Platz. Erfundene Eintraege gibt es hier nicht: wer auf einen tippt, liefe
  // in eine Verbindung, die nie zustande kommt -- das waere ein kaputtes
  // Produkt und eine Taeuschung. Ist die Liste leer, sagt die Shell das und
  // bietet an, selbst eine Runde zu eroeffnen.
  app.get('/api/raeume', async (req, reply) => {
    const r = await q(
      `SELECT r.code, r.name, r.map_key, r.max_spieler, r.spieler, r.runde, r.status,
              p.display_name AS host_name, p.level AS host_level
         FROM ts.raeume r
         LEFT JOIN ts.profiles p ON p.user_id = r.host_user
        WHERE r.status <> 'zu'
          AND r.laeuft_ab > now()
          AND r.gesehen > now() - ($1 || ' seconds')::interval
          AND r.spieler < r.max_spieler
        ORDER BY r.gesehen DESC
        LIMIT 30`, [String(STILL_S)]);
    reply.header('Cache-Control', 'public, max-age=10');
    return { raeume: r.rows };
  });
}
