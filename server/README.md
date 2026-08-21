# TOTES SIGNAL — API

Bestenliste, Konten, Profil und Erfolge. Laeuft als PM2-Prozess auf
`127.0.0.1:3120`, nginx reicht `https://totersignal.de/api/` durch.

**Same-origin ist Absicht:** kein CORS, keine Fremdabhaengigkeit, und die
Daten bleiben auf dem eigenen EU-Server. Der Preis ist, dass Konten nur auf
`totersignal.de` funktionieren -- im Portfolio-iframe ist das ohnehin nicht
reparierbar (Passkeys sind origin-gebunden, Cookies waeren Drittanbieter).

## Betrieb

```bash
npm ci --omit=dev --prefix server
node server/scripts/migrate.mjs        # Migrationen anwenden
pm2 start server/pm2-ts-api.config.cjs && pm2 save
curl -fsS https://totersignal.de/api/health
```

Zugangsdaten liegen in `/etc/ts-api/.env` (chmod 600), **nie** im Repo.

## Grenzen, die bewusst so sind

- **Kein ORM.** Nummerierte `.sql`-Migrationen und ein kurzer Runner. Prisma
  braeuchte Codegen und eine grosse Query-Engine-Binary -- auf einer Maschine
  mit ~350 MiB freiem RAM und belegtem Swap die falsche Wahl.
- **Speicher ist die knappe Ressource.** `max_memory_restart: 260M`,
  `--max-old-space-size=192`, Pool auf 5 Verbindungen. Auf dem Server laufen
  daneben acht PM2-Apps, Postgres, zwei Redis und ein Minecraft-Netz.
- **Anti-Cheat hat eine harte Obergrenze.** Der Punktestand entsteht im
  Browser des Spielers. Wir koennen Gelegenheits-Manipulation teuer machen,
  nicht unmoeglich. Siehe `docs/` im Repo-Wurzelverzeichnis.
