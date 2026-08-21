// Sammelt die TSUI-Marker. Das ist der EINZIGE Kanal von QuakeC zur Shell:
// QC druckt "\nTSUI:<...>\n" auf stdout, die Engine leitet das an console.log,
// und web/index.html haengt sich mit einem Wrapper dort ein.
export function collectMarkers(page) {
  const seen = [];
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('TSUI:')) seen.push({ text: t, at: Date.now() });
  });
  return {
    all: () => seen,
    has: (needle) => seen.some((m) => m.text.includes(needle)),
    first: (needle) => seen.find((m) => m.text.includes(needle)),
    // Reihenfolge zaehlt: dstats MUSS vor dead kommen, sonst steht das
    // Todes-Panel leer da.
    indexOf: (needle) => seen.findIndex((m) => m.text.includes(needle)),
    async waitFor(needle, timeout = 90_000) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (seen.some((m) => m.text.includes(needle))) return true;
        await page.waitForTimeout(250);
      }
      return false;
    },
  };
}
