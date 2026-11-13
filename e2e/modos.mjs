// Menu nuevo (Aventura como carpeta), progreso separado por modo y palabras extra. Uso: URL=http://localhost:5199 node e2e/modos.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5199';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALLO'} ${n} ${x}`); };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(() => {
  const stars = {}; for (let i = 0; i < 9; i++) stars[`inicio:${i}`] = 3;          // solo en CHILL: 9 niveles hechos
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 100, settings: { tutorialDone: true, music: false, sfx: false } }));
});
const open = async hash => { await p.goto('about:blank'); await p.goto(`${URL}/?e2e#${hash}`, { waitUntil: 'networkidle0' }); await sleep(900); };
const clickSlide = async i => { await p.evaluate(i => document.querySelectorAll('.slide')[i].click(), i); await sleep(700); await p.evaluate(() => document.querySelector('.slide.active').click()); await sleep(1500); };

await open('jugar');
const titles = await p.$$eval('.slide .slide-title', e => e.map(x => x.textContent));
check('Jugar tiene 5 entradas: Aventura, Reto diario, Infinito, A dos, Relax', JSON.stringify(titles) === JSON.stringify(['Aventura', 'Reto diario', 'Infinito', 'A dos', 'Relax']), JSON.stringify(titles));
await p.evaluate(() => document.querySelector('.slide.active').click()); await sleep(900);
const modes = await p.$$eval('.slide .slide-title', e => e.map(x => x.textContent));
check('Aventura contiene los modos', JSON.stringify(modes) === JSON.stringify(['Chill', 'Contrarreloj', 'Con puntos', 'Acertijos', 'A ciegas']), JSON.stringify(modes));

// --- chill: va por el nivel 10 ---
await p.evaluate(() => document.querySelector('.slide.active').click()); await sleep(1500);
const nextChill = await p.evaluate(() => document.querySelector('.lvl.next .n')?.textContent);
check('en Chill el siguiente nivel es el 10', nextChill === '10', `(${nextChill})`);

// --- contrarreloj: empieza en el 1 ---
await open('aventura');
await clickSlide(1);
const nextTimed = await p.evaluate(() => document.querySelector('.lvl.next .n')?.textContent);
check('en Contrarreloj sigues en el nivel 1', nextTimed === '1', `(${nextTimed})`);
check('en Contrarreloj el nivel 2 esta bloqueado', await p.evaluate(() => { const l = [...document.querySelectorAll('.lvl')].find(x => x.getAttribute('aria-label')?.includes('nivel 2,')); return !!l?.disabled; }));

// --- jugar el nivel 1 de contrarreloj y ganarlo ---
await p.evaluate(() => { const n = [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.startsWith('1')); n.scrollIntoView({ block: 'center' }); n.click(); });
await sleep(2600);
const info = await p.evaluate(() => {
  const pz = window.__ns.puzzle, bd = document.querySelector('.board').getBoundingClientRect();
  const chips = [...document.querySelectorAll('.g-word:not([hidden]) .g-word-t')].map(e => e.textContent.trim().replace(/[^A-ZÑ]/g, ''));
  return { pl: pz.placements, l: bd.left, t: bd.top, cs: bd.width / pz.size, chips, coins: document.querySelector('.g-coins span')?.textContent };
});
const extras = info.pl.filter(pl => !info.chips.includes(pl.word));
check('hay palabras extra escondidas en el tablero', extras.length >= 1, `(${extras.map(e => e.word).join(', ')})`);
const at = (r, c) => [info.l + (c + 0.5) * info.cs, info.t + (r + 0.5) * info.cs];
const drag = async pl => {
  const [x1, y1] = at(pl.r, pl.c), [x2, y2] = at(pl.r + pl.dr * (pl.word.length - 1), pl.c + pl.dc * (pl.word.length - 1));
  await p.touchscreen.touchStart(x1, y1);
  for (let k = 1; k <= 4; k++) await p.touchscreen.touchMove(x1 + ((x2 - x1) * k) / 4, y1 + ((y2 - y1) * k) / 4);
  await p.touchscreen.touchEnd(); await sleep(250);
};
if (extras[0]) {
  await drag(extras[0]);
  const c2 = await p.evaluate(() => document.querySelector('.g-coins span')?.textContent);
  check('una palabra extra da monedas', Number(c2) > Number(info.coins), `(${info.coins} -> ${c2})`);
  const chip = await p.evaluate(() => document.querySelector('.g-extra-chip')?.textContent);
  check('el contador de extras se actualiza', /Extras: 1/.test(chip ?? ''), `(${chip})`);
}
for (const pl of info.pl.filter(pl => info.chips.includes(pl.word))) await drag(pl);
await sleep(3300);
check('al encontrar las de la lista se completa el nivel (las extra no hacen falta)', await p.$('.result-modal') !== null);
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('nuestra-sopa:state:v1')).stars);
check('las estrellas se guardan en el progreso de Contrarreloj', (st['timed|inicio:0'] ?? 0) >= 1, JSON.stringify(Object.keys(st).filter(k => k.includes('inicio:0'))));
check('y NO tocan el de Chill', st['inicio:0'] === 3 && Object.keys(st).filter(k => !k.includes('|')).length === 9);

// --- infinito: progreso propio, empieza en la isla 1 ---
await open('jugar');
await clickSlide(2);
const nextInf = await p.evaluate(() => ({ n: document.querySelector('.lvl.next .n')?.textContent, chip: document.querySelector('.mode-chip')?.textContent }));
check('Infinito empieza desde el nivel 1 con su propio mapa', nextInf.n === '1' && nextInf.chip === 'Infinito', JSON.stringify(nextInf));

// --- niveles aleatorios: el nivel 1 no repite palabras ---
const seen = new Set();
for (let i = 0; i < 6; i++) {
  await open('aventura'); await clickSlide(3);
  await p.evaluate(() => { const n = [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.startsWith('1')); n.scrollIntoView({ block: 'center' }); n.click(); });
  await sleep(1800);
  seen.add(await p.evaluate(() => window.__ns.puzzle.placements.map(x => x.word).sort().join(',')));
}
check('el nivel 1 cambia de palabras en cada partida (6 partidas, 6 tableros distintos)', seen.size === 6, `(${seen.size} distintos)`);
check('sin errores de consola', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
await b.close();
process.exit(results.every(Boolean) ? 0 : 1);
