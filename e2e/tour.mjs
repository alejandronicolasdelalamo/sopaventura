// Recorrido con capturas por las pantallas principales. Uso: URL=http://localhost:5199 W=390 H=844 node e2e/tour.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199';
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844);
const OUT = process.env.OUT ?? `e2e/shots/tour-${W}`;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const shot = n => p.screenshot({ path: `${OUT}/${n}.png` });
const click = (sel, t) => p.evaluate((s, t) => { const e = [...document.querySelectorAll(s)].find(x => x.textContent.trim().includes(t)); if (e) e.click(); return !!e; }, sel, t);
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' }); await sleep(600);
await shot('01-login');
await click('button', 'Nico'); await p.type('.code-input', 'prueba1234'); await click('button', 'Entrar'); await sleep(1200);
await shot('02-home');
await click('.slab', 'Jugar'); await sleep(900); await shot('03-jugar');
await p.evaluate(() => document.querySelector('.slide.active').click()); await sleep(1200); await shot('04-mapa');
await p.evaluate(() => { const n = [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.startsWith('1')); n.click(); }); await sleep(600); await shot('05-sheet');
await sleep(1500); await shot('06-juego');
for (const h of ['#tienda', '#logros', '#perfil', '#ajustes', '#nosotros', '#pintar', '#colorear']) { await p.goto(`${URL}/${h}`, { waitUntil: 'networkidle0' }); await sleep(900); await shot('10-' + h.slice(1)); }
console.log('errores:', errs);
await b.close();
