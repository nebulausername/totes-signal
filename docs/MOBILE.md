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

| Element | Funktion | Technik |
| --- | --- | --- |
| Virtueller Joystick (links unten) | Bewegung | synthetische `keydown`/`keyup`-Events für W/A/S/D (30 % Deadzone, 8 Richtungen) |
| Drag auf dem Spielfeld | Umsehen | native Touch-Behandlung der FTEQW-Engine (`touchmove`/`changedTouches`) |
| **FEUER** (großer Button) | Feuern | synthetischer `mousedown`/`mouseup` auf dem Canvas → nativer `MOUSE1`/`+attack`-Pfad; halten = Dauerfeuer. Touch ist auf dem Button gecaptured → kein Doppelfeuer mit Look-Drag |
| JUMP / RLD / USE / KNF / NADE | Springen, Nachladen, Benutzen, Messer, Granate | Key-Events auf die in `nzportable.cfg` (in `game.pk3`) gebundenen Tasten (SPACE, R, E, V, G) |
| **SPRT** | Sprinten | Key-Event `Shift` (keyCode 16 → `impulse 23`) |
| **DUCK** | Ducken/Stance | Key-Event `Alt` (keyCode 18 → `impulse 30`) |
| **NAD2** | Zweite Granate | Key-Event `4` (keyCode 52 → `impulse 33`) |
| AIM | Zielen (ADS) | Key-Event `Q`; Bind `q +button8` kommt aus `config/autoexec.cfg` (wird von `tools/build-progs.sh` ins `progs.pk3` gepackt) |
| SWAP | Waffe wechseln | Key-Event CTRL (`+button4`) |
| MENU | Pausemenü | Key-Event ESCAPE (tap) |
| ⛶ (links oben) | Vollbild + Landscape-Lock | Fullscreen API + `screen.orientation.lock('landscape')` |

## Implementierungsdetails

- Die Engine liest das Legacy-Feld `event.keyCode`; der `KeyboardEvent`-
  Konstruktor kann es nicht setzen, daher wird es per `Object.defineProperty`
  erzwungen. Events werden auf dem Canvas mit `bubbles: true` dispatcht.
- `viewport-fit=cover` + `env(safe-area-inset-*)` für Geräte mit Notch;
  `touch-action: none` und `overscroll-behavior: none` verhindern Scroll/Zoom.
- Der Ladehinweis nennt die Downloadgröße (~95 MB); der Browser cached die
  Dateien nach dem ersten Besuch.

## Bekannte Grenzen / Ideen

- **iframe-Fullscreen:** Wird die Seite im Cross-Origin-iframe des Shops
  eingebettet, sind `requestFullscreen()` und `screen.orientation.lock()` still
  blockiert, solange das **Shop-seitige** `<iframe>` nicht
  `allow="fullscreen; screen-wake-lock"` trägt. Standalone (`/zombie` direkt)
  funktioniert es. Fix im kaufmeinewebsite-Repo oder Standalone-Link nutzen.
- Der dedizierte **FEUER**-Button löst das frühere „Tap aufs Spielfeld feuert
  immer" — Look-Drag feuert nicht mehr versehentlich. (Native Tap-Feuerung
  bleibt möglich, ist aber nicht mehr nötig.)
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
- **M8 PWA/Offline:** 2-Tier-Service-Worker + Manifest + Icons — offen.
- **Settings-Panel:** Opacity/Scale/Links-Hand/Auto-Fire — offen.
