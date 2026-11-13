import { describe, expect, it } from 'vitest';
import { encodeGif } from './gif';

/** Decodificador GIF minimo para comprobar que lo que escribimos se lee igual. */
function decode(b: Uint8Array): { w: number; h: number; frames: number[][] } {
  let p = 0;
  const u16 = () => { const v = b[p] | (b[p + 1] << 8); p += 2; return v; };
  expect(String.fromCharCode(...b.slice(0, 6))).toBe('GIF89a'); p = 6;
  const w = u16(), h = u16(), packed = b[p]; p += 3;
  p += 3 * (1 << ((packed & 7) + 1));
  const frames: number[][] = [];
  while (b[p] !== 0x3b) {
    if (b[p] === 0x21) { p += 2; while (b[p]) p += b[p] + 1; p++; continue; }
    expect(b[p]).toBe(0x2c); p += 10;
    const min = b[p++];
    const data: number[] = [];
    while (b[p]) { const n = b[p++]; for (let i = 0; i < n; i++) data.push(b[p++]); }
    p++;
    const clear = 1 << min, eoi = clear + 1;
    let size = min + 1, dict: number[][] = [], prev: number[] | null = null, bit = 0;
    const reset = () => { dict = Array.from({ length: eoi + 1 }, (_, i) => [i]); size = min + 1; prev = null; };
    reset();
    const out: number[] = [];
    for (;;) {
      let code = 0;
      for (let i = 0; i < size; i++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << i;
      if (code === clear) { reset(); continue; }
      if (code === eoi) break;
      let entry: number[];
      if (code < dict.length) entry = dict[code];
      else entry = [...prev!, prev![0]];
      out.push(...entry);
      if (prev) dict.push([...prev, entry[0]]);
      prev = entry;
      if (dict.length === (1 << size) && size < 12) size++;
    }
    frames.push(out);
  }
  return { w, h, frames };
}

describe('gif', () => {
  it('codifica y se decodifica igual (con muchos colores y tablas que se llenan)', () => {
    const w = 120, h = 90;
    const pal = Array.from({ length: 34 }, (_, i) => [i * 7, 255 - i * 5, (i * 37) % 256] as [number, number, number]);
    const f1 = new Uint8Array(w * h).map((_, i) => (i * 7 + ((i / w) | 0)) % 34);
    const f2 = new Uint8Array(w * h).map((_, i) => ((i * 2654435761) >>> 0) % 34);
    const g = decode(encodeGif([f1, f2], w, h, pal, [10, 20]));
    expect([g.w, g.h]).toEqual([w, h]);
    expect(g.frames[0]).toEqual([...f1]);
    expect(g.frames[1]).toEqual([...f2]);
  });
});
