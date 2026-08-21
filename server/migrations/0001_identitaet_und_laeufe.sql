-- =====================================================================
-- 0001 -- Identitaet, Profil, Sitzungen, Laeufe
-- =====================================================================
-- Entwurfsgrundsaetze, die sich durch das ganze Schema ziehen:
--
--   1. Laeufe sind unveraenderliche Tatsachen. Bestwerte werden daraus
--      ABGELEITET und nicht gespeichert -- beim Zusammenfuehren zweier Konten
--      gibt es dadurch schlicht keinen Konflikt aufzuloesen.
--   2. XP wird nie aus einem Zaehler gelesen, sondern aus ts.xp_events neu
--      berechnet. Ein manipulierter Zaehler kommt so nirgends durch.
--   3. Was auf einer Bestenliste zaehlt, steht in EINER Funktion
--      (ts.run_is_eligible). Eine Regelaenderung ist damit eine Stelle.

CREATE TYPE ts.user_status AS ENUM ('active', 'merged', 'banned', 'deleted');

CREATE TABLE ts.users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status           ts.user_status NOT NULL DEFAULT 'active',
  -- anonym-zuerst: bleibt true, bis ein Passkey oder eine bestaetigte E-Mail
  -- angehaengt wird. Die anonymen Daten wandern dabei NICHT -- der anonyme
  -- Spieler IST bereits ein vollwertiger Datensatz.
  is_anonymous     boolean NOT NULL DEFAULT true,
  locale           text NOT NULL DEFAULT 'de',
  -- Art. 8 DSGVO: Selbstauskunft mit Zeitstempel, das uebliche
  -- verhaeltnismaessige Mittel fuer einen nicht-kommerziellen Dienst.
  age_confirmed_at timestamptz,
  privacy_version  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  merged_into      uuid REFERENCES ts.users(id) ON DELETE SET NULL,
  merged_at        timestamptz,
  deleted_at       timestamptz,
  CONSTRAINT users_merge_konsistent CHECK ((status = 'merged') = (merged_into IS NOT NULL)),
  CONSTRAINT users_kein_selbst_merge CHECK (merged_into IS DISTINCT FROM id)
);

-- Fuer den Aufraeumlauf: anonyme Konten ohne Aktivitaet verfallen nach 24
-- Monaten (so steht es in der Datenschutzerklaerung).
CREATE INDEX users_gc_idx ON ts.users (last_seen_at)
  WHERE is_anonymous AND status = 'active';
CREATE INDEX users_merged_into_idx ON ts.users (merged_into) WHERE merged_into IS NOT NULL;

-- XP-Kurve als IMMUTABLE-Funktion: sie laesst sich spaeter austauschen, ohne
-- eine einzige Zeile Daten zu migrieren.
CREATE OR REPLACE FUNCTION ts.level_for_xp(xp bigint) RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT GREATEST(1, LEAST(100, floor(power(GREATEST(xp, 0)::numeric / 250, 0.6))::int + 1)) $$;

CREATE TABLE ts.profiles (
  user_id            uuid PRIMARY KEY REFERENCES ts.users(id) ON DELETE CASCADE,
  display_name       citext NOT NULL,
  -- Was tatsaechlich per `seta name` in die Engine geschoben wird. Die
  -- Spielschrift kann nur ASCII 33..126 -- Umlaute werden transliteriert,
  -- '|' ist der Marker-Trennzeichen und '^' leitet Quake-Farbcodes ein.
  display_name_ascii text NOT NULL,
  title_id           text,
  badge_ids          text[] NOT NULL DEFAULT '{}',
  xp_total           bigint NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  level              integer GENERATED ALWAYS AS (ts.level_for_xp(xp_total)) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT name_laenge  CHECK (char_length(display_name) BETWEEN 3 AND 20),
  CONSTRAINT name_ascii   CHECK (display_name_ascii ~ '^[!-~]{3,20}$'),
  CONSTRAINT name_sauber  CHECK (display_name_ascii !~ '[|^"'';]')
);
CREATE UNIQUE INDEX profiles_name_uq ON ts.profiles (display_name);
CREATE INDEX profiles_xp_idx ON ts.profiles (xp_total DESC);

CREATE TABLE ts.sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES ts.users(id) ON DELETE CASCADE,
  -- Rotationsfamilie: wird ein bereits ersetztes Token noch einmal vorgelegt,
  -- ist es gestohlen -> die ganze Familie wird widerrufen.
  family_id          uuid NOT NULL,
  parent_id          uuid REFERENCES ts.sessions(id) ON DELETE SET NULL,
  refresh_token_hash bytea NOT NULL UNIQUE,   -- sha256, nie das Token selbst
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_used_at       timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  revoked_at         timestamptz,
  revoked_reason     text,
  -- Datensparsamkeit: nur ein IP-PRAEFIX (/24 bzw. /48) und ein gepfefferter
  -- Hash des User-Agent. Nie die volle Adresse, nie die Zeichenkette.
  ip_prefix          inet,
  ua_hash            bytea,
  is_anon_bootstrap  boolean NOT NULL DEFAULT false
);
CREATE INDEX sessions_user_idx   ON ts.sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX sessions_family_idx ON ts.sessions (family_id);
CREATE INDEX sessions_gc_idx     ON ts.sessions (expires_at);

CREATE TYPE ts.run_status AS ENUM ('open', 'verified', 'flagged', 'rejected', 'abandoned');

CREATE TABLE ts.runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES ts.users(id) ON DELETE CASCADE,
  original_user_id  uuid REFERENCES ts.users(id) ON DELETE SET NULL,  -- vor einem Merge
  status            ts.run_status NOT NULL DEFAULT 'open',

  -- Konfiguration, beim START erfasst und beim Abschluss gegengeprueft.
  -- map_key ist der BSP-Name, NICHT der Anzeigename: letzterer ist die erste
  -- Zeile aus maps/<bsp>.txt, also unser deutscher Text -- aendert er sich,
  -- zerfiele die Bestenliste in zwei Eintraege.
  map_key           text NOT NULL,
  map_pretty        text,
  gamemode          smallint NOT NULL DEFAULT 0,
  difficulty        smallint NOT NULL DEFAULT 0,
  start_round       smallint NOT NULL DEFAULT 0,
  flags             integer  NOT NULL DEFAULT 0,   -- Bit0 headshotonly, 1 magic aus, 2 fastrounds, 3 koop, 4 cheats
  player_count      smallint NOT NULL DEFAULT 1,
  aim_assist        smallint NOT NULL DEFAULT 1,   -- hebt das Niveau -> muss trennbar bleiben

  -- Ergebnis
  rounds            integer, score bigint, kills integer, headshots integer,
  downs integer, revives integer,
  in_game_secs      integer,
  wall_secs         integer,                       -- SERVER-Uhr, nicht der Client

  started_at        timestamptz NOT NULL DEFAULT now(),
  submitted_at      timestamptz,
  shell_build       text,
  run_token_hash    bytea NOT NULL,
  ip_prefix         inet,

  cheat_flag        boolean NOT NULL DEFAULT false,
  heartbeat_count   integer NOT NULL DEFAULT 0,
  max_hb_round      integer NOT NULL DEFAULT 0,
  round_wraps       smallint NOT NULL DEFAULT 0,   -- rounds kommt als WriteByte -> Ueberlauf bei 256
  plausibility      jsonb NOT NULL DEFAULT '{}',
  reject_reason     text,
  review_note       text,

  CONSTRAINT runs_nicht_negativ CHECK (
    coalesce(rounds,0) >= 0 AND coalesce(score,0) >= 0 AND coalesce(kills,0) >= 0 AND
    coalesce(headshots,0) >= 0 AND coalesce(downs,0) >= 0 AND coalesce(revives,0) >= 0),
  CONSTRAINT runs_kopf_le_kills CHECK (coalesce(headshots,0) <= coalesce(kills,0)),
  CONSTRAINT runs_abgeschlossen_vollstaendig CHECK (
    status = 'open' OR (rounds IS NOT NULL AND score IS NOT NULL AND submitted_at IS NOT NULL))
);

-- Was auf einer Bestenliste erscheinen darf -- EINE Definition.
CREATE OR REPLACE FUNCTION ts.run_is_eligible(r ts.runs) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT r.status = 'verified'
       AND NOT r.cheat_flag
       AND r.start_round <= 1        -- sv_startround 40 ist kein Rekord
       AND (r.flags & 16) = 0        -- Cheats waren aktiv
       AND r.player_count = 1 $$;    -- Koop laesst sich pro Spieler nicht pruefen

CREATE INDEX runs_board_rounds ON ts.runs
  (map_key, difficulty, gamemode, rounds DESC, in_game_secs ASC)
  WHERE status = 'verified' AND NOT cheat_flag AND start_round <= 1 AND player_count = 1;
CREATE INDEX runs_board_score ON ts.runs
  (map_key, difficulty, gamemode, score DESC, submitted_at ASC)
  WHERE status = 'verified' AND NOT cheat_flag AND start_round <= 1 AND player_count = 1;
CREATE INDEX runs_board_recent ON ts.runs (submitted_at DESC, score DESC)
  WHERE status = 'verified' AND NOT cheat_flag AND start_round <= 1 AND player_count = 1;
CREATE INDEX runs_user_idx   ON ts.runs (user_id, submitted_at DESC);
CREATE INDEX runs_open_idx   ON ts.runs (started_at) WHERE status = 'open';
CREATE INDEX runs_review_idx ON ts.runs (submitted_at DESC) WHERE status = 'flagged';

CREATE TABLE ts.run_heartbeats (
  run_id       uuid NOT NULL REFERENCES ts.runs(id) ON DELETE CASCADE,
  seq          integer NOT NULL,
  round        integer NOT NULL,
  score        bigint  NOT NULL,
  kills        integer NOT NULL,
  headshots    integer NOT NULL,
  in_game_secs integer NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, seq)
);
CREATE INDEX run_hb_gc ON ts.run_heartbeats (received_at);

CREATE TABLE ts.xp_events (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES ts.users(id) ON DELETE CASCADE,
  run_id     uuid REFERENCES ts.runs(id) ON DELETE SET NULL,
  delta      integer NOT NULL,
  reason     text NOT NULL,           -- 'run' | 'achievement' | 'merge' | 'admin'
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Macht den Abschluss eines Laufs idempotent: ein doppelt eingereichter Lauf
-- kann keine XP zweimal gutschreiben.
CREATE UNIQUE INDEX xp_run_einmalig ON ts.xp_events (run_id) WHERE reason = 'run';
CREATE INDEX xp_user_idx ON ts.xp_events (user_id, created_at DESC);

CREATE TABLE ts.audit_log (
  id           bigserial PRIMARY KEY,
  at           timestamptz NOT NULL DEFAULT now(),
  actor        text NOT NULL,
  action       text NOT NULL,
  subject_type text,
  subject_id   text,
  detail       jsonb
);
CREATE INDEX audit_at_idx ON ts.audit_log (at DESC);
