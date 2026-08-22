import { q } from '../lib/db.js';

// Code -> Serveradresse. Oeffentlich lesbar, denn der Code ersetzt eine
// oeffentliche Adresse und ist kein Geheimnis.
//
// Es gibt KEINEN Schreibendpunkt. Eintraege legt ausschliesslich
// server/scripts/spielserver-anmelden.mjs an -- sonst waere die API ein
// Weiterleitungsdienst, in den jeder beliebige Adressen haengen kann.
export default async function routes(app) {
  app.get('/api/spiel/:code', async (req, reply) => {
    // Grosschreiben und Trennzeichen entfernen: der Spieler tippt den Code so,
    // wie er ihn gehoert hat -- mit oder ohne Bindestrich, gross oder klein.
    const roh = String(req.params.code || '').toUpperCase().replace(/[^A-Z2-9]/g, '');

    if (roh.length < 4 || roh.length > 12) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Code unbekannt.' } };
    }

    const r = await q(
      `SELECT adresse, name FROM ts.spielserver
        WHERE code = $1 AND (laeuft_ab IS NULL OR laeuft_ab > now())`, [roh]);

    if (!r.rows.length) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Code unbekannt oder abgelaufen.' } };
    }

    // Kurz cachen: ein Code zeigt waehrend einer Partie auf dieselbe Adresse,
    // aber ein abgelaufener soll nicht minutenlang weiterleben.
    reply.header('Cache-Control', 'public, max-age=20');
    return { adresse: r.rows[0].adresse, name: r.rows[0].name || null };
  });
}
