-- =====================================================================
-- 0004 -- Sieben Erfolge sind jetzt im Spiel erreichbar
-- =====================================================================
-- 0002 hat die 42 Erfolge angelegt und 19 davon als `verfuegbar = false`
-- markiert. Der Grund war nicht Absicht, sondern eine Luecke: die Erfolge
-- standen seit Jahren in der CSQC-Tabelle, es gab nur nirgends ein
-- GiveAchievement(), das sie vergeben haette.
--
-- Fuer diese sieben gibt es die Vergabestelle jetzt:
--
--   18 cmere_cupcake       damage.qc         (eigene Granate, DamgageExplode)
--   22 cache_and_carry     powerups.qc       (PU_MaxAmmo, VOR dem Auffuellen)
--   23 divide_and_conquer  rounds.qc         (EndRound gegen Total_Zombies)
--   28 increase_firepower  pack_a_punch.qc   (PAP_UpgradeWeapon)
--   31 thanks_explosions   damage.qc         (Abschuesse je Explosionsaufruf)
--   32 mbox_maniac         mystery_box.qc    (Kauf an der Truhe)
--   35 why_wait            player_core.qc    (PlayerPreThink, Geschwindigkeit)
--
-- `verfuegbar` steuert nur die Anzeige ("x von y erreichbar") und die
-- Auswertung der derived/meta-Regeln -- fuer ingame-Erfolge ist es eine
-- Zusage an den Spieler, keine Sperre.
--
-- Warum eine eigene Migration und keine Aenderung an 0002: der Runner haelt
-- eine Pruefsumme je Datei und bricht laut ab, wenn eine bereits angewandte
-- Migration sich nachtraeglich aendert. Die Quelle der Wahrheit bleibt
-- server/data/erfolge.json; scripts/erfolge-seed-erzeugen.mjs weigert sich
-- ab jetzt, 0002 zu ueberschreiben, und weist auf genau diesen Weg hin.

UPDATE ts.achievement_defs
   SET verfuegbar = true
 WHERE id IN (18, 22, 23, 28, 31, 32, 35);
