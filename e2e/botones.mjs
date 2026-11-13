// Pulsa TODOS los botones de las pantallas principales con clic "humano" (down, 120 ms, up) y detecta:
//  - boton que se mueve al pulsarlo y el soltar cae fuera (bug de las flechas)
//  - boton tapado por otro elemento (el clic no llega)
//  - errores de consola / excepciones tras el clic
// Uso: URL=http://localhost:5199 node e2e/botones.mjs [pantalla,pantalla]   (VP=pc para ordenador)
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5199';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const only = process.argv[2]?.split(',');
const SCREENS = ['home', 'jugar', 'aventura', 'mapa', 'tienda', 'pintar', 'pintar-menu', 'colorear', 'perfil', 'logros', 'ajustes', 'nosotros', 'buzon', 'estadisticas', 'pegatinas', 'juntos', 'crear-sopa', 'avatar']
  .filter(s => !only || only.includes(s));
const SKIP = /borrar|reiniciar|cerrar sesi|salir|eliminar|reset|importar|exportar|subir|panel de nico/i;
const vp = process.env.VP === 'pc' ? { width: 1342, height: 884, deviceScaleFactor: 1 } : { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: false };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const problems = []; let total = 0;
const p = await b.newPage(); await p.setViewport(vp);
let errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|supabase/i.test(m.text())) errs.push(m.text()); });
p.on('dialog', d => d.dismiss().catch(() => {}));
const seed = () => p.evaluate(() => {
  const stars = {}; for (let i = 0; i < 6; i++) stars[`inicio:${i}`] = 3;
  localStorage.setItem('nuestra-sopa:local:role', '"nico"');
  localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', stars, coins: 400, settings: { tutorialDone: true, music: false, sfx: false } }));
});
await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' }); await seed();
const open = async s => { await p.goto('about:blank'); await p.goto(`${URL}/?e2e#${s}`, { waitUntil: 'networkidle0' }); await sleep(700); };
const listBtns = () => p.evaluate(() => {
  const sel = 'button, [role=button], a[href], .slide, .btn, .tile, summary';
  const out = []; const seen = new Set();
  document.querySelectorAll(sel).forEach((e, i) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (r.width < 4 || r.height < 4 || cs.visibility === 'hidden' || cs.display === 'none' || e.disabled || e.closest('[hidden]')) return;
    const label = (e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\s+/g, ' ').slice(0, 40);
    const k = label + '|' + Math.round(r.x) + '|' + Math.round(r.y); if (seen.has(k)) return; seen.add(k);
    out.push({ i, label });
  });
  return out;
});
for (const s of SCREENS) {
  await open(s);
  const btns = await listBtns();
  console.log(`\n== ${s}: ${btns.length} botones`);
  for (let n = 0; n < btns.length; n++) {
    const bt = btns[n];
    if (SKIP.test(bt.label)) continue;
    await open(s); errs = [];
    const info = await p.evaluate(i => {
      const e = document.querySelectorAll('button, [role=button], a[href], .slide, .btn, .tile, summary')[i]; if (!e) return null;
      e.scrollIntoView({ block: 'center', inline: 'center' });
      const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth };
    }, bt.i);
    if (!info || !info.inView) continue;
    total++;
    await sleep(150);
    const sig = () => p.evaluate(i => { const e = document.querySelectorAll('button, [role=button], a[href], .slide, .btn, .tile, summary')[i]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, el: e }; }, bt.i);
    const cover = await p.evaluate((x, y, i) => { const e = document.querySelectorAll('button, [role=button], a[href], .slide, .btn, .tile, summary')[i]; const t = document.elementFromPoint(x, y); return e && t && !(e === t || e.contains(t) || t.contains(e)) ? (t.className || t.tagName) : null; }, info.x, info.y, bt.i);
    if (cover) problems.push(`${s} · «${bt.label}»: tapado por .${String(cover).slice(0, 40)}`);
    await p.mouse.move(info.x, info.y); await p.mouse.down(); await sleep(130);
    const held = await p.evaluate((x, y, i) => { const e = document.querySelectorAll('button, [role=button], a[href], .slide, .btn, .tile, summary')[i]; if (!e) return { gone: true }; const t = document.elementFromPoint(x, y); return { under: !!t && (e === t || e.contains(t) || t.contains(e)) }; }, info.x, info.y, bt.i);
    await p.mouse.up(); await sleep(450);
    if (!held.gone && held.under === false) problems.push(`${s} · «${bt.label}»: al mantener pulsado el boton se desplaza y el soltar cae fuera`);
    if (errs.length) problems.push(`${s} · «${bt.label}»: error tras el clic: ${errs[0].slice(0, 120)}`);
  }
}
console.log(`\n${total} botones pulsados, ${problems.length} problemas`);
for (const x of problems) console.log('FALLO', x);
await b.close();
process.exit(problems.length ? 1 : 0);
