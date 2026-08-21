// PM2-Eintrag fuer die TOTES-SIGNAL-API.
//
// Folgt den Konventionen der anderen Apps auf diesem Server
// (/root/demo-src/pm2-demos.config.cjs): nur auf 127.0.0.1 lauschen, nach
// draussen geht ausschliesslich nginx.
//
// min_uptime + exp_backoff_restart_delay sind nicht optional: ohne sie laeuft
// ein Prozess, der schon beim Start scheitert, in eine stille Endlosschleife.
//
// Speichergrenzen sind hier eng gesetzt, und zwar mit Absicht. Auf der Maschine
// laufen daneben acht PM2-Apps, PostgreSQL, zwei Redis-Instanzen und ein
// Minecraft-Netz mit vier JVMs; frei sind rund 350 MiB bei bereits belegtem
// Swap. Gemessen braucht dieser Prozess im Leerlauf ~75 MB.
module.exports = {
  apps: [{
    name: 'ts-api',
    cwd: '/root/projects/zombie-app/server',
    script: './src/server.js',
    node_args: '--max-old-space-size=192',
    env: {
      NODE_ENV: 'production',
      TS_ENV_FILE: '/etc/ts-api/.env',
    },
    max_memory_restart: '260M',
    min_uptime: '20s',
    max_restarts: 10,
    exp_backoff_restart_delay: 200,
    kill_timeout: 5000,
    autorestart: true,
    watch: false,
  }],
};
