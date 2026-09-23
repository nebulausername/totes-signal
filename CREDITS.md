# Credits and attribution

TOTES SIGNAL is a fork of **Nazi Zombies: Portable (NZ:P)**. It would not exist without years of work by
the NZ:P Team. Thank you.

## NZ:P Team

From the original in-game credits (`quakec/source/menu/menu_cred.qc` at upstream commit `6613eb72`):

| Role | People |
| --- | --- |
| Modelling, maps | blubs, Ju[s]tice, Derped_Crusader, cypress, BCDeshiG, Revnova, Naievil, Stoohp, Jacob Giguere, Lexi |
| Programming | blubs, Jukki, DR_Mabuse1981, Naievil, cypress, Scatterbox, Peter0x44 |
| 2D art | Ju[s]tice, blubs, cypress, Derped_Crusader |
| Music | blubs, Marty P., cypress |
| Sound effects | blubs, Biodude, cypress |
| Special thanks | Spike, eukara, Shpuld, Crow_Bar, st1x51, fgsfdsfgs, MasterFeizz, Rinnegatamante, Azenn |

The in-game credits screen of the current build shows the TOTES SIGNAL additions and a line crediting NZ:P
and the FTEQW engine. The full list above goes back into the game with the next release (see the roadmap).

## Upstream projects

- **Game logic (QuakeC):** [nzp-team/quakec](https://github.com/nzp-team/quakec), GPL-2.0. Vendored into
  `quakec/` at the pinned commit in [docs/UPSTREAM.md](docs/UPSTREAM.md), with own changes on top
  (localisation, mobile markers, co-op, bots, fixes; see the git history). The source files keep their
  `Copyright (C) NZ:P Team` headers.
- **Engine:** [nzp-team/fteqw](https://github.com/nzp-team/fteqw), GPL-2.0, a fork of
  [FTEQW](https://fte.triptohell.info/) by Spike and contributors. `web/ftewebgl.js` and `web/ftewebgl.wasm`
  are unmodified builds from that repository; the complete corresponding source is available there.
- **Assets:** [nzp-team/assets](https://github.com/nzp-team/assets), shipped as `game.pk3` from
  [nzp-team/nzp-team.github.io](https://github.com/nzp-team/nzp-team.github.io). Unmodified, loaded at runtime,
  sha256-pinned, **not** part of this repository.
- **Web shell:** `web/index.html` and `web/default.fmf` started from
  [nzp-team/nzp-team.github.io](https://github.com/nzp-team/nzp-team.github.io) @ `3fd68254`.

## TOTES SIGNAL additions

Darius Hofman ([@nebulausername](https://github.com/nebulausername)), built with Claude Code as AI pair
programmer. What exactly was added is listed in the [README](README.md#mine). Menu backgrounds and the
death-screen key art are AI-generated.

## Not affiliated

This is an unofficial, non-commercial fan project. It is **not** affiliated with or endorsed by the NZ:P
Team, Activision, Treyarch or Microsoft. "Call of Duty" is a trademark of Activision Publishing, Inc.
