// Prueba las flechas izquierda/derecha del carrusel (Jugar y Aventura) con clics reales, en ordenador y en movil.
// Uso: URL=http://localhost:5199 node e2e/flechas.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5199';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALLO'} ${n} ${x}`); };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
/** Clic como el de una persona: pulsar, esperar un poco y soltar (con :active el boton se mueve). */
const humanClick = async (p, x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await new Promise(r => setTimeout(r, 120)); await p.mouse.up(); };
const activeTitle = p => p.evaluate(() => document.querySelector('.slide.active .slide-title')?.textContent);
const setup = async p => {
  await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { localStorage.setItem('nuestra-sopa:local:role', '"nico"'); localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', coins: 50, settings: { tutorialDone: true, music: false, sfx: false } })); });
};
for (const [name, vp] of [['ordenador 1342x884', { width: 1342, height: 884, deviceScaleFactor: 1 }], ['portatil 1024x640', { width: 1024, height: 640, deviceScaleFactor: 1 }], ['movil 390x844 (con raton)', { width: 390, height: 844, deviceScaleFactor: 2 }]]) {
  const p = await b.newPage(); await p.setViewport(vp);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await setup(p);
  for (const hash of ['jugar', 'aventura']) {
    await p.goto('about:blank'); await p.goto(`${URL}/?e2e#${hash}`, { waitUntil: 'networkidle0' }); await sleep(900);
    const arrows = await p.evaluate(() => [...document.querySelectorAll('.car-arrow')].map(a => { const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { cls: a.className, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), disp: cs.display, dis: a.disabled, op: cs.opacity }; }));
    const first = await activeTitle(p);
    const R = arrows.find(a => a.cls.includes(' r')), L = arrows.find(a => a.cls.includes(' l'));
    if (!R || R.disp === 'none') { console.log(`(${name} / ${hash}: flechas ocultas por CSS en este tamaño: ${JSON.stringify(arrows)})`); await p.close(); continue; }
    // derecha x3
    const seq = [first];
    for (let i = 0; i < 3; i++) { await humanClick(p, R.x + R.w / 2, R.y + R.w / 2); await sleep(900); seq.push(await activeTitle(p)); }
    check(`${name} · ${hash}: la flecha DERECHA avanza (${seq.join(' → ')})`, new Set(seq).size === seq.length);
    // izquierda x3
    const back = [seq.at(-1)];
    const L2 = await p.evaluate(() => { const a = document.querySelector('.car-arrow.l'); const r = a.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, dis: a.disabled }; });
    for (let i = 0; i < 3; i++) { await humanClick(p, L2.x + L2.w / 2, L2.y + L2.w / 2); await sleep(900); back.push(await activeTitle(p)); }
    check(`${name} · ${hash}: la flecha IZQUIERDA retrocede (${back.join(' → ')})`, back.at(-1) === first && new Set(back).size === back.length);
    // y entrar con clic en la tarjeta activa sigue funcionando
    const full = await p.evaluate(() => { const c = document.querySelector('.slide.active'); const r = c.getBoundingClientRect(); return { l: r.left, r: r.right, vw: innerWidth }; });
    check(`${name} · ${hash}: la tarjeta activa queda dentro de la pantalla`, full.l >= -2 && full.r <= full.vw + 2, JSON.stringify(full));
  }
  check(`${name}: sin errores de consola`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await p.close();
}
console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
await b.close();
process.exit(results.every(Boolean) ? 0 : 1);
