// Mide la fluidez del final (brillo/destellos) y de "Verla pintarse" con CPU frenada y perfila donde se va el tiempo.
// Uso (con `npm run dev`): URL=http://localhost:5199 ID=arce W=390 H=844 DPR=3 CPU=4 node e2e/replay-perf.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5199', ID = process.env.ID ?? 'arce';
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844), DPR = +(process.env.DPR ?? 3), CPU = +(process.env.CPU ?? 4);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: W < 700, hasTouch: W < 700 });
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(async id => {
  const { allTemplates, getTemplate } = await import('/src/paint/catalog.ts');
  const t = getTemplate(id) ?? allTemplates().find(x => x.id.startsWith(id));
  const order = []; t.cells.forEach((c, i) => { if (c !== 255) order.push(i); });
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', coins: 100, paintDone: [t.id], settings: { tutorialDone: true, music: false, sfx: false } }));
  localStorage.setItem(`nuestra-sopa:paint:${t.id}`, JSON.stringify({ o: order, b: '1'.repeat(order.length) }));
}, ID);
await p.goto('about:blank'); await p.goto(`${URL}/?e2e#pintar`, { waitUntil: 'networkidle0' }); await sleep(600);
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent.includes('Galería')).click()); await sleep(300);
await p.evaluate(() => document.querySelector('.art-card').click()); await sleep(400);
const cdp = await p.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await p.evaluate(() => { window.__d = []; let l = performance.now(); const f = t => { window.__d.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
const stats = async (name, ms) => {
  await p.evaluate(() => { window.__d = []; }); await sleep(ms);
  const d = (await p.evaluate(() => window.__d.slice(1))).sort((a, b) => a - b);
  const avg = d.reduce((a, v) => a + v, 0) / d.length;
  console.log(`${name.padEnd(34)} frames=${String(d.length).padStart(4)}  media=${avg.toFixed(1).padStart(6)}ms  p95=${d[Math.floor(d.length * 0.95)].toFixed(0).padStart(4)}ms  peor=${d[d.length - 1].toFixed(0).padStart(4)}ms  ~${Math.round(1000 / avg)} fps`);
};
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start');
await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Verla pintarse')).click());
await stats('entrada + brillo final (3 s)', 3000);
await stats('hoja + destellos en bucle (3 s)', 3000);
await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Ver el time-lapse'))?.click());
await stats('time-lapse (7 s)', 7000);
await stats('final otra vez (3 s)', 3000);
const { profile } = await cdp.send('Profiler.stop');
const self = new Map(); const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map(n => [n.id, n]));
profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop().split('?')[0]}:${n.callFrame.lineNumber + 1}`; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); });
console.log('\nDonde se va el tiempo (ms, CPU frenada):');
[...self.entries()].filter(([k]) => !k.includes('(idle)')).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`${(v / 1000).toFixed(0).padStart(6)}  ${k}`));
await b.close();
