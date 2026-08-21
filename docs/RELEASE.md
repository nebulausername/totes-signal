# Release, Rollback, Notfall

> **Stand: 2026-08-21.** Phase 0 (Sicherheitsnetz) ist umgesetzt. Der
> Release-Store und `tools/deploy.sh` folgen in Phase 1 — bis dahin gilt der
> manuelle Weg unten. Diese Datei wird mit jeder Phase nachgezogen.

---

## Die Seite ist kaputt. Was jetzt?

**1. Webroot aus dem letzten Schnappschuss zurückholen**

```bash
ts=$(cat /var/backups/totersignal/LATEST)
tar -xzf "/var/backups/totersignal/webroot-totersignal-$ts.tgz" -C /var/www
ln -f /srv/totersignal/assets/game.pk3 /var/www/totersignal.de/nzp/game.pk3
```

Die Tarballs enthalten `game.pk3` **nicht** (sonst 97 MB statt 4 MB). Deshalb
die zweite Zeile — sie hängt die kanonische Kopie wieder ein.

**2. Prüfen**

```bash
curl -sS https://totersignal.de/version.json
curl -sSI https://totersignal.de/ | head -3
```

**3. War auch nginx im Spiel?**

```bash
ts=$(cat /var/backups/totersignal/LATEST)
cp "/var/backups/totersignal/nginx-$ts/totersignal.de" /etc/nginx/sites-available/
nginx -t && nginx -s reload
```

**`nginx -t` ist Pflicht, nicht Kür.** Eine kaputte Konfiguration nimmt neun
weitere vhosts mit — darunter die Hauptseite und die Statusseite.

**4. Die Demo-Kopie nachziehen**

```bash
rsync -a --delete --exclude='nzp/game.pk3' /var/www/totersignal.de/ /var/www/demo/zombie/
ln -f /srv/totersignal/assets/game.pk3 /var/www/demo/zombie/nzp/game.pk3
```

---

## Verbote

- **Niemals `pkill -f next`** — das killt acht fremde PM2-Anwendungen.
- **Niemals die Ports 25565–25578 anfassen** — dort läuft ein Minecraft-Netz.
- **Niemals `game.pk3` neu packen oder löschen.** Sie ist nicht reproduzierbar
  (siehe `/srv/totersignal/assets/game.pk3.provenance.txt`).
- **Kein COOP/COEP setzen** — bricht den iframe-Embed im Portfolio.

---

## Sicherungen

| Was | Wo |
| --- | --- |
| `game.pk3`, kanonisch, `chattr +i` | `/srv/totersignal/assets/game.pk3` |
| `game.pk3`, zweite Kopie | `/var/backups/totersignal/game.pk3.7a799699.bak` |
| Webroots (ohne `game.pk3`) | `/var/backups/totersignal/webroot-*-<ts>.tgz` |
| nginx-Konfigurationen | `/var/backups/totersignal/nginx-<ts>/` |
| Zeitstempel des letzten Satzes | `/var/backups/totersignal/LATEST` |

`game.pk3` ist unveränderlich gesetzt. Zum Ändern:

```bash
chattr -i /srv/totersignal/assets/game.pk3
# ... ändern ...
chattr +i /srv/totersignal/assets/game.pk3
```

Ohne dieses Wissen sieht ein `Operation not permitted` wie ein Rechteproblem
aus und kostet eine halbe Stunde.

---

## Bauen

```bash
bash tools/full-build.sh
```

Oder nur die Spiellogik, ohne Python-Werkzeugkette:

```bash
cd /root/projects/zombie-app && \
  PATH=/root/projects/zombie-app/.venv/bin:$PATH bash tools/build-progs.sh
```

**Der Build ist deterministisch** — bis auf einen eingebetteten Kompilierdatum-
String in den `.dat`-Dateien. Zwei Builds derselben Quelle unterscheiden sich
in genau zwei Bytes (`Compiled [JJJJ/MM/TT]`). Wer prüfen will, ob eine
ausgelieferte Fassung zur Quelle passt, vergleicht deshalb die Stringtabellen,
nicht die Hashes:

```bash
diff <(unzip -p A/progs.pk3 csprogs.dat | strings -n 6 | sort -u) \
     <(unzip -p B/progs.pk3 csprogs.dat | strings -n 6 | sort -u)
```

---

## Ausliefern (Stand heute: von Hand)

> Wird in Phase 1 durch `tools/deploy.sh` ersetzt (Release-Store +
> Symlink-Tausch + Dreifach-Bump-Prüfung + Rollback).

```bash
cd /root/projects/zombie-app
rsync -a --delete --exclude='nzp/game.pk3' web/ /var/www/totersignal.de/
ln -f /srv/totersignal/assets/game.pk3 /var/www/totersignal.de/nzp/game.pk3
rsync -a --delete --exclude='nzp/game.pk3' /var/www/totersignal.de/ /var/www/demo/zombie/
ln -f /srv/totersignal/assets/game.pk3 /var/www/demo/zombie/nzp/game.pk3
```

**Die Dreifach-Bump-Regel:** Jede Änderung an `web/index.html`, `web/sw.js`
oder den Icons verlangt, dass **alle drei** hochgezählt werden:

- `TS_BUILD` in `web/index.html`
- `SW_VERSION` in `web/sw.js`
- `web/version.json`

Sonst liefern installierte PWA-Clients eine veraltete Shell aus.

⚠️ **Solange B1 und B10 offen sind** (Masterplan v4, Phase 2), gilt:
`progs.pk3` wird 30 Tage gecacht und erreicht wiederkehrende Spieler nicht,
und jeder `SW_VERSION`-Bump löscht den 90-MB-Datencache des Spielers. **Vor
Phase 2 ist ein Deploy also entweder wirkungslos oder teuer.**

---

## Vor jedem Deploy

1. `git status` sauber.
2. `bash tools/full-build.sh` läuft durch.
3. Dreifach-Bump stimmt überein (bis `tools/preflight.sh` existiert: von Hand).
4. Schnappschuss ist frisch (siehe oben).
5. Nach dem Deploy: in einem **frischen Inkognito-Profil** prüfen — die
   Service-Worker-Caches täuschen sonst.
