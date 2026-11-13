// Mide el tamano de la imagen de TODAS las tarjetas (Jugar, Aventura y Pintar) y si su texto desborda la caja.
// Uso: URL=http://localhost:5200 node e2e/tarjetas-medidas.mjs
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5200';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
for (const [n, w, h, mobile] of [['390x844', 390, 844, true], ['360x640', 360, 640, true], ['320x568', 320, 568, true], ['1440x900', 1440, 900, false]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await p.goto(`${URL}/?e2e`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { localStorage.setItem('nuestra-sopa:local:role', '"nico"'); localStorage.setItem('nuestra-sopa:state:v1', JSON.stringify({ v: 1, role: 'nico', coins: 50, settings: { tutorialDone: true, newsSeen: true, music: false, sfx: false } })); });
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  console.log(`\n== ${n}`);
  const all = [];
  for (const hash of ['jugar', 'aventura', 'pintar-menu']) {
    await p.evaluate(x => { location.hash = '#' + x; }, hash); await sleep(1500);
    const rows = await p.evaluate(() => [...document.querySelectorAll('.slide')].map(c => {
      const im = c.querySelector('.slide-art img'), art = c.querySelector('.slide-art'), d = c.querySelector('.slide-desc');
      const r = im ? { w: im.offsetWidth, h: im.offsetHeight } : { w: 0, h: 0 };
      return { name: c.querySelector('.slide-title')?.textContent, w: r.w, h: r.h, area: r.w * r.h, artH: art?.offsetHeight, over: d ? d.scrollHeight > d.clientHeight + 1 : false, hasImg: !!im };
    }));
    rows.forEach(r => { all.push({ hash, ...r }); console.log(`${hash.padEnd(12)} ${String(r.name).padEnd(14)} img ${String(r.w).padStart(3)}x${String(r.h).padEnd(3)} area ${String(r.area).padStart(6)} ${r.hasImg ? '' : '(icono)'} ${r.over ? 'TEXTO CON DESPLAZAMIENTO' : ''}`); });
  }
  const imgs = all.filter(r => r.hasImg && r.hash !== 'pintar-menu');
  const areas = imgs.map(r => r.area), min = Math.min(...areas), max = Math.max(...areas);
  const ok = max / min < 1.25;
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FALLO'} misma superficie en las ${imgs.length} imagenes (min ${min}, max ${max}, razon ${(max / min).toFixed(2)})`);
  const over = all.filter(r => r.over);
  console.log(over.length ? `AVISO ${over.length} textos desbordan (se desplazan): ${over.map(r => r.name).join(', ')}` : 'OK   ningun texto desborda');
  await p.close();
}
await b.close();
process.exit(fails ? 1 : 0);
