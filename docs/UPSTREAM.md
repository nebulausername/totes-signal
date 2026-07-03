# Upstream-Pinning

Alle übernommenen Upstream-Stände, damit Builds reproduzierbar bleiben.

## nzp-team/quakec → `quakec/`

- Commit: `6613eb72359d1244e6034d31c3d07f78c1cf9b6f` (vendored 2026-07-03, `.git`/`.github` entfernt)
- Lokale Abweichungen von Upstream werden über die Git-Historie dieses Repos
  nachvollziehbar gehalten. Wichtigste Änderungen:
  - `bin/qc_hash_generator.py`: Fix für pandas ≥ 2 (Spalte ersetzen statt
    `csv_data.values` zu mutieren — Upstream-Code verliert die Hashes sonst
    stillschweigend und erzeugt nicht kompilierbares QC).

## nzp-team/nzp-team.github.io → `web/`

- Commit: `3fd682542a4669e7c540d6ba5719350ad6662d88` (Stand 2026-07-03)
- Übernommen: `index.html`, `default.fmf`, `ftewebgl.js`, `ftewebgl.wasm`, `nzportable.ico`

## game.pk3 (Assets, nicht in Git)

- Quelle: `https://raw.githubusercontent.com/nzp-team/nzp-team.github.io/main/nzp/game.pk3`
- sha256: `c7b812cebef842d7ad4d010ccb8b30f85ae92a81febf8d449642d5abb24ccb46`
- Größe: ~90 MB. Wird von `tools/fetch-assets.sh` geladen und verifiziert.
- Bei Upstream-Änderung: Datei prüfen, Hash hier **und** in
  `tools/fetch-assets.sh` aktualisieren.

## Toolchain

- FTEQCC: vendored Binaries in `quakec/bin/` (Upstream-Stand von quakec)
- Python-Abhängigkeiten des Hash-Generators: `pandas`, `fastcrc`, `colorama`
