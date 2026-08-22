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
chattr -i /srv/totersignal/assets/game.pk3
ln -f /srv/totersignal/assets/game.pk3 /var/www/totersignal.de/nzp/game.pk3
chattr +i /srv/totersignal/assets/game.pk3
```

Die Tarballs enthalten `game.pk3` **nicht** (sonst 97 MB statt 4 MB). Deshalb
die `ln`-Zeile — sie hängt die kanonische Kopie wieder ein.

⚠️ **Ohne das `chattr -i` davor schlägt genau diese Zeile fehl.** Die kanonische
Datei ist unveränderlich gesetzt, und ein Hardlink auf eine solche Datei ändert
ihren Link-Zähler — der Kernel lehnt das mit `Operation not permitted` ab. Das
sieht nach einem Rechteproblem aus, ist aber keins (Footgun 4). Am 2026-08-22
nachgemessen: `ln -f` scheitert, nach `chattr -i` gelingt es. Die alte Fassung
dieser Datei nannte das `chattr` nicht — nach einem Rollback hätte im Webroot
**gar keine** `game.pk3` gelegen und das Spiel wäre nicht gestartet.

**2. Prüfen**

```bash
curl -sS https://totersignal.de/version.json
curl -sSI https://totersignal.de/ | head -3
```

**3. War auch nginx im Spiel?**

```bash
ts=$(cat /var/backups/totersignal/LATEST)
cp "/var/backups/totersignal/nginx-$ts/sites-available/totersignal.de" /etc/nginx/sites-available/
cp "/var/backups/totersignal/nginx-$ts/snippets/"*.conf /etc/nginx/snippets/
nginx -t && nginx -s reload
```

Die Header liegen in `snippets/` und **nicht** im vhost — wer nur die vhosts
zurückspielt, hat die Sicherheits-Header verloren, ohne dass etwas kaputtgeht.
Es fällt erst im Harness auf (`00-headers.spec.js`).

**`nginx -t` ist Pflicht, nicht Kür.** Eine kaputte Konfiguration nimmt neun
weitere vhosts mit — darunter die Hauptseite und die Statusseite.

**4. Die Demo-Kopie nachziehen**

```bash
rsync -a --delete --exclude='nzp/game.pk3' /var/www/totersignal.de/ /var/www/demo/zombie/
```

`game.pk3` bleibt dabei stehen — `--exclude` heißt, dass rsync sie weder
überträgt noch löscht. Nur wenn sie im Ziel fehlt, braucht es die
`chattr -i` / `ln -f` / `chattr +i`-Folge von oben.

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

### Schnappschuss anlegen (vor JEDEM Deploy)

Bis 2026-08-22 stand hier nur, wie man einen Schnappschuss **zurückspielt** —
nicht, wie man einen anlegt. Genau daran ging es schief: ein von Hand gebauter
Tarball hatte `./index.html` statt `totersignal.de/index.html`, und das
dokumentierte `tar -xzf … -C /var/www` hätte den Webroot damit über `/var/www`
ausgeschüttet. **Das Präfix ist Teil des Vertrags.**

```bash
ts=$(date +%Y%m%d-%H%M%S); d=/var/backups/totersignal
tar -czf "$d/webroot-totersignal-$ts.tgz" -C /var/www --exclude='totersignal.de/nzp/game.pk3' totersignal.de
tar -czf "$d/webroot-demo-zombie-$ts.tgz" -C /var/www/demo --exclude='zombie/nzp/game.pk3' zombie
mkdir -p "$d/nginx-$ts" && cp -r /etc/nginx/sites-available /etc/nginx/snippets "$d/nginx-$ts/"
echo "$ts" > "$d/LATEST"
```

⚠️ **`snippets/` gehört mit dazu.** Die erste Fassung dieses Rezepts sicherte
nur `sites-available` — und die Sicherheits-Header (inklusive der CSP) stehen
in `snippets/ts-headers-canonical.conf`. Ein Rollback hätte die vhosts
zurückgeholt und die Header still verloren.

Prüfen, dass das Präfix stimmt und `game.pk3` draußen ist:

```bash
tar -tzf "/var/backups/totersignal/webroot-totersignal-$(cat /var/backups/totersignal/LATEST).tgz" | head -3
```

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
rsync -a --delete --exclude='nzp/game.pk3' /var/www/totersignal.de/ /var/www/demo/zombie/
```

**Kein `ln -f` im normalen Deploy.** `--exclude='nzp/game.pk3'` lässt die
vorhandene Kopie in Ruhe; sie muss also gar nicht neu eingehängt werden. Die
frühere Fassung rief `ln -f` trotzdem auf, und das brach jeden Deploy mitten
im Ablauf ab (`Operation not permitted`, siehe Rollback oben). In beiden
Webroots liegt heute eine **eigene Kopie**, kein Hardlink — am 2026-08-22
geprüft: drei verschiedene Inodes, Link-Zähler je 1, sha256 aller drei
identisch (`7a799699…`).

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
