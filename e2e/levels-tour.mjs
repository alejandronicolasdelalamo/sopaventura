// Abre niveles concretos (con todo desbloqueado) y saca capturas. Uso: W=390 H=844 node e2e/levels-tour.mjs "Isla Maleta:3" "Isla Estadio:3"
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199';
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844);
const OUT = process.env.OUT ?? `e2e/shots/lv-${W}x${H}`;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const targets = process.argv.slice(2).map(a => { const [n, i] = a.split(':'); return { n, i: +i }; });
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(() => {
  const L = { inicio: 15, series: 20, anime: 20, pixel: 20, olaf: 15, musica: 25, trap: 20, rivas: 20, madrid: 25, viajes: 20, abisal: 20, bosque: 20, glaciar: 20, golosa: 20, estadio: 20, cosmos: 25, ruta: 20, estreno: 20 };
  const stars = {}; Object.entries(L).forEach(([id, n]) => { for (let i = 0; i < n; i++) stars[`${id}:${i}`] = 3; });
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 500, hints: 3, reveals: 2, settings: { tutorialDone: true, music: false, sfx: false } }));
});
await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
for (const t of targets) {
  await p.goto('about:blank'); await p.goto(`${URL}/?e2e#mapa`, { waitUntil: 'networkidle0' }); await sleep(1800);
  const ok = await p.evaluate((n, i) => {
    const isl = [...document.querySelectorAll('.isl')].find(x => x.getAttribute('aria-label') === n);
    if (!isl) return 'sin isla';
    const lv = [...isl.querySelectorAll('.lvl')].find(x => x.textContent.trim().startsWith(String(i)));
    if (!lv) return 'sin nivel'; lv.scrollIntoView({ block: 'center' }); lv.click(); return 'ok';
  }, t.n, t.i);
  await sleep(400);
  if (ok !== 'ok') { console.log(t, ok); continue; }
  await p.evaluate(() => { const m = document.querySelector('.mode-btn'); if (m) m.click(); });
  await sleep(500);
  const tag = `${t.n.replace(/\W+/g, '')}-${t.i}`;
  await p.screenshot({ path: `${OUT}/${tag}-a.png` });
  await sleep(2600);
  await p.screenshot({ path: `${OUT}/${tag}-b.png` });
  const info = await p.evaluate(() => { const bd = document.querySelector('.board'); const r = bd?.getBoundingClientRect(); const w = window.__ns?.puzzle; return { size: w?.size, words: w?.placements.length, bw: r && Math.round(r.width), bh: r && Math.round(r.height), top: r && Math.round(r.top), bottom: r && Math.round(r.bottom), actions: Math.round(document.querySelector('.g-actions')?.getBoundingClientRect().top ?? 0), scroll: document.querySelector('.game2')?.scrollHeight - document.querySelector('.game2')?.clientHeight }; });
  console.log(tag, JSON.stringify(info));
}
console.log('errores:', errs);
await b.close();
