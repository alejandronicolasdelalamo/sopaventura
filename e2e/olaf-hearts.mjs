// Toca a Olaf en el menu y captura los corazones. Uso: URL=http://localhost:4174 node e2e/olaf-hearts.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:4174';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.setItem('nuestra-sopa:local:role', '"nico"'); localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', coins: 50, settings: { tutorialDone: true, music: false, sfx: false } })); });
await p.goto('about:blank'); await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' }); await sleep(1200);
await p.click('.olaf'); await sleep(550);
const n = await p.$$eval('.olaf-heart', e => e.length);
await p.screenshot({ path: 'e2e/shots/olaf-corazones.png' });
await sleep(2600);
const after = await p.$$eval('.olaf-heart', e => e.length);
console.log(`corazones al tocar: ${n}; despues de 3 s: ${after}; errores: ${errs.length}`);
await b.close();
process.exit(n >= 5 && after === 0 && !errs.length ? 0 : 1);
