// Abre el catalogo de Pintar con todas las islas completadas y un mural. Uso: URL=http://localhost:5199 ID=mural-inicio node e2e/mural-tour.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199', ID = process.env.ID ?? 'mural-inicio';
const OUT = process.env.OUT ?? 'e2e/shots/murales'; fs.mkdirSync(OUT, { recursive: true });
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
await p.goto('about:blank'); const t0 = Date.now(); await p.goto(`${URL}/?e2e#pintar`, { waitUntil: 'networkidle0' }); await sleep(800);
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent.includes('Catálogo')).click());
for (let i = 0; i < 40; i++) { const n = await p.evaluate(() => document.querySelectorAll('.art-card').length); const m = await p.evaluate(() => [...document.querySelectorAll('.art-card')].filter(c => c.textContent.includes('Mural')).length); if (m >= 18) { console.log('murales listos:', m, 'en', Date.now() - t0, 'ms; tarjetas', n); break; } await sleep(500); }
await p.evaluate(() => { const c = [...document.querySelectorAll('.art-card')].find(x => x.textContent.includes('Mural')); c?.scrollIntoView({ block: 'center' }); });
await sleep(400); await p.screenshot({ path: `${OUT}/catalogo.png` });
await p.evaluate(id => { const c = [...document.querySelectorAll('.art-card')].find(x => x.textContent.includes('Mural') && (x.dataset.id === id || true)); c.click(); }, ID); await sleep(1500);
await p.screenshot({ path: `${OUT}/lienzo.png` });
console.log('hud:', await p.$eval('.hud-title', e => e.textContent), await p.$eval('.hud-meta', e => e.textContent), 'colores:', await p.$$eval('.swatch', e => e.length), 'errores', errs.slice(0, 3));
await b.close();
