import type { ThemeId } from '../data/themes';

export const TRANSPARENT = 255;

export interface Template {
  id: string;
  name: string;
  w: number;
  h: number;
  palette: string[];          // hasta ~30 colores "#rrggbb"
  cells: Uint8Array;          // indice de color por casilla (255 = vacia)
  theme?: ThemeId;
  price: number;              // 0 = gratis
  unlockIsland?: string;      // se regala al completar esa isla
  photo?: string;             // recuerdo que se desbloquea al terminar: data URL o ruta en el almacenamiento privado
  source: 'builtin' | 'custom';
}

/** Operacion de pintado: la unidad que se guarda, se sincroniza y alimenta el time-lapse. */
export interface PaintOp { id: string; t: 'p' | 'u'; c: number[]; by: 1 | 2; ts: number }

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
export const luminance = (hex: string): number => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

export function colorCounts(t: Template): number[] {
  const n = new Array<number>(t.palette.length).fill(0);
  for (const c of t.cells) if (c !== TRANSPARENT) n[c]++;
  return n;
}
export const paintableCount = (t: Template): number => t.cells.reduce((a, c) => a + (c === TRANSPARENT ? 0 : 1), 0);

// ---- (de)serializacion para guardar en la nube ----
export function bytesToB64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
export const b64ToBytes = (b: string): Uint8Array => Uint8Array.from(atob(b), ch => ch.charCodeAt(0));

export interface TemplateJson { id: string; name: string; w: number; h: number; palette: string[]; cells: string; price: number; theme?: ThemeId; photo?: string; unlockIsland?: string }
export const toJson = (t: Template): TemplateJson => ({ id: t.id, name: t.name, w: t.w, h: t.h, palette: t.palette, cells: bytesToB64(t.cells), price: t.price, theme: t.theme, photo: t.photo, unlockIsland: t.unlockIsland });
export const fromJson = (j: TemplateJson): Template => ({ ...j, cells: b64ToBytes(j.cells), source: 'custom' });
