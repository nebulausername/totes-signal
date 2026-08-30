-- Die Koop-Bestenliste.
--
-- 0006 hat Koop von der SOLO-Liste ausgeschlossen -- und damit stand ein
-- Koop-Lauf auf gar keiner Liste mehr: gespeichert, in der eigenen Historie
-- sichtbar, sonst nirgends. Wer zu viert bis Runde 20 kommt, hat nichts davon.
--
-- Getrennt nach Spielerzahl, weil zwei und vier nicht dasselbe Spiel sind: die
-- Zombiezahl skaliert mit ((player_count - 1) * 6), aber auch die Feuerkraft
-- und die Chance, wieder aufgehoben zu werden. Ein gemeinsames Feld waere
-- kein Vergleich, sondern eine Vermischung.
--
-- Die SOLO-Funktion und ihre drei Indizes bleiben UNANGETASTET. Das war der
-- ganze Grund fuer 0006.

BEGIN;

CREATE OR REPLACE FUNCTION ts.run_is_eligible_coop(r ts.runs) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT r.status = 'verified'
       AND NOT r.cheat_flag
       AND r.start_round <= 1            -- sv_startround 40 ist kein Rekord
       AND (r.flags & 16) = 0            -- Cheats waren aktiv
       AND (r.flags & 8) <> 0            -- Koop-Bit: kommt aus dem SPIEL
       AND r.player_count BETWEEN 2 AND 4 $$;

-- Die Teilindizes tragen WORTGLEICH dasselbe Praedikat wie die Funktion.
-- Weicht ein Index davon ab, sieht er aus, als deckte er die Abfrage ab, und
-- tut es nicht -- genau die Falle, die 0006 fuer die Solo-Liste geraeumt hat.
CREATE INDEX IF NOT EXISTS runs_koop_rounds ON ts.runs
  (map_key, difficulty, gamemode, player_count, rounds DESC, in_game_secs ASC)
  WHERE status = 'verified' AND NOT cheat_flag AND start_round <= 1
    AND (flags & 16) = 0 AND (flags & 8) <> 0
    AND player_count BETWEEN 2 AND 4;

CREATE INDEX IF NOT EXISTS runs_koop_score ON ts.runs
  (map_key, difficulty, gamemode, player_count, score DESC, submitted_at ASC)
  WHERE status = 'verified' AND NOT cheat_flag AND start_round <= 1
    AND (flags & 16) = 0 AND (flags & 8) <> 0
    AND player_count BETWEEN 2 AND 4;

COMMIT;
