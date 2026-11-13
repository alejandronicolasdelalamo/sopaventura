import { beforeEach, describe, expect, it } from 'vitest';
import { ISLANDS } from '../data/islands';
import { generatePuzzle, shapeMask } from './generator';
import { islandLevel, levelDifficulty, variantFor } from './levels';
import { resetState } from './state';

const story = ISLANDS.filter(i => !i.locked);

describe('progresion y variedad de niveles', () => {
  beforeEach(() => resetState());

  it('la dificultad sube de isla en isla (media) y empieza suave', () => {
    const avg = story.map(i => Array.from({ length: i.levels }, (_, k) => levelDifficulty(i, k)).reduce((a, b) => a + b, 0) / i.levels);
    for (let k = 1; k < avg.length; k++) expect(avg[k]).toBeGreaterThan(avg[k - 1]);
    expect(levelDifficulty(story[0], 0)).toBeLessThan(0.05);
    expect(levelDifficulty(story[story.length - 1], 5)).toBeGreaterThan(0.75);
  });

  it('nunca hay dos niveles seguidos del mismo tipo (salvo clasicos) y se usan varios tipos', () => {
    const seen = new Set<string>();
    for (const isl of story) for (let k = 1; k < isl.levels; k++) {
      const a = variantFor(isl, k - 1), b = variantFor(isl, k);
      seen.add(b);
      if (b !== 'classic') expect(b).not.toBe(a);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  it('los primeros niveles son clasicos y los tipos nuevos se desbloquean poco a poco', () => {
    for (let k = 0; k < 3; k++) expect(variantFor(story[0], k)).toBe('classic');
    const firstIsland = new Set(Array.from({ length: story[0].levels - 1 }, (_, k) => variantFor(story[0], k)));
    expect(firstIsland.has('fog')).toBe(false);
    expect(firstIsland.has('giant')).toBe(false);
  });

  it('todos los niveles de la historia generan una sopa valida con casi todas sus palabras', () => {
    let lost = 0, total = 0;
    for (const isl of story) for (let k = 0; k < isl.levels; k++) {
      const spec = islandLevel(isl, k, 777 + k, []);
      const p = generatePuzzle(spec.words, { size: spec.size, seed: spec.seed, dirCount: spec.dirCount, dirs: spec.dirs, bias: spec.bias, mask: spec.shape ? shapeMask(spec.shape, spec.size) : undefined });
      expect(p.placements.length).toBeGreaterThanOrEqual(3);
      expect(spec.size).toBeLessThanOrEqual(13);
      if (spec.dirs) for (const pl of p.placements) expect([[0, -1], [-1, 0], [-1, -1], [1, -1]]).toContainEqual([pl.dr, pl.dc]);
      lost += spec.words.length - p.placements.length; total += spec.words.length;
    }
    expect(lost / total).toBeLessThan(0.06);
  });
});
