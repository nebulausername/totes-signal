# Branding

Aktueller Name: **„Endzeit: Untot"** (Arbeitstitel, leicht änderbar).
Weitere Kandidaten waren: „Projekt Untot", „Zombiewelle", „Letzte Runde".

## Name ändern — genau diese Stellen anpassen

1. **`quakec/source/shared/branding.qc`** — zentrale Defines
   (`GAME_NAME`, `GAME_DEFAULT_CHAPTER`, `GAME_CREDITS_BLURB`).
   Danach `tools/build-progs.sh` ausführen.
2. **`web/index.html`** — `<title>`, `og:title`, `og:description`.
3. **`web/default.fmf`** — Zeile `name "…"` (Anzeigename der Engine).
4. **`web/favicon.ico`** — Icon (generiert; beliebig ersetzbar).
5. **`README.md`** — Projekttitel.

Bewusst **nicht** geändert:

- `game nzp` / `basegame nzp` in `default.fmf` und der Ordnername
  `web/nzp/` — interner Verzeichnisname, für Spieler unsichtbar;
  eine Umbenennung bricht `mainconfig`/Pfad-Annahmen ohne Nutzen.
- GPL-Copyright-Header „NZ:P Team" in `quakec/source/**` — Urheberangaben
  bleiben aus Lizenzgründen erhalten.
- Map-Herkunfts-Badges „NZ:P BETA (2011)" / „NZ:P ORIGINAL" im Map-Menü —
  faktische Quellenangabe der Karten.
- Social-Badges im Hauptmenü (YouTube/Bluesky/Patreon/Docs des NZ:P-Teams) —
  bewusste Credits an Upstream. Bei Bedarf in
  `quakec/source/menu/menu_main.qc` (`Menu_SocialBadge`-Zeilen) anpassen.

## Bekannte Grenzen

- Der Engine-Bootlog gibt weiterhin `Starting Nazi Zombies: Portable` und
  `Engine Version: NZ:P git-…` aus (nur in der Browser-Konsole sichtbar).
  Das steckt im vorkompilierten `ftewebgl.wasm`; Änderung erfordert einen
  Engine-Rebuild von nzp-team/fteqw (bewusst out of scope).
- `gfx/lscreen/lscreen.png` (generischer Ladescreen in `game.pk3`) könnte
  Upstream-Artwork mit Schriftzug enthalten — bei Bedarf ersetzen
  (Overlay-pk3 oder eigenes Asset-Release).
