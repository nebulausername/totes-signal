import { test, expect } from '@playwright/test';

// Warum es diese Datei gibt (alles am 2026-08-22 an der Live-Fassung
// nachgemessen, bevor es behoben wurde):
//
// Die Bestenliste war die einzige Oberflaeche, die nie am Bild geprueft worden
// war -- nur ihr Tab im Todesbildschirm. Vier Befunde aus dem ersten Blick:
//
// 1. Frisch verdiente Erfolge im Kopf schoben NOCHMAL und ZUR LOBBY unter den
//    Bildschirmrand. Auf WebKit reichte EIN Erfolg (Knopfunterkante 391 px bei
//    390 px Viewport), auf Android sechs (404 px). Die Box wuchs einfach mit
//    ihrem Inhalt; die alte Deckelung an #rank-liste half nur der Liste, nicht
//    dem Kopf darueber.
// 2. Die Deckelung min(34vh,200px) stand in keinem Verhaeltnis zur Zeilenhoehe
//    (27 px): sechs ganze Zeilen und eine halbierte. Ein aufgeschnittener
//    Eintrag liest sich als Zeichenfehler, nicht als "hier geht es weiter".
// 3. Die eigene Zeile wurde IMMER zentriert. Bei Platz 3 schob das den Ersten
//    aus dem Bild (scrollTop 21) -- eine Bestenliste, deren oberste sichtbare
//    Zeile die Zwei ist, sieht kaputt aus.
// 4. Der Fehlerzustand war eine Sackgasse: zwei Woerter, kein Weg zurueck.
//
// Die Engine wird hier BEWUSST nicht gebootet. Der Todesbildschirm ist reines
// DOM; ein Boot kostete den ~90-MB-Erstdownload je Test und wuerde nichts
// beweisen, was diese Messungen nicht schon zeigen. TS_API wird gestubbt --
// sonst legte jeder Lauf echte Konten in der Produktionsdatenbank an.

test.setTimeout(120_000);

const ZEHN = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1, user_id: 'u' + (i + 1), display_name: 'Spieler ' + (i + 1),
  level: 3, rounds: 40 - i, score: 90000 - i * 700, kills: 500, headshots: 200,
}));

// Den Rang-Tab in einen bestimmten Zustand fahren und messen.
async function rangTab(page, fall, groesse) {
  // Querformat: die Geraeteprofile starten im Hochformat (Footgun 17).
  await page.setViewportSize(groesse || { width: 844, height: 390 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  return page.evaluate(async (f) => {
    window.tsCmd = () => true;
    window.TS_ORIGIN_OK = true;
    for (const id of ['mstart', 'rotate']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';           // ohne Engine-Boot bleibt das Gate sonst stehen
    }
    TS_API.hatKonto = () => true;
    TS_API.meineId = f.ich || null;
    TS_API.call = async () => { if (f.fehler) throw new Error('kaputt'); return f.antwort; };
    TS_BOARD.letztes = f.letztes || null;
    TS_DEATH.setStats('17|84250|912|347|2|1|1483|Nacht der Untoten');
    TS_DEATH.render(17);
    document.getElementById('deathui').style.display = 'flex';
    TS_DEATH.tab('rank');
    await new Promise((r) => setTimeout(r, 800));

    const akt = document.querySelector('#deathui .death-actions');
    const box = document.getElementById('rank-liste');
    const erg = {
      viewport: window.innerHeight,
      knopfUnten: Math.round(akt.getBoundingClientRect().bottom),
      knopfOben: Math.round(akt.getBoundingClientRect().top),
      wiederholen: !!document.getElementById('rankNeu'),
    };
    if (box) {
      const seite = document.getElementById('dpage-rank');
      const sb = seite.getBoundingClientRect();
      const lb = box.getBoundingClientRect();
      const zeilen = [...box.querySelectorAll('tbody tr')];
      erg.scrollTop = Math.round(box.scrollTop);
      // Die Liste darf nicht ueber die Tab-Seite hinauslaufen. Genau das war
      // einmal der Fall, OHNE dass die Liste selbst eine Zeile anschnitt: die
      // Hoehenrechnung uebersah die Kopfzeilen darueber, und abgeschnitten hat
      // dann die Seitenkante. Ein Test, der nur die Liste befragt, ist blind
      // dafuer -- deshalb wird hier gegen BEIDE Kanten geprueft.
      erg.seiteRollt = seite.scrollHeight > seite.clientHeight + 1;
      erg.ueberhang = Math.round(lb.bottom - sb.bottom);
      const kante = Math.min(lb.bottom, sb.bottom);
      erg.angeschnitten = zeilen.filter((tr) => {
        const b = tr.getBoundingClientRect();
        return b.top < kante - 1 && b.bottom > kante + 1;
      }).map((tr) => tr.cells[0].textContent);
      erg.ersterPlatzSichtbar = (() => {
        const tr = zeilen[0];
        if (!tr) return false;
        const kopf = box.querySelector('thead').getBoundingClientRect();
        const b = tr.getBoundingClientRect();
        return b.top >= kopf.bottom - 1 && b.bottom <= lb.bottom + 1;
      })();
      erg.luecke = !!box.querySelector('tr.luecke');
      erg.eigeneImBild = (() => {
        const tr = box.querySelector('tr.ich');
        if (!tr) return null;
        const kopf = box.querySelector('thead').getBoundingClientRect();
        const b = tr.getBoundingClientRect();
        return b.top >= kopf.bottom - 1 && b.bottom <= lb.bottom + 1;
      })();
    }
    return erg;
  }, fall);
}

test('Knopfreihe bleibt im Bild -- auch mit frischen Erfolgen', async ({ page }) => {
  for (const anzahl of [0, 1, 6]) {
    const m = await rangTab(page, {
      ich: 'u2', antwort: { entries: ZEHN, me: ZEHN[1] },
      letztes: { status: 'verified', rank: { map: 2 }, xp_gained: 1250,
        achievements_neu: Array.from({ length: anzahl }, (_, i) => ({ name: 'Erfolg Nummer ' + (i + 1), xp: 100 })) },
    });
    expect(m.knopfUnten, `${anzahl} Erfolge: NOCHMAL/ZUR LOBBY unter dem Bildschirmrand`)
      .toBeLessThanOrEqual(m.viewport + 1);
    expect(m.knopfOben, `${anzahl} Erfolge: Knopfreihe oberhalb des Bildes`).toBeGreaterThanOrEqual(-1);
    expect(m.ueberhang, `${anzahl} Erfolge: Liste ragt unten aus der Tab-Seite`).toBeLessThanOrEqual(1);
  }
});

test('Keine halbierte Zeile an der Listenkante', async ({ page }) => {
  // Zwei Hoehen, weil die alte Deckelung min(34vh,200px) je nach Viewport
  // anders danebenlag: bei 390 px griff 34vh (132,6 px -- Rest ein Haar), bei
  // 720 px die 200 px, und dort war Zeile 7 sichtbar halbiert (341..368 in
  // einem Fenster, das bei 350 endet). Nur die grosse Hoehe zeigt den Fehler
  // deutlich; die kleine haelt die Regel trotzdem fest.
  for (const groesse of [{ width: 844, height: 390 }, { width: 1280, height: 720 }]) {
    const m = await rangTab(page, {
      ich: 'u3', antwort: { entries: ZEHN, me: ZEHN[2] },
      letztes: { status: 'verified', rank: { map: 3 }, xp_gained: 240, achievements_neu: [] },
    }, groesse);
    expect(m.angeschnitten, groesse.width + 'x' + groesse.height + ': Hoehe muss in ganze Zeilen einrasten').toEqual([]);
    expect(m.ueberhang, groesse.width + 'x' + groesse.height + ': Liste ragt unten aus der Tab-Seite').toBeLessThanOrEqual(1);
    expect(m.seiteRollt, groesse.width + 'x' + groesse.height + ': die Tab-Seite selbst darf nicht rollen muessen').toBe(false);
  }
});

test('Platz 1 bleibt stehen, wenn die eigene Zeile ohnehin oben steht', async ({ page }) => {
  const m = await rangTab(page, {
    ich: 'u3', antwort: { entries: ZEHN, me: ZEHN[2] },
    letztes: { status: 'verified', rank: { map: 3 }, xp_gained: 240, achievements_neu: [] },
  });
  expect(m.scrollTop, 'ohne Not wird nicht gerollt').toBe(0);
  expect(m.ersterPlatzSichtbar, 'der Erste gehoert ins Bild').toBe(true);
  expect(m.eigeneImBild, 'die eigene Zeile auch').toBe(true);
});

test('Eigene Zeile weit unten: sichtbar und als Luecke gekennzeichnet', async ({ page }) => {
  const m = await rangTab(page, {
    ich: 'u47',
    antwort: { entries: ZEHN, me: { rank: 47, user_id: 'u47', display_name: 'Ich Selbst', level: 2, rounds: 6, score: 4200, kills: 40, headshots: 9 } },
    letztes: { status: 'verified', rank: { map: 47 }, xp_gained: 90, achievements_neu: [] },
  });
  expect(m.luecke, 'Trennlinie, sonst liest sich Platz 47 wie Platz 11').toBe(true);
  expect(m.eigeneImBild, 'wer auf 47 steht, will genau diese Zeile sehen').toBe(true);
  expect(m.angeschnitten, 'auch hier keine halbierte Zeile').toEqual([]);
});

test('Fehlerzustand ist keine Sackgasse', async ({ page }) => {
  const m = await rangTab(page, { fehler: true });
  expect(m.wiederholen, 'ohne Knopf kommt man aus dem Fehler nur ueber einen Tab-Wechsel').toBe(true);
  expect(m.knopfUnten, 'und die Hauptknoepfe bleiben im Bild').toBeLessThanOrEqual(m.viewport + 1);
});
