// Prueba de humo en navegador movil emulado (Chrome). Uso:  npm run build && npm run preview &  node e2e/smoke.mjs
// Variables: URL (por defecto http://localhost:4174), SHOTS (carpeta de capturas), CHROME (ruta de Chrome).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = process.env.URL ?? 'http://localhost:4174';
const SHOTS = process.env.SHOTS ?? 'e2e/shots';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FALLO'} ${name} ${extra}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = n => page.screenshot({ path: `${SHOTS}/${n}.png` });
const clickText = async (sel, text) => {
  const ok = await page.evaluate((sel, text) => {
    const el = [...document.querySelectorAll(sel)].find(e => e.textContent.trim().includes(text));
    if (el) { el.click(); return true; } return false;
  }, sel, text);
  if (!ok) throw new Error(`No encuentro ${sel} con "${text}"`);
};

try {
  // ---- login (modo local) ----
  await page.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
  await sleep(600);
  check('aparece el login', await page.$('.login') !== null);
  await shot('01-login');
  await clickText('button', 'Nico');
  await page.type('.code-input', 'prueba1234');
  await clickText('button', 'Entrar');
  await sleep(900);
  check('entra al inicio', await page.$('.home') !== null);
  await shot('02-inicio');

  // ---- jugar: carrusel de modos -> mapa ----
  await clickText('.slab', 'Jugar');
  await sleep(800);
  check('se ve el carrusel de modos', (await page.$$('.carousel .slide')).length >= 5);
  await shot('02b-modos-slides');
  await page.evaluate(() => document.querySelectorAll('.slide')[1].click());   // desliza al segundo
  await sleep(700);
  check('el carrusel cambia de modo', await page.evaluate(() => document.querySelectorAll('.slide')[1].classList.contains('active')));
  await shot('02c-modos-slide2');
  await page.evaluate(() => document.querySelectorAll('.slide')[0].click());
  await sleep(700);
  await page.evaluate(() => document.querySelector('.slide.active').click());   // entra en Aventura (carpeta de modos)
  await sleep(800);
  check('Aventura muestra los modos', (await page.$$('.carousel .slide')).length >= 5);
  await page.evaluate(() => document.querySelector('.slide.active').click());   // Chill
  await sleep(800);
  check('se ve el mapa con islas', (await page.$$('.isl')).length >= 10);
  await shot('03-mapa');

  // ---- nivel 1 en modo Chill ----
  await page.evaluate(() => { const n = [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.startsWith('1')); n.scrollIntoView({ block: 'center' }); });
  await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.startsWith('1')).click());
  await sleep(400);
  await sleep(900);
  check('arranca la partida', await page.$('.board') !== null);
  await shot('05-juego');

  // ---- resolver deslizando el dedo (touch real) sobre cada palabra ----
  const info = await page.evaluate(() => {
    const p = window.__ns.puzzle, b = document.querySelector('.board').getBoundingClientRect();
    return { pl: p.placements, size: p.size, l: b.left, t: b.top, cs: b.width / p.size };
  });
  check('el tablero cabe en pantalla', info.l >= 0 && info.l + info.cs * info.size <= 390 + 1, `(cs=${info.cs.toFixed(1)}px, tablero ${info.size}x${info.size})`);
  const at = (r, c) => [info.l + (c + 0.5) * info.cs, info.t + (r + 0.5) * info.cs];
  // primero un intento fallido (para probar el feedback de error)
  { const [x1, y1] = at(0, 0), [x2, y2] = at(0, 1); await page.touchscreen.touchStart(x1, y1); await page.touchscreen.touchMove(x2, y2); await page.touchscreen.touchEnd(); }
  await sleep(150);
  let scrolled = await page.evaluate(() => window.scrollY);
  for (const [i, pl] of info.pl.entries()) {
    const [x1, y1] = at(pl.r, pl.c), [x2, y2] = at(pl.r + pl.dr * (pl.word.length - 1), pl.c + pl.dc * (pl.word.length - 1));
    // la ultima palabra: la hacemos AL REVES para probar esa direccion
    const rev = i === info.pl.length - 1;
    const [sx, sy, ex, ey] = rev ? [x2, y2, x1, y1] : [x1, y1, x2, y2];
    await page.touchscreen.touchStart(sx, sy);
    for (let k = 1; k <= 4; k++) await page.touchscreen.touchMove(sx + ((ex - sx) * k) / 4, sy + ((ey - sy) * k) / 4);
    await page.touchscreen.touchEnd();
    await sleep(i === 0 ? 120 : 60);
    if (i === 0) await shot('06-palabra-encontrada');
  }
  scrolled = await page.evaluate(() => window.scrollY);
  check('no hay scroll al deslizar sobre el tablero', scrolled === 0);
  await sleep(2800);
  check('aparece el resultado al encontrar todas', await page.$('.result-modal') !== null);
  const stars = await page.$$eval('.result-stars .pstar.on', e => e.length);
  check('se otorgan estrellas', stars >= 1, `(${stars})`);
  await shot('07-victoria');
  await clickText('button', 'Volver al mapa');
  await sleep(600);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('nuestra-sopa:state:v1')));
  check('se guarda el progreso', (st.stars['inicio:0'] ?? 0) >= 1 && st.coins > 50, `(estrellas ${st.stars['inicio:0']}, monedas ${st.coins})`);
  await shot('08-mapa-progreso');

  // ---- pintar por numeros ----
  await page.goto(`${URL}/#pintar`, { waitUntil: 'networkidle0' });
  await sleep(700);
  await clickText('.seg-btn', 'Catálogo');
  await sleep(300);
  await shot('09-catalogo');
  await clickText('.art-card', 'Corazón');
  await sleep(900);
  check('se abre el lienzo', await page.$('.paint-canvas') !== null);
  await shot('10-pintar-inicio');
  const cnv = await page.$eval('.paint-canvas', c => { const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  // zoom con dos dedos no se puede simular con puppeteer; usamos la rueda (mismo camino de codigo de zoom)
  await page.mouse.move(cnv.l + cnv.w / 2, cnv.t + cnv.h / 2);
  await page.mouse.wheel({ deltaY: -500 });
  await sleep(300);
  await shot('11-pintar-zoom');
  // elegir color 2 y tocar una casilla de ese color
  await page.mouse.wheel({ deltaY: 500 });
  await sleep(300);
  await page.evaluate(() => document.querySelectorAll('.swatch')[1].click());
  await sleep(400);
  await shot('12-color-iluminado');
  // buscar una casilla del color 2 en pantalla (heart 24x24): barrido de toques hasta que pinte
  const before = await page.$eval('.hud-meta', e => e.textContent);
  let painted = false;
  for (let y = cnv.t + 60; y < cnv.t + cnv.h - 60 && !painted; y += 14) for (let x = cnv.l + 20; x < cnv.l + cnv.w - 20 && !painted; x += 14) {
    await page.mouse.click(x, y); await sleep(30);
    const m = await page.$eval('.hud-meta', e => e.textContent);
    if (m !== before) painted = true;
  }
  await sleep(250);
  await shot('13-ola-pintando');
  await sleep(1200);
  await shot('14-color-pintado');
  check('el pintado por color avanza el progreso', painted);
  const after = await page.$eval('.hud-meta', e => e.textContent);
  check('pintar un color pinta muchas casillas a la vez', parseInt(after) > 5, `(${before} -> ${after})`);

  // ---- colorear libre ----
  await page.goto(`${URL}/#pintar-menu`, { waitUntil: 'networkidle0' }); await sleep(700);
  await shot('14b-pintar-menu');
  await clickText('.slide', 'Colorear libre'); await sleep(700);
  check('lista de dibujos para colorear', (await page.$$('.cpage-card')).length >= 10);
  await shot('14c-colorear-lista');
  await clickText('.cpage-card', 'Gatito'); await sleep(900);
  const paper = await page.$eval('.color-paper', c => { const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  await page.evaluate(() => document.querySelectorAll('.cswatch:not(.add)')[3].click());
  await page.mouse.click(paper.l + paper.w * 0.41, paper.t + paper.h * 0.40); await sleep(300);
  await page.evaluate(() => document.querySelectorAll('.cswatch:not(.add)')[8].click());
  await page.mouse.click(paper.l + paper.w * 0.5, paper.t + paper.h * 0.78); await sleep(300);
  await page.mouse.click(paper.l + paper.w * 0.1, paper.t + paper.h * 0.1); await sleep(300);
  const colored = await page.evaluate(() => { const c = document.querySelector('.color-paper canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] !== 255 || d[i + 1] !== 255) n++; return n; });
  check('el cubo de pintura colorea zonas', colored > 5000, `(${colored} px)`);
  await shot('14d-colorear');

  // ---- otras pantallas ----
  for (const [hash, name] of [['perfil', '15a-perfil'], ['tienda', '15-tienda'], ['nosotros', '16-nosotros'], ['logros', '17-logros'], ['ajustes', '18-ajustes']]) {
    await page.goto(`${URL}/#${hash}`, { waitUntil: 'networkidle0' }); await sleep(600);
    check(`pantalla ${hash}`, (await page.$('.page-body')) !== null);
    await shot(name);
  }
  // ---- carta ----
  await page.goto(`${URL}/#nosotros`, { waitUntil: 'networkidle0' }); await sleep(500);
  await clickText('button', '¡Te quierooo!'); await sleep(300);
  await page.goto(`${URL}/#buzon`, { waitUntil: 'networkidle0' }); await sleep(600);
  await clickText('.seg-btn', 'Enviadas'); await sleep(300);
  check('el mensaje rapido queda en el buzon', await page.$('.mail-row') !== null);
  await shot('19-buzon');

  // ---- offline: el service worker debe servir la app sin red ----
  await page.goto(`${URL}/`, { waitUntil: 'networkidle0' }); await sleep(1500);
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(1500);
  check('funciona sin internet (service worker)', await page.$('.screen') !== null);
  await shot('20-offline');
  await page.setOfflineMode(false);
} catch (e) {
  check(`excepcion: ${e.message}`, false);
  await shot('error').catch(() => {});
}

const real = errors.filter(e => !/favicon|manifest|Failed to load resource/.test(e));
check('sin errores de consola', real.length === 0, real.length ? `\n  ${real.slice(0, 5).join('\n  ')}` : '');
await browser.close();
const bad = results.filter(r => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} comprobaciones correctas`);
process.exit(bad ? 1 : 0);
