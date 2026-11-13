// Comprueba: pintar casilla a casilla, el color NO cambia solo al completarlo, y los iconos "i" con su boton Atras.
// Uso (con un servidor en modo local): URL=http://localhost:5200 node e2e/pintar-ayuda.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5200';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FALLO'} ${n} ${x}`); };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
await p.evaluate(() => {
  const stars = {}; for (let i = 0; i < 15; i++) stars[`inicio:${i}`] = 3;
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  // paintMode 'auto' (valor antiguo guardado) debe pasar a casilla a casilla
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 900, settings: { tutorialDone: true, newsSeen: true, music: false, sfx: false, paintMode: 'auto' } }));
});
const open = async hash => { await p.goto('about:blank'); await p.goto(`${URL}/?e2e#${hash}`, { waitUntil: 'networkidle0' }); await sleep(1000); };

// ---- Jugar: icono de ayuda con Atras
await open('jugar');
check('Jugar tiene el boton de informacion', await p.evaluate(() => !!document.querySelector('.info-help')));
await p.evaluate(() => document.querySelector('.info-help').click()); await sleep(300);
check('la informacion de Jugar se abre', await p.evaluate(() => !!document.querySelector('.news-box h2')));
await p.evaluate(() => document.querySelector('.news-box .btn.big').click()); await sleep(300);
check('Entendido cierra la informacion', await p.evaluate(() => !document.querySelector('.news-box')));

// ---- Jugar: si un texto no cupiera, se desplaza DENTRO de la misma caja (sin abrir ninguna ventana)
await open('jugar');
const scrollInfo = await p.evaluate(() => {
  const d = document.querySelector('.slide.active .slide-desc');
  d.textContent = 'Texto largo de prueba. '.repeat(14);
  const before = { sh: d.scrollHeight, ch: d.clientHeight };
  d.scrollTop = 30;
  return { ...before, top: d.scrollTop, oy: getComputedStyle(d).overflowY, modal: !!document.querySelector('.modal-back') };
});
check('el texto largo se puede desplazar dentro de su caja', scrollInfo.sh > scrollInfo.ch && scrollInfo.top > 0 && scrollInfo.oy === 'auto' && !scrollInfo.modal, JSON.stringify(scrollInfo));
check('las tarjetas ya no son botones anidados (div con rol)', await p.evaluate(() => [...document.querySelectorAll('.slide')].every(c => c.tagName === 'DIV' && c.getAttribute('role') === 'option')));

// ---- Pintar: casilla a casilla
await open('pintar');
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent.includes('Catálogo')).click()); await sleep(500);
await p.evaluate(() => { const c = [...document.querySelectorAll('.art-card')].find(x => x.textContent.toLowerCase().includes('cerezo')); c.click(); }); await sleep(1500);
check('por defecto se pinta casilla a casilla', await p.evaluate(() => window.__paint.mode === 'classic'));

const cellPos = c => p.evaluate(c => {
  const e = window.__paint, cv = document.querySelector('.paint-canvas').getBoundingClientRect();
  const cx = (cv.width / 2 - e.ox) / e.s, cy = (cv.height / 2 - e.oy) / e.s;
  let best = -1, bd = 1e9;
  for (let i = 0; i < e.tpl.cells.length; i++) { if (e.tpl.cells[i] !== c || e.painted[i]) continue; const d = (i % e.w + .5 - cx) ** 2 + (Math.floor(i / e.w) + .5 - cy) ** 2; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return null;
  return { x: cv.left + e.ox + ((best % e.w) + .5) * e.s, y: cv.top + e.oy + (Math.floor(best / e.w) + .5) * e.s };
}, c);

// color con menos casillas (los que ya no tienen ninguna quedan fuera)
const target = await p.evaluate(() => { const e = window.__paint; let best = -1; e.remaining.forEach((n, c) => { if (n > 0 && (best < 0 || n < e.remaining[best])) best = c; }); return { c: best, n: e.remaining[best] }; });
await p.evaluate(c => document.querySelectorAll('.swatch')[c].click(), target.c); await sleep(900);
const before = await p.evaluate(c => window.__paint.remaining[c], target.c);
let pos = await cellPos(target.c);
await p.mouse.click(pos.x, pos.y); await sleep(500);
const after = await p.evaluate(c => window.__paint.remaining[c], target.c);
check('un toque pinta UNA casilla (no todo el color)', before - after === 1 && before > 1, `(${before} -> ${after})`);

// terminar el color a toques
for (let k = 0; k < 400 && (await p.evaluate(c => window.__paint.remaining[c], target.c)) > 0; k++) {
  pos = await cellPos(target.c); if (!pos) break;
  await p.mouse.click(pos.x, pos.y); await sleep(60);
}
await sleep(1600);
check('el color queda completo', (await p.evaluate(c => window.__paint.remaining[c], target.c)) === 0);
check('NO cambia de color solo', (await p.evaluate(() => window.__paint.selected)) === target.c);
check('sin barrido de brillo en la pantalla al completar un color', await p.evaluate(() => !document.querySelector('.fx-shine')));
check('sin sacudida del lienzo', await p.evaluate(() => !document.querySelector('.paint-canvas').classList.contains('punch')));
const other = target.c === 0 ? 1 : 0;
await p.evaluate(c => document.querySelectorAll('.swatch')[c].click(), other); await sleep(500);
check('el color cambia cuando lo eliges tu', (await p.evaluate(() => window.__paint.selected)) === other);

// ---- Pintar: icono "i" con Atras
await p.evaluate(() => document.querySelector('.paint-tools .info-btn').click()); await sleep(300);
const t0 = await p.evaluate(() => document.querySelector('.news-box h2')?.textContent);
check('la "i" de pintar abre la explicacion', t0 === 'Pintar por números', `(${t0})`);
await p.evaluate(() => document.querySelector('.news-box .btn.big').click()); await sleep(250);
const t1 = await p.evaluate(() => document.querySelector('.news-box h2')?.textContent);
await p.evaluate(() => [...document.querySelectorAll('.news-box .btn')].find(x => x.textContent.includes('Atrás')).click()); await sleep(250);
check('Atras vuelve a la pagina anterior', t1 !== t0 && (await p.evaluate(() => document.querySelector('.news-box h2').textContent)) === t0, `(${t0} / ${t1})`);
await p.evaluate(() => document.querySelector('.news-box .news-skip').click()); await sleep(400);
check('Saltar cierra la explicacion', await p.evaluate(() => !document.querySelector('.news-box')));

// ---- Ajustes: ayuda e informacion
await open('ajustes');
check('Ajustes lista todos los temas de ayuda', (await p.evaluate(() => document.querySelectorAll('.help-btns .btn').length)) >= 6);
check('el modo global ya no ofrece "Por color"', await p.evaluate(() => ![...document.querySelectorAll('.seg-btn')].some(x => x.textContent === 'Por color')));

// ---- Partida: "i" de palabras extra
await open('jugar');
await p.evaluate(() => document.querySelector('.slide.active').click()); await sleep(900);
await p.evaluate(() => document.querySelector('.slide.active').click()); await sleep(2000);
await p.evaluate(() => { const lv = [...document.querySelectorAll('.lvl:not(:disabled)')].find(x => x.textContent.trim().startsWith('3')); lv.scrollIntoView({ block: 'center' }); lv.click(); }); await sleep(3200);
check('la partida tiene la "i" de palabras extra', await p.evaluate(() => !!document.querySelector('.g-extra-row .info-btn')));
check('la barra de extras no dice cuantas hay', await p.evaluate(() => !/\d/.test(document.querySelector('.g-extra-chip')?.textContent ?? '')));
await p.evaluate(() => document.querySelector('.g-extra-row .info-btn').click()); await sleep(300);
check('la "i" de la partida abre la explicacion', await p.evaluate(() => /extra/i.test(document.querySelector('.news-box h2')?.textContent ?? '')));
await p.evaluate(() => document.querySelector('.news-box .btn.big').click()); await sleep(400);
check('al cerrarla, la partida sigue', await p.evaluate(() => !document.querySelector('.news-box') && !!document.querySelector('.board')));

check('sin errores de consola', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
console.log(fails ? `\n${fails} FALLOS` : '\nTodo OK');
await b.close();
process.exit(fails ? 1 : 0);
