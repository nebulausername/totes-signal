# Mobile-Unterstützung

Die Web-Version enthält ein Touch-Overlay (`web/index.html`), das nur auf
Touch-Geräten eingeblendet wird (`pointer: coarse` bzw. `ontouchstart`).

## Start & Ausrichtung (mobil)

- **Start-Gate „Tippen zum Spielen"** (`#mstart`): Auf Touch-Geräten startet die
  Engine nicht automatisch, sondern erst nach einem Tap. Dieser Tap ist die
  nötige User-Geste für **Vollbild**, **Landscape-Lock** und den **iOS-Audio-
  Unlock** in einem Rutsch. Zweisprachig (DE/EN) nach `navigator.language`.
- **Rotate-Hinweis** (`#rotate`): Im Hochformat wird „Bitte Gerät ins Querformat
  drehen" eingeblendet und das Touch-Overlay ausgeblendet (das Layout ist für
  Landscape ausgelegt).

## Steuerung

Das HUD ist nur **im Spiel** sichtbar (QuakeC→JS-Marker `TSUI:menu/game` via
`console.log`-Wrapper) — im Menü/der Lobby ist der Bildschirm frei. Sichtbar
sind **9 Controls** (Controls 2.0); alles Weitere steckt im ⚙-Sheet.

| Element | Funktion | Technik |
| --- | --- | --- |
| Virtueller Joystick (links, groß) | Bewegung | synthetische `keydown`/`keyup` für W/A/S/D (28 % Deadzone); **Pointer-Registry + Watchdog** re-adoptieren einen lebenden Finger nach Blur/Resize (M1-Fix) |
| Joystick **voll nach vorn** | Auto-Sprint | zeit-gedrosselte Shift-Taps (keyCode 16 → `impulse 23`); QC stoppt selbst (Stamina/Richtung); roter Stick-Glow |
| Joystick **lange halten** (350 ms, in der Deadzone) | Ducken/Haltung | Alt-Tap (keyCode 18 → `impulse 30`) + Haptik |
| Drag auf dem Spielfeld | Umsehen | native Touch-Behandlung der FTEQW-Engine (`touchmove`/`changedTouches`) |
| **FEUER** (großer Button) | Feuern | synthetischer `mousedown`/`mouseup` → nativer `MOUSE1`/`+attack`; halten = Dauerfeuer; AUTO-Modus (⚙) = Tap-Latch mit 110-ms-Puls |
| LADEN / AKTION / MESSER / GRANATE / SPRUNG | Nachladen, Benutzen, Messer, Granate, Springen | Key-Events auf die `nzportable.cfg`-Binds (R, E, V, G, SPACE) |
| ZIELEN | ADS | Key-Event `Q`; Bind `q +button8` aus `config/autoexec.cfg` |
| **AKTION** hebt sich hervor | zeigt an, dass etwas zu kaufen ist | Marker `TSUI:use:0\|1` aus `CSQC_UpdateView`; die Shell setzt die Klasse `.bereit`. Kein Blinken -- das zoege den Blick vom Spielfeld ab. Beim Spielstart zurueckgesetzt, sonst bliebe die Hervorhebung nach einem Tod an einer Kaufstelle haengen |
| WAFFE | Waffe wechseln | Key-Event CTRL (`+button4`) |
| MENÜ (oben rechts) | Pausemenü | Key-Event ESCAPE (tap) |
| ⚙ (oben links) | Schnell-Einstellungen | Sheet: AUTO-FEUER an/aus, HALTUNG, GRANATE WECHSELN (`impulse 25` via `tsCmd`), VOLLBILD, HILFE |

Einmaliges **Onboarding-Overlay** (localStorage `ts_seen_hints`) erklärt
Stick/Sprint/Ducken/Look/Feuer; über ⚙ → HILFE jederzeit wieder aufrufbar.
Es gibt dieselbe Karte am Rechner, dort mit der echten Tastenbelegung
(`pchint1..3`) — die Mechanik liegt seit 08/2026 plattformneutral in
`__ts_hints`, nur der Text hängt an der Plattform.
Nach dem Tod erscheint das **SIGNAL-VERLOREN-Overlay** (`TSUI:dead:<runden>`)
mit NOCHMAL (`restart`) und ZUR LOBBY (`disconnect` + `ts_maps`).

## Implementierungsdetails

- Die Engine liest das Legacy-Feld `event.keyCode`; der `KeyboardEvent`-
  Konstruktor kann es nicht setzen, daher wird es per `Object.defineProperty`
  erzwungen. Events werden **auf `document`** mit `bubbles: true` dispatcht —
  **nicht auf den Canvas**: die Engine haengt ihre Tastatur-Listener an beide
  (jeweils `capture`), ein Canvas-Dispatch lief also `document -> canvas` und
  wurde ZWEIMAL verarbeitet. Bei `+`-Binds fiel das nicht auf (Druecken und
  Loslassen sind idempotent), bei Umschaltern schon: der MENUE-Knopf oeffnete
  das Pausemenue und schloss es im selben Tipp, Haltung (`impulse 30`) sprang
  eine Stufe zu weit.
- `viewport-fit=cover` + `env(safe-area-inset-*)` für Geräte mit Notch;
  `touch-action: none` und `overscroll-behavior: none` verhindern Scroll/Zoom.
- Der Ladehinweis nennt die Downloadgröße (~95 MB); der Browser cached die
  Dateien nach dem ersten Besuch.

## Rückmeldung bei Schaden

Zwei Dinge, die vorher fehlten bzw. falsch lagen:

- **Woher kam der Treffer.** Die rote Überblendung sagt nur *dass*. Am Rechner
  dreht man sich schnell genug, um das selbst zu klären; auf dem Handy kostet
  eine halbe Drehung mehrere Wische. `CSQC_EVENT_HURTDIR` liefert den
  **Welt**-Winkel (nicht die Ablage zur Blickrichtung — der Bogen steht gut
  eine Sekunde, und in der Sekunde dreht man sich), `HUD_HurtDirection`
  zeichnet daraus einen Bogen am Bildrand. Knochenweiß auf dunkler Unterlage:
  die erste Fassung war signalrot und lag damit auf der roten Blendung, die
  im selben Moment den ganzen Schirm füllt.
- **Die Vibration hing am falschen Ereignis.** `TSUI:fx:r` ist der
  *Gamepad*-Rumble mit neun Quellen, sieben davon Waffenaktionen — das Handy
  ruckelte also bei jedem Schuss mit dem Treffer-Muster. Sie hängt jetzt an
  `TSUI:fx:d`, gesendet dort, wo Schaden entsteht. Siehe Footgun 27 in
  `CLAUDE.md`.

## Bekannte Grenzen / Ideen

- **iframe-Fullscreen:** Wird die Seite im Cross-Origin-iframe des Shops
  eingebettet, sind `requestFullscreen()` und `screen.orientation.lock()` still
  blockiert, solange das **Shop-seitige** `<iframe>` nicht
  `allow="fullscreen; screen-wake-lock"` trägt. Standalone (`/zombie` direkt)
  funktioniert es. Fix im kaufmeinewebsite-Repo oder Standalone-Link nutzen.
- Der dedizierte **FEUER**-Button löst das frühere „Tap aufs Spielfeld feuert
  immer" — Look-Drag feuert nicht mehr versehentlich. (Native Tap-Feuerung
  bleibt möglich, ist aber nicht mehr nötig.)
## Einstellungen sind vom Menue aus erreichbar

Im Optionsbildschirm steht auf Touch als erste Zeile **STEUERUNG & ANZEIGE**.
Sie druckt `TSUI:open:settings`, die Shell oeffnet daraufhin `#settingsui`.
Vorher lagen diese Einstellungen ausschliesslich hinter dem Zahnrad IM SPIEL --
wer die Empfindlichkeit oder den Linkshaender-Modus aendern wollte, musste erst
eine Runde starten.

Dieselbe Liste blendet auf Touch STEUERUNG (Maus/Tastenbelegung), GAMEPAD und
KONSOLE aus: ohne Tastatur haben sie nichts zu bieten.

**Achtung:** `#settingsui` war lange unsichtbar, weil es nicht im
Overlay-Sammelselektor stand (`position` fehlte, `z-index` wirkt auf statische
Elemente nicht). Siehe Footgun 14 in `CLAUDE.md`.

## Das rechte Panel steht nur, wo Inhalt ist

`Menu_DrawMapPanel()` wird von fast jedem Bildschirm gerufen und stuetzt auf dem
Desktop die Wertespalte. Auf Touch gibt es die nicht mehr -- der Streifen blieb
also meist LEER und schnitt nur das Hintergrundbild ab. Im direkten Vergleich sah
BARRIEREFREIHEIT (das ihn nie zeichnete) deutlich lebendiger aus.

Auf Touch zeichnet `Menu_DrawMapPanel()` deshalb nichts mehr. Wo wirklich Inhalt
im Panel steht -- Kartenvorschau, Lobby, Steckbriefe -- holt sich die jeweilige
Stelle die Unterlage selbst ueber `Menu_PanelHintergrund()`. Reine Textschirme
(Credits) nehmen `Menu_TextHintergrund()` ueber die volle Breite.

**Texteingaben sind auf Touch nur noch Anzeige.** Ohne Bildschirmtastatur waere
ein Eingabefeld ein Knopf, der nichts tut -- und im Koop-Bildschirm lag es ueber
der ganzen Zeile, verdeckte deren Beschriftung und der Text begann bei x=0, wo
ihn der Bildrand abschnitt. Den Decknamen setzt der Spieler in der Konto-Ansicht.

## Bewegung und Bild

- **Einblendung beim Bildschirmwechsel** (`Menu_RowEinblendung`): die Zeilen
  laufen von links ein, jede 28 ms spaeter als die darueber. Nur auf Touch.
  Zeitquelle ist `Menu_Uhr()` -- im Pausemenue steht `time` STILL (das Spiel ist
  pausiert), eine Animation dagegen erreicht ihr Ende nie und die Zeilen blieben
  dauerhaft am linken Rand abgeschnitten stehen. In CSQC laeuft `cltime`
  unabhaengig weiter.
- **Kartenzeilen tragen ihr Vorschaubild.** Eine Liste aus Grossbuchstaben sagt
  nichts ueber eine Karte, und der Platz links neben der Beschriftung lag brach.
- **Gesperrte Zeilen** (`Menu_GreyButton`) bekommen auf Touch dieselbe Flaeche
  wie normale, nur gedaempft -- sonst steht der Eintrag als schwebender Text
  zwischen Flaechen und sieht nach Zeichenfehler aus.

## Was das Menue auf Touch bewusst NICHT zeigt

Der Bildschirm BILD laesst auf Touch weg, was die Shell bereits besitzt oder was
im Browser wirkungslos ist: AUFLOESUNG und VOLLBILD (der Canvas bestimmt die
Groesse, Vollbild liegt im Zahnrad-Sheet), VSYNC (der Browser taktet ueber
requestAnimationFrame), GAMMA (die Shell setzt `gamma`/`v_contrastboost` und
ueberschreibt den Wert bei jedem Spielstart) sowie MAX FPS und PARTIKEL (der
Sparsam-Modus setzt `cl_maxfps` und `nzp_particles` in beide Richtungen).
Uebrig bleiben vier Zeilen, die dort wirklich hingehoeren.

**UEBERNEHMEN entfaellt auf Touch** (`Menu_SettingsFooter`): ein Knopf, den man
druecken MUSS, damit die Aenderung bleibt, ist auf dem Handy eine Falle -- und er
kostet eine der fuenf Zeilen. Gesichert wird beim Verlassen, mit derselben
Funktion. Im Bild-Bildschirm bewusst ohne `vid_restart`: das steckt in
`Menu_Video_ApplySettings` und startet im Browser das Videosystem neu, wofuer es
dort keinen Grund gibt.

**Regler werden auf Touch zu Steppern** (`[-] Wert [+]`, `Menu_StepButton`).
Eine deutsche Beschriftung wie GESAMTLAUTSTAERKE braucht fast die ganze
Zeilenbreite und lief dem Schieber ins Bild; ausserdem ist ein 15 px hoher Griff
mit dem Daumen nicht zu fassen. Schrittweite mindestens ein Zwanzigstel des
Bereichs -- SICHTFELD haette sonst 140 Tipps gebraucht.

## Trefferlage im Menue (1:1-Rendern)

Menue und Pausemenue positionieren den Cursor **absolut**. Der Touch-Pfad der
Engine uebergibt dabei rohe CSS-Koordinaten (`t.pageX`/`t.pageY`) an eine
Schnittstelle, die **Backbuffer-Pixel** erwartet; der Maus-Pfad daneben rechnet
korrekt mit `canvas.width/rect.width` um. Solange der Backbuffer groesser ist
als die CSS-Flaeche, landet jeder Fingertipp bei `1/eff` seines wahren Abstands
zur linken oberen Canvas-Ecke — bei `eff 1.5` auf zwei Dritteln.

Die Shell zwingt deshalb im Menuezustand auf `M9.eff = 1` (`__ts_renderMode`,
ausgeloest von `TSUI:menu` bzw. `TSUI:pause:1`); `startDynRes` haelt dann still
und merkt die Stufe in `M9.dyn`, die bei `TSUI:game` bzw. `TSUI:pause:0` wieder
gilt. Aufloesung ist im Menue belanglos. Regressionstest:
`tools/verify/specs/20-menu.spec.js`.

Ebenfalls dort gesetzt: `vid_conheight 480` — das Menue hat einen eigenen
virtuellen Raum und darf nicht den HUD-Preset des Spielers erben (mehrere
Zeichenroutinen in `m_menu.qc` sind hart auf 480 ausgelegt).

## Performance (mobil, M9)

Nur auf Touch-Geräten aktiv; Desktop-Browser rendern unverändert in voller
Auflösung.

- **DPR-Cap:** Die Engine rendert den Canvas-Backbuffer in `CSS-Größe ×
  window.devicePixelRatio`. Auf 3x-Phones sind das 9× Fragmente. Wir cappen
  **nur** `devicePixelRatio` über einen Getter (`Object.defineProperty`) → die
  engine-eigene `window.onresize` (samt korrektem `FTEC.evcb.resize` für die
  Input-Koordinaten) nutzt den gedeckelten Wert. Tier-Detect vor `begin()` via
  `hardwareConcurrency`/`deviceMemory`: **low 1.0 · mid 1.25 · high 1.5**.
- **Dynamische Auflösung:** rAF-Sampler mit EMA-fps; Stufen `cap … 0.66`. Runter
  bei `fps<50` (>2 s), hoch bei `fps>58` (>6 s), Hysterese gegen Oszillation.
  Umschalten ruft `M9.eff` + engine-eigene `window.onresize()` → Resize-Pfad
  bleibt konsistent (`canvas.width == CSS-Breite × eff`, verifiziert).

## Bekannte Grenzen / Ideen (Rest M9/M8)

- **Low-End-cvar-Profil (M9 B/C):** `nzp_particles/decals 0`, `r_dynamic/
  shadows 0`, `r_fastsky 1`, `cl_maxfps 60` — nur per **Repack** setzbar
  (`ftewebgl.js` exponiert keinen JS-Konsolen-Hook) und muss web/touch-gated in
  `main.qc` erfolgen (sonst leidet der Desktop-Browser); cvar-Namen vorher in der
  Live-Konsole gegen diesen Build prüfen.
- **Resumable `game.pk3` (M9 D):** Server unterstützt Range (`Accept-Ranges:
  bytes`, 206 verifiziert); der Client-Loader müsste den Engine-Fetch übernehmen
  und via `Module.files` einspeisen — offen.
- **Settings-Panel:** Opacity/Scale/Links-Hand/Auto-Fire — offen.

## PWA / Offline (M8, fertig)

Installierbare, offline-fähige PWA-Schicht komplett unter `/zombie/` (alles
relativ → funktioniert auch auf GitHub Pages + local dev). **Kein COOP/COEP.**

- `web/manifest.webmanifest`: standalone, `orientation: landscape`, Theme
  `#6e0d00`, 3 Icons (192/512/maskable), `scope`/`start_url` relativ (`./`).
- `web/icons/`: gerendertes rot/schwarzes Skull-Icon (Quelle `icon-source.svg`).
- `web/sw.js` — Zwei-Tier-Cache (`SW_VERSION` bumpen bei Engine/pk3-Änderung):
  - `totes-shell-vN (SW_VERSION in web/sw.js)`: ~5,4-MB-Boot-Shell wird beim `install` precached
    (index.html, ftewebgl.js/.wasm, default.fmf, manifest, icons, favicon).
    **`game.pk3` NICHT im Install** — ein Fehlbyte würde ihn scheitern lassen.
  - `totes-data-vN`: `nzp/*.pk3` **cache-first, lazy put-on-miss** (nach dem
    ersten Spiel offline verfügbar).
  - Navigation **network-first** (Rebrand-Updates shippen), Shell-Assets
    cache-first (instant offline boot), **Range-Requests → Netz-Bypass** (Cache
    API kann kein 206). Engine-eigene CacheStorage bleibt unangetastet.
- `index.html`: Manifest/apple-touch/`apple-mobile-web-app-*`-Meta, guarded
  SW-Register (`load`-Event), `beforeinstallprompt`-Affordance (INSTALL-Button
  erst nach Load, weg bei `appinstalled`/Spielstart). Verifiziert (headless):
  SW-Scope exakt `/zombie/`, Shell gecacht, **Offline-Reload bootet die Shell**.
