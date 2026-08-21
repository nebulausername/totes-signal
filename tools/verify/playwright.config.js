// Verifikations-Harness fuer TOTES SIGNAL.
//
// Zwei Dinge sind hier nicht verhandelbar:
//
// 1. @playwright/test ist auf 1.62.1 GEPINNT. Genau diese Version pinnt in
//    ihrer browsers.json chromium 1234 und webkit 2336 -- also exakt das, was
//    unter /root/.cache/ms-playwright liegt. Jede andere Version loest andere
//    Revisionen auf und loest einen ~500-MB-Download aus. Auf einer Maschine
//    mit ~350 MiB freiem RAM und 2,9 GB belegtem Swap ist das keine gute Idee.
//
// 2. workers: 1. Zwei headless Browser mit je einem WASM-Spiel und ~90 MB
//    Heap koexistieren auf diesem Server nicht.
import { defineConfig, devices } from '@playwright/test';

const BASE = process.env.TS_BASE || 'https://totersignal.de/';

export default defineConfig({
  testDir: './specs',
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  outputDir: './artifacts',
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile',  use: { ...devices['Pixel 7'] } },
    // WebKit ist Pflicht, nicht Kuer: iOS Safari ist das riskanteste Ziel
    // (SW-Kontingent, AudioContext-Grenzen, kein requestFullscreen).
    { name: 'webkit-mobile',    use: { ...devices['iPhone 14'] } },
  ],
});
