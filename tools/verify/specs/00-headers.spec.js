import { test, expect, request } from '@playwright/test';
import { HOSTS, REQUIRED, CACHE_MATRIX } from '../lib/headers.js';

// Header-Pruefungen brauchen keinen Browser -> laufen einmal, nicht je Projekt.
test.describe.configure({ mode: 'serial' });

for (const [key, base] of Object.entries(HOSTS)) {
  test.describe(`Header: ${key} (${base})`, () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'nur einmal noetig');

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
