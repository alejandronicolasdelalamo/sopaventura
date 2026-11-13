// "Verla pintarse" desde la Galeria: el time-lapse debe verse limpio y la hoja de resultado solo aparece al acabar.
// Uso (con `npm run dev`): URL=http://localhost:5199 ID=arce node e2e/replay.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199', ID = process.env.ID ?? 'arce';
const OUT = 'e2e/shots/replay'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALLO'} ${n} ${x}`); };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1342, height: 884, deviceScaleFactor: 1 });   // como en el video: ordenador
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
const tid = await p.evaluate(async id => {
  const { allTemplates, getTemplate } = await import('/src/paint/catalog.ts');
  const t = getTemplate(id) ?? allTemplates().find(x => x.id.startsWith(id));
  const order = []; t.cells.forEach((c, i) => { if (c !== 255) order.push(i); });
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', coins: 100, paintDone: [t.id], settings: { tutorialDone: true, music: false, sfx: true } }));
  localStorage.setItem(`nuestra-sopa:paint:${t.id}`, JSON.stringify({ o: order, b: '1'.repeat(order.length) }));
  return t.id;
}, ID);
await p.goto('about:blank'); await p.goto(`${URL}/?e2e#pintar`, { waitUntil: 'networkidle0' }); await sleep(700);
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent.includes('Galería')).click()); await sleep(400);
await p.evaluate(() => document.querySelector('.art-card').click()); await sleep(500);
await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Verla pintarse')).click());
await sleep(2300);
// contar sonidos por casilla: antes sonaba uno cada 4 casillas (cientos por segundo)
const st = await p.evaluate(() => { const e = window.__paint; return { sparks: e.sparks.length, pops: e.pops.length, lapse: e.lapse, selected: e.selected, hasSheet: !!document.querySelector('.paint-result'), bar: !!document.querySelector('.tl-bar'), grid: e.s >= 9 }; });
await p.screenshot({ path: `${OUT}/1-time-lapse.png` });
check('durante el time-lapse NO hay hoja de resultado encima', !st.hasSheet);
check('hay barra "Pintándose… / Saltar"', st.bar);
check('sin chispas ni pops por cada casilla', st.sparks === 0 && st.pops === 0, `(chispas ${st.sparks}, pops ${st.pops})`);
await sleep(1800);
const mid = await p.evaluate(() => ({ sheet: !!document.querySelector('.paint-result'), shown: window.__paint.shownCount }));
check('sigue pintandose (sin hoja)', !mid.sheet && mid.shown > 0, `(${mid.shown} casillas)`);
await sleep(6500);
await p.screenshot({ path: `${OUT}/2-final.png` });
const end = await p.evaluate(() => ({ sheet: !!document.querySelector('.paint-result'), bar: !!document.querySelector('.tl-bar'), shown: window.__paint.shownCount, total: window.__paint.totalCells }));
check('al acabar se ve la obra terminada y aparece la hoja', end.sheet && !end.bar && end.shown === end.total, JSON.stringify(end));
const fx = await p.evaluate(() => ({ stars: document.querySelectorAll('.fx-star').length, shine: document.querySelectorAll('.fx-shine.loop').length, canvasAnimating: !!window.__paint.raf }));
check('brillo y destellos son capas CSS (no se redibuja el lienzo)', fx.stars >= 4 && fx.shine === 1 && !fx.canvasAnimating, JSON.stringify(fx));
for (let k = 0; k < 5; k++) { await sleep(520); await p.screenshot({ path: `${OUT}/3-fx-${k}.png` }); }
check('sin errores de consola', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
await b.close();
process.exit(results.every(Boolean) ? 0 : 1);
