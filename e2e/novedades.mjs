// Comprueba las novedades: tutorial de novedades, volumenes, tablero, misiones, radar, cambio de modo en el mapa,
// criaturas, reto entre los dos y estadisticas por modo. Uso: URL=http://localhost:5199 node e2e/novedades.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5199';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALLO'} ${n} ${x}`); };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(() => {
  const stars = {}; for (let i = 0; i < 9; i++) stars[`inicio:${i}`] = 3;
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 100, powerups: { freeze: 1, clean: 1, bolt: 1, radar: 3 }, settings: { tutorialDone: true, music: false, sfx: false } }));
});
const open = async hash => { await p.goto('about:blank'); await p.goto(`${URL}/?e2e#${hash}`, { waitUntil: 'networkidle0' }); await sleep(900); };
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('nuestra-sopa:state:v1')));

// ---- ajustes: tutorial de novedades, volumenes, tablero
await open('ajustes');
await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Ver tutorial')).click()); await sleep(400);
check('el tutorial de novedades se abre', await p.evaluate(() => !!document.querySelector('.news-box h2')));
const t0 = await p.evaluate(() => document.querySelector('.news-box h2').textContent);
check('en la primera pagina no hay boton Atras', await p.evaluate(() => ![...document.querySelectorAll('.news-box .btn')].some(x => x.textContent.includes('Atrás'))));
await p.evaluate(() => document.querySelector('.news-box .btn.big').click()); await sleep(250);
const t1 = await p.evaluate(() => document.querySelector('.news-box h2').textContent);
check('Siguiente cambia de pagina', t1 !== t0, `(${t0} → ${t1})`);
await p.evaluate(() => [...document.querySelectorAll('.news-box .btn')].find(x => x.textContent.includes('Atrás')).click()); await sleep(250);
check('Atras vuelve a la pagina anterior', (await p.evaluate(() => document.querySelector('.news-box h2').textContent)) === t0);
for (let i = 0; i < 5; i++) { await p.evaluate(() => document.querySelector('.news-box .btn.big').click()); await sleep(250); }
check('al terminarlo queda marcado como visto', (await st()).settings.newsSeen === true);
await p.evaluate(() => { const i = document.getElementById('vol-musicVol'); i.value = '30'; i.dispatchEvent(new Event('input', { bubbles: true })); const j = document.getElementById('vol-sfxVol'); j.value = '55'; j.dispatchEvent(new Event('input', { bubbles: true })); });
const s1 = await st();
check('volumen de musica y de efectos por separado', Math.abs(s1.settings.musicVol - 0.3) < 0.01 && Math.abs(s1.settings.sfxVol - 0.55) < 0.01, `(${s1.settings.musicVol} / ${s1.settings.sfxVol})`);
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent === '10').click());
check('tamaño del tablero 10 guardado', (await st()).settings.boardSize === 10);

// ---- perfil: misiones
await open('perfil');
check('el perfil muestra 4 misiones semanales', (await p.$$('.mission')).length === 4);

// ---- mapa: cambiar de modo y criaturas
await p.evaluate(() => sessionStorage.clear());
await open('mapa');
check('hay criaturas tocables en el mapa', (await p.$$('.critter')).length >= 2);
const before = (await st()).coins;
await p.evaluate(() => document.querySelector('.critter:not(.gone)').click()); await sleep(300);
const after = await st();
check('tocar una criatura da 2 monedas', after.coins === before + 2 && after.critters.n === 1, `(${before} -> ${after.coins})`);
await p.evaluate(() => document.querySelector('.mode-chip').click()); await sleep(400);
await p.evaluate(() => [...document.querySelectorAll('.modal .btn')].find(x => x.textContent.includes('Contrarreloj')).click()); await sleep(1500);
check('el chip del mapa cambia a Contrarreloj', await p.evaluate(() => document.querySelector('.mode-chip')?.textContent.includes('Contrarreloj')));

// ---- partida: radar, extras, reto (seguimos en el mapa de Contrarreloj)
await p.evaluate(() => { const n = [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.startsWith('1')); n.scrollIntoView({ block: 'center' }); n.click(); }); await sleep(2600);
check('el boton de Radar existe', await p.evaluate(() => !!document.querySelector('.g-pw[data-k=radar]')));
await p.evaluate(() => document.querySelector('.g-pw[data-k=radar]').click()); await sleep(400);
const rad = await p.evaluate(() => document.querySelectorAll('.g-cell.radar').length);
check('el radar marca una zona de 3x3', rad === 9, `(${rad})`);
check('el radar gasta una unidad', (await st()).powerups.radar === 2);
const info = await p.evaluate(() => {
  const pz = window.__ns.puzzle, bd = document.querySelector('.board').getBoundingClientRect();
  const chips = [...document.querySelectorAll('.g-word:not([hidden]) .g-word-t')].map(e => e.textContent.trim().replace(/[^A-ZÑ]/g, ''));
  return { pl: pz.placements.filter(x => chips.includes(x.word)), l: bd.left, t: bd.top, cs: bd.width / pz.size };
});
const at = (r, c) => [info.l + (c + 0.5) * info.cs, info.t + (r + 0.5) * info.cs];
for (const pl of info.pl) {
  const [x1, y1] = at(pl.r, pl.c), [x2, y2] = at(pl.r + pl.dr * (pl.word.length - 1), pl.c + pl.dc * (pl.word.length - 1));
  await p.touchscreen.touchStart(x1, y1);
  for (let k = 1; k <= 4; k++) await p.touchscreen.touchMove(x1 + ((x2 - x1) * k) / 4, y1 + ((y2 - y1) * k) / 4);
  await p.touchscreen.touchEnd(); await sleep(260);
}
await sleep(3500);
check('aparece el boton Retar', await p.evaluate(() => [...document.querySelectorAll('.g-result .btn')].some(x => x.textContent.startsWith('Retar'))));
await p.evaluate(() => [...document.querySelectorAll('.g-result .btn')].find(x => x.textContent.startsWith('Retar')).click()); await sleep(400);
check('el reto se envia', await p.evaluate(() => [...document.querySelectorAll('.g-result .btn')].some(x => x.textContent.includes('Reto enviado'))));
const s2 = await st();
check('las misiones avanzan al ganar', s2.missions.items.some(i => i.n > 0), JSON.stringify(s2.missions.items.map(i => i.id + ':' + i.n)));
check('se guarda la mejor marca del modo', !!s2.modeBest?.timed, JSON.stringify(s2.modeBest));

// ---- estadisticas por modo
await open('estadisticas');
check('estadisticas por modo', (await p.$$('.mode-stat')).length === 5);
check('sin errores de consola', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
await b.close();
process.exit(results.every(Boolean) ? 0 : 1);
