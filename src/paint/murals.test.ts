import { describe, expect, it } from 'vitest';
import { ISLANDS } from '../data/islands';
import { despeckle, MURAL_COLORS, MURAL_H, MURAL_W, muralIslandIds, muralTemplate, quantize } from './murals';
import { TRANSPARENT } from './model';

describe('murales pintables de las islas', () => {
  it('quantize reduce a K colores y respeta los colores puros', () => {
    const pack = (r: number, g: number, b: number) => (255 << 24) | (b << 16) | (g << 8) | r;
    const buf = new Uint32Array(400);
    for (let i = 0; i < 400; i++) buf[i] = i < 200 ? pack(250, 10, 10) : pack(10, 10, 250);
    const q = quantize(buf, 4);
    expect(q.palette.length).toBeLessThanOrEqual(4);
    expect(new Set(q.cells).size).toBe(2);
    expect(q.cells[0]).not.toBe(q.cells[399]);
  });

  it('despeckle quita el pixel suelto pero deja las lineas', () => {
    const w = 5, h = 5, c = new Uint8Array(w * h).fill(1);
    c[2 * w + 2] = 7;                         // punto suelto
    for (let x = 0; x < w; x++) c[4 * w + x] = 3;   // linea de abajo
    despeckle(c, w, h);
    expect(c[2 * w + 2]).toBe(1);
    expect(c[4 * w + 2]).toBe(3);
  });

  it('cada isla de la historia tiene un mural valido, determinista y con muchos colores', () => {
    const ids = muralIslandIds(ISLANDS);
    expect(ids.length).toBeGreaterThanOrEqual(15);
    expect(ids).not.toContain('roma');
    for (const id of ids.filter((_, i) => i % 6 === 0)) {
      const isl = ISLANDS.find(i => i.id === id)!;
      const a = muralTemplate(isl), b = muralTemplate(isl);
      expect(a.id).toBe(`mural-${id}`);
      expect(a.w).toBe(MURAL_W); expect(a.h).toBe(MURAL_H);
      expect(a.palette.length).toBeGreaterThan(8);
      expect(a.palette.length).toBeLessThanOrEqual(MURAL_COLORS);
      expect(a.unlockIsland).toBe(id);
      expect(a.cells.length).toBe(a.w * a.h);
      expect([...a.cells].every(c => c === TRANSPARENT || c < a.palette.length)).toBe(true);
      expect(a.cells.every((v, i) => v === b.cells[i])).toBe(true);   // mismo dibujo siempre: asi no se pierde el progreso
    }
  });
});
