// Comprueba que el mapa y las partidas funcionan igual con y sin Web Worker. Uso: URL=http://localhost:4174 node e2e/worker-fallback.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:4174';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
let bad = 0;
for (const noWorker of [false, true]) {
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  if (noWorker) await p.evaluateOnNewDocument(() => { delete window.Worker; });
  await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { const stars = {}; for (let i = 0; i < 15; i++) stars[`inicio:${i}`] = 3; localStorage.setItem('nuestra-sopa:local:role', '"nico"'); localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 100, settings: { tutorialDone: true, music: false } })); });
  await p.goto('about:blank'); await p.goto(`${URL}/?e2e#mapa`, { waitUntil: 'networkidle0' }); await sleep(2500);
  const r = await p.evaluate(() => {
    const cv = [...document.querySelectorAll('.isl-art.pop-in')];   // solo los ya pintados (los lejanos siguen vacios)
    const g = cv[0]?.getContext('2d'); const px = g ? g.getImageData(0, 0, cv[0].width, cv[0].height).data : [];
    let colored = 0; for (let i = 3; i < px.length; i += 4000) if (px[i] > 0) colored++;
    return { scenes: cv.length, colored, npc: document.querySelectorAll('.npc img').length, hasWorker: typeof Worker !== 'undefined' };
  });
  const ok = r.scenes >= 1 && r.colored > 20 && r.npc >= 1 && errs.length === 0;
  console.log(ok ? 'OK  ' : 'FALLO', noWorker ? 'sin Worker' : 'con Worker', JSON.stringify(r), errs.slice(0, 2));
  if (!ok) bad++;
  // partida: fondo de la isla + tablero
  await p.evaluate(() => [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.startsWith('1')).click()); await sleep(400);
  await p.evaluate(() => document.querySelector('.mode-btn')?.click()); await sleep(2500);
  const g = await p.evaluate(() => ({ board: !!document.querySelector('.board'), bg: getComputedStyle(document.querySelector('.game')).getPropertyValue('--bgimg').slice(0, 20) }));
  const okg = g.board && g.bg.includes('url');
  console.log(okg ? 'OK  ' : 'FALLO', noWorker ? 'sin Worker' : 'con Worker', 'partida', JSON.stringify(g)); if (!okg) bad++;
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
