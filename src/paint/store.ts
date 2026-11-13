import { TRANSPARENT, hexToRgb, type Template } from './model';

export interface SavedPaint { order: number[]; by: number[] }
const K = (id: string) => `nuestra-sopa:paint:${id}`;

export function loadPaint(id: string): SavedPaint | null {
  try {
    const raw = localStorage.getItem(K(id));
    if (!raw) return null;
    const j = JSON.parse(raw) as { o: number[]; b: string };
    return { order: j.o, by: [...j.b].map(Number) };
  } catch { return null; }
}

export function savePaint(id: string, st: SavedPaint): void {
  try { localStorage.setItem(K(id), JSON.stringify({ o: st.order, b: st.by.join('') })); } catch { /* sin espacio */ }
}

export const paintedCount = (id: string): number => loadPaint(id)?.order.length ?? 0;

export function totalCells(t: Template): number {
  let n = 0; for (const c of t.cells) if (c !== TRANSPARENT) n++;
  return n;
}

const thumbCache = new Map<string, string>();

/** Miniatura de un dibujo: color completo, gris (sin empezar) o mezcla segun lo ya pintado. */
export function thumb(t: Template, mode: 'color' | 'gray' | 'progress', size = 120): string {
  const painted = mode === 'progress' ? new Set(loadPaint(t.id)?.order ?? []) : null;
  const key = `${t.id}:${mode}:${size}:${painted?.size ?? 0}`;
  const hit = thumbCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = t.w; c.height = t.h;
  const g = c.getContext('2d')!;
  const id = g.createImageData(t.w, t.h);
  const d = new Uint32Array(id.data.buffer);
  const rgb = t.palette.map(hexToRgb);
  for (let i = 0; i < t.cells.length; i++) {
    const ci = t.cells[i];
    if (ci === TRANSPARENT) continue;
    const [r, gg, b] = rgb[ci];
    const show = mode === 'color' || (painted?.has(i) ?? false);
    const gray = Math.round(150 + (0.299 * r + 0.587 * gg + 0.114 * b) / 255 * 95);
    d[i] = show ? (255 << 24) | (b << 16) | (gg << 8) | r : (255 << 24) | (gray << 16) | (gray << 8) | gray;
  }
  g.putImageData(id, 0, 0);
  const out = document.createElement('canvas');
  const sc = size / Math.max(t.w, t.h);
  out.width = Math.max(1, Math.round(t.w * sc)); out.height = Math.max(1, Math.round(t.h * sc));
  const og = out.getContext('2d')!;
  og.imageSmoothingEnabled = false;
  og.drawImage(c, 0, 0, out.width, out.height);
  const url = out.toDataURL();
  thumbCache.set(key, url);
  return url;
}

/** PNG grande y suave de la obra terminada (para compartir). */
export async function shareablePng(t: Template, scale = 10): Promise<Blob> {
  const small = document.createElement('canvas');
  small.width = t.w; small.height = t.h;
  const sg = small.getContext('2d')!;
  const id = sg.createImageData(t.w, t.h), d = new Uint32Array(id.data.buffer);
  t.cells.forEach((ci, i) => { if (ci !== TRANSPARENT) { const [r, g, b] = hexToRgb(t.palette[ci]); d[i] = (255 << 24) | (b << 16) | (g << 8) | r; } });
  sg.putImageData(id, 0, 0);
  const big = document.createElement('canvas');
  big.width = t.w * scale; big.height = t.h * scale;
  const bg = big.getContext('2d')!;
  bg.fillStyle = '#fffdf6'; bg.fillRect(0, 0, big.width, big.height);
  bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high';
  bg.drawImage(small, 0, 0, big.width, big.height);
  return new Promise(res => big.toBlob(b => res(b!), 'image/png'));
}
