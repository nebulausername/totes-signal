// Prueft Cvars gegen DIESEN Engine-Build. Die Engine ist gepinnt -- was in
// irgendeiner FTE-Fassung existiert, ist hier irrelevant. Nur was die Konsole
// dieses Builds zurueckmeldet, zaehlt.
import { chromium } from './node_modules/playwright-core/index.mjs';

const CVARS = process.argv.slice(2).length ? process.argv.slice(2) : [
  'vid_conautoscale', 'vid_conwidth', 'vid_conheight', 'scr_conscale',
  'r_renderscale', 'cl_maxfps', 'sensitivity', 'm_pitch', 'm_yaw',
  'in_aimassist', 'in_rumbleenabled', 'nzp_particles', 'nzp_decals',
  'r_fastsky', 'r_dynamic', 'gamma',
];

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const lines = [];
p.on('console', m => lines.push(m.text()));

await p.goto('https://totersignal.de/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.Module && window.Module.began === true, null, { timeout: 90000 });
await p.waitForTimeout(22000);

for (const c of CVARS) {
  lines.length = 0;
  await p.evaluate((cv) => window.tsCmd(cv + '\n'), c);
  await p.waitForTimeout(400);
  const hit = lines.find(l => l.includes(c)) || lines.find(l => l.trim());
  console.log(`  ${c.padEnd(18)} ${hit ? hit.trim().slice(0, 110) : '(keine Ausgabe)'}`);
}

// fps_preset ohne Argument listet die eingebauten Stufen
lines.length = 0;
await p.evaluate(() => window.tsCmd('fps_preset\n'));
await p.waitForTimeout(800);
console.log('\n  fps_preset:');
lines.filter(l => l.trim()).slice(0, 12).forEach(l => console.log('    ' + l.trim().slice(0, 130)));

await b.close();
