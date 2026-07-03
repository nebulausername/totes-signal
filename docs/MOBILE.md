# Mobile-Unterstützung

Die Web-Version enthält ein Touch-Overlay (`web/index.html`), das nur auf
Touch-Geräten eingeblendet wird (`pointer: coarse` bzw. `ontouchstart`).

## Steuerung

| Element | Funktion | Technik |
| --- | --- | --- |
| Virtueller Joystick (links unten) | Bewegung | synthetische `keydown`/`keyup`-Events für W/A/S/D (30 % Deadzone, 8 Richtungen) |
| Drag auf dem Spielfeld | Umsehen | native Touch-Behandlung der FTEQW-Engine |
| Tap auf das Spielfeld | Feuern | native Touch-Behandlung (Tap = MOUSE1) |
| JUMP / RLD / USE / KNF / NADE | Springen, Nachladen, Benutzen, Messer, Granate | Key-Events auf die Standard-Binds (SPACE, R, E, V, G) |
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

- Tap auf das Spielfeld feuert immer (Engine-Verhalten) — beim reinen Umsehen
  per Drag wird beim Antippen kurz geschossen.
- Kein Multitouch-Konflikt-Handling zwischen Engine-Touch (Look) und zweitem
  Finger auf dem Canvas.
- Zukunft: Downloadgröße reduzieren (game.pk3 abspecken), PWA/Offline-Cache,
  Render-Auflösung auf Mobilgeräten drosseln.
