import { bayer } from '../core/noise';
import { mulberry32 } from '../core/rng';
import { gridPx } from './grid';

type RGB = [number, number, number];
const toRgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** Color de la rampa de la nube (0 = sombra de abajo ... 1 = luz de arriba), con tramado para que no haya bandas duras. */
function shade(cols: RGB[], t: number, x: number, y: number): RGB {
  const i = Math.floor(Math.max(0, Math.min(0.9999, t)) * cols.length + (bayer(x, y) - 0.5) * 0.7);
  return cols[Math.max(0, Math.min(cols.length - 1, i))];
}

/** Una nube pixel art: varias bolas juntas, luz arriba y base casi plana. Tamaño en pixeles de arte. */
export function cloudSprite(colors: string[], seed: number, w = 34, h = 12): HTMLCanvasElement {
  const cols = colors.map(toRgb), rng = mulberry32(seed);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d')!, im = g.createImageData(w, h), d = im.data;
  const n = 3 + Math.floor(rng() * 2);
  const puffs = Array.from({ length: n }, (_, i) => ({ x: ((i + 0.5) / n) * w + (rng() - 0.5) * 3, r: h * (0.3 + rng() * 0.28) }));
  const base = h - 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let top = 99;
    for (const p of puffs) { const dx = (x - p.x) / (p.r * 1.25); if (Math.abs(dx) < 1) top = Math.min(top, base - p.r * 2 * Math.sqrt(1 - dx * dx)); }
    if (y < top || y > base) continue;
    const t = 1 - (y - top) / Math.max(2, base - top + 1) * 0.9;
    const c = shade(cols, t, x, y), i = (y * w + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return cv;
}

/**
 * Franja de nubes para unir dos islas (la de arriba termina en nubes y la de abajo empieza en ellas):
 * `up` = el borde ondulado mira hacia arriba (franja de abajo de una isla); si no, hacia abajo (franja de arriba).
 */
export function drawSeam(cv: HTMLCanvasElement, widthCss: number, colors: string[], up: boolean, seed: number, rows = 14): void {
  const px = gridPx(widthCss), W = Math.max(8, Math.ceil(widthCss / px));
  cv.width = W; cv.height = rows; cv.style.height = `${rows * px}px`;
  const g = cv.getContext('2d')!, im = g.createImageData(W, rows), d = im.data, cols = colors.map(toRgb);
  const ph = (seed % 97) * 0.37;
  for (let x = 0; x < W; x++) {
    // borde "con bultos": suma de arcos, asi parecen cumulos y no una onda
    const hgt = 3 + 3.2 * Math.abs(Math.sin(x * 0.33 + ph)) + 2.6 * Math.abs(Math.sin(x * 0.12 + ph * 2)) + 1.2 * Math.abs(Math.sin(x * 0.9 + ph * 3));
    for (let k = 0; k < rows; k++) {
      const y = up ? rows - 1 - k : k;         // k = distancia a la linea de union
      if (k > hgt + 3) continue;
      const edge = k / Math.max(1, hgt + 3);   // 0 junto a la union, 1 en el borde
      const c = shade(cols, up ? 0.5 + edge * 0.45 : 0.5 - edge * 0.3, x, y), i = (y * W + x) * 4;   // el borde que mira arriba lleva luz; el que mira abajo, sombra
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
}
