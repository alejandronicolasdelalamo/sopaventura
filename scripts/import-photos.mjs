// Convierte vuestras fotos en dibujos para pintar + recuerdos. Resultado en private/ (ignorado por git).
// Uso:  node scripts/import-photos.mjs --nosotros "ruta/foto-los-dos.png" --nico "ruta/nico.png" --izana "ruta/izana.png"
// Solo se usan recortes de la cara. Los recortes (no las fotos originales) se guardan como recuerdo.
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// Recortes normalizados (x, y, ancho, alto sobre la foto) y ajustes. Cambialos si quieres otro encuadre.
const JOBS = [
  { key: 'nosotros', id: 'nosotros-foto', name: 'Nosotros', crop: { x: 0.22, y: 0.18, w: 0.58, h: 0.55 }, grid: [76, 56], colors: 30, price: 0, unlockIsland: 'inicio', adjust: { brightness: 8, contrast: 14 } },
  { key: 'nico', id: 'retrato-nico', name: 'Nico', crop: { x: 0.04, y: 0.2, w: 0.78, h: 0.52 }, grid: [64, 64], colors: 24, price: 0, unlockIsland: 'olaf', adjust: { brightness: 6, contrast: 16 } },
  { key: 'izana', id: 'retrato-izana', name: 'Izana', crop: { x: 0.3, y: 0.0, w: 0.7, h: 0.47 }, grid: [64, 56], colors: 24, price: 0, unlockIsland: 'viajes', adjust: { brightness: 6, contrast: 16 } },
];

fs.mkdirSync('private', { recursive: true });
const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle0' });
// Calentamiento: la primera importacion puede recargar la pagina (Vite descubre dependencias)
for (let k = 0; k < 4; k++) { try { await page.evaluate(() => import('/src/paint/convert.ts')); break; } catch { await new Promise(r => setTimeout(r, 1200)); } }

for (const job of JOBS) {
  const file = arg(job.key);
  if (!file) { console.log(`- ${job.key}: sin ruta, se omite`); continue; }
  const dataUrl = `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(file).toString('base64')}`;
  let out;
  for (let k = 0; k < 3 && !out; k++) try { out = await page.evaluate(async (dataUrl, job) => {
    const conv = await import('/src/paint/convert.ts');
    const model = await import('/src/paint/model.ts');
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    const t = conv.photoToTemplate(img, { gridW: job.grid[0], gridH: job.grid[1], colors: job.colors, crop: job.crop, adjust: job.adjust, name: job.name, id: job.id, seed: 3 });
    // recuerdo: solo el recorte, comprimido
    const c = document.createElement('canvas');
    const sw = img.width * job.crop.w, sh = img.height * job.crop.h, sc = Math.min(1, 900 / Math.max(sw, sh));
    c.width = Math.round(sw * sc); c.height = Math.round(sh * sc);
    c.getContext('2d').drawImage(img, img.width * job.crop.x, img.height * job.crop.y, sw, sh, 0, 0, c.width, c.height);
    return { ...model.toJson({ ...t, price: job.price, unlockIsland: job.unlockIsland }), photo: c.toDataURL('image/jpeg', 0.85) };
  }, dataUrl, job); } catch (e) { if (k === 2) throw e; await new Promise(r => setTimeout(r, 1500)); }
  fs.writeFileSync(`private/${job.id}.json`, JSON.stringify(out));
  console.log(`OK ${job.id}: ${job.grid[0]}x${job.grid[1]}, ${out.palette.length} colores, recuerdo ${Math.round(out.photo.length / 1024)} KB`);
}
await browser.close();
await server.close();
