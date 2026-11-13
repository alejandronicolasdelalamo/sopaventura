// Recorre el mapa isla por isla con capturas. Uso: URL=http://localhost:5199 node e2e/map-tour.mjs "Isla Olaf" "Isla Cosmos"
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199';
const OUT = process.env.OUT ?? 'e2e/shots/mapa'; fs.mkdirSync(OUT, { recursive: true });
const names = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: +(process.env.W ?? 390), height: +(process.env.H ?? 844), deviceScaleFactor: +(process.env.DPR ?? 2), isMobile: !process.env.W, hasTouch: !process.env.W });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${URL}/?e2e${process.env.Q ?? ''}`, { waitUntil: 'networkidle0' });
await p.evaluate(() => {
  const L = { inicio: 15, series: 20, anime: 20, pixel: 20, olaf: 15, musica: 25, trap: 20, rivas: 20, madrid: 25, viajes: 20, abisal: 20, bosque: 20, glaciar: 20, golosa: 20, estadio: 20, cosmos: 25, ruta: 20, estreno: 20 };
  const stars = {}; Object.entries(L).forEach(([id, n]) => { for (let i = 0; i < n; i++) stars[`${id}:${i}`] = (i % 3) + 1; });
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 900, settings: { tutorialDone: true, music: false, sfx: false } }));
});
await p.goto('about:blank'); await p.goto(`${URL}/?e2e${process.env.Q ?? ''}#mapa`, { waitUntil: 'networkidle0' }); await sleep(1500);
for (const n of names) {
  await p.evaluate((n, off) => { const s = [...document.querySelectorAll('.isl')].find(x => x.getAttribute('aria-label') === n); const sc = document.querySelector('.map-scroll'); sc.scrollTop = s.offsetTop + off; }, n, +(process.env.OFF ?? -20));
  await sleep(1400);
  await p.screenshot({ path: `${OUT}/${n.replace(/\W+/g, '')}.png` });
}
console.log('errores', errs.slice(0, 3));
await b.close();
