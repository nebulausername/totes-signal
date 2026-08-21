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

- **Referenzstand (unser):** sha256
  `7a79969908e60e668aebb9b791dc435b44917ae1766e69f7dfd35de163d27889`,
  93.750.380 Bytes.
- **Kanonische Kopie:** `/srv/totersignal/assets/game.pk3` (`chattr +i`),
  zweite Kopie unter `/var/backups/totersignal/`. Herkunft und Begründung:
  `game.pk3.provenance.txt` daneben.
- **Primärquelle:** `https://totersignal.de/nzp/game.pk3` — unsere eigene
  Auslieferung. Diese Bytes liegen ohnehin öffentlich, und nur sie sind der
  Referenzstand.

### Warum der Upstream-Pin nicht mehr gilt

- Historischer Pin: `c7b812cebef842d7ad4d010ccb8b30f85ae92a81febf8d449642d5abb24ccb46`
- Historische Quelle: `https://raw.githubusercontent.com/nzp-team/nzp-team.github.io/main/nzp/game.pk3`

**Upstream hat die Datei nach unserem Vendoring geändert.** Ein Neu-Download
liefert also nicht mehr unseren Stand. Belege dafür, dass unser Stand der
richtige ist: drei unabhängig zeitgestempelte Kopien (Repo 2026-07-11,
`/var/www/totersignal.de` 2026-07-10, `/var/www/demo/zombie` 2026-08-02) waren
byte-identisch, und das Spiel läuft damit nachweislich.

**Wir folgen Upstream hier nicht.** Ein Wechsel auf deren Fassung wäre eine
bewusste Entscheidung mit vollem Neu-Test, kein Wartungsschritt.

Upstream-Fassung zum Vergleich holen, ohne die eigene anzufassen:

```bash
bash tools/fetch-assets.sh --diff
```

> **Achtung, historischer Fehler:** `tools/fetch-assets.sh` hat bis 2026-08-21
> bei Hash-Abweichung `rm -f` auf die lokale Datei gerufen **und danach erst**
> neu geladen. Mit dem inzwischen falschen Pin hätte ein einziger Lauf die
> einzige gute Kopie vernichtet. Das Skript wurde umgebaut: es löscht diese
> Datei nie und überschreibt sie nur nach erfolgreicher Verifikation eines
> vollständigen Downloads.

## Toolchain

- FTEQCC: vendored Binaries in `quakec/bin/` (Upstream-Stand von quakec),
  Version 6202. **Der Compiler ist deterministisch** bis auf einen
  eingebetteten Datumsstring: zwei Builds derselben Quelle unterscheiden
  sich in genau zwei Bytes (`Compiled [JJJJ/MM/TT]` in jeder `.dat`).
  Zum Abgleich Quelle↔Auslieferung deshalb Stringtabellen vergleichen,
  nicht Hashes — siehe `docs/RELEASE.md`.
- Python-Abhängigkeiten des Hash-Generators: `pandas`, `fastcrc`, `colorama`
