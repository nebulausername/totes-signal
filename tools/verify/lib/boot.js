// Gemeinsames Boot-Muster. Lag vorher zweimal kopiert in den Specs
// (10-boot und 50-shell-api) -- beim dritten Bedarf herausgezogen.
import { collectMarkers } from './markers.js';

export async function booten(page, url = '/') {
  const markers = collectMarkers(page);
  // Die Geraeteprofile des Harness (Pixel 7, iPhone 14) starten im HOCHFORMAT.
  // Das Spiel blendet dort absichtlich das Touch-HUD aus und zeigt den
  // Dreh-Hinweis -- jede Messung am laufenden Spiel braucht Querformat.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Das Start-Gate haelt die Engine an, bis geklickt wird -- seit 08/2026 auf
  // BEIDEN Plattformen (davor lief `begin()` am Rechner sofort beim Parsen).
  // Gefragt wird deshalb das Gate selbst und nicht mehr IS_TOUCH: die Frage
  // ist "steht da etwas im Weg", nicht "welches Geraet ist das".
  if (await page.locator('#mstart').isVisible()) await page.locator('#mstart').click();
  await page.waitForFunction(() => window.Module && window.Module.began === true, null, { timeout: 120_000 });
  await page.waitForTimeout(22_000);   // Engine + MenuQC brauchen danach noch Zeit
  return markers;
}

// Canvas-Geometrie und Renderzustand. Der Vergleich buf==css ist die
// Invariante, an der die Trefferlage im Menue haengt (siehe 20-menu.spec.js).
export function geometrie(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('canvas');
    const r = cv.getBoundingClientRect();
    return {
      cssW: Math.round(r.width), cssH: Math.round(r.height),
      bufW: cv.width, bufH: cv.height,
      eff: window.M9 ? +window.M9.eff.toFixed(3) : null,
      dyn: window.M9 ? +window.M9.dyn.toFixed(3) : null,
      lock: window.M9 ? !!window.M9.lock : null,
      on: window.M9 ? !!window.M9.on : null,
    };
  });
}

// Genau das Praefix, das Menu_StartSolo + Menu_Maps_LoadMap + Menu_Lobby setzen.
// Ohne sv_public/sv_listen_qw erbt ein direktes `map` den zuletzt gesetzten
// Zustand -- nach einem Ausflug in den Koop-Zweig einen oeffentlich beim
// Master-Server angemeldeten Listen-Server.
export const SOLO_START = [
  'sv_public 0', 'sv_listen_qw 0', 'sv_gamemode 0', 'sv_difficulty 0',
  'sv_startround 0', 'sv_magic 1', 'sv_headshotonly 0', 'sv_maxai 24',
  'sv_fastrounds 0',
].join('\n') + '\n';
