import net from 'node:net';
import { q } from './db.js';

// Hausputz und Lebenszeichen.
//
// Beides laeuft IM API-Prozess und nicht als systemd-Timer: der Prozess laeuft
// ohnehin dauerhaft, die Arbeit ist winzig, und ein zusaetzlicher Dienst ist
// ein zusaetzliches Teil, das kaputtgehen und vergessen werden kann. Bei
// max_memory_restart 260M faellt ein Intervall mit einem DELETE nicht ins
// Gewicht.

const STUNDE = 60 * 60 * 1000;

// Raeume sind Betriebsdaten, keine Nutzerdaten: sie leben eine Partie lang.
// Ohne Aufraeumen waechst ts.raeume unbegrenzt -- die Liste filtert zwar
// richtig, aber die Tabelle nicht, und irgendwann raeumt es jemand unter
// Zeitdruck von Hand weg.
export async function raeumeAufraeumen(log) {
  try {
    const r = await q(
      `DELETE FROM ts.raeume
        WHERE (status = 'zu'  AND gesehen   < now() - interval '1 hour')
           OR (laeuft_ab < now() - interval '1 day')
        RETURNING code`);
    if (r.rows.length && log) log.info({ anzahl: r.rows.length }, 'Raeume aufgeraeumt');
    return r.rows.length;
  } catch (e) {
    if (log) log.warn({ err: e.message }, 'Aufraeumen der Raeume fehlgeschlagen');
    return 0;
  }
}

// Laeuft der WebRTC-Vermittler? Ohne ihn findet kein Koop mehr zusammen, und
// das waere sonst voellig unsichtbar: die Seite laedt, das Spiel startet, nur
// "SPIEL ANBIETEN" fuehrt ins Leere.
//
// Die Antwort geht in /api/health, AENDERT ABER DEN STATUSCODE NICHT: die API
// ist ohne Vermittler vollstaendig benutzbar (Solo, Bestenliste, Konten), und
// ein 503 dafuer waere gelogen. Wer den Vermittler ueberwachen will, prueft
// das Feld -- der vorhandene Monitor kann ein Schluesselwort.
export function vermittlerLebt(port = 27950, timeoutMs = 800) {
  return new Promise((fertig) => {
    const s = new net.Socket();
    let erledigt = false;
    const ende = (ok) => { if (erledigt) return; erledigt = true; s.destroy(); fertig(ok); };
    s.setTimeout(timeoutMs);
    s.once('connect', () => ende(true));
    s.once('timeout', () => ende(false));
    s.once('error',   () => ende(false));
    s.connect(port, '127.0.0.1');
  });
}

export function hausputzStarten(log) {
  // Einmal beim Start, danach stuendlich. unref(): ein Intervall darf das
  // Herunterfahren nicht aufhalten.
  raeumeAufraeumen(log);
  const t = setInterval(() => raeumeAufraeumen(log), STUNDE);
  if (t.unref) t.unref();
  return t;
}
