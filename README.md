# Endzeit: Untot (Arbeitstitel)

Ein modifizierter, rebrandeter und zweisprachiger (Deutsch/Englisch) Fork von
[Nazi Zombies: Portable](https://github.com/nzp-team/nzportable) (NZ:P) für den
Browser (WebGL), mit Fokus auf Mobile-Tauglichkeit.

> **Inoffizielles Fanprojekt.** Nicht affiliiert mit dem NZ:P-Team, Activision
> oder Microsoft. Nicht kommerziell. Siehe [docs/LEGAL.md](docs/LEGAL.md).

## Struktur

| Pfad       | Inhalt                                                            |
| ---------- | ----------------------------------------------------------------- |
| `quakec/`  | Spiellogik (QuakeC), Fork von [nzp-team/quakec](https://github.com/nzp-team/quakec) (GPL-2.0) |
| `web/`     | Web-Shell: `index.html`, FTEQW-WebGL-Engine (`ftewebgl.js/.wasm`), Manifest `default.fmf` |
| `web/nzp/` | Spieldaten zur Laufzeit: `game.pk3` (Assets, wird heruntergeladen) + `progs.pk3` (wird gebaut) |
| `tools/`   | Build-/Dev-Skripte                                                 |
| `docs/`    | Branding, Lokalisierung, Upstream-Pinning, Rechtliches             |

## Entwickeln

```bash
# Voraussetzungen: bash, python3 (pip install pandas fastcrc colorama), zip, curl
tools/assemble-web.sh   # Assets holen + QuakeC kompilieren
tools/serve.sh          # http://localhost:8080
```

Nur Spiellogik neu bauen: `tools/build-progs.sh` (erzeugt `web/nzp/progs.pk3`).

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) baut das Spiel und deployt
`web/` nach GitHub Pages. Dazu in den Repo-Einstellungen **Pages → Source:
GitHub Actions** aktivieren.

## Lizenz

Quellcode: [GPL-2.0](LICENSE). Basiert auf Arbeit des
[NZ:P-Teams](https://github.com/nzp-team) — siehe [CREDITS.md](CREDITS.md).
