// Pinta un dibujo entero con toques reales (usa el gancho __paint) y captura los efectos. Uso: URL=http://localhost:5199 ID=cerezo node e2e/paint-fx.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199', ID = process.env.ID ?? 'cerezo';
const OUT = process.env.OUT ?? `e2e/shots/fx-${ID}`; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(() => {
  const L = { inicio: 15, series: 20, anime: 20, pixel: 20, olaf: 15, musica: 25, trap: 20, rivas: 20, madrid: 25, viajes: 20, abisal: 20, bosque: 20, glaciar: 20, golosa: 20, estadio: 20, cosmos: 25, ruta: 20, estreno: 20 };
  const stars = {}; Object.entries(L).forEach(([id, n]) => { for (let i = 0; i < n; i++) stars[`${id}:${i}`] = 3; });
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 900, settings: { tutorialDone: true, music: false, sfx: false } }));
});
if (process.env.MODE) await p.evaluate((id, m) => localStorage.setItem(`nuestra-sopa:paintmode:${id}`, m), ID.startsWith('mural') ? 'mural-inicio' : ID, process.env.MODE);
await p.goto('about:blank'); await p.goto(`${URL}/?e2e#pintar`, { waitUntil: 'networkidle0' }); await sleep(600);
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent.includes('Catálogo')).click()); await sleep(ID.startsWith('mural') ? 4500 : 400);
await p.evaluate(id => { const name = id.startsWith('mural') ? (id.includes(':') ? id : 'Mural:') : id; const c = [...document.querySelectorAll('.art-card')].find(x => x.textContent.toLowerCase().includes(name.toLowerCase())); c.click(); }, ID); await sleep(1300);
const info = await p.evaluate(() => { const e = window.__paint; return { n: e.tpl.palette.length, w: e.w, h: e.h }; });
const clickColor = async (c) => {
  await p.evaluate(c => document.querySelectorAll('.swatch')[c].click(), c); await sleep(900);   // vuela al color
  const pos = await p.evaluate(c => { const e = window.__paint, cv = document.querySelector('.paint-canvas').getBoundingClientRect(); const cx = (cv.width / 2 - e.ox) / e.s, cy = (cv.height / 2 - e.oy) / e.s;
    let best = -1, bd = 1e9; for (let i = 0; i < e.tpl.cells.length; i++) { if (e.tpl.cells[i] !== c || e.painted[i]) continue; const d = (i % e.w + .5 - cx) ** 2 + (Math.floor(i / e.w) + .5 - cy) ** 2; if (d < bd) { bd = d; best = i; } }
    if (best < 0) return null; return { x: cv.left + e.ox + ((best % e.w) + .5) * e.s, y: cv.top + e.oy + (Math.floor(best / e.w) + .5) * e.s }; }, c);
  if (!pos) return false;
  await p.mouse.click(pos.x, pos.y); return true;
};
let shot = 0;
for (let c = 0; c < info.n; c++) {
  if (!(await clickColor(c))) continue;
  for (let k = 0; k < 120 && (await p.evaluate(c => window.__paint.remaining[c], c)) > 0; k++) { await sleep(120); const pos = await p.evaluate(c => { const e = window.__paint, cv = document.querySelector('.paint-canvas').getBoundingClientRect(); const cx = (cv.width / 2 - e.ox) / e.s, cy = (cv.height / 2 - e.oy) / e.s; let best = -1, bd = 1e9; for (let i = 0; i < e.tpl.cells.length; i++) { if (e.tpl.cells[i] !== c || e.painted[i]) continue; const d = (i % e.w + .5 - cx) ** 2 + (Math.floor(i / e.w) + .5 - cy) ** 2; if (d < bd) { bd = d; best = i; } } if (best < 0) return null; return { x: cv.left + e.ox + ((best % e.w) + .5) * e.s, y: cv.top + e.oy + (Math.floor(best / e.w) + .5) * e.s, vis: e.ox + ((best % e.w) + .5) * e.s > 0 && e.ox + ((best % e.w) + .5) * e.s < cv.width && e.oy + (Math.floor(best / e.w) + .5) * e.s > 0 && e.oy + (Math.floor(best / e.w) + .5) * e.s < cv.height }; }, c); if (!pos) break; if (!pos.vis) { await p.evaluate(c => window.__paint.select(c, true), c); await p.evaluate(c => { const e = window.__paint; e.hint(); }, c); await sleep(900); continue; } await p.mouse.click(pos.x, pos.y); }
  if (shot === 0) { await sleep(160); await p.screenshot({ path: `${OUT}/1-ola.png` }); shot = 1; await sleep(500); await p.screenshot({ path: `${OUT}/2-ola-tarde.png` }); }
  await sleep(1300);
  const pct = parseInt(await p.$eval('.hud-meta', e => e.textContent).catch(() => '100'));
  if (shot === 1 && pct >= 25) { shot = 2; await p.screenshot({ path: `${OUT}/3-hito.png` }); }
}
if (process.env.FLOW) await p.evaluate(() => { const e = window.__paint; e.order.forEach((i, k) => { if (k % 3 === 0) e.by[i] = 2; }); });
await sleep(2200); await p.screenshot({ path: `${OUT}/4-final-a.png` });
await sleep(1200); await p.screenshot({ path: `${OUT}/5-final-b.png` });
if (process.env.FLOW) {
  const clickBtn = t => p.evaluate(t => { const b = [...document.querySelectorAll('.paint-btns button, .card-view button')].find(x => x.textContent.includes(t)); b?.click(); return !!b; }, t);
  console.log('quien:', await clickBtn('¿Quién?')); await sleep(700); await p.screenshot({ path: `${OUT}/6-quien.png` }); await clickBtn('Ocultar');
  console.log('tarjeta:', await clickBtn('Tarjeta')); await sleep(2500); await p.screenshot({ path: `${OUT}/7-tarjeta.png` });
}
console.log('engine', await p.evaluate(() => { const e = window.__paint; return JSON.stringify({ inset: e.inset, s: e.s, fitS: e.fitS, oy: e.oy, H: e.H, box: document.querySelector('.paint-result')?.getBoundingClientRect().height }); }));
console.log('errores', errs.slice(0, 3), 'modal:', await p.evaluate(() => !!document.querySelector('.result-modal')));
await b.close();
