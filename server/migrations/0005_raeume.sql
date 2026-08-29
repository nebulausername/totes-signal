-- Oeffentliche Koop-Raeume.
--
-- Der Beitritt selbst braucht dieses Verzeichnis NICHT: bei einem im Browser
-- angebotenen Raum IST der Code die Adresse -- der Gastgeber meldet ihn als
-- sv_public "/<code>" beim Vermittler an, und `connect /<code>` trifft ihn.
-- Wer den Code hat, kommt also auch ohne Konto und ohne diese Tabelle rein.
--
-- Was hier dazukommt, ist allein die SICHTBARKEIT: eine Liste offener Runden
-- fuer Leute, die niemanden kennen, den sie fragen koennten.
--
-- ts.spielserver (0003) bleibt daneben bestehen und unveraendert -- dort
-- stehen von Hand eingetragene Dauer-Server, ein anderer Lebenszyklus.

BEGIN;

CREATE TABLE IF NOT EXISTS ts.raeume (
  code         text PRIMARY KEY,
  -- Immer '/'||code. Wird NIE vom Aufrufer uebernommen: sonst waere die API
  -- ein Weiterleitungsdienst, in den jeder beliebige Adressen haengen kann --
  -- genau der Einwand, mit dem 0003 den Schreibweg verweigert hat.
  adresse      text        NOT NULL,
  name         text,
  map_key      text,
  max_spieler  smallint    NOT NULL DEFAULT 4 CHECK (max_spieler BETWEEN 2 AND 4),
  spieler      smallint    NOT NULL DEFAULT 1 CHECK (spieler BETWEEN 0 AND 8),
  runde        smallint    NOT NULL DEFAULT 0,
  status       text        NOT NULL DEFAULT 'offen'
                           CHECK (status IN ('offen','laeuft','zu')),
  host_user    uuid        REFERENCES ts.users(id) ON DELETE CASCADE,
  ip_prefix    inet,
  token_hash   bytea       NOT NULL,
  erstellt     timestamptz NOT NULL DEFAULT now(),
  gesehen      timestamptz NOT NULL DEFAULT now(),
  laeuft_ab    timestamptz NOT NULL,

  CONSTRAINT raeume_code_form CHECK (code ~ '^[A-Z2-9]{4,12}$'),
  CONSTRAINT raeume_adresse_abgeleitet CHECK (adresse = '/' || code)
);

CREATE INDEX IF NOT EXISTS raeume_ablauf ON ts.raeume (laeuft_ab);

-- Die Liste zeigt nur, was offen ist und sich in letzter Zeit gemeldet hat.
CREATE INDEX IF NOT EXISTS raeume_liste ON ts.raeume (gesehen DESC)
  WHERE status <> 'zu';

-- Ein offener Raum je Konto. now() ist nicht IMMUTABLE und darf hier nicht
-- vorkommen -- deshalb ueber status, nicht ueber laeuft_ab. Abgelaufene
-- Eintraege raeumt der Ablauf-Job weg.
CREATE UNIQUE INDEX IF NOT EXISTS raeume_ein_host ON ts.raeume (host_user)
  WHERE status <> 'zu';

COMMIT;
