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

---

## NZP-Durchgang, 2026-08-29 (gemessen, nicht geschaetzt)

Auftrag war: „alles entfernen, was mit NZP zu tun hat". Der Durchgang hat
gezeigt, dass die **spielersichtbare** Flaeche bereits sauber ist -- bis auf
genau eine Zeile, und die ist Pflicht.

| Klasse | Umfang | Entscheidung |
| --- | --- | --- |
| **Spielersichtbar** | **1 Zeile**: `menu_cred.qc:26` „Basiert auf dem Open-Source-Projekt Nazi Zombies: Portable" | **BLEIBT.** GPL-2.0 verlangt, dass Empfaenger erfahren, worauf die Software beruht. Sie zu streichen waere eine Lizenzverletzung -- und unehrlich gegenueber Leuten, deren Arbeit dieses Spiel ueberhaupt erst moeglich macht. |
| Kartenabzeichen im Menue | bereits „ORIGINAL" / „KLASSIK (2011)" | schon frueher rebranded, nichts zu tun |
| Uebersetzungen (`localization.qc`) | 0 Treffer | nichts zu tun |
| **GPL-Kopfzeilen** | **85 Quelldateien** `Copyright (C) 2021-2025 NZ:P Team` | **BLEIBEN.** Urheberrechtsvermerke zu entfernen ist genau das, was GPL-2.0 §1 verbietet. Nicht spielersichtbar. |
| **Pfade und Bezeichner im gepinnten `game.pk3`** | bsp-Namen `nzp_warehouse`, `nzp_warehouse2`, `nzp_xmas2` · Cvars `nzp_*` (~12) · Klassen `door_nzp`, `door_nzp_cost` · `game nzp` / `basegame nzp` / `nzportable.cfg` / Ordner `web/nzp/` | **BLEIBEN.** Sie sind Schluessel INNERHALB der Datei, die wir nicht neu packen duerfen (nicht reproduzierbar, Lizenz). Ein Umbenennen bricht das Laden der Karten -- ohne dass ein Spieler je einen dieser Namen zu sehen bekaeme. `runs.map_key` in der Datenbank haengt zusaetzlich daran. |
| **`com_protocolname` = `NZP-REBOOT-WEB`** | `client/main.qc:210`, `menu/main.qc:238`, nginx-`location`, Vermittler-Pfad | **BLEIBT -- und das ist eine Abwaegung, keine Bequemlichkeit.** Der Name ist der Kompatibilitaetsschluessel: aendert man ihn, kann kein nativer NZ:P-Client je unserem Server beitreten. Genau dieses Crossplay wurde ausdruecklich gewuenscht. Sichtbar ist der Name nur in den Entwicklerwerkzeugen des Browsers, nie im Spiel. **Wird natives Crossplay je aufgegeben, ist es eine Zeile plus eine nginx-`location`.** |
| Attribution in `CREDITS.md`, `docs/LEGAL.md`, `README.md` | mehrere | **BLEIBEN.** Dasselbe Argument wie beim Abspann. |

**Kurzfassung:** Im Spiel steht „NZP" an genau einer Stelle, und die gehoert
dorthin. Alles Uebrige ist entweder unsichtbar oder haelt das Spiel zusammen.

