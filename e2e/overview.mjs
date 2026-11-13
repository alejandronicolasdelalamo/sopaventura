// "Primer vistazo": captura las pantallas clave con una partida avanzada y las junta en una sola imagen.
// Uso: npm run build && npm run preview -- --port 4176 &   node e2e/overview.mjs
// Salida: private/vistazo.png (carpeta ignorada por git: puede incluir recuerdos personales) y capturas sueltas en SHOTS.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.env.URL ?? 'http://localhost:4176';
const SHOTS = process.env.SHOTS ?? 'e2e/shots';
fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync('private', { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; p.on('pageerror', e => errors.push(e.message));
const shots = [];
const shot = async (n, label) => { const f = `${SHOTS}/${n}.png`; await p.screenshot({ path: f }); shots.push({ f, label }); };
const click = (sel, text) => p.evaluate((sel, text) => { const e = [...document.querySelectorAll(sel)].find(x => x.textContent.includes(text)); if (e) e.click(); return !!e; }, sel, text);

// ---- 1) login con avatares (sin sesion) ----
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' }); await sleep(900);
await shot('v01-login', 'Entrar: elige quién eres');

// ---- 2) partida avanzada ----
await p.evaluate(() => {
  const L = { inicio: 15, series: 20, anime: 20, pixel: 20, olaf: 15, musica: 25, trap: 20, rivas: 20 };
  const stars = {}; Object.entries(L).forEach(([id, n]) => { for (let i = 0; i < n; i++) stars[`${id}:${i}`] = i % 5 === 0 ? 2 : 3; });
  stars['madrid:0'] = 3;
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 380, hints: 3, reveals: 2, streak: { count: 5, last: new Date().toISOString().slice(0, 10) }, achievements: ['primera', 'diez', 'perfecto'], stats: { levelsDone: 40, wordsFound: 260, perfect: 22, paintDone: 1, dailyDone: 2, messagesSent: 3 }, owned: ['img:retrato-izana'] }));
});
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' }); await sleep(1000);
await shot('v02-inicio', 'Inicio con tu avatar');
await p.goto(`${URL}/?e2e#avatar`); await sleep(700);
await shot('v03-avatar', 'Editor de avatar (predeterminado: Nico)');
await p.evaluate(() => [...document.querySelectorAll('button')].find(e => e.textContent.includes('Como Izana')).click()); await sleep(400);
await shot('v04-avatar-izana', 'Y el de Izana');
await p.goto(`${URL}/?e2e#nosotros`); await sleep(900);
await shot('v05-nosotros', 'Nosotros: los dos avatares');

// ---- 3) mapa: Isla Madrid ----
await p.goto(`${URL}/?e2e#mapa`); await sleep(900);
await p.evaluate(() => { const s = [...document.querySelectorAll('.island')].find(x => x.textContent.includes('Isla Madrid')); s.scrollIntoView({ block: 'start' }); });
await sleep(900);
await shot('v06-isla-madrid', 'Isla Madrid: metro y barrios');
await p.evaluate(() => { const s = [...document.querySelectorAll('.island')].find(x => x.textContent.includes('Isla Rivas')); s.scrollIntoView({ block: 'start' }); }); await sleep(600);
await shot('v07-isla-rivas', 'Isla Rivas: parques, centros y metro');

// ---- 4) jugar un nivel del metro (tema Metro de Madrid, modo Acertijos) ----
await p.evaluate(() => { const s = [...document.querySelectorAll('.island')].find(x => x.textContent.includes('Isla Madrid')); [...s.querySelectorAll('.node')].find(n => n.querySelector('.n').textContent === '1').click(); }); await sleep(500);
await shot('v08-modos', 'Elegir modo');
await click('.mode-btn', 'Acertijos'); await sleep(1000);
await shot('v09-juego-acertijos', 'Acertijos: pistas del metro y Madrid');

// ---- 5) pintar ----
await p.goto(`${URL}/?e2e#pintar`); await sleep(800);
await click('.seg-btn', 'Catálogo'); await sleep(500);
await p.evaluate(() => { const b = document.querySelector('.page-body'); b.scrollTo(0, b.scrollHeight); }); await sleep(500);
await shot('v10-catalogo', 'Catálogo: vuestros retratos pixel art');
await click('.art-card', 'Nico'); await sleep(1200);
await p.evaluate(() => { const e = window.__paint; const c = []; e.tpl.cells.forEach((v, i) => { if (v !== 255 && v < Math.floor(e.tpl.palette.length * 0.45)) c.push(i); }); e.applyRemote({ id: 'ov1', t: 'p', c, by: 2, ts: 1 }, false); }); await sleep(900);
await shot('v11-pintando', 'Pintando a medias (los números siguen)');
await p.evaluate(() => { const e = window.__paint; const c = []; e.tpl.cells.forEach((v, i) => { if (v !== 255) c.push(i); }); e.applyRemote({ id: 'ov2', t: 'p', c, by: 1, ts: 2 }, false); }); await sleep(1700);
await shot('v12-revelado', 'Revelado final');
await sleep(2800);
await shot('v13-recuerdo', 'Recompensa: el recuerdo con la foto');
await p.goto(`${URL}/?e2e#pintar`); await sleep(700);
await click('.seg-btn', 'Galería'); await sleep(500);
await shot('v14-galeria', 'Galería de obras terminadas');

await b.close();
// ---- hoja de contacto ----
const b2 = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const q = await b2.newPage();
const cols = 5, w = 300, h = Math.round((844 / 390) * w) + 34;
const html = `<body style="margin:0;background:#1d1b2e;font-family:monospace;color:#fff8e8"><div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:14px;padding:16px;width:${cols * (w + 14) + 18}px">` +
  shots.map(s => `<div><img src="data:image/png;base64,${fs.readFileSync(s.f).toString('base64')}" style="width:${w}px;display:block;box-shadow:0 0 0 3px #0e0c1a"><div style="padding:6px 2px;font-size:15px">${s.label}</div></div>`).join('') + `</div></body>`;
await q.setViewport({ width: cols * (w + 14) + 18, height: 400 });
await q.setContent(html, { waitUntil: 'load' });
await q.screenshot({ path: 'private/vistazo.png', fullPage: true });
await b2.close();
console.log(`${shots.length} capturas -> private/vistazo.png` + (errors.length ? `\nErrores JS: ${errors.join(' | ')}` : '\nSin errores de JavaScript'));
