// Capturas del menu a distintas horas. Uso: URL=http://localhost:5199 node e2e/sky-shots.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:5199';
const OUT = 'e2e/shots/cielo'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.setItem('nuestra-sopa:local:role', '"nico"'); localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', coins: 50, settings: { tutorialDone: true, newsSeen: true, music: false, sfx: false } })); });
for (const part of ['night', 'dusk', 'day', 'dawn']) {
  await p.goto('about:blank'); await p.goto(`${URL}/?e2e&hora=${part}&temporada=primavera`, { waitUntil: 'networkidle0' }); await sleep(1500);
  await p.screenshot({ path: `${OUT}/${part}.png` });
}
await b.close();
