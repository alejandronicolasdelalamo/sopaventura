import { hashStr, mulberry32 } from '../core/rng';
import { TRANSPARENT, type Template } from './model';
import { artTemplates } from './art';
import { moreArt } from './art2';
import { artTres } from './art3';
import { decoVariados } from './art4';
import { envTemplates } from './env';

/** Mini rasterizador sobre una rejilla de indices de color. */
class Grid {
  cells: Uint8Array;
  constructor(public w: number, public h: number, fill = TRANSPARENT) { this.cells = new Uint8Array(w * h).fill(fill); }
  set(x: number, y: number, c: number) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y * this.w + x] = c; }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.cells[y * this.w + x] : TRANSPARENT; }
  rect(x: number, y: number, w: number, h: number, c: number) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, c);
    }
  }
  tri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: number) {
    const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
    const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
    const s = (ax: number, ay: number, bx: number, by: number, px: number, py: number) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d1 = s(px, py, x1, y1, x2, y2), d2 = s(px, py, x2, y2, x3, y3), d3 = s(px, py, x3, y3, x1, y1);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) this.set(x, y, c);
    }
  }
  line(x1: number, y1: number, x2: number, y2: number, c: number) {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x1 + ((x2 - x1) * i) / n), Math.round(y1 + ((y2 - y1) * i) / n), c);
  }
  /** Solo pinta sobre casillas ya ocupadas (para sombras dentro de una figura). */
  shade(fn: (x: number, y: number) => number | null) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y) === TRANSPARENT) continue;
      const v = fn(x, y); if (v !== null) this.set(x, y, v);
    }
  }
}

const mk = (id: string, name: string, g: Grid, palette: string[], extra: Partial<Template> = {}): Template =>
  ({ id, name, w: g.w, h: g.h, palette, cells: g.cells, price: 0, source: 'builtin', ...extra });

/** Rellena el cielo con bandas de degradado. */
function sky(g: Grid, from: number, count: number, h: number) {
  for (let y = 0; y < h; y++) g.rect(0, y, g.w, 1, from + Math.min(count - 1, Math.floor((y / h) * count)));
}
const lerpHex = (a: string, b: string, t: number) => {
  const p = (s: string) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  return `#${[r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
};
const ramp = (a: string, b: string, n: number) => Array.from({ length: n }, (_, i) => lerpHex(a, b, n === 1 ? 0 : i / (n - 1)));

function corazon(): Template {
  const g = new Grid(24, 24);
  const heart = (x: number, y: number) => { const nx = (x + 0.5 - 12) / 10, ny = -(y + 0.5 - 11) / 10; return (nx * nx + ny * ny - 1) ** 3 - nx * nx * ny ** 3 <= 0; };
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (heart(x, y)) g.set(x, y, 1);
  g.shade((x, y) => (x + y < 14 ? 2 : x + y > 28 ? 0 : (x - 12) ** 2 + (y - 8) ** 2 < 5 ? 3 : null));
  g.shade((x, y) => (y > 16 && x > 12 ? 4 : null));
  g.rect(6, 6, 2, 2, 3);
  return mk('corazon', 'Corazón', g, ['#e0457b', '#ff7eb6', '#ff9fc9', '#ffd1e6', '#b8325f'], { theme: 'nosotros' });
}

function olaf(): Template {
  const g = new Grid(32, 32);
  // 0 naranja oscuro (rayas), 1 naranja, 2 blanco (barriga y patas), 3 rosa, 4 naranja claro, 5 negro, 6 blanco ojos, 7 fondo
  g.rect(0, 0, 32, 32, 7);
  g.ellipse(16, 24, 9, 8, 1);                 // cuerpo
  g.ellipse(16, 15, 9, 8, 1);                 // cabeza
  g.tri(8, 11, 8, 2, 14, 8, 1); g.tri(24, 11, 24, 2, 18, 8, 1);   // orejas
  g.tri(9, 9, 9, 4, 12, 8, 3); g.tri(23, 9, 23, 4, 20, 8, 3);     // interior rosa
  g.shade((x, y) => (y >= 26 && g.get(x, y) === 1 ? 2 : null));   // la parte de abajo es blanca
  g.ellipse(16, 27, 5, 3.5, 2);               // barriga blanca
  g.rect(6, 26, 4, 5, 2); g.rect(22, 26, 4, 5, 2);                 // patas blancas
  g.ellipse(16, 19, 4.5, 3.2, 2);             // hocico blanco
  [[12, 7], [16, 6], [20, 7]].forEach(([x, y]) => g.rect(x, y, 1, 3, 0));   // rayas de la frente
  g.rect(8, 23, 3, 1, 0); g.rect(8, 25, 3, 1, 0); g.rect(21, 23, 3, 1, 0); g.rect(21, 25, 3, 1, 0); // rayas del cuerpo
  g.rect(8, 14, 2, 1, 0); g.rect(22, 14, 2, 1, 0);                  // rayas de las mejillas
  g.ellipse(12, 14, 2.4, 2.6, 6); g.ellipse(20, 14, 2.4, 2.6, 6);  // ojos
  g.rect(12, 14, 2, 2, 5); g.rect(19, 14, 2, 2, 5);
  g.rect(15, 17, 3, 2, 3);                    // nariz
  g.line(16, 19, 16, 20, 5); g.line(13, 21, 16, 20, 5); g.line(19, 21, 16, 20, 5);
  g.line(4, 17, 10, 18, 0); g.line(4, 20, 10, 19, 0); g.line(28, 17, 22, 18, 0); g.line(28, 20, 22, 19, 0); // bigotes
  g.shade((x, y) => (g.get(x, y) === 1 && y > 9 && y < 12 && x > 10 && x < 22 ? 4 : null));
  return mk('olaf', 'Olaf', g, ['#c8651a', '#f29a2e', '#fff8e8', '#ff9fb2', '#ffc46b', '#1d1b2e', '#ffffff', '#ffe9c7'], { theme: 'olaf', unlockIsland: 'olaf' });
}

function pizza(): Template {
  const g = new Grid(24, 24);
  g.tri(12, 22, 2, 3, 22, 3, 1);
  g.tri(12, 20, 4, 5, 20, 5, 2);
  g.rect(2, 2, 21, 3, 0); g.rect(3, 4, 19, 1, 1);
  [[8, 8], [14, 8], [11, 13], [10, 17], [13, 18]].forEach(([x, y]) => { g.ellipse(x, y, 2, 2, 3); g.set(x - 1, y - 1, 4); });
  g.rect(6, 6, 2, 1, 5); g.rect(15, 11, 2, 1, 5); g.rect(9, 10, 1, 2, 5);
  return mk('pizza', 'Pizza de pepperoni', g, ['#e0a030', '#f6c453', '#ffe28a', '#c8372d', '#e8574c', '#fff4c9'], { theme: 'comida', price: 40 });
}

function luna(): Template {
  const g = new Grid(32, 32);
  sky(g, 0, 6, 32);
  const rng = mulberry32(7);
  for (let i = 0; i < 18; i++) g.set(Math.floor(rng() * 32), Math.floor(rng() * 20), 7);
  g.ellipse(18, 13, 8, 8, 6); g.ellipse(21, 11, 7, 7, 0);
  g.ellipse(18, 13, 8, 8, 6); g.ellipse(22, 11, 7.2, 7.2, 1);
  g.ellipse(15, 16, 1.5, 1.5, 8);
  g.rect(0, 26, 32, 6, 9); g.rect(0, 28, 32, 4, 10);
  g.tri(2, 26, 7, 20, 12, 26, 9); g.tri(18, 26, 25, 18, 31, 26, 9);
  return mk('luna', 'Noche de luna', g, ['#1d1b4a', '#2d2a6b', '#3f3b8c', '#5a56ad', '#7a76c4', '#a7a3e0', '#fff1b8', '#fff8e8', '#e6d68a', '#15133a', '#0d0c26'], { theme: 'citas', price: 60 });
}

function bloque(): Template {
  const g = new Grid(24, 24);
  const rng = mulberry32(21);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    g.set(x, y, y < 6 ? (rng() < 0.3 ? 1 : 0) : (rng() < 0.2 ? 3 : rng() < 0.4 ? 4 : 2));
  }
  g.rect(0, 6, 24, 1, 1);
  for (let x = 0; x < 24; x++) if (rng() < 0.5) g.set(x, 7, 0);
  return mk('bloque', 'Bloque de hierba', g, ['#6cbd4c', '#4f9a37', '#8a5a33', '#6e4526', '#a56d3d'], { theme: 'minecraft', price: 30 });
}

function capsula(): Template {
  const g = new Grid(24, 24);
  g.ellipse(12, 12, 10, 10, 5); g.shade((x, y) => (y < 12 ? 0 : 1));
  g.rect(2, 11, 20, 2, 2);
  g.ellipse(12, 12, 3.5, 3.5, 2); g.ellipse(12, 12, 2.2, 2.2, 3);
  g.shade((x, y) => (y < 12 && x < 9 && y < 7 && g.get(x, y) === 0 ? 4 : null));
  return mk('capsula', 'Cápsula', g, ['#e04848', '#f2f2f2', '#2b2b3a', '#ffffff', '#ff8a8a', '#d9d9e3'], { theme: 'pokemon', price: 40 });
}

function shuriken(): Template {
  const g = new Grid(24, 24);
  g.tri(12, 0, 8, 10, 16, 10, 1); g.tri(12, 24, 8, 14, 16, 14, 1);
  g.tri(0, 12, 10, 8, 10, 16, 1); g.tri(24, 12, 14, 8, 14, 16, 1);
  g.ellipse(12, 12, 5, 5, 0); g.ellipse(12, 12, 2, 2, 3);
  g.shade((x, y) => (g.get(x, y) === 1 && (x + y) % 11 === 0 ? 2 : null));
  return mk('shuriken', 'Shuriken', g, ['#6b6f85', '#b9bdd1', '#e6e8f2', '#2a2d3e'], { theme: 'naruto', price: 40 });
}

function muralla(): Template {
  const g = new Grid(40, 32);
  sky(g, 0, 5, 14);
  g.ellipse(30, 5, 3, 3, 5);
  for (let y = 12; y < 32; y++) for (let x = 0; x < 40; x++) {
    const row = Math.floor((y - 12) / 4), off = row % 2 ? 4 : 0;
    g.set(x, y, 6 + (((x + off) % 8 === 0 || (y - 12) % 4 === 0) ? 1 : (x * 7 + y * 3) % 5 === 0 ? 2 : 0));
  }
  for (let x = 0; x < 40; x += 6) g.rect(x, 9, 4, 3, 6);
  return mk('muralla', 'La muralla', g, ['#7ea0c4', '#99b8d6', '#b4cde4', '#cfe0ef', '#e6f0f8', '#fff3c4', '#a09585', '#6e665a', '#bcb2a1'], { theme: 'aot', price: 80, unlockIsland: 'anime' });
}

function mando(): Template {
  const g = new Grid(32, 24);
  g.ellipse(8, 14, 7, 8, 1); g.ellipse(24, 14, 7, 8, 1); g.rect(8, 6, 16, 14, 1);
  g.rect(8, 6, 16, 2, 0);
  g.rect(7, 9, 5, 2, 3); g.rect(8, 8, 3, 4, 3);                   // cruceta
  [[22, 9, 4], [25, 12, 5], [22, 15, 6], [19, 12, 2]].forEach(([x, y, c]) => g.ellipse(x, y, 1.8, 1.8, c));
  g.ellipse(13, 17, 2, 2, 3); g.ellipse(19, 17, 2, 2, 3);
  g.rect(14, 10, 4, 1, 3);
  return mk('mando', 'Mando', g, ['#4b4f6b', '#7a7fa6', '#aab0d6', '#2a2d3e', '#e8574c', '#6fcf5b', '#ffd86b'], { theme: 'gaming', price: 50 });
}

function disco(): Template {
  const g = new Grid(32, 32);
  g.ellipse(16, 16, 15, 15, 0);
  for (const r of [13, 10, 7]) { g.ellipse(16, 16, r, r, 1); g.ellipse(16, 16, r - 1, r - 1, 0); }
  g.ellipse(16, 16, 5, 5, 2); g.ellipse(16, 16, 1, 1, 4);
  g.shade((x, y) => (g.get(x, y) === 0 && x > 20 && y < 12 && (x - 16) ** 2 + (y - 16) ** 2 < 200 ? 3 : null));
  return mk('disco', 'Vinilo', g, ['#1c1c28', '#33334a', '#ff7eb6', '#4a4a66', '#fff8e8'], { theme: 'kanye', price: 60 });
}

function portal(): Template {
  const g = new Grid(32, 32);
  const cx = 15.5, cy = 15.5;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x + 0.5 - 16, dy = y + 0.5 - 16, d = Math.hypot(dx, dy);
    if (d > 15) continue;
    const phase = (((Math.atan2(dy, dx) / (Math.PI * 2)) + d * 0.09) % 1 + 1) % 1;
    const ring = Math.min(5, Math.floor(d / 3));
    g.set(x, y, phase < 0.5 ? ring : Math.min(7, ring + 1));
  }
  g.ellipse(cx, cy, 3.5, 3.5, 7);
  return mk('portal', 'Portal verde', g, ['#0d3b2a', '#165a40', '#1f8a5c', '#3ccf7c', '#7cf2a3', '#c6ffd9', '#9be86f', '#e8ffd0'], { theme: 'rickmorty', price: 80 });
}

function flor(): Template {
  const g = new Grid(24, 24);
  g.rect(11, 12, 2, 12, 5); g.tri(12, 20, 4, 16, 11, 21, 6); g.tri(12, 17, 20, 13, 13, 18, 6);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.ellipse(12 + Math.cos(a) * 5.2, 9 + Math.sin(a) * 5.2, 3.2, 3.2, i % 2 ? 0 : 1); }
  g.ellipse(12, 9, 3.4, 3.4, 2); g.set(11, 8, 3);
  return mk('flor', 'Flor', g, ['#ff7eb6', '#ff9fc9', '#ffd86b', '#fff1b8', '#fff', '#4f9a37', '#6cbd4c'], { theme: 'citas' });
}

/** Paisajes grandes generados con semilla: prueba de 48x48 hasta 128x128 con hasta 30 colores. */
function paisaje(id: string, name: string, size: number, colors: number, seed: number, palette: [string, string, string], extra: Partial<Template> = {}): Template {
  const rng = mulberry32(hashStr(id) + seed);
  const g = new Grid(size, size);
  const skyN = Math.max(6, Math.floor(colors * 0.45)), landN = Math.max(3, Math.floor(colors * 0.18)), seaN = colors - skyN - landN - 1;
  const pal = [...ramp(palette[0], palette[1], skyN), ...ramp('#3a2a52', '#8a5a7a', landN), ...ramp(palette[2], '#14284a', Math.max(2, seaN)), '#fff6c8'];
  const horizon = Math.floor(size * 0.58);
  sky(g, 0, skyN, horizon);
  const sunX = Math.floor(size * (0.3 + rng() * 0.4)), sunR = Math.max(3, Math.floor(size * 0.09));
  g.ellipse(sunX, horizon - sunR - 1, sunR, sunR, pal.length - 1);
  // montañas
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    let h = horizon - size * (0.08 + l * 0.05), v = 0;
    for (let x = 0; x < size; x++) {
      v = Math.max(-2, Math.min(2, v + (rng() - 0.5) * 1.4));
      h += v * 0.5;
      const top = Math.max(2, Math.min(horizon, Math.floor(h)));
      for (let y = top; y < horizon; y++) g.set(x, y, skyN + Math.min(landN - 1, l));
    }
  }
  // mar con reflejo
  for (let y = horizon; y < size; y++) {
    const t = (y - horizon) / (size - horizon);
    const base = skyN + landN + Math.min(seaN - 1, Math.floor(t * seaN));
    for (let x = 0; x < size; x++) {
      const wave = Math.sin((x + y * 0.7) * 0.9 + rng()) > 0.75;
      const refl = Math.abs(x - sunX) < sunR * (1.4 - t) && wave;
      g.set(x, y, refl ? pal.length - 1 : Math.max(skyN + landN, base - (wave ? 1 : 0)));
    }
  }
  return mk(id, name, g, pal.slice(0, colors), { price: 100, ...extra });
}

function alhambra(): Template {
  const size = 48;
  const t = paisaje('atardecer-granada', 'Atardecer en Granada', size, 16, 3, ['#2b1b5a', '#ff9b6a', '#3a6ea5'], { theme: 'granada', price: 120, unlockIsland: 'viajes' });
  const g = { cells: t.cells, w: t.w };
  // siluetas de torres sobre la colina
  const set = (x: number, y: number) => { if (x >= 0 && x < size && y >= 0 && y < size) g.cells[y * size + x] = 8; };
  [[8, 9, 7], [16, 5, 6], [24, 11, 8], [32, 7, 6]].forEach(([x, w, h]) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, 26 - j);
    for (let i = 0; i < w; i += 2) set(x + i, 26 - h - 1);
  });
  return t;
}

let olafCache: Template | null = null;
/** Olaf suelto y barato: el arranque solo necesita a Olaf, no los ~120 dibujos. */
export const olafBase = (): Template => (olafCache ??= olaf());
let cache: Template[] | null = null;
export const builtinReady = (): boolean => cache !== null;
/** Recibe los dibujos ya generados por el Web Worker (si aun no se habian generado aqui). */
export function injectBuiltin(list: Template[]): void { if (!cache) cache = list; }
/** Genera los dibujos por tandas, cediendo el hilo entre una y otra (para hacerlo con el menu ya a la vista). */
export function warmBuiltin(step: (fn: () => void) => void, done?: () => void): void {
  [artTemplates, moreArt, artTres, decoVariados, envTemplates, builtinTemplates].forEach(fn => step(() => { fn(); }));
  if (done) step(done);
}
export function builtinTemplates(): Template[] {
  if (cache) return cache;
  cache = [
    ...artTemplates(), ...moreArt(), ...artTres(), ...decoVariados(), ...envTemplates(),
    corazon(), flor(), olaf(), pizza(), bloque(), capsula(), shuriken(), luna(), mando(), disco(), muralla(), portal(), alhambra(),
    paisaje('amanecer-48', 'Amanecer', 48, 20, 5, ['#3a2a7a', '#ffc58a', '#4a7fb5'], { price: 100 }),
    paisaje('atardecer-80', 'Atardecer en el mar', 80, 26, 9, ['#2a1f5a', '#ff8f7a', '#2f6aa8'], { price: 180 }),
    paisaje('horizonte-128', 'Horizonte (128×128)', 128, 30, 13, ['#1d1b4a', '#ffd0a0', '#3a86c8'], { price: 300 }),
  ];
  return cache;
}
