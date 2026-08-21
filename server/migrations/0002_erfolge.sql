-- =====================================================================
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
  (0, 'ready', 'derived', 50, true, 'Bereit ...', 'Erreiche Runde 5', 'gfx/achievement/ready.tga', '{"metrik":"max_rounds","op":">=","wert":5}'::jsonb),
  (1, 'steady', 'derived', 100, true, 'Ruhig ...', 'Erreiche Runde 10', 'gfx/achievement/steady.tga', '{"metrik":"max_rounds","op":">=","wert":10}'::jsonb),
  (2, 'go_hell_no', 'derived', 200, true, 'Los? Auf keinen Fall.', 'Erreiche Runde 15', 'gfx/achievement/go_hell_no.tga', '{"metrik":"max_rounds","op":">=","wert":15}'::jsonb),
  (3, 'where_legs_go', 'ingame', 30, true, 'Wo sind die Beine hin?', 'Mach aus einem Zombie einen Krabbler', 'gfx/achievement/where_legs_go.tga', NULL),
  (4, 'the_f_bomb', 'ingame', 40, true, 'Mit Kanonen auf Spatzen', 'Toete mit der Atombombe genau einen Zombie', 'gfx/achievement/the_f_bomb.tga', NULL),
  (5, 'no_perks_no_problem', 'ingame', 120, true, 'Ohne Perks? Kein Problem.', 'Ueberstehe ab Runde 15 eine ganze Runde ohne Perks', 'gfx/achievement/no_perks_no_problem.tga', NULL),
  (6, 'dipsomaniac', 'ingame', 150, true, 'Trunksucht', 'Halte alle Perk-A-Colas gleichzeitig', 'gfx/achievement/dipsomaniac.tga', NULL),
  (7, 'oops', 'ingame', 30, true, 'Hoppla!', 'Ueberlebe einen Sturz nur knapp', 'gfx/achievement/oops.tga', NULL),
  (8, 'abstinence_program', 'ingame', 150, true, 'Unberuehrt', 'Erreiche Runde 10, ohne Schaden zu nehmen', 'gfx/achievement/abstinence_program.tga', NULL),
  (9, 'pro_gamer_move', 'ingame', 25, true, 'Meisterleistung', 'Stirb in Runde 1 mit leerem Magazin', 'gfx/achievement/pro_gamer_move.tga', NULL),
  (10, 'spinning_plates', 'ingame', 120, true, 'Alle Teller in der Luft', 'Halte bis Runde 10 alle Fenster vernagelt', 'gfx/achievement/spinning_plates.tga', NULL),
  (11, 'unlucky', 'ingame', 60, true, 'Pech gehabt', 'Lass die Wundertruhe zehnmal umziehen', 'gfx/achievement/unlucky.tga', NULL),
  (12, 'the_collector', 'ingame', 100, true, 'Der Sammler', 'Kaufe in einem Spiel jede Wandwaffe', 'gfx/achievement/the_collector.tga', NULL),
  (13, 'barrels_o_fun', 'ingame', 60, true, 'Fass ohne Boden', 'Toete in Nacht der Untoten 15 Zombies mit Explosivfaessern', 'gfx/achievement/barrels_o_fun.tga', NULL),
  (14, 'its_a_trap', 'ingame', 60, false, 'Eine Falle!', 'Nicht verfuegbar: verlangt Kino der Toten', 'gfx/achievement/its_a_trap.tga', NULL),
  (15, 'uplink', 'ingame', 60, false, 'Standleitung', 'Nicht verfuegbar: verlangt Kino der Toten', 'gfx/achievement/uplink.tga', NULL),
  (16, 'undone', 'derived', 1000, true, 'Zermuerbt', 'Ueberstehe in Nacht der Untoten insgesamt 150 Runden', 'gfx/achievement/undone.tga', '{"metrik":"summe_rounds_ndu","op":">=","wert":150}'::jsonb),
  (17, 'moviegoer', 'ingame', 60, false, 'Kinogaenger', 'Nicht verfuegbar: verlangt Kino der Toten', 'gfx/achievement/moviegoer.tga', NULL),
  (18, 'cmere_cupcake', 'ingame', 25, false, 'Komm her, Suesser!', 'Sprenge dich mit deiner eigenen Granate', 'gfx/achievement/cmere_cupcake.tga', NULL),
  (19, 'orbital_strike', 'ingame', 80, false, 'Schlag von oben', 'Toete im Sprung fuenf Zombies mit dem Panzerschreck', 'gfx/achievement/orbital_strike.tga', NULL),
  (20, 'long_name', 'ingame', 150, false, 'Geteiltes Haus', 'Nicht verfuegbar: Erkennung fehlt', 'gfx/achievement/long_name.tga', NULL),
  (21, 'colt_hearted_killer', 'ingame', 150, false, 'Kaltbluetig', 'Erreiche Runde 10 nur mit der Colt M1911', 'gfx/achievement/colt_hearted_killer.tga', NULL),
  (22, 'cache_and_carry', 'ingame', 25, false, 'Voll ist voll', 'Nimm Max-Munition bei vollem Vorrat', 'gfx/achievement/cache_and_carry.tga', NULL),
  (23, 'divide_and_conquer', 'ingame', 100, false, 'Teile und herrsche', 'Mach in einer Runde alle Zombies zu Krabblern', 'gfx/achievement/divide_and_conquer.tga', NULL),
  (24, 'tough_luck', 'derived', 10, true, 'Dumm gelaufen', 'Stirb vor Runde 5', 'gfx/achievement/tough_luck.tga', '{"metrik":"min_rounds","op":"<","wert":5}'::jsonb),
  (25, 'gregg', 'ingame', 100, false, 'Alle sind eins mit Gregg!', '???', 'gfx/achievement/gregg.tga', NULL),
  (26, 'slasher', 'ingame', 80, false, 'Schlitzer', 'Erledige insgesamt 100 Zombies im Nahkampf', 'gfx/achievement/slasher.tga', NULL),
  (27, 'made_by_children', 'ingame', 40, false, 'Von Kindern gebaut', 'Lass einen Zombie fuenf Minuten feststecken', 'gfx/achievement/made_by_children.tga', NULL),
  (28, 'increase_firepower', 'ingame', 50, false, 'Mehr Feuerkraft!', 'Benutze zum ersten Mal Pack-a-Punch', 'gfx/achievement/increase_firepower.tga', NULL),
  (29, 'kraut_tongue', 'derived', 40, true, 'Kopfsache', 'Lande 25 Kopfschuesse', 'gfx/achievement/kraut_tongue.tga', '{"metrik":"summe_headshots","op":">=","wert":25}'::jsonb),
  (30, 'mindblowing', 'derived', 150, true, 'Umwerfend', 'Lande 250 Kopfschuesse', 'gfx/achievement/mindblowing.tga', '{"metrik":"summe_headshots","op":">=","wert":250}'::jsonb),
  (31, 'thanks_explosions', 'ingame', 60, false, 'Danke, Sprengstoff', 'Toete zehn Zombies mit einer einzigen Granate', 'gfx/achievement/thanks_explosions.tga', NULL),
  (32, 'mbox_maniac', 'ingame', 80, false, 'Truhen-Besessen', 'Benutze die Wundertruhe 20-mal in einem Spiel', 'gfx/achievement/mbox_maniac.tga', NULL),
  (33, 'instant_help', 'ingame', 80, false, 'Sofortige Hilfe', 'Erledige 100 Zombies unter Insta-Kill', 'gfx/achievement/instant_help.tga', NULL),
  (34, 'blow_the_bank', 'derived', 500, true, 'Bank gesprengt', 'Verdiene insgesamt 1.000.000 Punkte', 'gfx/achievement/blow_the_bank.tga', '{"metrik":"summe_score","op":">=","wert":1000000}'::jsonb),
  (35, 'why_wait', 'ingame', 20, false, 'Worauf warten wir?', 'Steh zwei Minuten still', 'gfx/achievement/why_wait.tga', NULL),
  (36, 'one_clip', 'ingame', 100, false, 'Ein Magazin', 'Ueberstehe eine Runde mit dem MG42, ohne nachzuladen', 'gfx/achievement/one_clip.tga', NULL),
  (37, '2021', 'ingame', 150, false, 'Zwanzig aus zwanzig', 'Lande 20 Kopfschuesse mit 20 Schuss aus einem Magazin', 'gfx/achievement/2021.tga', NULL),
  (38, 'warmed_up', 'meta', 100, true, 'Warmgelaufen', 'Sammle 10 Erfolge', 'gfx/achievement/warmed_up.tga', '{"metrik":"anzahl_erfolge","op":">=","wert":10}'::jsonb),
  (39, 'half_way', 'meta', 200, true, 'Gut die Haelfte', 'Sammle 20 Erfolge', 'gfx/achievement/half_way.tga', '{"metrik":"anzahl_erfolge","op":">=","wert":20}'::jsonb),
  (40, '75_percent', 'meta', 300, true, '75 Prozent reichen auch', 'Sammle 30 Erfolge', 'gfx/achievement/75_percent.tga', '{"metrik":"anzahl_erfolge","op":">=","wert":30}'::jsonb),
  (41, 'over_achiever', 'meta', 1000, true, 'Uebererfuellt', 'Sammle alle 42 Erfolge', 'gfx/achievement/over_achiever.tga', '{"metrik":"anzahl_erfolge","op":">=","wert":42}'::jsonb);
