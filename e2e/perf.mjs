// Mide fotogramas reales al pintar 128x128 con 30 colores, con CPU frenada (CPU=4 aprox. iPhone de gama media).
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:4174';
const CPU = Number(process.env.CPU ?? 4);
const b = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await p.goto(URL, { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', owned: ['img:horizonte-128'], coins: 500 })); localStorage.setItem('nuestra-sopa:local:role', '"nico"'); });
await p.goto(`${URL}/#pintar`); await p.reload({ waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(e => e.textContent.includes('Catálogo')).click());
await new Promise(r => setTimeout(r, 300));
await p.evaluate(() => [...document.querySelectorAll('.art-card')].find(e => e.textContent.includes('Horizonte')).click());
await new Promise(r => setTimeout(r, 1200));
const c = await (await p.$('.paint-canvas')).boundingBox();
const cdp = await p.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await p.evaluate(() => { window.__d = []; let l = performance.now(); const f = t => { window.__d.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
const cx = c.x + c.width / 2, cy = c.y + c.height / 2;
const measure = async (label, fn) => {
  await p.evaluate(() => { window.__d = []; });
  await fn(); await new Promise(r => setTimeout(r, 400));
  const d = await p.evaluate(() => window.__d.slice(1));
  d.sort((a, b) => a - b);
  const avg = d.reduce((a, v) => a + v, 0) / d.length;
  console.log(`${label.padEnd(34)} frames=${String(d.length).padStart(3)}  media=${avg.toFixed(1)}ms  p95=${d[Math.floor(d.length * 0.95)].toFixed(1)}ms  peor=${d[d.length - 1].toFixed(1)}ms  ~${(1000 / avg).toFixed(0)} fps`);
  return avg;
};
let worst = 0;
worst = Math.max(worst, await measure('Zoom con rueda (acercar/alejar)', async () => { await p.mouse.move(cx, cy); for (let i = 0; i < 10; i++) { await p.mouse.wheel({ deltaY: -120 }); await new Promise(r => setTimeout(r, 30)); } }));
worst = Math.max(worst, await measure('Arrastrar (pan) con zoom alto', async () => { await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 0; i < 25; i++) { await p.mouse.move(cx + i * 4, cy + i * 2); await new Promise(r => setTimeout(r, 16)); } await p.mouse.up(); await new Promise(r => setTimeout(r, 800)); }));
await p.mouse.wheel({ deltaY: 1500 }); await new Promise(r => setTimeout(r, 400));
await p.evaluate(() => document.querySelectorAll('.swatch')[0].click()); await new Promise(r => setTimeout(r, 300));
worst = Math.max(worst, await measure('Ola de pintado (toque en color)', async () => {
  for (let y = c.y + 40; y < c.y + c.height - 40; y += 8) { const before = await p.$eval('.hud-meta', e => e.textContent); await p.mouse.click(c.x + c.width * 0.5, y); await new Promise(r => setTimeout(r, 20)); if ((await p.$eval('.hud-meta', e => e.textContent)) !== before) break; }
  await new Promise(r => setTimeout(r, 1200));
}));
console.log(worst < 33.4 ? 'OK: >= 30 fps de media en todos los casos con la CPU frenada' : 'AVISO: por debajo de 30 fps con la CPU frenada');
await b.close();
