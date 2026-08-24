// Erzeugt die Seed-Migration aus data/erfolge.json.
// Eine Quelle der Wahrheit -- die deutschen Texte stehen nur an einer Stelle.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(root, 'data/erfolge.json'), 'utf8'));
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const zeilen = d.erfolge.map((e) => `  (${e.id}, ${q(e.key)}, ${q(e.art)}, ${e.xp}, ${e.verfuegbar},` +
  ` ${q(e.de.name)}, ${q(e.de.desc)}, ${q('gfx/achievement/' + e.key + '.tga')},` +
  ` ${e.regel ? q(JSON.stringify(e.regel)) + '::jsonb' : 'NULL'})`).join(',\n');

const sql = `-- =====================================================================
-- 0002 -- Erfolge
-- =====================================================================
-- ERZEUGT aus server/data/erfolge.json -- nicht von Hand aendern.
-- Neu erzeugen: node scripts/erfolge-seed-erzeugen.mjs
--
-- Warum es diese Tabelle ueberhaupt gibt: die 42 Erfolge existieren seit
-- Jahren im Spiel, waren aber komplett abgeschaltet (GiveAchievement begann
-- mit einem bedingungslosen return, und CSQC verweigerte im Web grundsaetzlich).
-- Die Ablage in ach.dat war der Grund dafuer -- im Emscripten-Dateisystem
-- unzuverlaessig. Genau das loest der Server.
--
-- art:
--   derived = aus den Laufdaten berechenbar. Wirkt RUECKWIRKEND: wer schon
--             Runde 15 erreicht hat, bekommt den Erfolg beim Ausrollen sofort.
--   meta    = zaehlt andere Erfolge.
--   ingame  = braucht ein Ereignis aus dem Spiel.
-- verfuegbar = false: im Spiel nicht erreichbar (fehlende Erkennung oder
--   Verweis auf Kino der Toten, eine Karte die wir gar nicht ausliefern).

CREATE TYPE ts.ach_art AS ENUM ('ingame', 'derived', 'meta');

CREATE TABLE ts.achievement_defs (
  id         smallint PRIMARY KEY,
  key        text NOT NULL UNIQUE,
  art        ts.ach_art NOT NULL,
  xp_reward  integer NOT NULL DEFAULT 0,
  verfuegbar boolean NOT NULL DEFAULT true,
  name_de    text NOT NULL,
  desc_de    text NOT NULL,
  icon       text NOT NULL,
  regel      jsonb
);

CREATE TABLE ts.user_achievements (
  user_id        uuid     NOT NULL REFERENCES ts.users(id) ON DELETE CASCADE,
  achievement_id smallint NOT NULL REFERENCES ts.achievement_defs(id),
  unlocked_at    timestamptz,
  progress       integer NOT NULL DEFAULT 0,
  quelle         text NOT NULL DEFAULT 'server',   -- 'server' | 'client'
  run_id         uuid REFERENCES ts.runs(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, achievement_id)
);
CREATE INDEX ua_freigeschaltet_idx ON ts.user_achievements (user_id) WHERE unlocked_at IS NOT NULL;

INSERT INTO ts.achievement_defs (id, key, art, xp_reward, verfuegbar, name_de, desc_de, icon, regel) VALUES
${zeilen};
`;

const ziel = path.join(root, 'migrations/0002_erfolge.sql');

// Wache: 0002 ist laengst angewandt. Der Migrations-Runner haelt je Datei eine
// Pruefsumme und bricht ab, wenn sich eine angewandte Migration nachtraeglich
// aendert -- ein stilles Ueberschreiben hier haette also die naechste
// Auslieferung lahmgelegt, und zwar an einer Stelle, die nichts mit Erfolgen
// zu tun hat. Real geworden ist das beim Freischalten der sieben ingame-Erfolge
// (0004): `verfuegbar` steht in der Seed-Zeile, eine Neuerzeugung haette 0002
// veraendert.
//
// Die Quelle der Wahrheit bleibt data/erfolge.json. Wer sie aendert, legt eine
// neue, nummerierte Migration mit dem Unterschied an -- so wie 0004.
if (fs.existsSync(ziel)) {
  const alt = fs.readFileSync(ziel, 'utf8');
  if (alt === sql) {
    console.log(`unveraendert: ${path.relative(root, ziel)} (${d.erfolge.length} Erfolge)`);
    process.exit(0);
  }
  if (process.argv.includes('--wirklich-ueberschreiben')) {
    fs.writeFileSync(ziel, sql);
    console.log(`UEBERSCHRIEBEN: ${path.relative(root, ziel)} -- nur richtig, solange 0002 nirgends angewandt ist.`);
    process.exit(0);
  }
  console.error(`[FEHLER] ${path.relative(root, ziel)} wuerde sich aendern, ist aber bereits angewandt.`);
  console.error('         Der Migrations-Runner bricht danach bei JEDER Migration ab.');
  console.error('         Lege stattdessen eine neue Migration mit dem Unterschied an.');
  console.error('         Nur wenn 0002 nachweislich nirgends angewandt ist:');
  console.error('           node scripts/erfolge-seed-erzeugen.mjs --wirklich-ueberschreiben');
  process.exit(1);
}

fs.writeFileSync(ziel, sql);
console.log(`geschrieben: ${path.relative(root, ziel)} (${d.erfolge.length} Erfolge)`);
