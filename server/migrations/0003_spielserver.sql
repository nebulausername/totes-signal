-- =====================================================================
-- 0003 -- Spielserver: kurzer Code statt langer Adresse
-- =====================================================================
-- Warum: der Beitritt zu einem Multiplayer-Spiel verlangte bisher eine
-- vollstaendige Serveradresse (wss://host:port/pfad). Das ist auf einem Handy
-- nicht zumutbar und laesst sich niemandem zurufen. Der Host bekommt statt
-- dessen einen kurzen Code, den ein Mitspieler eintippt.
--
-- Der Code ist bewusst KEIN Geheimnis: er ersetzt eine oeffentliche Adresse,
-- nicht ein Passwort. Er ist nur kurz genug zum Merken und Vorlesen.
--
-- Vom Alphabet bleibt je Verwechslungspaar genau EINER: O, I, L, S sowie 0
-- und 1 fallen weg. Erzeugt wird der Code vom Anmeldeskript, nicht von der
-- Datenbank -- eine bereits angewandte Migration darf sich nicht mehr aendern.
--
-- Angelegt wird ein Eintrag ausschliesslich ueber
-- server/scripts/spielserver-anmelden.mjs. Es gibt bewusst KEINEN
-- oeffentlichen Schreibendpunkt: sonst koennte jeder beliebige Adressen
-- hinterlegen, und die API waere ein Weiterleitungsdienst fuer Fremde.

CREATE TABLE IF NOT EXISTS ts.spielserver (
  code        TEXT PRIMARY KEY,
  adresse     TEXT        NOT NULL,
  name        TEXT,
  erstellt    TIMESTAMPTZ NOT NULL DEFAULT now(),
  laeuft_ab   TIMESTAMPTZ
);

-- Abgelaufene Eintraege werden beim Nachschlagen ignoriert; der Index haelt
-- die Abfrage guenstig, auch wenn die Tabelle mit der Zeit waechst.
CREATE INDEX IF NOT EXISTS spielserver_laeuft_ab_idx ON ts.spielserver (laeuft_ab);
