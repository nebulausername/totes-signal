// Plausibilitaetspruefungen fuer eingereichte Laeufe.
//
// VORWEG, DAMIT DIE ERWARTUNG STIMMT: Das Spiel laeuft vollstaendig im Browser
// des Spielers, der Punktestand entsteht dort. Wer bereit ist, den Client zu
// veraendern und die Echtzeit wirklich abzusitzen, kommt auf die Liste. Das
// laesst sich ohne serverseitige Simulation nicht verhindern -- und die zu
// bauen hiesse, das Spiel neu zu schreiben.
//
// Ziel ist deshalb nicht Unmoeglichkeit, sondern:
//   1. Gelegenheits-Manipulation (Konsole auf, Punkte setzen) scheitert sofort.
//   2. Ernsthafte Manipulation kostet mehr Aufwand als ehrliches Spielen.
//   3. Die Spitze der Liste bleibt fuer einen Menschen pruefbar.
//   4. Ein manipulierter Lauf sieht NIE aus wie ein ehrlicher.

// --- Zombiezahl je Runde, 1:1 aus server/rounds.qc:67-108 uebernommen ------
// Abweichung: QuakeC rint() rundet zur naechsten GERADEN Zahl, JS Math.round()
// kaufmaennisch. Der Unterschied liegt bei hoechstens 1 Zombie und die Grenze
// hat ohnehin 15 % Luft.
export function zombiesForRound(rounds, playerCount = 1, difficulty = 0, roundtype = 1) {
  let count;
  if (roundtype === 1) {
    count = 24;
    let multiplier = Math.max(rounds / 5, 1);
    if (rounds >= 10) multiplier *= rounds * 0.15;
    count += Math.round((playerCount === 1 ? 0.5 * 6 : (playerCount - 1) * 6) * multiplier);
    if      (rounds < 2) count = Math.floor(count * 0.25);
    else if (rounds < 3) count = Math.floor(count * 0.30);
    else if (rounds < 4) count = Math.floor(count * 0.50);
    else if (rounds < 5) count = Math.floor(count * 0.70);
    else if (rounds < 6) count = Math.floor(count * 0.90);
  } else {
    count = (rounds <= 14 ? 6 : 8) * playerCount;   // Hunderunden
  }
  if (difficulty === 1) count = Math.floor(count * 0.90);
  else if (difficulty === 2 || difficulty === 3) count = Math.floor(count * 1.25);
  return count;
}

export function totalZombiesUpTo(rounds, playerCount = 1, difficulty = 0) {
  let sum = 0;
  for (let r = 1; r <= rounds; r++) sum += zombiesForRound(r, playerCount, difficulty);
  return sum;
}

const SPAWN_FLOOR_S = 0.08;   // server/rounds.qc:313 -- kleiner wird der Abstand nie

// Verdikte: 'rejected' = sicher unmoeglich, 'flagged' = auffaellig, ein Mensch
// schaut drauf. Im Zweifel IMMER flagged: ein faelschlich abgewiesener
// ehrlicher Lauf ist schlimmer als ein markierter, der sich als echt erweist.
function pruef(name, ok, observed, bound, severity, why) {
  return { name, ok, observed, bound, severity, why };
}

export function bewerte(run, heartbeats = []) {
  const c = [];
  const rounds   = run.rounds ?? 0;
  const kills    = run.kills ?? 0;
  const heads    = run.headshots ?? 0;
  const downs    = run.downs ?? 0;
  const inGame   = run.in_game_secs ?? 0;
  const wall     = run.wall_secs ?? 0;
  const players  = run.player_count ?? 1;
  const diff     = run.difficulty ?? 0;

  const zombieBudget = totalZombiesUpTo(rounds, players, diff);

  c.push(pruef('C1_kopfschuesse', heads <= kills, heads, kills, 'rejected',
    'Mehr Kopfschuesse als Kills ist arithmetisch unmoeglich.'));

  // 15 % Luft fuer Hunderunden und Nachzuegler innerhalb einer Runde.
  const killBound = Math.ceil(zombieBudget * 1.15) + 10;
  c.push(pruef('C2_kills', kills <= killBound, kills, killBound, 'rejected',
    'Mehr Kills als bis zu dieser Runde ueberhaupt Zombies erscheinen.'));

  c.push(pruef('C3_downs', downs <= rounds + 2, downs, rounds + 2, 'flagged',
    'Mehr Niederschlaege als Runden -- moeglich, aber ungewoehnlich.'));

  c.push(pruef('C5_zeitrichtung', inGame <= wall + 30, inGame, wall + 30, 'rejected',
    'Die Spielzeit kann die tatsaechlich verstrichene Zeit nicht uebersteigen.'));

  const wallBound = wall === 0 ? Infinity : 4 * inGame + 900;
  c.push(pruef('C6_pausen', wall <= wallBound, wall, wallBound, 'flagged',
    'Sehr viel Echtzeit fuer wenig Spielzeit -- lange Pause oder zusammengesetzt.'));

  // Selbst wenn der Spieler nichts tut, brauchen die Zombies Zeit zum Erscheinen.
  const minSeconds = Math.floor(zombieBudget * SPAWN_FLOOR_S);
  c.push(pruef('C7_mindestdauer', inGame >= minSeconds, inGame, minSeconds, 'rejected',
    'Schneller, als die Zombies ueberhaupt spawnen koennen.'));

  c.push(pruef('C9_cheats', !run.cheat_flag, run.cheat_flag, false, 'rejected',
    'sv_cheats war in dieser Sitzung aktiv (Riegel rastet einbahnig ein).'));

  // --- Herzschlag-Spur ---------------------------------------------------
  if (heartbeats.length) {
    let monoton = true;
    for (let i = 1; i < heartbeats.length; i++) {
      const a = heartbeats[i - 1], b = heartbeats[i];
      if (b.round < a.round || Number(b.score) < Number(a.score) ||
          b.kills < a.kills || b.in_game_secs < a.in_game_secs) { monoton = false; break; }
    }
    c.push(pruef('C12_monoton', monoton, null, null, 'rejected',
      'Werte sind zwischendurch gesunken -- die Spur ist nicht echt.'));

    const maxHb = Math.max(...heartbeats.map((h) => h.round));
    // Ein Abschluss, der Runde 40 behauptet, aber nur bis Runde 3 gemeldet
    // hat, ist eine Luege. Unterhalb von Runde 15 sind Aussetzer normal
    // (kurze Laeufe, verlorene Anfragen), darum nur markieren.
    const deckung = maxHb >= rounds - 2;
    c.push(pruef('C14_deckung', deckung, maxHb, rounds - 2,
      rounds > 15 ? 'rejected' : 'flagged',
      'Die gemeldete Endrunde ist von der Herzschlag-Spur nicht gedeckt.'));
  } else if (rounds > 5) {
    c.push(pruef('C14_deckung', false, 0, rounds - 2, 'flagged',
      'Gar keine Herzschlaege fuer einen laengeren Lauf.'));
  }

  c.push(pruef('C15_rundenueberlauf', rounds <= 250, rounds, 250, 'flagged',
    'Nahe am WriteByte-Ueberlauf (256) -- ein Mensch sollte das ansehen.'));

  const rejected = c.filter((x) => !x.ok && x.severity === 'rejected');
  const flagged  = c.filter((x) => !x.ok && x.severity === 'flagged');

  return {
    status: rejected.length ? 'rejected' : (flagged.length ? 'flagged' : 'verified'),
    reason: rejected.length ? rejected[0].name : (flagged.length ? flagged[0].name : null),
    checks: c,
  };
}

// XP: bewusst flach und vor allem NACHVOLLZIEHBAR. Runden zaehlen mehr als
// Kills, damit Weiterkommen belohnt wird und nicht Farmen.
export function xpForRun(run) {
  const rounds = run.rounds ?? 0;
  const kills  = run.kills ?? 0;
  const heads  = run.headshots ?? 0;
  return Math.max(0, Math.round(rounds * 25 + kills * 0.5 + heads * 0.5));
}
