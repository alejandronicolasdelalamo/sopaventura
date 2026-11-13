import { missionEvent } from '../core/extras';
import { hashStr } from '../core/rng';
import { addCoins, getState, update } from '../core/state';
import type { Biome } from '../data/islands';
import { sfx } from './audio';
import { burst } from './fx';
import { reducedMotion, toast } from './dom';

/** Criaturitas pixel (2 fotogramas) que viven en cada isla: se tocan y dan monedas (tope diario). */
type Pal = Record<string, string>;
interface Kind { f: [string[], string[]]; pal: Pal; speed: number }
const BUTTER: Kind = {
  f: [['#...#', '##.##', '#####', '.###.', '#.#.#'].map(r => r), ['.....', '#...#', '#####', '.###.', '#.#.#']],
  pal: { '#': '#ff8ac0' }, speed: 1,
};
const kinds: Record<string, Kind> = {
  mariposa: {
    f: [['a...a', 'aa.aa', 'aabaa', '.aba.', 'a.b.a'], ['.....', 'a...a', 'aabaa', '.aba.', '.....']],
    pal: { a: '#ff9ad5', b: '#4a2a6a' }, speed: 1,
  },
  mariposaAzul: {
    f: [['a...a', 'aa.aa', 'aabaa', '.aba.', 'a.b.a'], ['.....', 'a...a', 'aabaa', '.aba.', '.....']],
    pal: { a: '#5ec8ff', b: '#1d2a6a' }, speed: 1,
  },
  pez: {
    f: [['..aaa..a', '.aaaaa.aa', 'aawaaaaaa', '.aaaaa.aa', '..aaa..a'], ['..aaa...a', '.aaaaa.aa', 'aawaaaaa.', '.aaaaa.aa', '..aaa...a']],
    pal: { a: '#ffa14a', w: '#ffffff' }, speed: 1.2,
  },
  pezAzul: {
    f: [['..aaa..a', '.aaaaa.aa', 'aawaaaaaa', '.aaaaa.aa', '..aaa..a'], ['..aaa...a', '.aaaaa.aa', 'aawaaaaa.', '.aaaaa.aa', '..aaa...a']],
    pal: { a: '#4fd1c5', w: '#ffffff' }, speed: 1.2,
  },
  luciernaga: {
    f: [['.....', '..y..', '.yYy.', '..y..', '.....'], ['.....', '.....', '..y..', '.....', '.....']],
    pal: { y: '#fff3a0', Y: '#ffffff' }, speed: 0.6,
  },
  pajaro: {
    f: [['.....bb.', '..bbbbbb', '.bbwbbb.', 'bbbbbb..', '..o.o...'], ['........', '..bbbbbb', '.bbwbbb.', 'bbbbbbb.', '..o.o...']],
    pal: { b: '#6b8cff', w: '#ffffff', o: '#ffb13b' }, speed: 1,
  },
  pajaroRojo: {
    f: [['.....bb.', '..bbbbbb', '.bbwbbb.', 'bbbbbb..', '..o.o...'], ['........', '..bbbbbb', '.bbwbbb.', 'bbbbbbb.', '..o.o...']],
    pal: { b: '#e0573b', w: '#ffffff', o: '#ffb13b' }, speed: 1,
  },
  estrella: {
    f: [['..y..', '..y..', 'yyYyy', '.yyy.', '.y.y.'], ['.....', '..y..', '.yYy.', '..y..', '.....']],
    pal: { y: '#ffe08a', Y: '#ffffff' }, speed: 0.7,
  },
  caramelo: {
    f: [['.....', 'r.rr.', '.rwrr', 'rrwr.', '.rr.r'], ['.....', '.rrr.', 'rrwrr', '.rrr.', '.....']],
    pal: { r: '#ff6fa8', w: '#ffffff' }, speed: 0.8,
  },
  cristal: {
    f: [['..c..', '.cwc.', 'cwccc', '.ccc.', '..c..'], ['.....', '..c..', '.cwc.', '..c..', '.....']],
    pal: { c: '#9be7ff', w: '#ffffff' }, speed: 0.7,
  },
  copo: {
    f: [['..w..', '.www.', 'wwbww', '.www.', '..w..'], ['..w..', 'w.w.w', '.wbw.', 'w.w.w', '..w..']],
    pal: { w: '#ffffff', b: '#9be7ff' }, speed: 0.7,
  },
};
void BUTTER;
const FOR_BIOME: Record<Biome, string[]> = {
  flores: ['mariposa', 'mariposaAzul'], jardin: ['mariposa', 'mariposaAzul'], parque: ['mariposaAzul', 'pajaro'], otono: ['pajaroRojo', 'luciernaga'],
  bosque: ['luciernaga', 'pajaro'], setas: ['luciernaga', 'mariposaAzul'], noche: ['luciernaga', 'estrella'], cristal: ['cristal', 'luciernaga'],
  ciudad: ['pajaro', 'pajaroRojo'], playa: ['pez', 'pajaro'], nieve: ['copo', 'pajaro'], oceano: ['pez', 'pezAzul'], espacio: ['estrella', 'cristal'], dulce: ['caramelo', 'mariposa'],
};
const sprite = (k: Kind, fi: number): HTMLCanvasElement => {
  const rows = k.f[fi], c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; g.fillStyle = k.pal[ch] ?? (ch === 'w' ? '#fff' : '#000'); g.fillRect(x, y, 1, 1); }));
  return c;
};
export const CRITTER_DAILY_CAP = 12;

/** Pone 2 criaturas en una isla abierta. Devuelve un limpiador. */
export function mountCritters(host: HTMLElement, isl: { id: string; levels: number }, biome: Biome, height: (i: number) => number, xOfLevel: (i: number) => number): void {
  const names = FOR_BIOME[biome] ?? ['mariposa'];
  const seed = hashStr(isl.id + ':critters');
  for (let n = 0; n < 2; n++) {
    const kind = kinds[names[(seed + n) % names.length]];
    const lvl = 1 + ((seed >> (n * 3)) % Math.max(1, isl.levels - 2));
    const wrap = document.createElement('button');
    wrap.className = `critter c${n}`;
    wrap.setAttribute('aria-label', 'Criatura: tócala para ganar monedas');
    const x = Math.min(0.9, Math.max(0.08, xOfLevel(lvl) + (n ? -0.2 : 0.2)));
    wrap.style.left = `${(x * 100).toFixed(1)}%`; wrap.style.top = `${height(lvl) - 28 + n * 36}px`;
    const a = sprite(kind, 0), b = sprite(kind, 1);
    a.className = 'cf a'; b.className = 'cf b';
    wrap.append(a, b);
    wrap.style.setProperty('--sp', `${kind.speed}`);
    wrap.style.setProperty('--d', `${((seed >> 4) % 40) / 10}s`);
    wrap.addEventListener('click', e => {
      e.stopPropagation();
      const today = new Date().toISOString().slice(0, 10);
      update(s => { if (s.critters?.day !== today) s.critters = { day: today, n: 0 }; });
      const r = wrap.getBoundingClientRect();
      sfx('pop', 10);
      burst(r.left + r.width / 2, r.top + r.height / 2, ['#ffd86b', '#ffffff', '#ff9ad5'], 8, 0.9);
      if (getState().critters.n >= CRITTER_DAILY_CAP) { toast('Hoy ya no tienen más monedas. ¡Mañana más!'); return; }
      update(s => { s.critters.n += 1; });
      addCoins(2); missionEvent('critters'); sfx('coin');
      wrap.classList.add('gone');
      if (!reducedMotion()) setTimeout(() => { wrap.classList.remove('gone'); }, 25000);
      toast(`+2 monedas (${getState().critters.n}/${CRITTER_DAILY_CAP} hoy)`, 1100);
    });
    host.append(wrap);
  }
}
