// Der Vermittler-Vertrag, gemessen am 2026-08-24 gegen den gepinnten Build.
//
// Drei Eigenschaften werden hier festgehalten, weil jede von ihnen still
// brechen kann und keine davon im Spiel sichtbar wird:
//
//   1. SOLO SPRICHT MIT NIEMANDEM. Mit sv_public 0 entsteht keine
//      Verbindung nach draussen. Das ist eine Datenschutz-Zusage, keine
//      Feinheit -- ein kuenftiges `sv_port_rtc "/"` im Solo-Pfad wuerde jeden
//      Einzelspieler an einen Vermittler melden, ohne dass es jemand merkt.
//   2. ANBIETEN GEHT. Der Browser KANN Gastgeber sein; die gegenteilige
//      Behauptung in menu_coop.qc stimmt fuer diesen Build nicht.
//   3. GENAU EIN RAUM JE RUNDE. sv_port_rtc steht ab Werk auf "/" und
//      erzeugt sonst eine zweite Registrierung mit Zufallsraum -- gemessen:
//      "Listening on /NZP-REBOOT-WEB/1126" neben dem gewollten Raum.
//
// Die Protokollkennung ist NZP-REBOOT-**WEB**, nicht NZP-REBOOT. Der
// Web-Build haengt das Suffix an. Daran haengt die nginx-Regel des eigenen
// Vermittlers -- und die Vermutung, dass native Clients einen anderen
// Namensraum benutzen und deshalb NICHT ueber den Vermittler erreichbar sind.
import { test, expect } from '@playwright/test';
import { booten, SOLO_START } from '../lib/boot.js';

const RAUM = 'tssonde1';
const NAMENSRAUM = '/NZP-REBOOT-WEB/';

test.describe('@mp Vermittler-Vertrag', () => {
  // Ueber den PROJEKTNAMEN in beforeEach -- die Kurzform test.skip(fn)
  // bekommt kein testInfo (dieselbe Falle wie in 00-headers).
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop',
      'reine Netzmessung -- genau einmal, nicht je Browser');
  });
  test.setTimeout(300_000);

  test('Solo schweigt, Anbieten meldet genau einen Raum', async ({ page }) => {
    const sockets = [];
    const marker = [];
    const listening = [];

    page.on('websocket', (ws) => sockets.push(ws.url()));
    page.on('console', (m) => {
      const t = m.text().trim();
      if (t.includes('TSUI:')) marker.push(t);
      if (t.includes('Listening on')) listening.push(t);
    });
    const lief = () => marker.some((z) => z.includes('TSUI:rstart:'));

    await booten(page);

    // ---------- 1. Solo, genau wie das Menue ihn startet ----------
    await page.evaluate((pre) => window.tsCmd(pre + 'map ndu\n'), SOLO_START);
    await page.waitForTimeout(25_000);
    // Ohne Beleg, DASS die Karte lief, ist ein Nullbefund wertlos: ein
    // Instrument, das nicht eingeschaltet war, misst zuverlaessig nichts.
    expect(lief(), 'Solo-Karte muss geladen haben, sonst misst die Sonde nichts').toBe(true);
    expect(sockets, 'Solo darf KEINE Verbindung nach draussen aufbauen').toEqual([]);

    // ---------- 2. Anbieten ----------
    marker.length = 0; sockets.length = 0; listening.length = 0;
    await page.evaluate(([pre, raum]) => window.tsCmd(
      'disconnect\n' + pre +
      'sv_public "/' + raum + '"\n' +
      // Ohne diese Zeile registriert die Engine einen ZWEITEN Raum mit
      // Zufallsnamen -- sv_port_rtc steht ab Werk auf "/".
      'sv_port_rtc ""\n' +
      'sv_listen_qw 1\nmaxclients 4\nmap ndu\n'), [SOLO_START, RAUM]);
    await page.waitForTimeout(35_000);

    expect(lief(), 'Angebotene Karte muss ganz normal laufen').toBe(true);

    const broker = sockets.filter((u) => u.includes(NAMENSRAUM));
    expect(broker.length, `genau eine Vermittler-Verbindung erwartet, bekam: ${JSON.stringify(sockets)}`).toBe(1);
    expect(broker[0]).toContain(NAMENSRAUM + RAUM);
    // Auf UNSEREM Vermittler, nicht auf master.frag-net.com. Der Wert kommt
    // aus default.fmf und wird von der Shell bei jedem Menue-Eintritt
    // wiederholt -- der Test setzt ihn bewusst nicht selbst.
    expect(broker[0], 'der Vermittler muss unserer sein').toContain('totersignal.de');

    expect(listening.join(' '), 'die Engine muss den Raum quittieren')
      .toContain(NAMENSRAUM + RAUM);
    expect(listening.length, `genau ein "Listening on" erwartet, bekam: ${JSON.stringify(listening)}`).toBe(1);
  });
});
