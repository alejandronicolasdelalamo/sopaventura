import { mulberry32 } from '../core/rng';
import { rgbToHex, TRANSPARENT, type Template } from './model';

// ---------- color: sRGB -> Lab (D65) ----------
const srgb = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = srgb(r), G = srgb(g), B = srgb(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export interface Adjust { brightness: number; contrast: number }   // -100..100

/** Aplica brillo y contraste a un buffer RGBA (en sitio). */
export function adjustPixels(data: Uint8ClampedArray, { brightness, contrast }: Adjust): void {
  const c = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const b = brightness * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    for (let k = 0; k < 3; k++) data[i + k] = c * (data[i + k] - 128 + b) + 128;   // Uint8ClampedArray satura solo
  }
}

/**
 * Cuantizacion k-means en espacio Lab con inicializacion k-means++ determinista.
 * Devuelve la paleta (hex) y el indice de color de cada pixel. Pixeles transparentes -> 255.
 */
export function quantize(rgba: Uint8ClampedArray, k: number, seed = 1, iterations = 14): { palette: string[]; indices: Uint8Array } {
  const n = rgba.length / 4;
  const lab = new Float32Array(n * 3);
  const opaque: number[] = [];
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    opaque.push(i);
    const [l, a, b] = rgbToLab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    lab[i * 3] = l; lab[i * 3 + 1] = a; lab[i * 3 + 2] = b;
  }
  const indices = new Uint8Array(n).fill(TRANSPARENT);
  if (!opaque.length) return { palette: [], indices };
  const kk = Math.min(k, opaque.length);
  const rng = mulberry32(seed);
  const d2 = (i: number, c: Float32Array, j: number) => (lab[i * 3] - c[j * 3]) ** 2 + (lab[i * 3 + 1] - c[j * 3 + 1]) ** 2 + (lab[i * 3 + 2] - c[j * 3 + 2]) ** 2;

  // k-means++
  const cent = new Float32Array(kk * 3);
  const first = opaque[Math.floor(rng() * opaque.length)];
  cent.set([lab[first * 3], lab[first * 3 + 1], lab[first * 3 + 2]], 0);
  const dist = new Float32Array(opaque.length).fill(Infinity);
  for (let c = 1; c < kk; c++) {
    let sum = 0;
    for (let q = 0; q < opaque.length; q++) { dist[q] = Math.min(dist[q], d2(opaque[q], cent, c - 1)); sum += dist[q]; }
    let r = rng() * sum, pick = opaque.length - 1;
    for (let q = 0; q < opaque.length; q++) { r -= dist[q]; if (r <= 0) { pick = q; break; } }
    const p = opaque[pick];
    cent.set([lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2]], c * 3);
  }

  const assign = new Int16Array(n).fill(-1);
  for (let it = 0; it < iterations; it++) {
    let changed = 0;
    const sums = new Float64Array(kk * 3), cnt = new Int32Array(kk);
    for (const i of opaque) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < kk; j++) { const d = d2(i, cent, j); if (d < bd) { bd = d; best = j; } }
      if (assign[i] !== best) { assign[i] = best; changed++; }
      sums[best * 3] += lab[i * 3]; sums[best * 3 + 1] += lab[i * 3 + 1]; sums[best * 3 + 2] += lab[i * 3 + 2]; cnt[best]++;
    }
    for (let j = 0; j < kk; j++) if (cnt[j]) { cent[j * 3] = sums[j * 3] / cnt[j]; cent[j * 3 + 1] = sums[j * 3 + 1] / cnt[j]; cent[j * 3 + 2] = sums[j * 3 + 2] / cnt[j]; }
    if (!changed) break;
  }

  // paleta = media RGB real de cada grupo (mas fiel que volver desde Lab); se descartan grupos vacios
  const rgbSum = new Float64Array(kk * 3), cnt = new Int32Array(kk);
  for (const i of opaque) { const j = assign[i]; rgbSum[j * 3] += rgba[i * 4]; rgbSum[j * 3 + 1] += rgba[i * 4 + 1]; rgbSum[j * 3 + 2] += rgba[i * 4 + 2]; cnt[j]++; }
  const remap = new Int16Array(kk).fill(-1);
  const palette: string[] = [];
  // ordenados de oscuro a claro: la paleta numerada queda mas agradable
  const order = [...Array(kk).keys()].filter(j => cnt[j] > 0).sort((a, b) => cent[a * 3] - cent[b * 3]);
  for (const j of order) { remap[j] = palette.length; palette.push(rgbToHex(rgbSum[j * 3] / cnt[j], rgbSum[j * 3 + 1] / cnt[j], rgbSum[j * 3 + 2] / cnt[j])); }
  for (const i of opaque) indices[i] = remap[assign[i]];
  return { palette, indices };
}

/** Quita casillas "sueltas" de un color que no aparece en ningun vecino (hace el dibujo mas agradable de pintar). */
export function despeckle(indices: Uint8Array, w: number, h: number): void {
  const copy = indices.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = copy[y * w + x];
    if (c === TRANSPARENT) continue;
    const nb: number[] = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) nb.push(copy[yy * w + xx]);
    }
    if (nb.length && !nb.includes(c)) {
      const counts = new Map<number, number>();
      nb.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
      indices[y * w + x] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  }
}

/** Quita de la paleta los colores que ya no se usan y renumera. */
export function compact(palette: string[], indices: Uint8Array): string[] {
  const used = new Set<number>();
  for (const v of indices) if (v !== TRANSPARENT) used.add(v);
  const map = new Map<number, number>();
  const out: string[] = [];
  palette.forEach((p, i) => { if (used.has(i)) { map.set(i, out.length); out.push(p); } });
  for (let i = 0; i < indices.length; i++) if (indices[i] !== TRANSPARENT) indices[i] = map.get(indices[i])!;
  return out;
}

export interface ConvertOptions {
  gridW: number;
  gridH: number;
  colors: 8 | 16 | 30 | number;
  crop: { x: number; y: number; w: number; h: number };   // normalizado 0..1 sobre la foto
  adjust: Adjust;
  name: string;
  id: string;
  seed?: number;
  despeckle?: boolean;
}

/** Foto -> plantilla de pintar por numeros (recorte, brillo/contraste, reduccion y cuantizacion). */
export function photoToTemplate(img: CanvasImageSource & { width: number; height: number }, o: ConvertOptions): Template {
  const c = document.createElement('canvas');
  c.width = o.gridW; c.height = o.gridH;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const sw = img.width * o.crop.w, sh = img.height * o.crop.h;
  g.drawImage(img, img.width * o.crop.x, img.height * o.crop.y, sw, sh, 0, 0, o.gridW, o.gridH);
  const data = g.getImageData(0, 0, o.gridW, o.gridH);
  adjustPixels(data.data, o.adjust);
  const { palette, indices } = quantize(data.data, o.colors, o.seed ?? 1);
  if (o.despeckle !== false) despeckle(indices, o.gridW, o.gridH);
  return { id: o.id, name: o.name, w: o.gridW, h: o.gridH, palette: compact(palette, indices), cells: indices, price: 0, source: 'custom' };
}
