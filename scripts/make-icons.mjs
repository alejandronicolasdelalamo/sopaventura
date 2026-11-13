// Genera los iconos PNG (iPhone no usa SVG para la pantalla de inicio). Uso: node scripts/make-icons.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const svg = fs.readFileSync('public/icon.svg', 'utf8');
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
for (const [size, name] of [[180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
  await p.setViewport({ width: size, height: size });
  await p.setContent(`<body style="margin:0;background:#1d1b2e"><div style="width:${size}px;height:${size}px;image-rendering:pixelated">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body>`);
  await p.screenshot({ path: `public/${name}`, omitBackground: false });
}
await b.close();
console.log('Iconos generados en public/');
