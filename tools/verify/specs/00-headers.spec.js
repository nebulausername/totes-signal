import { test, expect, request } from '@playwright/test';
import { HOSTS, REQUIRED, CACHE_MATRIX, CSP_TEILE } from '../lib/headers.js';

// Header-Pruefungen brauchen keinen Browser -> laufen einmal, nicht je Projekt.
test.describe.configure({ mode: 'serial' });

for (const [key, base] of Object.entries(HOSTS)) {
  test.describe(`Header: ${key} (${base})`, () => {
// browserName ist fuer chromium-desktop UND chromium-mobile 'chromium' --
// danach zu filtern liesse diese reine HTTP-Suite ZWEIMAL laufen, und der
// zweite Lauf faellt zuverlaessig ins Rate-Limit. Deshalb ueber den
// Projektnamen, und zwar in beforeEach: die Kurzform test.skip(fn) bekommt
// kein testInfo.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop',
    'reine HTTP-Pruefung -- genau einmal, nicht je Browser');
});

    for (const row of CACHE_MATRIX) {
      test(`${row.path} -> ${row.why}`, async () => {
        const ctx = await request.newContext();
        const res = await ctx.head(base + row.path);
        expect(res.status(), `${base}${row.path} nicht erreichbar`).toBe(200);

        const cc = res.headers()['cache-control'] || '';
        expect(cc, `Cache-Control fuer ${row.path}`).toMatch(row.expect);

        for (const h of REQUIRED[key]) {
          expect(res.headers()[h], `${h} fehlt auf ${row.path}`).toBeTruthy();
        }
        await ctx.dispose();
      });
    }

    test('CSP enthaelt jeden Baustein, den das Spiel braucht', async () => {
      test.skip(!CSP_TEILE[key], 'nur fuer die kanonischen Hosts festgezurrt');
      const ctx = await request.newContext();
      const res = await ctx.head(base + '/');
      const csp = res.headers()['content-security-policy'] || '';
      for (const teil of CSP_TEILE[key])
        expect(csp, `"${teil}" fehlt in der CSP -- am laufenden Spiel als noetig nachgewiesen`).toContain(teil);
      // Und was NICHT drinstehen darf: unsafe-eval fuer Skripte waere eine
      // Einladung. wasm-unsafe-eval reicht der Engine nachweislich.
      expect(csp, "'unsafe-eval' ist nicht noetig -- wasm-unsafe-eval genuegt").not.toContain("'unsafe-eval'");
      await ctx.dispose();
    });

    test('progs.pk3 revalidiert per ETag (304, nicht 1,8 MB)', async () => {
      const ctx = await request.newContext();
      const head = await ctx.head(base + '/nzp/progs.pk3');
      const etag = head.headers()['etag'];
      expect(etag, 'ETag fehlt -> keine Revalidierung moeglich').toBeTruthy();

      const again = await ctx.get(base + '/nzp/progs.pk3', {
        headers: { 'If-None-Match': etag },
      });
      expect(again.status(), 'unveraenderter Build muss 304 liefern').toBe(304);
      await ctx.dispose();
    });
  });
}
