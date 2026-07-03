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
- Zukunft (siehe Masterplan M8/M9): PWA/Offline-Cache (2-Tier-Service-Worker),
  Render-Auflösung drosseln (DPR-Cap ≤2, dynamische Auflösung), Settings-Panel
  (Opacity/Scale/Links-Hand/Auto-Fire), resumable `game.pk3`-Download.
