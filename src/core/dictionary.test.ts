import { beforeEach, describe, expect, it } from 'vitest';
import { ISLANDS } from '../data/islands';
import { extraWord, knownWords } from './dictionary';
import { generatePuzzle } from './generator';
import { islandLevel } from './levels';
import { resetState } from './state';

describe('palabras extra', () => {
  beforeEach(() => resetState());

  it('palabras corrientes como "para" o "como" cuentan, de ida o de vuelta', () => {
    expect(extraWord('PARA')).toBe('PARA');
    expect(extraWord('ARAP')).toBe('PARA');   // leida al reves
    for (const w of ['COMO', 'PERO', 'CUANDO', 'DONDE', 'AUNQUE', 'TIENE', 'HACER', 'CORAZON']) expect(extraWord(w), w).toBe(w);
  });

  it('las palabras de menos de 4 letras y las inventadas no cuentan', () => {
    expect(extraWord('SOL')).toBeNull();
    expect(extraWord('XQZK')).toBeNull();
  });

  it('el diccionario es amplio y no tiene tildes ni palabras cortas', () => {
    const k = knownWords();
    expect(k.size).toBeGreaterThan(1500);
    for (const w of k) { expect(w.length).toBeGreaterThanOrEqual(4); expect(w).toMatch(/^[A-ZÑ]+$/); }
  });

  it('los niveles esconden varias extras (mas que antes) y todas caben en el tablero', () => {
    const isl = ISLANDS.filter(i => !i.locked)[0];
    const counts: number[] = [];
    for (let k = 0; k < 12; k++) {
      const spec = islandLevel(isl, k % isl.levels, 1000 + k, []);
      counts.push(spec.extras?.length ?? 0);
      const pz = generatePuzzle([...spec.words, ...(spec.extras ?? [])], { size: spec.size, seed: spec.seed, dirCount: spec.dirCount, dirs: spec.dirs, bias: spec.bias });
      for (const w of spec.extras ?? []) expect(pz.placements.some(p => p.word === w), `extra ${w}`).toBe(true);
    }
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(4);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(2);
  });
});
