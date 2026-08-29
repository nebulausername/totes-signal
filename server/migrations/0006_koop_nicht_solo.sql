-- Ein Koop-Lauf gehoert nicht auf die Solo-Bestenliste.
--
-- Bis hierher pruefte ts.run_is_eligible ausschliesslich `player_count = 1` --
-- und die Web-Shell meldete diesen Wert HART als 1, weil sie die echte
-- Spielerzahl nie kannte. Eine Vierer-Runde war damit von einem Solo-Lauf
-- nicht zu unterscheiden und konnte auf der Solo-Liste landen.
--
-- Das Koop-Bit gab es die ganze Zeit: ts_flag_bits() im Server-QuakeC setzt
-- Bit 3 (= 8), sobald mehr als ein Spieler dabei ist. Es wurde gespeichert,
-- aber nie ausgewertet, und die Shell las es nicht einmal aus dem Marker.
--
-- Jetzt gilt BEIDES, und die belastbarere Bedingung ist die neue: die
-- Spielerzahl kommt aus der Shell, das Flag aus dem Spiel.

BEGIN;

CREATE OR REPLACE FUNCTION ts.run_is_eligible(r ts.runs) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT r.status = 'verified'
       AND NOT r.cheat_flag
       AND r.start_round <= 1        -- sv_startround 40 ist kein Rekord
       AND (r.flags & 16) = 0        -- Cheats waren aktiv
       AND (r.flags & 8)  = 0        -- Koop: kommt aus dem Spiel, nicht vom Client
       AND r.player_count = 1 $$;

-- Die drei Bestenlisten-Indizes tragen dieselbe Bedingung wie die Funktion.
-- Ein Teilindex, dessen Praedikat von der Funktion abweicht, ist eine Falle
-- fuer den Naechsten: er sieht aus, als deckte er die Abfrage ab, und tut es
-- nicht.
DROP INDEX IF EXISTS ts.runs_board_rounds;
DROP INDEX IF EXISTS ts.runs_board_score;
DROP INDEX IF EXISTS ts.runs_board_recent;

CREATE INDEX runs_board_rounds ON ts.runs
  (map_key, difficulty, gamemode, rounds DESC, in_game_secs ASC)
  WHERE status = 'verified' AND NOT cheat_flag AND start_round <= 1
    AND player_count = 1 AND (flags & 8) = 0 AND (flags & 16) = 0;
CREATE INDEX runs_board_score ON ts.runs
  (map_key, difficulty, gamemode, score DESC, submitted_at ASC)
  WHERE status = 'verified' AND NOT cheat_flag AND start_round <= 1
    AND player_count = 1 AND (flags & 8) = 0 AND (flags & 16) = 0;
CREATE INDEX runs_board_recent ON ts.runs (submitted_at DESC, score DESC)
  WHERE status = 'verified' AND NOT cheat_flag AND start_round <= 1
    AND player_count = 1 AND (flags & 8) = 0 AND (flags & 16) = 0;

COMMIT;
