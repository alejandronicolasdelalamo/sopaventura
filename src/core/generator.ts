import { mulberry32, pick } from './rng';
import { norm } from './text';

/** [dfila, dcolumna]. Las 3 primeras son las "faciles" (derecha, abajo, diagonal). */
export const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1],
];

export interface Placement { word: string; r: number; c: number; dr: number; dc: number }
export interface Puzzle { size: number; grid: string[][]; placements: Placement[] }
export interface GenOpts {
  size: number;
  seed: number;
  /** Cuantas direcciones usar (3 = solo hacia delante, 8 = todas). */
  dirCount?: number;
  /** Indices concretos de DIRS a usar (tiene prioridad sobre dirCount). Ej.: [4,5,6,7] = solo "al reves". */
  dirs?: number[];
  /** 0..1: probabilidad de rellenar con letras de las propias palabras (mas dificil). */
  bias?: number;
  /** Forma del tablero: true = casilla util. Las casillas fuera quedan vacias (''). */
  mask?: boolean[][];
}

export type Shape = 'corazon' | 'circulo' | 'rombo' | 'gato';
export const SHAPES: Shape[] = ['corazon', 'circulo', 'rombo', 'gato'];
/** Mascara de una silueta para un tablero n x n (deja ~65-80% de casillas utiles). */
export function shapeMask(shape: Shape, n: number): boolean[][] {
  const c = (n - 1) / 2;
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, k) => {
    const x = (k - c) / (n / 2), y = (r - c) / (n / 2);
    switch (shape) {
      case 'circulo': return x * x + y * y <= 1.02;
      case 'rombo': return Math.abs(x) + Math.abs(y) <= 1.32;
      case 'corazon': { const X = x * 1.18, Y = -(y * 1.18) + 0.25; return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0; }
      case 'gato': {
        const head = x * x + ((y - 0.18) / 0.86) ** 2 <= 1.0;
        const ear = (sx: number) => y < -0.35 && y > -1.05 && Math.abs(x - sx * 0.62) <= (y + 1.05) * 0.55;
        return head || ear(-1) || ear(1);
      }
    }
  }));
}

const FILLER = 'AAAAAAAAAAAAEEEEEEEEEEEEOOOOOOOOSSSSSSRRRRRNNNNIIIIIDDDDLLLLCCCCTTTTUUUUMMMPPBGVYQHFZJÑXKW';

/** Limpia la lista: normaliza, quita duplicados, palindromos y palabras contenidas en otras. */
export function cleanWords(raw: string[], size: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of raw) {
    const n = norm(w);
    if (n.length < 2 || n.length > size || seen.has(n)) continue;
    if (n === [...n].reverse().join('')) continue;
    seen.add(n);
    out.push(n);
  }
  const rev = (s: string) => [...s].reverse().join('');
  return out.filter(a => !out.some(b => b !== a && (b.includes(a) || b.includes(rev(a)))));
}

/** Cuenta cuantas veces aparece la palabra en la rejilla (8 direcciones). */
export function countOccurrences(grid: string[][], word: string): number {
  const n = grid.length;
  let count = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== word[0]) continue;
      for (const [dr, dc] of DIRS) {
        let ok = true;
        for (let i = 1; i < word.length && ok; i++) {
          const rr = r + dr * i, cc = c + dc * i;
          ok = rr >= 0 && rr < n && cc >= 0 && cc < n && grid[rr][cc] === word[i];
        }
        if (ok) count++;
      }
    }
  }
  return count;
}

function tryPlace(words: string[], size: number, rng: () => number, dirs: ReadonlyArray<readonly [number, number]>, mask?: boolean[][]):
  { grid: (string | null)[][]; placements: Placement[] } | null {
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const placements: Placement[] = [];
  const order = words.slice().sort((a, b) => b.length - a.length);
  for (const word of order) {
    let placed = false;
    for (let t = 0; t < (mask ? 600 : 250) && !placed; t++) {
      const [dr, dc] = pick(dirs, rng);
      const r0 = Math.floor(rng() * size), c0 = Math.floor(rng() * size);
      const rEnd = r0 + dr * (word.length - 1), cEnd = c0 + dc * (word.length - 1);
      if (rEnd < 0 || rEnd >= size || cEnd < 0 || cEnd >= size) continue;
      let overlap = 0, ok = true;
      for (let i = 0; i < word.length && ok; i++) {
        if (mask && !mask[r0 + dr * i][c0 + dc * i]) { ok = false; break; }
        const cur = grid[r0 + dr * i][c0 + dc * i];
        if (cur === null) continue;
        if (cur === word[i]) overlap++; else ok = false;
      }
      if (!ok || overlap > 2) continue;
      for (let i = 0; i < word.length; i++) grid[r0 + dr * i][c0 + dc * i] = word[i];
      placements.push({ word, r: r0, c: c0, dr, dc });
      placed = true;
    }
    if (!placed) return null;
  }
  return { grid, placements };
}

/**
 * Genera una sopa de letras determinista. Garantias: todas las palabras estan, cada una aparece
 * exactamente una vez (sin soluciones accidentales) y ninguna esta contenida en otra.
 * Si no cabe alguna palabra, se descarta la ultima y se reintenta (siempre es resoluble).
 */
export function generatePuzzle(rawWords: string[], opts: GenOpts): Puzzle {
  const { size, seed } = opts;
  const dirs = opts.dirs?.length ? opts.dirs.map(i => DIRS[i]) : DIRS.slice(0, Math.max(1, Math.min(8, opts.dirCount ?? 8)));
  let words = cleanWords(rawWords, size);
  const bias = opts.bias ?? 0;

  while (words.length > 0) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const rng = mulberry32((seed + attempt * 7919) >>> 0);
      const base = tryPlace(words, size, rng, dirs, opts.mask);
      if (!base) continue;
      const letters = words.join('');
      for (let fill = 0; fill < 30; fill++) {
        const grid = base.grid.map((row, r) => row.map((ch, k) => ch ?? (opts.mask && !opts.mask[r][k] ? '' : rng() < bias ? letters[Math.floor(rng() * letters.length)] : FILLER[Math.floor(rng() * FILLER.length)])));
        if (words.every(w => countOccurrences(grid as string[][], w) === 1)) {
          return { size, grid: grid as string[][], placements: base.placements };
        }
      }
    }
    words = words.slice(0, -1);
  }
  throw new Error('No se pudo generar la sopa de letras');
}

export interface Cell { r: number; c: number }

/** Ajusta el arrastre del dedo a una linea valida de 8 direcciones. */
export function snapSelection(start: Cell, fr: number, fc: number, size: number): { end: Cell; dir: readonly [number, number] | null } {
  const vx = fc - start.c, vy = fr - start.r;
  if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) return { end: start, dir: null };
  const k = ((Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) % 8) + 8) % 8;
  // k=0: derecha, 1: abajo-derecha, 2: abajo, 3: abajo-izquierda, 4: izq, 5: arriba-izq, 6: arriba, 7: arriba-der
  const table: [number, number][] = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
  const [dr, dc] = table[k];
  let len = Math.round((vx * dc + vy * dr) / (dr * dr + dc * dc));
  len = Math.max(0, len);
  while (len > 0) {
    const r = start.r + dr * len, c = start.c + dc * len;
    if (r >= 0 && r < size && c >= 0 && c < size) break;
    len--;
  }
  return { end: { r: start.r + dr * len, c: start.c + dc * len }, dir: [dr, dc] };
}

/** Devuelve el indice de la colocacion que coincide con la seleccion (en cualquier sentido), o -1. */
export function matchSelection(p: Puzzle, a: Cell, b: Cell): number {
  return p.placements.findIndex(pl => {
    const er = pl.r + pl.dr * (pl.word.length - 1), ec = pl.c + pl.dc * (pl.word.length - 1);
    return (a.r === pl.r && a.c === pl.c && b.r === er && b.c === ec) || (b.r === pl.r && b.c === pl.c && a.r === er && a.c === ec);
  });
}

export function placementCells(pl: Placement): Cell[] {
  return Array.from({ length: pl.word.length }, (_, i) => ({ r: pl.r + pl.dr * i, c: pl.c + pl.dc * i }));
}
