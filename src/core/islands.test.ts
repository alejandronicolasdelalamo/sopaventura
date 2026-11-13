import { beforeEach, describe, expect, it } from 'vitest';
import { ISLANDS, islandById, proceduralIsland } from '../data/islands';
import { bucketOfKey, isIslandUnlocked, isLevelUnlocked, levelKey, mapIslands, totalStars } from './progress';
import { getState, resetState } from './state';
import { islandLevel } from './levels';

const completeIsland = (id: string, n: number, bucket = 'chill') => { const s = getState(); for (let i = 0; i < n; i++) s.stars[levelKey(id, i, bucket)] = 3; };

describe('islas procedurales (sin fin)', () => {
  beforeEach(() => resetState());

  it('son deterministas y tienen nombre, temas y niveles', () => {
    for (let n = 1; n <= 60; n++) {
      const a = proceduralIsland(n), b = proceduralIsland(n);
      expect(a).toEqual(b);
      expect(a.id).toBe(`p${n}`);
      expect(a.themes.length).toBeGreaterThanOrEqual(3);
      expect([15, 20, 25]).toContain(a.levels);
      expect(islandById(a.id)?.name).toBe(a.name);
    }
  });

  it('el infinito empieza abierto y cada isla se abre al completar la anterior, con progreso propio', () => {
    expect(isIslandUnlocked(getState(), 'p1', 'infinito')).toBe(true);
    expect(isIslandUnlocked(getState(), 'p2', 'infinito')).toBe(false);
    expect(mapIslands(getState(), 'infinito').map(i => i.id)).toEqual(['p1', 'p2']);
    completeIsland('p1', proceduralIsland(1).levels, 'infinito');
    expect(isIslandUnlocked(getState(), 'p2', 'infinito')).toBe(true);
    expect(isLevelUnlocked(getState(), 'p2', 0, 'infinito')).toBe(true);
    expect(isLevelUnlocked(getState(), 'p2', 1, 'infinito')).toBe(false);
    expect(mapIslands(getState(), 'infinito').map(i => i.id)).toEqual(['p1', 'p2', 'p3']);
    // lo del infinito no cuenta en la aventura
    expect(mapIslands(getState(), 'chill').some(i => i.procedural)).toBe(false);
    expect(totalStars(getState(), 'chill')).toBe(0);
  });

  it('cada modo tiene su propio progreso: avanzar en chill no abre nada en contrarreloj', () => {
    completeIsland('inicio', 15, 'chill');
    completeIsland('series', 5, 'chill');
    expect(isLevelUnlocked(getState(), 'inicio', 14, 'chill')).toBe(true);
    expect(isLevelUnlocked(getState(), 'series', 5, 'chill')).toBe(true);
    // en contrarreloj sigues en el nivel 1 de la primera isla
    expect(isLevelUnlocked(getState(), 'inicio', 0, 'timed')).toBe(true);
    expect(isLevelUnlocked(getState(), 'inicio', 1, 'timed')).toBe(false);
    expect(isIslandUnlocked(getState(), 'series', 'timed')).toBe(false);
    expect(totalStars(getState(), 'timed')).toBe(0);
    expect(totalStars(getState(), 'chill')).toBeGreaterThan(0);
    // y las estrellas de un modo no se mezclan con las de otro
    getState().stars[levelKey('inicio', 0, 'timed')] = 2;
    expect(totalStars(getState(), 'timed')).toBe(2);
    expect(levelKey('inicio', 3, 'riddle')).toBe('riddle|inicio:3');
    expect(levelKey('inicio', 3)).toBe('inicio:3');
    expect(bucketOfKey('riddle|inicio:3')).toBe('riddle');
    expect(bucketOfKey('inicio:3')).toBe('chill');
  });

  it('generan niveles jugables con palabras', () => {
    for (let n = 1; n <= 20; n++) {
      const isl = proceduralIsland(n);
      for (const i of [0, isl.levels - 1]) {
        const spec = islandLevel(isl, i);
        expect(spec.words.length).toBeGreaterThanOrEqual(4);
        expect(spec.key).toBe(`p${n}:${i}`);
      }
    }
  });
});
