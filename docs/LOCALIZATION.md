# Lokalisierung (DE/EN)

## Funktionsweise

- Cvar **`cl_language`**: `0` = Englisch (Standard), `1` = Deutsch.
  Wird von `Localization_Init()` (aufgerufen in `m_init` und `CSQC_Init`)
  einmalig per `seta` registriert — die Wahl des Spielers wird in der
  `config.cfg` gespeichert und nie überschrieben.
- **Umschalter im Spiel**: Einstellungen → „LANGUAGE: ENGLISH" /
  „SPRACHE: DEUTSCH" (`quakec/source/menu/menu_opts.qc`).
- **`T(string)`** in `quakec/source/shared/localization.qc`: bekommt den
  englischen Originaltext und liefert die Übersetzung der aktiven Sprache.
  Unbekannte Strings fallen automatisch auf Englisch zurück — dadurch kann
  schrittweise übersetzt werden, ohne dass etwas kaputtgeht.
- Format-Strings laufen ebenfalls durch `T()`:
  `sprintf(T("You Survived %d Rounds"), rounds)`.

## Neuen String übersetzen

1. Call-Site finden und den Literal-String mit `T(...)` umschließen.
   (Datei muss in einem Modul liegen, das `localization.qc` einbindet:
   `csqc.src` und `menu.src` tun das; SSQC bisher nicht.)
2. In `localization.qc` einen `case`-Eintrag ergänzen.
3. `tools/build-progs.sh` ausführen.

## Wichtig: keine Umlaute!

Der Quake-Bitmap-Zeichensatz (`gfx/charset.tga`) enthält **keine Umlaute/ß** —
sie rendern als Fehlerkästchen. Deshalb transliterieren: `ae`, `oe`, `ue`,
`ss` (z. B. „HAUPTMENUE", „ZURUECK"). Echte Umlaute würden einen eigenen
Zeichensatz oder eine TTF-Font-Konfiguration der Engine erfordern (Backlog).

## Abgedeckt (Stand M3)

Hauptmenü, Einstellungs-Hauptseite, Pausenmenü (inkl. Bestätigungsdialoge),
Ladescreen (Tipps + Meldungen), HUD: Kauf-/Interaktionsprompts (`HUD_Useprint`),
Runden-Anzeige, Game Over, Zuschauermodus, Erfolgs-Banner, Revive-Meldungen.

## Noch offen (Backlog)

- Untermenüs: Video/Audio/Steuerung/Gamepad/Bindings/Barrierefreiheit,
  Koop-Menüs, Charakter-Bios, Map-Auswahl (`menu_maps.qc`, ~150+ Strings).
- Serverseitige Texte (SSQC-Centerprints in `server/rounds.qc` u. a.) —
  brauchen Message-ID-Übersetzung auf Client-Seite oder SSQC-Einbindung
  von `localization.qc` (dann überträgt aber der Server die Sprache).
- Waffennamen (`shared/weapon_stats.qc`) — Eigennamen, bewusst englisch.
- In Texturen gebackener Text (z. B. „Max Ammo"-Pickup, Kreide-Waffen,
  Perk-Logos) — bleibt englisch, wäre nur per Asset-Austausch änderbar.
