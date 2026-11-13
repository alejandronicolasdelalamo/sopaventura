import { ISLANDS, type Island } from '../data/islands';
import { THEMES, type ThemeId } from '../data/themes';
import { FALLBACK_WORDS, WORDS, type WordEntry } from '../data/words';
import { getContent } from '../data/content';
import { cleanWords, SHAPES, type Shape } from './generator';
import { hashStr, mulberry32, shuffle } from './rng';
import { norm } from './text';
import { getState } from './state';
import { EXTRA_CLUES } from '../data/clues';
import { COMMON_WORDS } from '../data/common';

export type Mode = 'chill' | 'timed' | 'points' | 'riddle' | 'blind';

export interface LevelSpec {
  key: string;
  title: string;
  theme: ThemeId;
  size: number;
  seed: number;
  dirCount: number;
  bias: number;
  words: string[];                 // ya normalizadas
  clues: Record<string, string>;   // palabra normalizada -> pista
  timeLimit: number;               // segundos (modos con tiempo)
  boss?: boolean;
  islandId?: string;
  index?: number;
  shape?: Shape;   // tablero con silueta (corazon, circulo, rombo, gato)
  variant?: Variant;  // tipo de reto del nivel (para que no todos sean iguales)
  dirs?: number[];    // direcciones concretas (ver DIRS), p. ej. solo "al reves"
  fog?: boolean;      // nube de niebla que tapa letras
  difficulty?: number; // 0..1
  extras?: string[];   // palabras EXTRA escondidas a proposito (no estan en la lista: dan monedas al encontrarlas)
}

/** Tipos de nivel. La historia los va soltando poco a poco segun avanzas. */
export type Variant = 'classic' | 'rain' | 'long' | 'shape' | 'reverse' | 'fog' | 'trap' | 'giant' | 'boss';
export const VARIANT_INFO: Record<Variant, { name: string; tip: string; from: number }> = {
  classic: { name: 'Clásico', tip: 'Un respiro: sopa de siempre', from: 0 },
  rain: { name: 'Lluvia de palabras', tip: 'Muchas palabras cortas', from: 0.14 },
  long: { name: 'Palabras largas', tip: 'Pocas, pero kilométricas', from: 0.18 },
  shape: { name: 'Sopa con forma', tip: 'El tablero tiene silueta', from: 0.22 },
  reverse: { name: 'Al revés', tip: 'Todas van hacia atrás o hacia arriba', from: 0.3 },
  fog: { name: 'Niebla', tip: 'Una nube tapa las letras', from: 0.4 },
  trap: { name: 'Trampa', tip: 'Letras que despistan', from: 0.5 },
  giant: { name: 'Gigante', tip: 'Tablero enorme', from: 0.62 },
  boss: { name: 'Jefe', tip: 'Todo a la vez', from: 0 },
};
const VARIANT_ORDER: Variant[] = ['rain', 'long', 'shape', 'reverse', 'fog', 'trap', 'giant'];

/** Ajustes de un tipo de nivel sobre la dificultad base. */
interface Tune { sizeAdd?: number; countAdd?: number; minLen?: number; maxLen?: number }

const entryWord = (e: WordEntry) => (typeof e === 'string' ? e : e[0]);
const entryClue = (e: WordEntry) => (typeof e === 'string' ? '' : e[1]);

/** Palabras base + las añadidas desde el panel secreto ("palabra|pista") + palabras secretas de los huevos. */
function themePool(theme: ThemeId): WordEntry[] {
  const c = getContent();
  const extra = (c.extraWords?.[theme] ?? []).map((l): WordEntry => {
    const [w, clue] = l.split('|');
    return clue ? [w.trim(), clue.trim()] : w.trim();
  });
  const eggWords = theme === 'nosotros' ? c.eggs.filter(e => e.word).map((e): WordEntry => [e.word!, e.trigger]) : [];
  // Palabras propias añadidas desde Nosotros (cada uno las suyas)
  const mine = theme === 'nosotros' || theme === 'citas' ? (getState().myWords ?? []).map(([w, clue]): WordEntry => (clue ? [w, clue] : w)) : [];
  return [...(WORDS[theme] ?? []), ...extra, ...eggWords, ...mine];
}

/** Dificultad 0..1 -> parametros de la sopa. Sube despacio: tablero, palabras, direcciones y letras trampa. */
export function difficultyParams(g: number) {
  const size = 10 + Math.floor(Math.pow(g, 0.85) * 3.99);   // 10..13 (en movil caben bien hasta 13)
  const count = 5 + Math.round(9 * Math.pow(g, 0.8));       // 5..14
  const dirCount = g < 0.04 ? 2 : g < 0.1 ? 3 : g < 0.18 ? 4 : g < 0.28 ? 5 : g < 0.4 ? 6 : 8;
  const bias = Math.min(0.7, g * 0.85);
  const timePerWord = Math.round(30 - g * 12);               // mas tablero = mas tiempo por palabra
  return { size, count, dirCount, bias, timePerWord };
}

/** Posicion global (0..1) de un nivel de la historia: asi la dificultad no "se reinicia" en cada isla. */
function storyProgress(islandNo: number, index: number): number {
  const story = ISLANDS.filter(i => !i.locked);
  const total = story.reduce((a, i) => a + i.levels, 0);
  const before = story.slice(0, Math.max(0, islandNo)).reduce((a, i) => a + i.levels, 0);
  return Math.min(1, (before + index) / Math.max(1, total - 1));
}

/** Dificultad de un nivel: rampa global suave + ondas (respiro al empezar isla, pico cada 5 niveles). */
export function levelDifficulty(island: Island, index: number): number {
  const last = island.levels - 1;
  if (island.procedural) {
    const base = Math.min(0.92, 0.72 + island.procedural * 0.02);
    return Math.min(1, base + (index / Math.max(1, last)) * 0.12 + (index % 5 === 4 ? 0.04 : 0));
  }
  const islandNo = ISLANDS.findIndex(i => i.id === island.id);
  let g = 0.02 + 0.88 * Math.pow(storyProgress(islandNo, index), 0.55);
  if (index === 0 && islandNo > 0) g -= 0.07;          // isla nueva: entrada amable
  else if (index === 1 && islandNo > 0) g -= 0.03;
  if (index % 5 === 4 && index !== last) g += 0.04;    // pico
  return Math.max(0, Math.min(1, g));
}

/** Tipo de reto de un nivel: determinista (misma isla+nivel = mismo tipo), nunca repite el del nivel anterior. */
export function variantFor(island: Island, index: number): Variant {
  if (index === island.levels - 1) return 'boss';
  const g = levelDifficulty(island, index);
  const allowed = VARIANT_ORDER.filter(v => g >= VARIANT_INFO[v].from);
  const islandNo = ISLANDS.findIndex(i => i.id === island.id);
  // los 3 primeros niveles de la primera isla y 1 de cada 4 son clasicos (respiro)
  if (!allowed.length || (islandNo === 0 && index < 3) || index % 4 === 0) return 'classic';
  const prev = index > 0 ? variantFor(island, index - 1) : 'classic';
  const r = mulberry32(hashStr(`${island.id}:v:${index}`));
  const pool = allowed.filter(v => v !== prev);
  // los tipos recien desbloqueados pesan mas: se estrenan en cuanto aparecen
  const fresh = pool.filter(v => g - VARIANT_INFO[v].from < 0.08);
  const list = fresh.length && r() < 0.6 ? fresh : pool;
  return list[Math.floor(r() * list.length)] ?? 'classic';
}

/** Semilla al azar: cada partida de un nivel es un tablero nuevo. */
export const randomSeed = (): number => (Math.random() * 0x7fffffff) | 0;

/** Temas generales con muchas palabras, para no repetir cuando un tema se agota. */
const GENERAL: ThemeId[] = ['animales', 'ciudades', 'cine', 'tiktok', 'comida', 'oceano', 'espacio', 'bosque', 'invierno', 'postres', 'deportes', 'instrumentos'];

function buildSpec(
  key: string, title: string, themes: ThemeId[], g: number, seed: number,
  extra: Partial<LevelSpec> & { fallbackThemes?: ThemeId[]; avoid?: string[]; tune?: Tune },
): LevelSpec {
  const dp = difficultyParams(g);
  const tune = extra.tune ?? {};
  const { dirCount, timePerWord } = dp;
  const bias = extra.bias ?? dp.bias;
  const cap = getState().settings?.boardSize || 13;
  const size = Math.max(7, Math.min(13, cap, dp.size + (tune.sizeAdd ?? 0)));
  const count = Math.max(3, Math.min(14, dp.count + (tune.countAdd ?? 0)));
  const lenOk = (w: string) => w.length >= (tune.minLen ?? 0) && w.length <= (tune.maxLen ?? 99);
  const rng = mulberry32(seed);
  const entries: WordEntry[] = [];
  themes.forEach(t => entries.push(...themePool(t)));
  // Recientes: cuanto mas reciente, peor. Las nunca vistas van primero.
  const avoid = extra.avoid ?? [];
  const recency = new Map(avoid.map((w, i) => [w, i + 1]));
  const fresh = (list: string[]) => list.filter(w => !recency.has(w));
  const stale = (list: string[]) => list.filter(w => recency.has(w)).sort((a, b) => recency.get(a)! - recency.get(b)!);
  const pick = (pool: WordEntry[]) => cleanWords(shuffle(pool, rng).map(entryWord), size);
  const primary = pick(entries);
  const island = pick((extra.fallbackThemes ?? []).flatMap(themePool));
  const general = avoid.length ? pick(GENERAL.filter(t => !themes.includes(t)).flatMap(themePool)) : [];
  // Orden de preferencia: tema del nivel sin repetir > temas de la isla sin repetir > temas generales sin repetir > lo repetido mas antiguo
  const ordered = [...fresh(primary), ...fresh(island), ...fresh(general), ...stale(primary), ...stale(island), ...pick(FALLBACK_WORDS)];
  // Primero las que cumplen el tipo de nivel (largas, cortas...); si faltan, las mas cercanas
  const cleaned = cleanWords(ordered, size);
  const target = ((tune.minLen ?? 0) + Math.min(tune.maxLen ?? 99, size)) / 2;
  const fits = cleaned.filter(lenOk);
  const rest = cleaned.filter(w => !lenOk(w)).sort((a, b) => Math.abs(a.length - target) - Math.abs(b.length - target));
  let words = cleanWords([...fits, ...rest], size).slice(0, count);
  if (words.length < count) words = cleanWords([...words, ...pick(FALLBACK_WORDS)], size).slice(0, count);

  // Palabras EXTRA: se esconden 2-3 que no estan en la lista (dan monedas). Se prefieren comunes y de otros temas.
  const extraPool = [...new Set([...COMMON_WORDS, ...GENERAL.flatMap(themePool).map(entryWord)].map(norm))];
  const extras: string[] = [];
  const maxExtras = size >= 12 ? 3 : 2;
  for (const w of shuffle(extraPool, rng)) {
    if (extras.length >= maxExtras) break;
    if (w.length < 4 || w.length > Math.min(7, size - 2) || words.includes(w) || w === [...w].reverse().join('')) continue;
    if (cleanWords([...words, ...extras, w], size).length === words.length + extras.length + 1) extras.push(w);
  }

  const clues: Record<string, string> = {};
  const all: WordEntry[] = [...entries, ...(extra.fallbackThemes ?? []).flatMap(themePool), ...FALLBACK_WORDS];
  for (const e of all) {
    const n = norm(entryWord(e));
    if (words.includes(n) && entryClue(e) && !clues[n]) clues[n] = entryClue(e);
  }
  for (const w of words) if (!clues[w] && EXTRA_CLUES[w]) clues[w] = EXTRA_CLUES[w];
  return {
    key, title, theme: themes[0], size, seed, dirCount, bias, words, clues,
    timeLimit: words.length * timePerWord, difficulty: g, extras, ...extra, avoid: undefined, tune: undefined,
  } as LevelSpec;
}

/** Nivel de una isla del mapa. El jefe (ultimo) mezcla todos los temas de la isla. */
export function islandLevel(island: Island, index: number, seed: number = randomSeed(), avoid: string[] = getState().recentWords ?? []): LevelSpec {
  const g = levelDifficulty(island, index);
  const variant = variantFor(island, index);
  const boss = variant === 'boss';
  // El tema NO esta fijado por el numero de nivel: cada partida sortea uno de la isla y le mezcla otros 1-2 (asi el nivel 1 nunca es igual)
  const rt = mulberry32(seed ^ 0x9e3779b9);
  const order = shuffle([...island.themes], rt);
  const theme = boss ? island.themes[0] : order[0];
  const blend = boss ? island.themes : order.slice(0, Math.min(order.length, 2 + Math.floor(rt() * 2)));
  const r = mulberry32(seed ^ 0x5bd1e995);
  const shape = (): Shape => (island.id === 'olaf' ? 'gato' : SHAPES[Math.floor(r() * SHAPES.length)]);

  // Ajustes segun el tipo de reto
  const tune: Tune = {};
  const extra: Partial<LevelSpec> = {};
  let gg = g;
  switch (variant) {
    case 'rain': tune.countAdd = 3; tune.maxLen = 6; break;
    case 'long': tune.minLen = 7; tune.countAdd = -2; tune.sizeAdd = 1; break;
    case 'shape': tune.sizeAdd = 2; extra.shape = shape(); break;
    case 'reverse': extra.dirs = [4, 5, 6, 7]; break;
    case 'fog': extra.fog = true; break;
    case 'trap': extra.bias = 0.9; break;
    case 'giant': tune.sizeAdd = 2; tune.countAdd = 2; break;
    case 'boss': gg = Math.min(1, g + 0.1); tune.sizeAdd = 2; extra.shape = shape(); extra.fog = true; break;
  }
  // Arriba del todo se combinan dos retos a la vez
  if (g > 0.78 && !boss && variant !== 'classic' && r() < 0.5) { if (variant !== 'fog') extra.fog = true; else extra.dirs = [4, 5, 6, 7]; }

  return buildSpec(
    `${island.id}:${index}`,
    boss ? `${island.name}: jefe` : variant === 'classic' ? THEMES[theme].name : `${THEMES[theme].name} · ${VARIANT_INFO[variant].name}`,
    blend, gg, seed,
    { boss, islandId: island.id, index, theme, fallbackThemes: island.themes, avoid, variant, tune, ...extra },
  );
}

const ENDLESS_THEMES = (Object.keys(THEMES) as ThemeId[]).filter(t => !THEMES[t].locked);

/** Modo infinito: miles de niveles (1..99999) deterministas a partir del numero. */
export function endlessLevel(n: number): LevelSpec {
  const theme = ENDLESS_THEMES[(n * 7 + Math.floor(n / ENDLESS_THEMES.length)) % ENDLESS_THEMES.length];
  const g = Math.min(1, 0.15 + (n % 100) / 130 + Math.min(0.3, n / 4000));
  return buildSpec(`inf:${n}`, `Infinito ${n}`, [theme], Math.min(1, g), hashStr(`inf:${n}`), { theme, fallbackThemes: [] });
}

/** Sopa hecha a mano (regalo): tamaño segun la palabra mas larga y cuantas son. */
export function customLevel(key: string, title: string, raw: string[], seed: number = randomSeed()): LevelSpec {
  const longest = Math.max(...raw.map(w => norm(w).length));
  const size = Math.max(9, Math.min(13, Math.max(longest + 1, Math.ceil(Math.sqrt(raw.join('').length * 2.2)))));
  const words = cleanWords(raw, size).slice(0, 12);
  return { key, title, theme: 'nosotros', size, seed, dirCount: 5, bias: 0.25, words, clues: {}, timeLimit: words.length * 25 };
}

/** Reto diario: igual para los dos (semilla = fecha). */
export function dailyLevel(date: string): LevelSpec {
  const seed = hashStr(`daily:${date}`);
  const theme = ENDLESS_THEMES[seed % ENDLESS_THEMES.length];
  const other = ENDLESS_THEMES[(seed >>> 8) % ENDLESS_THEMES.length];
  return buildSpec(`daily:${date}`, 'Reto diario', [theme, other], 0.55, seed, { theme, fallbackThemes: [] });
}

export const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const TOTAL_ENDLESS = 99999;
