import { bayer, makeNoise } from '../core/noise';
import { mulberry32 } from '../core/rng';
import { rgbToHex, TRANSPARENT, type Template } from './model';

/**
 * Generador de pixel art detallado para "pintar por numeros".
 * Cada figura se describe con formas (distancias con signo) y se sombrea por volumen:
 * luz desde arriba-izquierda, rampas de 5-7 tonos, tramado Bayer, textura de pelo/hojas
 * y contorno selectivo. Al final se reduce a una paleta numerada (<= 32 colores).
 */
export type RGB = [number, number, number];
export type SD = (x: number, y: number) => number;
export interface Shade { d: number; light: number; nx: number; ny: number }
export type ColorFn = (x: number, y: number, s: Shade) => RGB | null;

export const H = (s: string): RGB => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const R = (...hex: string[]): RGB[] => hex.map(H);
export const LX = -0.476, LY = -0.667, LZ = 0.571;     // luz normalizada (arriba-izquierda, de frente)
const clamp01 = (v: number) => Math.max(0, Math.min(0.9999, v));

/** Elige tono de una rampa con tramado ordenado: la clave del aspecto "pixel art". */
export function tone(r: RGB[], t: number, x: number, y: number, dither = 0.9): RGB {
  const i = Math.floor(clamp01(t) * r.length + (bayer(x, y) - 0.5) * dither);
  return r[Math.max(0, Math.min(r.length - 1, i))];
}
export const litT = (s: Shade, off = 0) => (s.light + 0.3) / 1.3 + off;

// ---------- formas ----------
export const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0): SD => {
  const c = Math.cos(rot), s = Math.sin(rot), m = Math.min(rx, ry);
  return (x, y) => { const dx = x - cx, dy = y - cy; const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry; return (Math.hypot(u, v) - 1) * m; };
};
export const seg = (ax: number, ay: number, bx: number, by: number, ra: number, rb = ra): SD => (x, y) => {
  const px = x - ax, py = y - ay, vx = bx - ax, vy = by - ay;
  const h = Math.max(0, Math.min(1, (px * vx + py * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - vx * h, py - vy * h) - (ra + (rb - ra) * h);
};
export const poly = (pts: [number, number][]): SD => (x, y) => {
  let d = Infinity, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    const vx = xj - xi, vy = yj - yi, h = Math.max(0, Math.min(1, ((x - xi) * vx + (y - yi) * vy) / (vx * vx + vy * vy || 1)));
    d = Math.min(d, Math.hypot(x - xi - vx * h, y - yi - vy * h));
  }
  return inside ? -d : d;
};
export const union = (...f: SD[]): SD => (x, y) => { let d = Infinity; for (const g of f) d = Math.min(d, g(x, y)); return d; };
export const cut = (a: SD, b: SD): SD => (x, y) => Math.max(a(x, y), -b(x, y));
export const clipY = (a: SD, minY: number, maxY = 999): SD => (x, y) => Math.max(a(x, y), minY - y, y - maxY);
export const roughen = (f: SD, n: ReturnType<typeof makeNoise>, amp: number, scale: number): SD => (x, y) => f(x, y) + (n.fbm(x / scale, y / scale, 3) - 0.5) * amp * 2;

// ---------- lienzo ----------
export class Art {
  px: (RGB | null)[];
  constructor(public w: number, public h: number) { this.px = new Array(w * h).fill(null); }
  get(x: number, y: number): RGB | null { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null; }
  set(x: number, y: number, c: RGB | null) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  /** Rellena una forma; la sombra sale del gradiente de la distancia (volumen "almohadillado"). */
  fill(sd: SD, color: ColorFn, bulge = 6): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const px = x + 0.5, py = y + 0.5, d = sd(px, py);
      if (d >= 0) continue;
      let nx = sd(px + 0.5, py) - sd(px - 0.5, py), ny = sd(px, py + 0.5) - sd(px, py - 0.5);
      const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      const e = 1 - Math.min(1, -d / bulge), nz = Math.sqrt(Math.max(0, 1 - e * e));
      const c = color(x, y, { d, nx, ny, light: nx * e * LX + ny * e * LY + nz * LZ });
      if (c) this.px[y * this.w + x] = c;
    }
  }
  line(x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= n; i++) this.set(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, c);
  }
  /** Contorno selectivo: el borde exterior toma una version oscura del propio color. */
  outline(dark: RGB, k = 0.72): void {
    const out = this.px.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.get(x, y);
      if (!c) continue;
      if (!this.get(x + 1, y) || !this.get(x - 1, y) || !this.get(x, y + 1) || !this.get(x, y - 1))
        out[y * this.w + x] = [0, 1, 2].map(i => c[i] + (dark[i] - c[i]) * k) as RGB;
    }
    this.px = out;
  }
  bg(fn: (x: number, y: number) => RGB): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.px[y * this.w + x]) this.px[y * this.w + x] = fn(x, y);
  }
}

const dist2 = (a: RGB, b: RGB) => 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2;

/** Pasa el lienzo a plantilla: junta colores repetidos y fusiona los menos usados hasta `max`. */
export function finish(a: Art, id: string, name: string, max: number, extra: Partial<Template> = {}): Template {
  const key = (c: RGB) => (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
  const count = new Map<number, number>();
  for (const c of a.px) if (c) count.set(key(c), (count.get(key(c)) ?? 0) + 1);
  const cols = [...count.entries()].map(([k, n]) => ({ k, n, c: [(k >> 16) & 255, (k >> 8) & 255, k & 255] as RGB, to: -1 }));
  const alive = () => cols.filter(c => c.to < 0);
  while (alive().length > max) {
    const live = alive().sort((p, q) => p.n - q.n);
    const v = live[0];
    let best = live[1], bd = Infinity;
    for (const o of live.slice(1)) { const d = dist2(v.c, o.c); if (d < bd) { bd = d; best = o; } }
    v.to = cols.indexOf(best); best.n += v.n;
  }
  const root = (i: number): number => (cols[i].to < 0 ? i : root(cols[i].to));
  const lum = (c: RGB) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const finals = cols.map((_, i) => i).filter(i => cols[i].to < 0).sort((p, q) => lum(cols[p].c) - lum(cols[q].c));
  const idx = new Map<number, number>(finals.map((f, i) => [f, i]));
  const byKey = new Map<number, number>(cols.map((c, i) => [c.k, idx.get(root(i))!]));
  const cells = new Uint8Array(a.w * a.h).fill(TRANSPARENT);
  a.px.forEach((c, i) => { if (c) cells[i] = byKey.get(key(c))!; });
  return { id, name, w: a.w, h: a.h, palette: finals.map(f => rgbToHex(...cols[f].c)), cells, price: 0, source: 'builtin', ...extra };
}

// ---------- rampas ----------
export const BARK = R('#1f1214', '#3b2124', '#5a3530', '#7a4c3c', '#9a6a52');
export const PINK = R('#5a1f3e', '#7a2f52', '#a94a72', '#cf6f93', '#e696b0', '#f4bccd', '#fbdbe4', '#fff3f6');
export const GREEN = R('#0b1f10', '#14301a', '#1f4a22', '#2f6b2a', '#4a8c2f', '#6caf37', '#97cc4a', '#c4e77a');
export const AUTUMN = R('#4a1a0a', '#6a2a12', '#93401a', '#bf5f24', '#dc8434', '#eba653', '#f6c97c', '#fde5ad');
export const INK: RGB = H('#120c24');

// ---------- arboles (referencia: copas por "racimos" sombreados como esferas) ----------
interface TreeOpts { crown: RGB[]; seed: number; cx: number; cy: number; rx: number; ry: number; blobs: number; rMin: number; rMax: number; jag: number; leaf: number; trunk: boolean; ground: 'petals' | 'grass' | 'leaves'; bottom?: number }
function tree(id: string, name: string, o: TreeOpts, extra: Partial<Template>): Template {
  const a = new Art(64, 64), n = makeNoise(o.seed), rng = mulberry32(o.seed);
  if (o.trunk) {
    const trunk = union(seg(32, 63, 31, 42, 3.8, 2.3), seg(31, 50, 20, 36, 1.8, 0.7), seg(31, 46, 44, 32, 1.8, 0.7), seg(31, 42, 25, 25, 1.4, 0.6),
      seg(31, 42, 39, 22, 1.3, 0.5), seg(29, 61, 24, 63.5, 1.6, 0.8), seg(34, 61, 39, 63.5, 1.6, 0.8));
    a.fill(trunk, (x, y, s) => tone(BARK, litT(s) + (n.fbm(x / 1.4, y / 5) - 0.5) * 0.5, x, y), 2.2);
  } else a.fill(union(seg(30, 62, 26, 50, 1.2, 0.6), seg(34, 62, 40, 52, 1.1, 0.5)), (x, y, s) => tone(BARK, litT(s), x, y), 1.5);
  const blobs: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < o.blobs; i++) {
    const r = o.rMin + rng() * (o.rMax - o.rMin), t = rng() * Math.PI * 2, k = Math.sqrt(rng());
    blobs.push({ x: o.cx + Math.cos(t) * k * Math.max(1, o.rx - r * 0.7), y: o.cy + Math.sin(t) * k * Math.max(1, o.ry - r * 0.7), r });
  }
  blobs.sort((p, q) => p.y - q.y);
  let crown: SD = (x, y) => { let d = Infinity; for (const b of blobs) d = Math.min(d, Math.hypot(x - b.x, y - b.y) - b.r); return d + (n.fbm(x / o.leaf, y / o.leaf, 3) - 0.5) * o.jag; };
  if (o.bottom) crown = clipY(crown, -99, o.bottom);
  a.fill(crown, (x, y, s) => {
    const px = x + 0.5, py = y + 0.5;
    let b = blobs[0];
    for (let i = blobs.length - 1; i >= 0; i--) if (Math.hypot(px - blobs[i].x, py - blobs[i].y) < blobs[i].r + 1.2) { b = blobs[i]; break; }
    const nx = Math.max(-1, Math.min(1, (px - b.x) / b.r)), ny = Math.max(-1, Math.min(1, (py - b.y) / b.r)), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const light = nx * LX + ny * LY + nz * LZ;
    if (n.value(px / 1.7 + 40, py / 1.7) < (s.d > -2.5 ? 0.3 : 0.08)) return null;      // huecos entre hojas
    const [c1, c2] = n.worley(px / 2.7, py / 2.7);
    const clump = (0.35 - c1) * 0.9 + (c2 - c1 < 0.12 ? -0.25 : 0);
    const t = (light + 0.45) / 1.45 + clump + (n.fbm(px / 1.6 + 9, py / 1.6, 2) - 0.5) * 0.35 - Math.max(0, (py - o.cy) / o.ry) * 0.25;
    return tone(o.crown, t, x, y);
  }, 4);
  // suelo: petalos, hojas o hierba
  for (let x = 4; x < 60; x++) for (let y = 59; y < 64; y++) {
    if (a.get(x, y)) continue;
    const dx = Math.abs(x - 32) / 28, p = (1 - dx) * (y - 58) / 6;
    if (o.ground === 'grass' && y >= 62) { a.set(x, y, tone(GREEN, 0.55 + (n.value(x, y) - 0.5) * 0.5 - (y - 62) * 0.3, x, y)); continue; }
    if (o.ground !== 'grass' && rng() < p * 0.9) a.set(x, y, tone(o.crown, 0.35 + rng() * 0.6, x, y));
  }
  if (o.ground === 'leaves') for (let i = 0; i < 9; i++) { const x = 8 + rng() * 48, y = 30 + rng() * 26; if (!a.get(Math.round(x), Math.round(y))) { a.set(x, y, o.crown[3]); a.set(x + 1, y, o.crown[4]); } }
  if (o.ground === 'petals') for (let i = 0; i < 10; i++) { const x = 6 + rng() * 52, y = 20 + rng() * 38; if (!a.get(Math.round(x), Math.round(y))) a.set(x, y, o.crown[5]); }
  return finish(a, id, name, 30, extra);
}

export const furT = (n: ReturnType<typeof makeNoise>, x: number, y: number, k = 0.32) => (n.fbm(x / 1.3, y / 3.2, 2) - 0.5) * k;

// ---------- gato atigrado ----------
function gato(): Template {
  const a = new Art(64, 64), n = makeNoise(5);
  const fur = R('#25202f', '#3d3649', '#575067', '#766e88', '#988fa9', '#bdb5cb', '#ddd7e6');
  const white = R('#8d87a0', '#bdb8cc', '#e2dfeb', '#fbfaff');
  const pinkR = R('#9c4f6c', '#cf7f9c', '#efb3c6');
  const tabby = (x: number, y: number, s: Shade) => {
    let t = litT(s) + furT(n, x, y);
    if (Math.sin(y * 0.8 + n.fbm(x / 5, y / 5) * 5 + Math.abs(x - 32) * 0.18) > 0.5) t -= 0.36;
    return tone(fur, t, x, y);
  };
  const wf: ColorFn = (x, y, s) => tone(white, litT(s, 0.15) + furT(n, x, y, 0.25), x, y);
  a.fill(union(seg(44, 58, 53, 55, 3, 2.6), seg(53, 55, 57, 45, 2.6, 2.2), seg(57, 45, 54, 35, 2.2, 1.7)),
    (x, y, s) => tone(fur, litT(s) - (Math.sin((x + y) * 0.95) > 0.35 ? 0.36 : 0), x, y), 2.5);
  a.fill(roughen(union(ell(32, 48, 14, 13.5), ell(21, 56, 9, 7), ell(43, 56, 9, 7)), n, 1.2, 1.6), tabby, 9);
  a.fill(roughen(ell(32, 46, 6.5, 9), n, 1.2, 1.4), wf, 5);
  for (const px of [26, 38]) {
    a.fill(seg(px, 46, px, 59, 3.1, 3.3), (x, y, s) => (y > 55 ? wf(x, y, s) : tabby(x, y, s)), 3);
    a.fill(ell(px, 60, 4.2, 2.6), wf, 2);
  }
  for (const m of [1, -1]) {
    const X = (v: number) => 32 + (v - 32) * m;
    a.fill(poly([[X(17), 24], [X(16), 5], [X(29), 15]]), tabby, 3);
    a.fill(poly([[X(19.5), 20], [X(18.5), 9.5], [X(26), 15.5]]), (x, y, s) => tone(pinkR, litT(s) + furT(n, x, y), x, y), 2);
  }
  a.fill(roughen(union(ell(32, 27, 15, 12), ell(22, 31, 7.5, 6), ell(42, 31, 7.5, 6)), n, 1.1, 1.4), (x, y, s) => {
    let t = litT(s) + furT(n, x, y, 0.28);
    const fx = Math.abs(x + 0.5 - 32);
    if (y < 22 && fx < 8 && Math.sin(fx * 1.3 + 0.4) > 0.45) t -= 0.42;
    if (fx > 10 && Math.sin(y * 1.15 + fx * 0.55) > 0.6) t -= 0.36;
    return tone(fur, t, x, y);
  }, 7);
  a.fill(union(ell(29, 32.5, 4.6, 3.6), ell(35, 32.5, 4.6, 3.6), ell(32, 35.5, 3.6, 2.4)), wf, 3);
  const iris = R('#173d22', '#2c6e33', '#4f9e3c', '#8bcf55', '#c9ef8a');
  for (const ex of [25.5, 38.5]) {
    a.fill(ell(ex, 26, 4.1, 3.6), () => INK);
    a.fill(ell(ex, 26.2, 3.3, 2.8), (x, y) => tone(iris, 0.2 + (y + 0.5 - 23.4) / 5.2, x, y, 0.6));
    a.fill(ell(ex, 26.2, 0.75, 2.6), () => H('#0a0812'));
    a.set(Math.floor(ex) - 2, 24, H('#ffffff')); a.set(Math.floor(ex) - 1, 24, H('#e8f6d8'));
  }
  a.fill(poly([[29.4, 30.2], [34.6, 30.2], [32, 33]]), (x, y) => tone(pinkR, 1 - (y - 30) / 3, x, y));
  a.outline(INK);
  const dark = H('#2a2236');
  a.line(32, 33, 32, 34, dark); a.line(32, 35, 30, 36, dark); a.line(32, 35, 34, 36, dark);
  const wh = H('#efeaf8');
  a.line(25, 33, 12, 31, wh); a.line(25, 35, 12, 36, wh); a.line(39, 33, 52, 31, wh); a.line(39, 35, 52, 36, wh);
  return finish(a, 'gato', 'Gato atigrado', 30, { price: 0 });
}

// ---------- perro (golden) ----------
function perro(): Template {
  const a = new Art(64, 64), n = makeNoise(9);
  const gold = R('#4f2c10', '#7a4719', '#a46628', '#c98739', '#e2aa55', '#f1cc85', '#fbe8bd');
  const ff = (off: number): ColorFn => (x, y, s) => tone(gold, litT(s, off) + furT(n, x, y, 0.36), x, y);
  a.fill(roughen(union(ell(32, 62, 23, 14), ell(32, 50, 13, 9)), n, 1.6, 1.3), ff(0.05), 10);
  a.fill(roughen(union(ell(32, 30, 13.5, 13), ell(32, 40, 9.5, 7.5)), n, 0.9, 1.5), ff(0.08), 8);
  for (const m of [1, -1]) a.fill(roughen(ell(32 + 13 * m, 35, 6, 12.5, -0.32 * m), n, 1.6, 1.2), ff(-0.16), 4);
  a.fill(union(ell(28.5, 40.5, 5.6, 4.4), ell(35.5, 40.5, 5.6, 4.4)), ff(0.3), 4);
  a.fill(clipY(ell(32, 45, 3, 3.6), 42.5), (x, y, s) => tone(R('#9e3550', '#d4587a', '#f08aa5'), litT(s), x, y), 2);
  a.fill(ell(32, 36.8, 4.2, 2.9), (x, y, s) => tone(R('#0d0a10', '#231c26', '#433744', '#6d5e70'), litT(s), x, y), 2);
  a.set(30, 35, H('#a99aae'));
  for (const ex of [26.5, 37.5]) {
    a.fill(ell(ex, 29, 2.6, 2.6), () => INK);
    a.fill(ell(ex, 29.2, 1.9, 1.9), (x, y) => tone(R('#2a140a', '#4a2612', '#6e3a1a'), (y - 27) / 4, x, y, 0.4));
    a.set(Math.floor(ex) - 1, 28, H('#ffffff'));
    a.line(ex - 2, 25.5, ex + 1.5, 25, H('#f1cc85'));
  }
  a.outline(INK);
  const dark = H('#2b1a10');
  a.line(32, 39, 32, 41, dark); a.line(32, 41, 28, 42.5, dark); a.line(32, 41, 36, 42.5, dark);
  return finish(a, 'perro', 'Perrete golden', 30, { price: 0 });
}

// ---------- husky ----------
function husky(): Template {
  const a = new Art(64, 64), n = makeNoise(13);
  const dark = R('#151726', '#24283c', '#383e57', '#535b78', '#757e9b', '#9aa2bd');
  const white = R('#8e94ad', '#babfd4', '#dfe2ef', '#fbfcff');
  a.fill(roughen(union(ell(32, 62, 21, 11), ell(32, 50, 12, 9)), n, 1.5, 1.3), (x, y, s) => tone(white, litT(s, 0.1) + furT(n, x, y), x, y), 9);
  for (const m of [1, -1]) {
    const X = (v: number) => 32 + (v - 32) * m;
    a.fill(poly([[X(16.5), 25], [X(19), 2.5], [X(29.5), 15]]), (x, y, s) => tone(dark, litT(s) + furT(n, x, y), x, y), 3);
    a.fill(poly([[X(19.5), 19.5], [X(20.3), 8], [X(26.5), 15.5]]), (x, y, s) => tone(R('#6b5262', '#a07f92', '#cfb3c2'), litT(s) + furT(n, x, y), x, y), 2);
  }
  const eyeA = ell(26, 29.5, 6.2, 4.4), eyeB = ell(38, 29.5, 6.2, 4.4);
  a.fill(roughen(union(ell(32, 30, 15.5, 14), ell(20, 38, 7.5, 7), ell(44, 38, 7.5, 7), ell(32, 43, 10, 6.5)), n, 1.2, 1.4), (x, y, s) => {
    const px = x + 0.5, py = y + 0.5, fx = Math.abs(px - 32);
    const isW = py > 33.5 + (n.fbm(px / 3, py / 3) - 0.5) * 3 || (fx < 2.4 && py > 14) || eyeA(px, py) < 0 || eyeB(px, py) < 0 || (fx > 13 && py > 30);
    return tone(isW ? white : dark, litT(s, isW ? 0.1 : 0) + furT(n, x, y), x, y);
  }, 8);
  const blue = R('#0f356b', '#2363b5', '#4f9de6', '#9fd6ff', '#e0f4ff');
  for (const ex of [26, 38]) {
    a.fill(ell(ex, 29.5, 3.6, 3), () => INK);
    a.fill(ell(ex, 29.6, 2.8, 2.3), (x, y) => tone(blue, 0.25 + (y + 0.5 - 27.5) / 4.2, x, y, 0.5));
    a.fill(ell(ex, 29.7, 0.9, 1.1), () => H('#06050c'));
    a.set(ex - 1, 28, H('#ffffff'));
  }
  a.fill(ell(32, 39.5, 4, 2.8), (x, y, s) => tone(R('#08070d', '#1c1924', '#3a3446', '#6a6178'), litT(s), x, y), 2);
  a.set(30, 38, H('#8f86a0'));
  a.outline(INK);
  const dk = H('#2a2a3a');
  a.line(32, 42, 32, 44, dk); a.line(32, 44, 28, 45, dk); a.line(32, 44, 36, 45, dk);
  return finish(a, 'husky', 'Husky de ojos azules', 30, { price: 120 });
}

// ---------- paloma ----------
function paloma(): Template {
  const a = new Art(64, 64), n = makeNoise(17);
  const gray = R('#272b40', '#3d4360', '#585f80', '#7880a2', '#9ba3c2', '#c2c8df', '#e3e6f2');
  const green = R('#1d4a3e', '#2f7a5c', '#4fb085', '#8be0b2');
  const purple = R('#3a1f5e', '#64379a', '#9460cf', '#c69af0');
  const legs = R('#8f2f45', '#c95066', '#ec8897');
  a.fill(ell(35, 58.5, 15, 1.8), () => H('#1c1644'));
  for (const [x1, x2] of [[30, 29], [38, 38]]) {
    a.line(x1, 47, x2, 56, legs[1]); a.line(x2, 56, x2 - 4, 57, legs[0]); a.line(x2, 56, x2 + 3, 57, legs[2]); a.line(x2, 56, x2 - 1, 58, legs[1]);
  }
  a.fill(poly([[44, 38], [62, 43], [61, 49], [42, 46]]), (x, y, s) => tone(gray, litT(s, x > 56 ? -0.45 : -0.1), x, y), 2);
  a.fill(ell(34, 39, 15, 10.5, -0.12), (x, y, s) => tone(gray, litT(s, 0.05) + furT(n, x, y, 0.2), x, y), 8);
  a.fill(roughen(ell(39.5, 35.5, 13, 7.5, -0.2), n, 0.6, 1.3), (x, y, s) => {
    const u = x + (y - 36) * 0.35;
    let t = litT(s, -0.02) + (Math.sin(x * 1.4) + Math.sin(y * 1.9) > 1.3 ? -0.14 : 0);
    if (((u > 35 && u < 37.6) || (u > 41.5 && u < 44.2)) && y > 32) t = 0.08;
    if (x > 47) t -= 0.25;
    return tone(gray, t, x, y);
  }, 5);
  a.fill(ell(23, 29, 7.5, 9.5, 0.25), (x, y, s) => {
    const g = n.fbm(x / 3, y / 3) + (y - 29) / 16 > 0.55;
    return tone(g ? green : purple, litT(s) + (n.value(x / 1.5, y / 1.5) - 0.5) * 0.5, x, y);
  }, 5);
  a.fill(ell(19, 20, 6.5, 6), (x, y, s) => tone(gray, litT(s, 0.1), x, y), 5);
  a.fill(poly([[13.6, 19.2], [7.5, 22], [13.6, 22.6]]), (x, y) => tone(R('#221e2c', '#463f52', '#6d6480'), 1 - (y - 19) / 4, x, y));
  a.fill(ell(17.8, 19, 2.1, 2.1), () => H('#e8812a'));
  a.set(17, 18, H('#120c10')); a.set(18, 18, H('#120c10')); a.set(17, 19, H('#120c10'));
  a.outline(INK);
  a.set(13, 19, H('#f2eff8')); a.set(14, 19, H('#e1dcea'));
  return finish(a, 'paloma', 'Paloma de plaza', 30, { price: 80 });
}

// ---------- leopardo ----------
function leopardo(): Template {
  const a = new Art(64, 64), n = makeNoise(21);
  const coat = R('#5a2f0c', '#8a4d16', '#b76f22', '#d9953a', '#eebb5e', '#f8db96', '#fff2cf');
  const white = R('#a99a84', '#d8cdbc', '#f3ede2', '#ffffff');
  const spot = H('#1a1008');
  const muzzle = union(ell(28, 40, 5.4, 4.2), ell(36, 40, 5.4, 4.2), ell(32, 46, 6, 3.2));
  const fur: ColorFn = (x, y, s) => {
    const px = x + 0.5, py = y + 0.5;
    if (muzzle(px, py) < 0.5) return null;
    const fore = Math.abs(px - 32) < 9 && py < 28;
    const [d1] = n.worley(px / (fore ? 2.4 : 4.1), py / (fore ? 2.4 : 4.1));
    if (fore ? d1 < 0.2 : d1 > 0.21 && d1 < 0.34 && n.hash(Math.floor(px / 4.1), Math.floor(py / 4.1)) > 0.12) return spot;
    return tone(coat, litT(s, d1 < 0.21 && !fore ? -0.12 : 0) + furT(n, x, y, 0.28), x, y);
  };
  a.fill(roughen(union(ell(32, 61, 22, 11), ell(32, 50, 13, 9)), n, 1.3, 1.4), fur, 9);
  for (const m of [1, -1]) {
    a.fill(ell(32 + 13.5 * m, 15, 5.8, 5.2), (x, y, s) => tone(R('#120a06', '#2c1a10', '#4a2e1c'), litT(s), x, y), 3);
    a.fill(ell(32 + 13.3 * m, 15.8, 3.4, 3), (x, y, s) => tone(white, litT(s, -0.1), x, y), 2);
  }
  a.fill(roughen(union(ell(32, 30, 17, 14.5), ell(32, 41, 11.5, 8)), n, 0.8, 1.4), (x, y, s) => fur(x, y, s) ?? tone(white, litT(s, 0.1), x, y), 9);
  a.fill(muzzle, (x, y, s) => tone(white, litT(s, 0.1) + furT(n, x, y, 0.2), x, y), 4);
  for (const ex of [25, 39]) {
    a.fill(ell(ex, 29, 4, 2.9, ex < 32 ? 0.18 : -0.18), () => INK);
    a.fill(ell(ex, 29.1, 3.1, 2.1, ex < 32 ? 0.18 : -0.18), (x, y) => tone(R('#6a5a0e', '#a8901c', '#d6c23a', '#f2e67a'), 0.3 + (y + 0.5 - 27.5) / 3.5, x, y, 0.5));
    a.fill(ell(ex, 29.1, 1, 1.6), () => H('#07050a'));
    a.set(ex - 2, 28, H('#ffffff'));
    const inner = ex < 32 ? 1 : -1;
    a.line(ex + 3 * inner, 31, ex + 3.6 * inner, 37, INK);
  }
  a.fill(poly([[28.6, 35.2], [35.4, 35.2], [32, 38.6]]), (x, y) => tone(R('#3a1a20', '#a3505f', '#d98a95'), 1 - (y - 35) / 3.6, x, y));
  a.outline(INK);
  a.line(32, 39, 32, 41, INK); a.line(32, 41, 29, 43, INK); a.line(32, 41, 35, 43, INK);
  for (const [x, y] of [[27, 40], [25, 41], [27, 42], [37, 40], [39, 41], [37, 42]]) a.set(x, y, H('#8a7a66'));
  return finish(a, 'leopardo', 'Leopardo', 32, { price: 150 });
}

// ---------- buho nocturno ----------
function buho(): Template {
  const a = new Art(64, 64), n = makeNoise(25);
  const plum = R('#1c1340', '#2c1f63', '#433088', '#5f48ad', '#8370cf', '#ac9dea', '#d6ccfb');
  const light = R('#5a5094', '#8a80c4', '#b9b0e6', '#e6e0ff');
  a.fill(roughen(seg(2, 57, 62, 54, 3.2, 2.6), n, 0.6, 1.5), (x, y, s) => tone(BARK, litT(s) + (n.fbm(x / 4, y) - 0.5) * 0.6, x, y), 2.5);
  for (const m of [1, -1]) a.fill(roughen(ell(32 + 13 * m, 39, 6, 13, 0.16 * m), n, 0.6, 1.3), (x, y, s) => tone(plum, litT(s, -0.12) + ((y + Math.abs(x - 32) * 0.4) % 4 < 1 ? -0.2 : 0), x, y), 4);
  a.fill(ell(32, 38, 13.5, 16), (x, y, s) => tone(plum, litT(s) + furT(n, x, y, 0.2), x, y), 9);
  a.fill(ell(32, 43, 9, 10.5), (x, y, s) => {
    const sc = (y + Math.abs(Math.sin((x + 0.5) * 0.85)) * 2.2) % 4 < 1;
    return tone(light, litT(s, sc ? -0.35 : 0.05), x, y);
  }, 6);
  for (const m of [1, -1]) a.fill(poly([[32 + 12 * m, 16], [32 + 16 * m, 3], [32 + 6 * m, 12]]), (x, y, s) => tone(plum, litT(s, -0.05), x, y), 2);
  a.fill(ell(32, 22, 14.5, 11.5), (x, y, s) => tone(plum, litT(s, 0.04) + furT(n, x, y, 0.2), x, y), 8);
  for (const ex of [25.5, 38.5]) {
    a.fill(ell(ex, 23, 7, 6.6), (x, y, s) => { const r = Math.hypot(x + 0.5 - ex, y + 0.5 - 23); return tone(light, litT(s, 0.1) + (Math.floor(r) % 2 ? -0.18 : 0), x, y); }, 5);
    a.fill(ell(ex, 23, 4.3, 4.3), () => INK);
    a.fill(ell(ex, 23, 3.5, 3.5), (x, y) => tone(R('#a8420e', '#e2791c', '#f9b23a', '#ffe08a'), 0.15 + Math.hypot(x + 0.5 - ex, y + 0.5 - 23.6) / 3.8, x, y, 0.5));
    a.fill(ell(ex, 23, 1.9, 1.9), () => H('#08060f'));
    a.set(ex - 2, 21, H('#ffffff')); a.set(ex - 1, 21, H('#fff3d0'));
  }
  a.fill(poly([[30.3, 26], [33.7, 26], [32, 31]]), (x, y) => tone(R('#6a4a12', '#b98a2a', '#f0c860'), 1 - (y - 26) / 5, x, y));
  for (const fx of [27, 31, 35]) { a.fill(ell(fx, 53.5, 1.8, 1.4), () => H('#e9b44c')); }
  a.outline(INK);
  return finish(a, 'buho', 'Búho de medianoche', 30, { price: 120 });
}

// ---------- zorro ----------
function zorro(): Template {
  const a = new Art(64, 64), n = makeNoise(29);
  const orange = R('#5e200a', '#8f3810', '#c0561a', '#e0782a', '#f29a48', '#fbc07c');
  const white = R('#9c95a8', '#cfcad8', '#f0eef5', '#ffffff');
  a.fill(roughen(union(ell(32, 62, 20, 11), ell(32, 50, 11, 9)), n, 1.4, 1.3), (x, y, s) => tone(Math.abs(x + 0.5 - 32) < 9 ? white : orange, litT(s, 0.05) + furT(n, x, y), x, y), 9);
  for (const m of [1, -1]) {
    const X = (v: number) => 32 + (v - 32) * m;
    a.fill(poly([[X(15), 27], [X(14), 4], [X(29), 17]]), (x, y, s) => tone(y < 11 ? R('#140a08', '#2e1a14', '#4a2c22') : orange, litT(s), x, y), 3);
    a.fill(poly([[X(18), 22], [X(17), 10], [X(25.5), 17]]), (x, y, s) => tone(white, litT(s, -0.15), x, y), 2);
  }
  a.fill(roughen(union(ell(32, 30, 15, 12.5), ell(21, 36, 6.5, 5), ell(43, 36, 6.5, 5), poly([[23, 34], [41, 34], [32, 47]])), n, 1.1, 1.4), (x, y, s) => {
    const px = x + 0.5, py = y + 0.5, fx = Math.abs(px - 32);
    const isW = py > 34 + fx * 0.05 && !(fx < 3.4 && py < 43.5);
    return tone(isW ? white : orange, litT(s, isW ? 0.08 : 0) + furT(n, x, y), x, y);
  }, 8);
  for (const ex of [25.5, 38.5]) {
    a.fill(ell(ex, 29, 3.6, 2.4, ex < 32 ? 0.3 : -0.3), () => INK);
    a.fill(ell(ex, 29.1, 2.8, 1.7, ex < 32 ? 0.3 : -0.3), (x, y) => tone(R('#7a3a06', '#c86a10', '#f2a83a'), 0.3 + (y + 0.5 - 27.5) / 3, x, y, 0.5));
    a.fill(ell(ex, 29.1, 0.7, 1.4), () => H('#07050a'));
    a.set(ex - 1, 28, H('#ffffff'));
  }
  a.fill(ell(32, 45.5, 3, 2.2), (x, y, s) => tone(R('#08070d', '#26202e', '#544a5e'), litT(s), x, y), 2);
  a.outline(INK);
  return finish(a, 'zorro', 'Zorro', 30, { price: 100 });
}

// ---------- mariposa morpho ----------
function mariposa(): Template {
  const a = new Art(64, 64), n = makeNoise(33);
  const blue = R('#0a1a52', '#13399e', '#1f5fe0', '#3e8ff7', '#7cc3ff', '#c4ecff');
  const edge = R('#07060f', '#17142a', '#2a2546');
  for (const m of [1, -1]) {
    const up = roughen(ell(32 + 14 * m, 23, 14, 11.5, -0.55 * m), n, 0.4, 1.5), lo = roughen(ell(32 + 10 * m, 42, 9.5, 11, 0.45 * m), n, 0.4, 1.5);
    for (const [w, cy] of [[lo, 42], [up, 23]] as const) a.fill(w, (x, y, s) => {
      const px = x + 0.5, py = y + 0.5, ang = Math.atan2(py - cy, px - 32);
      if (s.d > -2.6) return Math.sin(ang * 9 + px * 0.3) > 0.82 && s.d < -1 ? H('#f4f0ff') : tone(edge, 0.5 + s.d * 0.15, x, y);
      const r = Math.hypot(px - 32, py - (cy + 4)) / 22;
      const vein = Math.abs(Math.sin(ang * 5.5)) < 0.08;
      return tone(blue, 1.05 - r * 0.9 + s.light * 0.25 + (n.fbm(px / 2, py / 2) - 0.5) * 0.35 - (vein ? 0.4 : 0), x, y);
    }, 6);
  }
  a.fill(union(seg(32, 17, 32, 50, 1.9, 1.1), ell(32, 15, 2.4, 2.4)), (x, y, s) => tone(R('#0d0b16', '#2a2440', '#4c4470'), litT(s) + (y % 3 === 0 ? -0.3 : 0), x, y), 2);
  a.line(31, 13, 25, 3, H('#1c1830')); a.line(33, 13, 39, 3, H('#1c1830'));
  a.set(25, 3, H('#3e8ff7')); a.set(39, 3, H('#3e8ff7')); a.set(24, 3, H('#1c1830')); a.set(40, 3, H('#1c1830'));
  a.outline(INK, 0.5);
  return finish(a, 'mariposa', 'Mariposa morpho', 28, { price: 90 });
}

// ---------- medusa (fondo marino) ----------
function medusa(): Template {
  const a = new Art(64, 64), n = makeNoise(37), rng = mulberry32(37);
  const sea = R('#02041a', '#050b30', '#081647', '#0d235f', '#143477');
  const bell = R('#2a1670', '#4528a8', '#6a45d8', '#9a78f5', '#c9b2ff', '#f0e8ff');
  const tent = [H('#7cc3ff'), H('#a68cff'), H('#c9b2ff')];
  a.fill(clipY(ell(32, 27, 17, 14), -9, 31), (x, y, s) => {
    const px = x + 0.5, py = y + 0.5;
    if (py > 29 + Math.sin(px * 0.9) * 1.4) return null;
    const ring = Math.abs(ell(32, 22, 6.5, 4.2)(px, py)) < 0.8 || Math.abs(ell(32, 22, 3, 1.8)(px, py)) < 0.7;
    return tone(bell, litT(s, ring ? 0.35 : 0) + (s.d > -1.8 ? 0.35 : 0) + (n.fbm(px / 2, py / 2) - 0.5) * 0.3, x, y);
  }, 7);
  for (let i = 0; i < 8; i++) {
    const x0 = 19 + i * 3.7, ph = i * 1.7;
    for (let y = 30; y < 63 - (i % 3) * 4; y++) a.set(x0 + Math.sin(y * 0.22 + ph) * 2.2, y, tent[(i + Math.floor(y / 6)) % 3]);
  }
  a.fill(union(...[27, 32, 37].map((cx, k) => (x: number, y: number) => seg(cx, 30, cx + Math.sin(y * 0.25 + k) * 3, 50 + k * 3, 1.6, 0.6)(x, y))), (x, y, s) => tone(bell, litT(s, 0.15), x, y), 2);
  a.bg((x, y) => {
    if (ell(32, 26, 21, 18)(x + 0.5, y + 0.5) < 0 && y < 34) return tone(sea, 0.95 - y / 64, x, y);
    if (rng() < 0.012) return H('#5f7fd6');
    const ray = Math.sin((x - y * 0.45) * 0.35) > 0.85 && y < 40;
    return tone(sea, 0.8 - y / 64 + (ray ? 0.2 : 0) + (n.fbm(x / 8, y / 8) - 0.5) * 0.2, x, y);
  });
  return finish(a, 'medusa', 'Medusa abisal', 30, { price: 140 });
}

// ---------- galaxia (como el fondo del menu) ----------
function galaxia(): Template {
  const a = new Art(64, 64), n = makeNoise(41), rng = mulberry32(41);
  const sky = R('#03021a', '#070532', '#0d0a48', '#160f5e', '#211673');
  const gal = R('#1a2a8a', '#2b48c4', '#4a72f0', '#7a6cff', '#a98cff', '#d9ccff', '#ffffff');
  const cl = R('#1a0f52', '#2f1a7e', '#4c2aac', '#7346d6', '#a17cf5');
  a.bg((x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const dx = px - 32, dy = py - 30, c = Math.cos(-0.4), s = Math.sin(-0.4);
    const rx = (dx * c - dy * s) / 24, ry = (dx * s + dy * c) / 10, r = Math.hypot(rx, ry);
    const th = Math.atan2(ry, rx);
    const I = Math.exp(-r * 5) * 1.7 + Math.pow(0.5 + 0.5 * Math.cos(2 * th - 6.5 * Math.log(r + 0.08)), 2) * Math.exp(-r * 2.2) * (0.7 + 0.6 * n.fbm(px / 3, py / 3)) - 0.15;
    if (I > 0.1) return tone(gal, I, x, y);
    const cd = n.fbm(px / 9, py / 5) + (1 - Math.hypot((px - 4) / 30, (py - 6) / 14)) * 0.5 - 0.55;
    if (cd > 0.05) return tone(cl, cd * 3, x, y);
    const cd2 = n.fbm(px / 9 + 7, py / 5) + (1 - Math.hypot((px - 62) / 26, (py - 52) / 12)) * 0.5 - 0.55;
    if (cd2 > 0.05) return tone(R('#0d1a5a', '#173495', '#2a5ad0', '#5a96f5'), cd2 * 3, x, y);
    if (rng() < 0.03) return rng() < 0.5 ? H('#ffffff') : H('#a8d4ff');
    return tone(sky, py / 64, x, y);
  });
  for (const [x, y] of [[10, 12], [52, 8], [48, 50], [14, 44]]) { a.set(x, y, H('#ffffff')); a.set(x - 1, y, H('#a8d4ff')); a.set(x + 1, y, H('#a8d4ff')); a.set(x, y - 1, H('#a8d4ff')); a.set(x, y + 1, H('#a8d4ff')); }
  return finish(a, 'galaxia', 'Galaxia espiral', 30, { price: 160 });
}

// ---------- aurora sobre el lago ----------
function aurora(): Template {
  const a = new Art(64, 64), n = makeNoise(45), rng = mulberry32(45);
  const sky = R('#03031a', '#06082e', '#0b1044', '#121a5a', '#1b2670');
  const aur = R('#0e3a5a', '#11707a', '#1fbf9a', '#5ef0c0', '#c6ffe8');
  const vio = R('#2a1a6a', '#4a2fa0', '#7a5ad8', '#a98cff');
  const horizon = 44;
  const skyAt = (x: number, y: number): RGB => {
    const yc = 22 + Math.sin(x * 0.11) * 5 + (n.fbm(x / 14, 3) - 0.5) * 12;
    const streak = 0.6 + 0.6 * n.value(x / 1.4, 7);
    const dy = yc - y;
    if (dy > -3 && dy < 16) {
      const I = (dy < 0 ? 1 + dy / 3 : 1 - dy / 16) * streak;
      if (I > 0.18) return dy > 9 ? tone(vio, I * 1.3, x, y) : tone(aur, I, x, y);
    }
    if (rng() < 0.02) return H('#e6ecff');
    return tone(sky, y / horizon, x, y);
  };
  for (let y = 0; y < horizon; y++) for (let x = 0; x < 64; x++) a.set(x, y, skyAt(x, y));
  // montañas y pinos
  for (let x = 0; x < 64; x++) {
    const top = Math.floor(horizon - 6 - Math.abs(n.fbm(x / 16, 1) - 0.5) * 22);
    for (let y = top; y < horizon; y++) a.set(x, y, y - top < 1 ? H('#2a3170') : H('#0d0f33'));
  }
  for (let i = 0; i < 11; i++) {
    const tx = Math.floor(rng() * 64), th = 7 + Math.floor(rng() * 9);
    for (let k = 0; k < th; k++) { const w = Math.floor((k / th) * 3.5); for (let dx = -w; dx <= w; dx++) a.set(tx + dx, horizon - th + k, H('#05061a')); }
  }
  // lago con reflejo y ondas
  for (let y = horizon; y < 64; y++) for (let x = 0; x < 64; x++) {
    const ry = horizon - 1 - (y - horizon) * 1.6, wob = Math.round(Math.sin(y * 1.3) * 1.2);
    const src = a.get(Math.max(0, Math.min(63, x + wob)), Math.max(0, Math.floor(ry))) ?? sky[0];
    const ripple = (y + Math.floor(x / 7)) % 4 === 0;
    a.set(x, y, src.map(v => v * (ripple ? 0.4 : 0.55)) as RGB);
  }
  return finish(a, 'aurora', 'Aurora en el lago', 32, { price: 200 });
}

let built: Template[] | null = null;
/** Todos los dibujos detallados (se generan una vez, ~decenas de ms). */
export function artTemplates(): Template[] {
  if (built) return built;
  built = [
    tree('cerezo', 'Cerezo en flor', { crown: PINK, seed: 3, cx: 32, cy: 26, rx: 26, ry: 18, blobs: 26, rMin: 4.5, rMax: 8, jag: 6, leaf: 2.4, trunk: true, ground: 'petals' }, { price: 0 }),
    tree('arbusto', 'Arbusto frondoso', { crown: GREEN, seed: 8, cx: 32, cy: 44, rx: 27, ry: 18, blobs: 28, rMin: 4.5, rMax: 8, jag: 5, leaf: 2.2, trunk: false, ground: 'grass', bottom: 62 }, { price: 60 }),
    tree('arce', 'Arce de otoño', { crown: AUTUMN, seed: 11, cx: 33, cy: 25, rx: 29, ry: 19, blobs: 26, rMin: 4, rMax: 7.5, jag: 8, leaf: 2, trunk: true, ground: 'leaves' }, { price: 80 }),
    gato(), perro(), paloma(), leopardo(), husky(), zorro(), buho(), mariposa(), medusa(), galaxia(), aurora(),
  ];
  return built;
}
