// Prueba del panel de Nico: subir foto -> convertir a dibujo -> guardar -> aparece en el catalogo y se puede pintar.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const URL = process.env.URL ?? 'http://localhost:4174';
const SHOTS = process.env.SHOTS ?? 'e2e/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALLO'} ${n} ${x}`); };
const b = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; p.on('pageerror', e => errors.push(e.message));
await p.goto(URL, { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.setItem('nuestra-sopa:local:role', '"nico"'); localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico' })); });
// una "foto": degradado con un circulo y un cuadrado
const dataUrl = await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 600, 400); gr.addColorStop(0, '#ff7a45'); gr.addColorStop(1, '#3a86c8'); g.fillStyle = gr; g.fillRect(0, 0, 600, 400);
  g.fillStyle = '#ffe28a'; g.beginPath(); g.arc(300, 200, 110, 0, 7); g.fill(); g.fillStyle = '#2a1f5a'; g.fillRect(60, 260, 140, 100);
  return c.toDataURL('image/jpeg', 0.9);
});
const file = path.join(os.tmpdir(), 'foto-prueba.jpg'); fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
await p.goto(`${URL}/#admin`); await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
check('se abre el panel de Nico', await p.$('.adm-sec') !== null);
const input = await p.$('.adm-sec input[type=file]'); await input.uploadFile(file); await sleep(1200);
const info = await p.$$eval('.adm-sec .note', e => e.map(x => x.textContent).find(t => /colores/.test(t)) ?? '');
check('la vista previa se genera', /16 colores|colores/.test(info), `(${info})`);
const nonBlank = await p.$eval('.conv-preview', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
check('la vista previa tiene imagen', nonBlank > 100, `(${nonBlank} px)`);
// cambiar a 8 colores y 32x32
await p.select('.adm-sec select:nth-of-type(1)', '32'); await sleep(500);
const swCount = await p.$$eval('.palette-mini .mini-sw', e => e.length);
check('el numero de colores se respeta (<=16)', swCount > 2 && swCount <= 16, `(${swCount})`);
await p.screenshot({ path: `${SHOTS}/30-conversor.png` });
await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Guardar como dibujo')).click()); await sleep(500);
await p.goto(`${URL}/#pintar`); await p.reload({ waitUntil: 'networkidle0' }); await sleep(700);
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(e => e.textContent.includes('Catálogo')).click()); await sleep(300);
const cards = await p.$$eval('.art-card strong', e => e.map(x => x.textContent));
check('el dibujo de la foto sale en el catalogo', cards.some(t => /foto-prueba|Nuestra foto/.test(t)), `(${cards.length} dibujos)`);
await p.screenshot({ path: `${SHOTS}/31-catalogo-foto.png` });
await b.close();
check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
process.exit(results.every(Boolean) ? 0 : 1);
