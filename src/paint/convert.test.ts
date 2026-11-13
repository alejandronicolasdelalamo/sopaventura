import { describe, expect, it } from 'vitest';
import { adjustPixels, compact, despeckle, quantize, rgbToLab } from './convert';
import { TRANSPARENT } from './model';

function image(w: number, h: number, colorAt: (x: number, y: number) => [number, number, number, number?]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a = 255] = colorAt(x, y); d.set([r, g, b, a], (y * w + x) * 4); }
  return d;
}

describe('conversor foto -> plantilla', () => {
  it('Lab: blanco ~100, negro ~0', () => {
    expect(rgbToLab(255, 255, 255)[0]).toBeCloseTo(100, 0);
    expect(rgbToLab(0, 0, 0)[0]).toBeCloseTo(0, 0);
  });

  it('recupera los colores dominantes (3 bloques -> 3 colores)', () => {
    const d = image(30, 30, x => (x < 10 ? [250, 20, 20] : x < 20 ? [20, 250, 20] : [20, 20, 250]));
    const { palette, indices } = quantize(d, 3, 1);
    expect(palette).toHaveLength(3);
    const idx = (x: number) => indices[x];
    expect(new Set([idx(2), idx(15), idx(27)]).size).toBe(3);
    // cada bloque es homogeneo
    for (let y = 0; y < 30; y++) { expect(indices[y * 30 + 1]).toBe(idx(2)); expect(indices[y * 30 + 28]).toBe(idx(27)); }
  });

  it('es determinista', () => {
    const d = image(40, 40, (x, y) => [(x * 6) % 256, (y * 6) % 256, ((x + y) * 3) % 256]);
    expect(quantize(d, 8, 5)).toEqual(quantize(d, 8, 5));
  });

  it('respeta el maximo de colores (8, 16 y 30) y numera sin huecos', () => {
    const d = image(64, 64, (x, y) => [(x * 4) % 256, (y * 4) % 256, ((x * y) % 256)]);
    for (const k of [8, 16, 30]) {
      const { palette, indices } = quantize(d, k, 1);
      expect(palette.length).toBeLessThanOrEqual(k);
      expect(palette.length).toBeGreaterThan(k / 2);
      for (const v of indices) expect(v).toBeLessThan(palette.length);
    }
  });

  it('los pixeles transparentes quedan vacios', () => {
    const d = image(4, 4, x => (x < 2 ? [0, 0, 0, 0] : [200, 0, 0, 255]));
    const { indices } = quantize(d, 4, 1);
    expect(indices[0]).toBe(TRANSPARENT);
    expect(indices[3]).not.toBe(TRANSPARENT);
  });

  it('brillo y contraste', () => {
    const d = new Uint8ClampedArray([100, 100, 100, 255]);
    adjustPixels(d, { brightness: 20, contrast: 0 });
    expect(d[0]).toBeGreaterThan(100);
    const e = new Uint8ClampedArray([200, 200, 200, 255]);
    adjustPixels(e, { brightness: 0, contrast: 50 });
    expect(e[0]).toBeGreaterThan(200);
  });

  it('despeckle elimina casillas sueltas y compact renumera', () => {
    const idx = new Uint8Array(25).fill(1);
    idx[12] = 0;                                  // una casilla suelta de otro color
    despeckle(idx, 5, 5);
    expect(idx[12]).toBe(1);
    const pal = compact(['#000', '#111', '#222'], idx);
    expect(pal).toEqual(['#111']);
    expect(idx.every(v => v === 0)).toBe(true);
  });
});
