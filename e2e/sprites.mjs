// Hoja de contacto de los sprites de entorno (env-*). Uso: URL=http://localhost:5199 node e2e/sprites.mjs [prefijo]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199';
const prefix = process.argv[2] ?? 'env-';
fs.mkdirSync('e2e/shots/sprites', { recursive: true });
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 1100, height: 700, deviceScaleFactor: 1 });
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
const err = [];
p.on('pageerror', e => err.push(e.message));
const png = await p.evaluate(async prefix => {
  const m = await import('/src/paint/images.ts');
  const list = m.builtinTemplates().filter(t => t.id.startsWith(prefix));
  const SC = 4, PAD = 12, cols = 5;
  let x = PAD, y = PAD, rowH = 0; const cv = document.createElement('canvas'); cv.width = 1100; cv.height = 1500;
  const g = cv.getContext('2d'); g.fillStyle = '#4a9a40'; g.fillRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
  let n = 0;
  for (const t of list) {
    const w = t.w * SC, h = t.h * SC;
    if (x + w + PAD > cv.width) { x = PAD; y += rowH + PAD; rowH = 0; }
    const tc = document.createElement('canvas'); tc.width = t.w; tc.height = t.h; const tg = tc.getContext('2d');
    t.cells.forEach((c, i) => { if (c === 255) return; tg.fillStyle = t.palette[c]; tg.fillRect(i % t.w, (i / t.w) | 0, 1, 1); });
    g.drawImage(tc, x, y, w, h); x += w + PAD; rowH = Math.max(rowH, h); n++;
  }
  const out = document.createElement('canvas'); out.width = cv.width; out.height = y + rowH + PAD; out.getContext('2d').drawImage(cv, 0, 0);
  return out.toDataURL('image/png');
}, prefix);
fs.writeFileSync(`e2e/shots/sprites/${prefix.replace(/\W/g, '')}.png`, Buffer.from(png.split(',')[1], 'base64'));
console.log('errores', err);
await b.close();
