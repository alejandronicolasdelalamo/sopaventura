import { beforeEach, describe, expect, it } from 'vitest';
import { claimMission, decodeChallenge, encodeChallenge, ensureMissions, MISSION_POOL, missionEvent } from './extras';
import { getState, resetState } from './state';
import { islandLevel } from './levels';
import { ISLANDS } from '../data/islands';

beforeEach(() => { try { globalThis.localStorage?.clear(); } catch { /* sin almacenamiento */ } resetState(); });

describe('retos entre los dos', () => {
  it('ida y vuelta del mensaje conserva el tablero', () => {
    const spec = islandLevel(ISLANDS[0], 2, 1234, []);
    const c = decodeChallenge(encodeChallenge({ spec, mode: 'timed', secs: 77 }));
    expect(c?.secs).toBe(77);
    expect(c?.spec.seed).toBe(1234);
    expect(c?.spec.words).toEqual(spec.words);
  });
  it('rechaza textos que no son retos', () => {
    expect(decodeChallenge('hola')).toBeNull();
    expect(decodeChallenge('RETO:{no json')).toBeNull();
  });
});

describe('misiones semanales', () => {
  it('hay 4 y cada una escucha su evento hasta cobrarla una sola vez', () => {
    ensureMissions();
    const items = getState().missions.items;
    expect(items).toHaveLength(4);
    const d = MISSION_POOL.find(m => m.id === items[0].id)!;
    missionEvent(d.ev, d.goal + 3);
    expect(getState().missions.items[0].n).toBe(d.goal);
    const before = getState().coins;
    expect(claimMission(d.id)).toBe(d.reward);
    expect(getState().coins).toBe(before + d.reward);
    expect(claimMission(d.id)).toBe(0);
  });
});
