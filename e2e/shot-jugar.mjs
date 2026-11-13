// Captura del menu Jugar en movil y PC. Uso: URL=http://localhost:5200 node e2e/shot-jugar.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5200';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
for (const [n, w, h, mobile] of [['movil', 390, 844, true], ['movil-peq', 360, 640, true], ['pc', 1440, 900, false], ['se', 320, 568, true]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
  await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { localStorage.setItem('nuestra-sopa:local:role', '"nico"'); localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', coins: 50, settings: { tutorialDone: true, newsSeen: true, music: false, sfx: false } })); });
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
  await p.evaluate(() => { location.hash = '#jugar'; }); await sleep(2000);
  await p.screenshot({ path: `e2e/shots/jugar-${n}.png` });
  await p.close();
}
await b.close();
