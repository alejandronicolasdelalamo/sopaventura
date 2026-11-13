// Capturas para el README (docs/capturas). Uso: URL=http://localhost:5199 node e2e/capturas.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199';
const OUT = process.env.OUT ?? 'docs/capturas';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const shot = n => p.screenshot({ path: `${OUT}/${n}.png` });

await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' }); await sleep(700);
await shot('01-login');

await p.evaluate(() => {
  const L = { inicio: 15, series: 20, anime: 8 };
  const stars = {}; Object.entries(L).forEach(([id, n]) => { for (let i = 0; i < n; i++) stars[`${id}:${i}`] = i % 3 === 0 ? 2 : 3; });
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 420, hints: 3, reveals: 2, streak: { count: 6, last: new Date().toISOString().slice(0, 10) }, settings: { tutorialDone: true, newsSeen: true, music: false, sfx: false } }));
});
await p.goto(`${URL}/?e2e&hora=night`, { waitUntil: 'networkidle0' }); await sleep(1500);
await shot('02-menu');

// Jugar > Aventura > Chill (mapa)
await p.goto(`${URL}/?e2e#jugar`, { waitUntil: 'networkidle0' }); await sleep(900);
await shot('02b-jugar');
await p.evaluate(() => document.querySelector('.slide.active').click()); await sleep(900);
await p.evaluate(() => document.querySelector('.slide.active').click()); await sleep(2200);
await shot('03-mapa');

// partida: nivel 4 de la primera isla
await p.evaluate(() => {
  const lv = [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.trim().startsWith('4'));
  lv?.scrollIntoView({ block: 'center' }); lv?.click();
});
await sleep(3200);
await shot('04-partida');

for (const [h, n] of [['#pintar', '05-pintar'], ['#colorear', '06-colorear'], ['#tienda', '07-tienda'], ['#logros', '08-logros'], ['#perfil', '09-perfil']]) {
  await p.goto(`${URL}/?e2e${h}`, { waitUntil: 'networkidle0' }); await sleep(1400); await shot(n);
}
console.log('errores:', errs);
await b.close();
