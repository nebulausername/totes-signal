# Datenschutzerklärung — Entwurf

Das Impressum liegt zentral unter https://kaufmeinewebsite.de/legal#impressum;
der frühere Impressums-Entwurf ist deshalb nicht mehr Teil dieses Repos.


**Diese Dateien liegen bewusst NICHT in `web/`.** Der Deploy ist ein
`rsync --delete` über den gesamten Ordner: läge der Entwurf dort, ginge er beim
nächsten Ausliefern ungefragt live. Eine gesetzlich vorgeschriebene Seite, auf
der `ANSCHRIFT_FEHLT` steht, ist schlechter als gar keine — sie dokumentiert die
Lücke öffentlich.

## Was noch fehlt

Eine **ladungsfähige Anschrift**. Sie ist der einzige offene Punkt; alles andere
ist fertig. Gesucht sind: Name, Straße und Hausnummer, PLZ und Ort, E-Mail.
Eine Umsatzsteuer-ID gibt es bei einem nicht-kommerziellen Projekt nicht.

Die Platzhalter stehen als `<span class="luecke">ANSCHRIFT_FEHLT</span>`
(6× im Impressum, 4× in der Datenschutzerklärung):

```bash
grep -c ANSCHRIFT_FEHLT docs/rechtliches/*.html
```

## Was fertig ist

Die Beschreibung der Datenflüsse in `datenschutz.html` wurde am 2026-08-22
gegen den laufenden Code geprüft, nicht aus einer Vorlage abgeschrieben:

- Server-Protokolle: nginx, 14 Tage (`/etc/logrotate.d/nginx`, `rotate 14`, `daily`).
- Konto: anonym, ohne E-Mail, ohne Passwort (`server/src/routes/auth.js`).
- **Nur gekürzte IP** (`ipPrefix`, IPv4 /24, IPv6 /48) und ein **gepfefferter
  Streuwert** der Browserkennung (`uaHash`) — beides in `server/src/lib/tokens.js`.
- Genau ein Cookie, `__Host-ts_rt`, `HttpOnly`/`Secure`/`SameSite=Lax`,
  nur unter `/api/auth` (`COOKIE_OPTS`, auth.js).
- localStorage-Schlüssel einzeln aufgeführt, aus `web/index.html` erhoben.
- Fassung **1.0** — dieselbe Zeichenkette, die die Shell bei der Kontoanlage als
  `privacy_version` mitschickt. Ändert sich der Umfang der Verarbeitung, müssen
  **beide** Stellen zugleich hochgezählt werden.

## Wenn die Anschrift da ist

1. Platzhalter in beiden Dateien ersetzen.
2. Die drei Dateien nach `web/` verschieben
   (`impressum.html`, `datenschutz.html`, `rechtliches.css`).
3. In `web/index.html` verlinken — Fußzeile des Start-Gates und
   Konto-Overlay. Knopfregeln an die KLASSE hängen, nicht ans Overlay
   (Footgun 14).
4. `rechtliches.css` in `SHELL_ASSETS` in `web/sw.js` aufnehmen; die beiden
   HTML-Seiten laufen über den Catch-all.
5. **Dreifach-Bump** (`bash tools/bump-shell.sh`) — es ist eine
   Shell-Änderung.
6. Schnappschuss, ausliefern, in einem frischen Profil prüfen
   (`docs/RELEASE.md`).

## Kein Rechtsrat

Das ist ein sorgfältig recherchierter Entwurf, keine Rechtsberatung. Vor der
Veröffentlichung gehört er einmal von jemandem gelesen, der dafür haftet.
