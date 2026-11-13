// Mide la fluidez del final de un dibujo (ultimo color -> brillo -> confeti -> resultado) con CPU frenada.
// Uso: npm run dev (puerto 5173) y  URL=http://localhost:5173 node e2e/finish.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5173';
const CPU = Number(process.env.CPU ?? 4);
const ID = process.env.ID ?? 'gato';
const b = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const __errs = []; p.on('pageerror', e => __errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') __errs.push('console: ' + m.text()); });
await p.goto(URL, { waitUntil: 'networkidle0' });
const last = await p.evaluate(async id => {
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', coins: 500 }));
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  const { getTemplate } = await import('/src/paint/catalog.ts');
  const t = getTemplate(id);
  const count = new Array(t.palette.length).fill(0);
  t.cells.forEach(c => { if (c !== 255) count[c]++; });
  const k = count.indexOf(Math.max(...count));
  const order = []; t.cells.forEach((c, i) => { if (c !== 255 && c !== k) order.push(i); });
  localStorage.setItem(`nuestra-sopa:paint:${id}`, JSON.stringify({ o: order, b: '1'.repeat(order.length) }));
  return k;
}, ID);
await p.goto(`${URL}/#pintar`); await p.reload({ waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(e => e.textContent.includes('En curso')).click());
await new Promise(r => setTimeout(r, 300));
await p.evaluate(() => document.querySelector('.art-card').click());
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(k => document.querySelectorAll('.swatch')[k].click(), last);
await new Promise(r => setTimeout(r, 400));
const c = await (await p.$('.paint-canvas')).boundingBox();
const cdp = await p.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await p.evaluate(() => { window.__d = []; let l = performance.now(); const f = t => { window.__d.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
if (process.env.PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
if (process.env.EXTRA) await p.evaluate(process.env.EXTRA);
let done = false;
for (let y = c.y + 30; y < c.y + c.height - 30 && !done; y += 10) for (let x = c.x + 30; x < c.x + c.width - 30 && !done; x += 14) {
  await p.mouse.click(x, y); await new Promise(r => setTimeout(r, 15));
  done = await p.evaluate(() => document.querySelector('.paint-tools')?.hidden === true);
}
await p.evaluate(() => { window.__d = []; window.__lo = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__lo.push({ d: e.duration, s: (e.scripts || []).map(x => `${x.sourceFunctionName || x.invoker} ${Math.round(x.duration)}ms`).join(' | ') }))).observe({ type: 'long-animation-frame' }); });
await new Promise(r => setTimeout(r, 3200));
const lo = await p.evaluate(() => window.__lo);
console.log(`Fotogramas lentos (>50ms) durante el final: ${lo.length}${lo.length ? `, peor ${Math.max(...lo.map(x => x.d)).toFixed(0)}ms` : ''}`);
lo.sort((a, b) => b.d - a.d).slice(0, 5).forEach(x => console.log(`  ${x.d.toFixed(0)}ms  ${x.s}`));
if (process.env.PROFILE) {
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(); const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map(n => [n.id, n]));
  profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); });
  [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log(`${(v / 1000).toFixed(0).padStart(6)} ms  ${k}`));
}
const d = (await p.evaluate(() => window.__d.slice(1))).sort((a, b) => a - b);
const avg = d.reduce((a, v) => a + v, 0) / d.length;
console.log(`Final del dibujo (${ID})  terminado=${done}  frames=${d.length}  media=${avg.toFixed(1)}ms  p95=${d[Math.floor(d.length * 0.95)].toFixed(1)}ms  peor=${d[d.length - 1].toFixed(1)}ms  ~${(1000 / avg).toFixed(0)} fps`);
console.log(done && !lo.some(x => x.d > 100) ? 'OK: sin tirones (ningun fotograma > 100 ms con la CPU frenada x4)' : 'AVISO: hay tirones');
console.log('ERRORES:', JSON.stringify(__errs.slice(0, 6)));
await b.close();
