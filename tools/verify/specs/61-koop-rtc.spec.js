// Der Beweis: zwei Browser, ein Raum, ein Spiel.
//
// Am 2026-08-24 zum ersten Mal gelungen. Belegt drei Dinge auf einmal:
//   - ein Browser KANN anbieten (menu_coop.qc:274 behauptet das Gegenteil),
//   - die RELATIVE Beitrittsform `connect /<raum>` trifft den Raum, den der
//     Gastgeber registriert hat,
//   - der Beitretende zieht sich unser csprogs.dat selbst nach.
//
// WAS DIESER TEST NICHT BEWEIST: NAT-Durchstich. Beide Seiten liegen auf
// derselben Maschine, es gibt direkte ICE-Kandidaten, STUN wird nie
// gebraucht. Wer diesen Test gruen sieht und daraus "Koop funktioniert im
// Internet" liest, irrt. Dafuer gibt es nur die Messung mit zwei Geraeten in
// zwei Netzen (Phase M6 im Masterplan v5).
//
// Ein Browser, zwei Kontexte -- nicht zwei Browser: zwei WASM-Spiele mit je
// ~90 MB Heap sind der Grund fuer workers:1, und zwei Browserprozesse
// verdoppeln das Grundrauschen obendrauf.
//
// DER VERMITTLER WIRD HIER BEWUSST NICHT GESETZT. Geprueft wird der Zustand,
// wie er ausgeliefert wird: default.fmf und die Shell zeigen beide auf
// wss://totersignal.de. Wuerde der Test ihn selbst setzen, liefe er gruen,
// waehrend die Auslieferung auf einen fremden Dienst zeigt.
import { test, expect } from '@playwright/test';
import { booten } from '../lib/boot.js';

// Fester Raumname statt Zufall: ein Fehlschlag soll im Protokoll des
// Vermittlers wiederauffindbar sein.
const RAUM = 'tskooptest';

test.describe('@mp Koop ueber den Vermittler', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop',
      'zwei Engines gleichzeitig -- genau einmal');
  });
  test.setTimeout(600_000);

  test('Gastgeber bietet an, Beitretender spielt mit', async ({ browser }) => {
    const auf = async () => {
      const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
      const page = await ctx.newPage();
      const log = [];
      const ws = [];
      page.on('console', (m) => log.push(m.text().trim()));
      page.on('websocket', (w) => ws.push(w.url()));
      await booten(page);
      return { ctx, page, log, ws };
    };

    const host = await auf();
    await host.page.evaluate((r) => window.tsCmd(
      'sv_public "/' + r + '"\n' +
      // Ohne diese Zeile registriert die Engine einen ZWEITEN Raum mit
      // Zufallsnamen: sv_port_rtc steht ab Werk auf "/".
      'sv_port_rtc ""\nsv_listen_qw 1\nmaxclients 4\n' +
      'sv_gamemode 0\nsv_difficulty 0\nsv_startround 0\nmap ndu\n'), RAUM);
    await host.page.waitForTimeout(30_000);

    expect(host.log.filter((z) => z.includes('Listening on')).join(' '),
      'der Gastgeber muss den Raum beim Vermittler registrieren')
      .toContain('/NZP-REBOOT-WEB/' + RAUM);

    // Und zwar bei UNSEREM. Ein Koop, das ueber einen fremden Dienst laeuft,
    // ist keins, das wir zusagen koennen -- und es steht in keiner
    // Datenschutzerklaerung.
    const hostWs = host.ws.filter((u) => u.includes('/NZP-REBOOT-WEB/'));
    expect(hostWs.length, `genau eine Vermittler-Verbindung, bekam ${JSON.stringify(host.ws)}`).toBe(1);
    expect(hostWs[0], 'der Vermittler muss unserer sein').toContain('totersignal.de');

    const gast = await auf();
    gast.log.length = 0;
    // RELATIV. `connect rtc://host/raum` baut in der Engine einen anderen
    // Raumnamen als `sv_port_rtc`/`sv_public` ihn registrieren.
    await gast.page.evaluate((r) => window.tsCmd('connect /' + r + '\n'), RAUM);
    await gast.page.waitForTimeout(45_000);

    const gastText = gast.log.join('\n');
    expect(gastText, 'Verbindung zum Raum muss zustande kommen')
      .toContain('Connected to /' + RAUM);
    expect(gastText, 'der Beitretende muss im Spiel ankommen').toContain('TSUI:rstart:');

    // DER WICHTIGSTE HAKEN AN DIESER STELLE. Beim eigenen `map` schliesst die
    // Engine das Menue, bei `connect` tat es niemand: das Hauptmenue blieb
    // ueber der laufenden Partie stehen, menu_active blieb wahr, und damit
    // kam nie ein TSUI:game. Ohne diesen Marker wendet die Shell ihren
    // GANZEN Spielzustand nicht an -- Sprache, Empfindlichkeit, Y-Achse,
    // Zielhilfe, HUD-Groesse und die gemeldeten Bildschirmraender. Ein
    // Beitretender spielte ohne jede seiner Einstellungen, und auf dem Handy
    // lagen Munition und Rundenanzeige wieder unter den Knoepfen.
    //
    // Aufgefallen ist das ausschliesslich, weil ein Bild angesehen wurde:
    // die Zahlen sagten "verbunden".
    expect(gastText, 'der Beitretende braucht TSUI:game -- sonst bleibt das Menue offen')
      .toContain('TSUI:game');


    // Der Gastgeber muss den Beitritt sehen -- sonst hat der Gast zwar eine
    // Verbindung, aber keinen Platz in der Runde.
    expect(host.log.join('\n'), 'der Gastgeber muss den Beitritt bemerken')
      .toContain('has joined the game');
    expect(gast.ws.filter((u) => u.includes('/NZP-REBOOT-WEB/'))[0] || '',
      'auch der Beitretende geht ueber unseren Vermittler').toContain('totersignal.de');

    // Gegenprobe, dass der Menue-Fix das Pausemenue nicht mitgenommen hat:
    // ESC im laufenden Spiel ist CSQC (TSUI:pause:), nicht das Hauptmenue.
    // Steht bewusst GANZ HINTEN -- diese Pruefung leert host.log, und als sie
    // weiter oben stand, fiel die Beitritts-Pruefung darunter auf ein leeres
    // Protokoll herein. Ein Test, der seine eigene Messung loescht, meldet
    // einen Fehler, den es nicht gibt.
    host.log.length = 0;
    await host.page.keyboard.press('Escape');
    await host.page.waitForTimeout(2000);
    expect(host.log.join('\n'), 'ESC muss weiterhin das Pausemenue oeffnen')
      .toContain('TSUI:pause:1');
    await host.page.keyboard.press('Escape');
    await host.page.waitForTimeout(2000);

    // Beide Bilder festhalten. Die Zahlen oben sagen "verbunden"; ob der
    // Spieler etwas SIEHT, sagt nur die Aufnahme -- so ist aufgefallen, dass
    // beim Beitretenden das Engine-Menue offen ueber dem Spiel liegen bleibt.
    await host.page.screenshot({ path: 'artifacts/koop-host.png' });
    await gast.page.screenshot({ path: 'artifacts/koop-gast.png' });

    await gast.ctx.close();
    await host.ctx.close();
  });
});
