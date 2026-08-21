import { q } from './db.js';

// Abgeleitete und Meta-Erfolge serverseitig auswerten.
//
// Der Reiz daran: sie wirken RUECKWIRKEND. Wer laengst Runde 15 erreicht hat,
// bekommt den Erfolg in dem Moment, in dem die Regel ausgerollt wird -- ohne
// eine Zeile QuakeC und ohne dass er noch einmal spielen muss.
//
// Deshalb liegen die Regeln als Daten in der Tabelle und nicht im Code: eine
// neue Regel ist ein INSERT, kein Deployment.

// Kennzahlen eines Spielers, aus VERIFIZIERTEN Laeufen. Markierte oder
// abgewiesene zaehlen nicht -- sonst waere ein Erfolg ueber einen
// manipulierten Lauf zu holen.
async function kennzahlen(userId) {
  const r = await q(`
    SELECT
      coalesce(max(r.rounds), 0)                                  AS max_rounds,
      coalesce(min(r.rounds), 999999)                             AS min_rounds,
      coalesce(sum(r.headshots), 0)                               AS summe_headshots,
      coalesce(sum(r.score), 0)                                   AS summe_score,
      coalesce(sum(r.rounds) FILTER (WHERE r.map_key = 'ndu'), 0)  AS summe_rounds_ndu,
      count(*)                                                    AS anzahl_laeufe
    FROM ts.runs r
    WHERE r.user_id = $1 AND r.status = 'verified'`, [userId]);
  const k = r.rows[0];
  const a = await q(
    `SELECT count(*) AS n FROM ts.user_achievements
     WHERE user_id = $1 AND unlocked_at IS NOT NULL`, [userId]);
  return {
    max_rounds: Number(k.max_rounds),
    min_rounds: Number(k.anzahl_laeufe) > 0 ? Number(k.min_rounds) : 999999,
    summe_headshots: Number(k.summe_headshots),
    summe_score: Number(k.summe_score),
    summe_rounds_ndu: Number(k.summe_rounds_ndu),
    anzahl_erfolge: Number(a.rows[0].n),
  };
}

function erfuellt(regel, werte) {
  if (!regel || !regel.metrik) return false;
  const v = werte[regel.metrik];
  if (v === undefined) return false;
  switch (regel.op) {
    case '>=': return v >= regel.wert;
    case '>':  return v >  regel.wert;
    case '<=': return v <= regel.wert;
    case '<':  return v <  regel.wert;
    case '==': return v === regel.wert;
    default:   return false;
  }
}

// Wertet aus und schaltet frei, was faellig ist. Gibt die NEU
// freigeschalteten zurueck, damit die Shell sie feiern kann.
//
// Meta-Erfolge zaehlen andere Erfolge, koennen also durch einen abgeleiteten
// erst faellig werden. Deshalb in Runden auswerten, bis nichts Neues mehr
// dazukommt -- hoechstens dreimal, das genuegt bei vier Meta-Stufen.
export async function erfolgePruefen(userId, runId = null) {
  const defs = (await q(
    `SELECT id, key, art, xp_reward, name_de, regel FROM ts.achievement_defs
     WHERE art IN ('derived','meta') AND verfuegbar AND regel IS NOT NULL`)).rows;

  const neu = [];
  for (let runde = 0; runde < 3; runde++) {
    const werte = await kennzahlen(userId);
    const schon = new Set((await q(
      `SELECT achievement_id FROM ts.user_achievements
       WHERE user_id = $1 AND unlocked_at IS NOT NULL`, [userId])).rows.map(r => r.achievement_id));

    const faellig = defs.filter(d => !schon.has(d.id) && erfuellt(d.regel, werte));
    if (!faellig.length) break;

    for (const d of faellig) {
      await q(
        `INSERT INTO ts.user_achievements (user_id, achievement_id, unlocked_at, quelle, run_id)
         VALUES ($1, $2, now(), 'server', $3)
         ON CONFLICT (user_id, achievement_id)
         DO UPDATE SET unlocked_at = coalesce(ts.user_achievements.unlocked_at, now())`,
        [userId, d.id, runId]);
      if (d.xp_reward > 0) {
        // Kein ON CONFLICT ueber run_id hier: ein Erfolg vergibt seine XP
        // genau einmal, das sichert der Eindeutigkeits-Index unten ab.
        await q(
          `INSERT INTO ts.xp_events (user_id, run_id, delta, reason)
           SELECT $1, $2, $3, 'achievement'
           WHERE NOT EXISTS (
             SELECT 1 FROM ts.xp_events
             WHERE user_id = $1 AND reason = 'achievement' AND delta = $3 AND run_id IS NOT DISTINCT FROM $2)`,
          [userId, runId, d.xp_reward]);
      }
      neu.push({ id: d.id, key: d.key, name: d.name_de, xp: d.xp_reward });
    }
  }

  if (neu.length) {
    // xp_total ist nur ein Zwischenspeicher -- die Wahrheit sind die Ereignisse.
    await q(
      `UPDATE ts.profiles SET xp_total =
         (SELECT coalesce(sum(delta),0) FROM ts.xp_events WHERE user_id = $1),
         updated_at = now() WHERE user_id = $1`, [userId]);
  }
  return neu;
}
