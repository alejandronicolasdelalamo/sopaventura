// Rendimiento de la interfaz (menu, mapa con scroll, partida) con CPU x4. Uso: URL=http://localhost:4174 node e2e/perf-ui.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:4174';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const cdp = await p.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => {
  window.__lt = []; window.__fr = [];
  new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] });
  let last = 0; const tick = t => { if (last) window.__fr.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
});
const stat = async (name, fn) => {
  await p.evaluate(() => { window.__lt = []; window.__fr = []; });
  await fn();
  const r = await p.evaluate(() => { const f = window.__fr.slice(3).sort((a, b) => a - b); const avg = f.reduce((a, c) => a + c, 0) / f.length; return { frames: f.length, avgMs: +avg.toFixed(1), p95: +f[Math.floor(f.length * .95)].toFixed(1), worst: +f[f.length - 1].toFixed(1), longtasks: window.__lt, fps: Math.round(1000 / avg) }; });
  console.log(name.padEnd(24), JSON.stringify(r));
};
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(() => {
  const L = { inicio: 15, series: 20, anime: 20, pixel: 20, olaf: 15, musica: 25, trap: 20, rivas: 20, madrid: 25, viajes: 20 };
  const stars = {}; Object.entries(L).forEach(([id, n]) => { for (let i = 0; i < n; i++) stars[`${id}:${i}`] = 3; });
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 500, hints: 3, reveals: 2, settings: { tutorialDone: true, music: false, sfx: false } }));
});
const t0 = Date.now();
await p.goto('about:blank'); await p.goto(`${URL}/?e2e`, { waitUntil: 'load' });
await p.waitForSelector('.home'); console.log('arranque hasta menu (ms):', Date.now() - t0);
await stat('menu quieto 3s', () => sleep(3000));
await p.goto('about:blank'); await p.goto(`${URL}/?e2e#mapa`, { waitUntil: 'load' }); await sleep(1500);
await stat('mapa scroll', async () => { for (let i = 0; i < 40; i++) { await p.evaluate(i => { const s = document.querySelector('.map-scroll'); s.scrollTop = s.scrollHeight - (i + 1) * 120 - 900; }, i); await sleep(50); } });
await stat('mapa quieto 2s', () => sleep(2000));
await p.evaluate(() => [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.startsWith('1')).click()); await sleep(400);
await p.evaluate(() => document.querySelector('.mode-btn')?.click());
await stat('partida (intro+3s)', () => sleep(3500));
console.log('errores:', errs);
await b.close();
