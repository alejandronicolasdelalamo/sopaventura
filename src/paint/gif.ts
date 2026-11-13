import { TRANSPARENT, hexToRgb, type Template } from './model';
import { loadPaint } from './store';

/**
 * Codificador GIF89a minimo (paleta global, LZW, bucle infinito). Sin dependencias.
 * Sirve para exportar el time-lapse de un dibujo terminado.
 */
export function encodeGif(frames: Uint8Array[], w: number, h: number, palette: [number, number, number][], delays: number[]): Uint8Array<ArrayBuffer> {
  const bits = Math.max(2, Math.ceil(Math.log2(Math.max(2, palette.length))));
  const size = 1 << bits;
  const out: number[] = [];
  const u16 = (v: number) => out.push(v & 255, (v >> 8) & 255);
  out.push(...[...'GIF89a'].map(c => c.charCodeAt(0)));
  u16(w); u16(h);
  out.push(0x80 | 0x70 | (bits - 1), 0, 0);
  for (let i = 0; i < size; i++) out.push(...(palette[i] ?? [0, 0, 0]));
  // NETSCAPE2.0: repetir siempre
  out.push(0x21, 0xff, 0x0b, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 0x03, 0x01, 0, 0, 0);
  frames.forEach((px, f) => {
    out.push(0x21, 0xf9, 0x04, 0x04); u16(delays[f] ?? 8); out.push(0, 0);
    out.push(0x2c); u16(0); u16(0); u16(w); u16(h); out.push(0);
    out.push(bits);
    const data = lzw(bits, px);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); out.push(n); for (let k = 0; k < n; k++) out.push(data[i + k]); }
    out.push(0);
  });
  out.push(0x3b);
  return new Uint8Array(out);
}

function lzw(minSize: number, px: Uint8Array): number[] {
  const clear = 1 << minSize, eoi = clear + 1;
  let codeSize = minSize + 1, next = eoi + 1;
  let dict = new Map<number, number>();
  const bytes: number[] = [];
  let acc = 0, nbits = 0;
  const emit = (code: number) => {
    acc |= code << nbits; nbits += codeSize;
    while (nbits >= 8) { bytes.push(acc & 255); acc >>>= 8; nbits -= 8; }
  };
  emit(clear);
  let prefix = px[0];
  for (let i = 1; i < px.length; i++) {
    const k = px[i], key = prefix * 256 + k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next === 4096) { emit(clear); dict = new Map(); codeSize = minSize + 1; next = eoi + 1; }
    else { if (next >= 1 << codeSize) codeSize++; dict.set(key, next++); }
    prefix = k;
  }
  emit(prefix); emit(eoi);
  if (nbits > 0) bytes.push(acc & 255);
  return bytes;
}

/** Time-lapse del dibujo: se va coloreando en el orden en que se pinto (o por filas si no hay registro). */
export function timelapseGif(t: Template, maxSide = 256): Blob {
  const s = Math.max(1, Math.floor(maxSide / Math.max(t.w, t.h)));
  const W = t.w * s, H = t.h * s;
  const pal: [number, number, number][] = [hexToRgb('#fffdf6') as [number, number, number], hexToRgb('#e6e1f2') as [number, number, number], ...t.palette.map(h => hexToRgb(h) as [number, number, number])];
  const cellsAll: number[] = [];
  t.cells.forEach((c, i) => { if (c !== TRANSPARENT) cellsAll.push(i); });
  const saved = loadPaint(t.id)?.order ?? [];
  const seen = new Set(saved);
  const order = [...saved.filter(i => t.cells[i] !== TRANSPARENT), ...cellsAll.filter(i => !seen.has(i))];
  const cur = new Uint8Array(t.w * t.h);
  t.cells.forEach((c, i) => { cur[i] = c === TRANSPARENT ? 0 : 1; });
  const frame = () => {
    const px = new Uint8Array(W * H);
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
      const v = cur[y * t.w + x];
      for (let yy = 0; yy < s; yy++) px.fill(v, (y * s + yy) * W + x * s, (y * s + yy) * W + x * s + s);
    }
    return px;
  };
  const STEPS = 40;
  const frames = [frame()], delays = [60];
  for (let f = 1; f <= STEPS; f++) {
    const upto = Math.round((order.length * f) / STEPS);
    for (let k = Math.round((order.length * (f - 1)) / STEPS); k < upto; k++) cur[order[k]] = t.cells[order[k]] + 2;
    frames.push(frame()); delays.push(f === STEPS ? 300 : 8);
  }
  return new Blob([encodeGif(frames, W, H, pal, delays)], { type: 'image/gif' });
}

/** Comparte o descarga el GIF. */
export async function shareGif(t: Template): Promise<void> {
  const blob = timelapseGif(t);
  const file = new File([blob], `${t.id}-timelapse.gif`, { type: 'image/gif' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: t.name }); return; } catch { /* cancelado */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}
