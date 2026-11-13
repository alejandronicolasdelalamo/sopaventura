/** Ruido de valor 2D con semilla y fbm: base de nubes, follaje, pelaje y manchas. Sin dependencias. */
export function makeNoise(seed: number) {
  const h = (x: number, y: number): number => {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number): number => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const tx = smooth(x - xi), ty = smooth(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
  const fbm = (x: number, y: number, oct = 4): number => {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += value(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
    return s / norm;
  };
  /** Distancias a los dos puntos de celda mas cercanos (Worley): manchas de leopardo, escamas... */
  const worley = (x: number, y: number): [number, number] => {
    const xi = Math.floor(x), yi = Math.floor(y);
    let d1 = 9, d2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xi + i + h(xi + i, yi + j), cy = yi + j + h(yi + j + 71, xi + i + 13);
      const d = Math.hypot(x - cx, y - cy);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return [d1, d2];
  };
  return { hash: h, value, fbm, worley };
}

/** Matriz de Bayer 4x4 (0..1): tramado ordenado tipico del pixel art. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number): number => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
