import { describe, expect, it } from 'vitest';
import { cleanWords, countOccurrences, generatePuzzle, matchSelection, placementCells, shapeMask, snapSelection } from './generator';
import { ISLANDS } from '../data/islands';
import { THEMES, type ThemeId } from '../data/themes';
import { dailyLevel, endlessLevel, islandLevel } from './levels';
import { norm } from './text';

const WORDS = ['Cuchi', 'Izanis', 'Burrito', 'Nicolasia', 'Olaf', 'Granada', 'Ñandú', 'Alhambra'];

describe('texto', () => {
  it('quita tildes pero conserva la Ñ', () => {
    expect(norm('Pingüino')).toBe('PINGUINO');
    expect(norm('Ok mañana')).toBe('OKMAÑANA');
    expect(norm('Alhambra!')).toBe('ALHAMBRA');
  });
});

describe('generatePuzzle', () => {
  it('es determinista: misma semilla, misma sopa', () => {
    const a = generatePuzzle(WORDS, { size: 10, seed: 42 });
    const b = generatePuzzle(WORDS, { size: 10, seed: 42 });
    expect(a.grid).toEqual(b.grid);
    expect(a.placements).toEqual(b.placements);
  });
  it('semillas distintas dan sopas distintas', () => {
    const a = generatePuzzle(WORDS, { size: 10, seed: 1 });
    const b = generatePuzzle(WORDS, { size: 10, seed: 2 });
    expect(a.grid).not.toEqual(b.grid);
  });
  it('cada palabra esta una sola vez y en su sitio', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = generatePuzzle(WORDS, { size: 11, seed, dirCount: 8, bias: 0.4 });
      for (const pl of p.placements) {
        expect(countOccurrences(p.grid, pl.word)).toBe(1);
        expect(placementCells(pl).map(c => p.grid[c.r][c.c]).join('')).toBe(pl.word);
      }
    }
  });
  it('con dirCount 3 solo usa direcciones hacia delante', () => {
    const p = generatePuzzle(WORDS, { size: 10, seed: 7, dirCount: 3 });
    for (const pl of p.placements) expect(pl.dr >= 0 && pl.dc >= 0).toBe(true);
  });
  it('descarta palabras contenidas en otras, palindromos y las que no caben', () => {
    expect(cleanWords(['Dani', 'Daniela', 'Ana', 'Supercalifragilistico'], 8)).toEqual(['DANIELA']);
  });
  it('si no caben todas, sigue siendo resoluble', () => {
    const p = generatePuzzle(['ABCDEF', 'GHIJKL', 'MNÑOPQ', 'RSTUVW', 'XYZABC', 'DEFGHI', 'JKLMNO'], { size: 6, seed: 3 });
    expect(p.placements.length).toBeGreaterThan(0);
  });
});

describe('seleccion', () => {
  it('ajusta el dedo a lineas de 8 direcciones', () => {
    expect(snapSelection({ r: 3, c: 3 }, 3.1, 7.2, 10).end).toEqual({ r: 3, c: 7 });
    expect(snapSelection({ r: 3, c: 3 }, 6.8, 6.9, 10).end).toEqual({ r: 7, c: 7 });
    expect(snapSelection({ r: 3, c: 3 }, 0, 0, 10).end).toEqual({ r: 0, c: 0 });
  });
  it('no se sale del tablero', () => {
    const { end } = snapSelection({ r: 8, c: 8 }, 8, 20, 10);
    expect(end).toEqual({ r: 8, c: 9 });
  });
  it('reconoce la palabra al derecho y al reves', () => {
    const p = generatePuzzle(WORDS, { size: 10, seed: 11 });
    const pl = p.placements[0];
    const cells = placementCells(pl);
    expect(matchSelection(p, cells[0], cells[cells.length - 1])).toBe(0);
    expect(matchSelection(p, cells[cells.length - 1], cells[0])).toBe(0);
    expect(matchSelection(p, cells[0], cells[1])).toBe(-1);
  });
});

describe('niveles', () => {
  it('todos los niveles de todas las islas se generan y son resolubles', () => {
    for (const isl of ISLANDS.filter(i => !i.locked)) {
      for (let i = 0; i < isl.levels; i++) {
        const spec = islandLevel(isl, i);
        expect(spec.words.length).toBeGreaterThanOrEqual(2);
        const p = generatePuzzle(spec.words, { size: spec.size, seed: spec.seed, dirCount: spec.dirCount, bias: spec.bias });
        expect(p.placements.length).toBeGreaterThanOrEqual(2);
        for (const pl of p.placements) expect(countOccurrences(p.grid, pl.word)).toBe(1);
      }
    }
  });
  it('el mismo nivel sale igual siempre', () => {
    expect(islandLevel(ISLANDS[1], 4, 1234, [])).toEqual(islandLevel(ISLANDS[1], 4, 1234, []));
    expect(endlessLevel(1234)).toEqual(endlessLevel(1234));
    expect(dailyLevel('2026-11-10')).toEqual(dailyLevel('2026-11-10'));
  });
  it('mas de 10.000 niveles distintos y validos (muestreo)', () => {
    const seen = new Set<string>();
    for (let n = 1; n <= 99999; n += 37) {
      const s = endlessLevel(n);
      const p = generatePuzzle(s.words, { size: s.size, seed: s.seed, dirCount: s.dirCount, bias: s.bias });
      expect(p.placements.length).toBeGreaterThanOrEqual(2);
      seen.add(p.grid.map(r => r.join('')).join('|'));
    }
    expect(seen.size).toBeGreaterThan(2500);
  });
  it('cada partida de un nivel es distinta y evita palabras recientes', () => {
    const a = islandLevel(ISLANDS[0], 3, 11, []), b = islandLevel(ISLANDS[0], 3, 99, []);
    expect(a.words.join()).not.toEqual(b.words.join());
    // simulamos 40 partidas seguidas guardando lo visto: casi nada se repite
    const recent: string[] = [];
    let repeats = 0, total = 0;
    for (let k = 0; k < 40; k++) {
      const s = islandLevel(ISLANDS[k % 8], k % 10, 1000 + k, recent);
      s.words.forEach(w => { total++; if (recent.includes(w)) repeats++; });
      recent.push(...s.words);
    }
    expect(repeats / total).toBeLessThan(0.05);
  });
  it('las sopas con forma colocan todo dentro de la silueta', () => {
    let total = 0, kept = 0;
    for (const isl of ISLANDS.filter(i => !i.locked).slice(0, 8)) {
      for (let i = 3; i < isl.levels; i++) {
        const spec = islandLevel(isl, i, 4242 + i, []);
        if (!spec.shape) continue;
        const mask = shapeMask(spec.shape, spec.size);
        const p = generatePuzzle(spec.words, { size: spec.size, seed: spec.seed, dirCount: spec.dirCount, bias: spec.bias, mask });
        total += spec.words.length; kept += p.placements.length;
        for (const pl of p.placements) {
          placementCells(pl).forEach(c => expect(mask[c.r][c.c]).toBe(true));
          expect(countOccurrences(p.grid, pl.word)).toBe(1);
        }
        p.grid.forEach((row, r) => row.forEach((ch, c) => expect(ch === '').toBe(!mask[r][c])));
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(kept / total).toBeGreaterThan(0.9);
  });
  it('cada isla mezcla varios temas', () => {
    for (const isl of ISLANDS) {
      expect(new Set(isl.themes).size).toBeGreaterThanOrEqual(3);
      isl.themes.forEach(t => expect(THEMES[t as ThemeId]).toBeTruthy());
    }
  });
});
