import { THEMES, type ThemeId } from './themes';
import { hashStr, mulberry32 } from '../core/rng';

// Cada isla mezcla 3-6 temas: los niveles rotan entre ellos para no ser monotonos.
export interface Island {
  id: string;
  name: string;
  blurb: string;
  levels: number;          // niveles por isla (el ultimo es el jefe)
  themes: ThemeId[];       // mezcla de temas de la isla
  starsToUnlock: number;   // estrellas totales necesarias para abrirla
  special?: boolean;       // isla personal
  locked?: 'proximamente';
  skyColors: [string, string];
  biome?: Biome;
  procedural?: number;     // isla generada numero n (aparece al completar la anterior)
}

export const ISLANDS: Island[] = [
  { id: 'inicio', name: 'Isla Cuchi', blurb: 'Donde todo empezo', levels: 15, starsToUnlock: 0,
    themes: ['nosotros', 'citas', 'comida', 'animales'], skyColors: ['#1b1150', '#3b2a8a'] },
  { id: 'series', name: 'Isla Sofa', blurb: 'Maraton de series', levels: 20, starsToUnlock: 20,
    themes: ['himym', 'castle', 'rickmorty', 'adventure'], skyColors: ['#0e1a4f', '#2a4fb0'] },
  { id: 'anime', name: 'Isla Titan', blurb: 'Lo que nos unio', levels: 20, starsToUnlock: 50,
    themes: ['aot', 'naruto', 'dvalentino', 'ghibli'], special: true, skyColors: ['#160d3f', '#4a2fa0'] },
  { id: 'pixel', name: 'Isla Pixel', blurb: 'Bloques, bichos y rage', levels: 20, starsToUnlock: 90,
    themes: ['minecraft', 'pokemon', 'gaming', 'adventure'], skyColors: ['#0b2350', '#1f6fc0'] },
  { id: 'olaf', name: 'Isla Olaf', blurb: 'Reino gatuno', levels: 15, starsToUnlock: 130,
    themes: ['olaf', 'animales', 'nosotros', 'comida'], special: true, skyColors: ['#1d1246', '#5b3fa8'] },
  { id: 'musica', name: 'Isla Vinilo', blurb: 'Banda sonora', levels: 25, starsToUnlock: 180,
    themes: ['kanye', 'luchork', 'amaia', 'taylor', 'lana'], skyColors: ['#2a0d5a', '#7a3fd0'] },
  { id: 'trap', name: 'Isla Neon', blurb: 'Noche de barrio', levels: 20, starsToUnlock: 240,
    themes: ['mvrk', 'lhaine', 'pantera', 'dvalentino', 'gaming'], skyColors: ['#05031a', '#2c1f78'] },
  { id: 'rivas', name: 'Isla Rivas', blurb: 'Nuestro barrio', levels: 20, starsToUnlock: 300,
    themes: ['rivas', 'metro', 'gente', 'comida', 'citas'], special: true, skyColors: ['#0d1f4a', '#2f6db8'] },
  { id: 'madrid', name: 'Isla Madrid', blurb: 'Metro, plazas y barrios', levels: 25, starsToUnlock: 330,
    themes: ['madrid', 'metromad', 'metro', 'comida', 'citas'], skyColors: ['#1a0f48', '#5a4ac8'] },
  { id: 'viajes', name: 'Isla Maleta', blurb: 'Granada, Cercedilla...', levels: 20, starsToUnlock: 360,
    themes: ['granada', 'cercedilla', 'comida', 'nosotros'], special: true, skyColors: ['#12124a', '#3a5ad0'] },
  { id: 'abisal', name: 'Isla Abisal', blurb: 'Bajo las olas moradas', levels: 20, starsToUnlock: 400,
    themes: ['oceano', 'animales', 'comida'], skyColors: ['#020a2a', '#1a4a9a'], biome: 'oceano' },
  { id: 'bosque', name: 'Isla Bosque Encantado', blurb: 'Setas que brillan y búhos que miran', levels: 20, starsToUnlock: 450,
    themes: ['bosque', 'animales', 'ghibli'], skyColors: ['#0c1a2a', '#2a5a5a'], biome: 'bosque' },
  { id: 'glaciar', name: 'Isla Glaciar', blurb: 'Chocolate caliente y manta', levels: 20, starsToUnlock: 500,
    themes: ['invierno', 'animales', 'citas'], skyColors: ['#0e1a4a', '#5a7ad0'], biome: 'nieve' },
  { id: 'golosa', name: 'Isla Golosa', blurb: 'Todo aquí se puede comer', levels: 20, starsToUnlock: 550,
    themes: ['postres', 'comida', 'citas'], skyColors: ['#2a0d4a', '#9a5ad0'], biome: 'dulce' },
  { id: 'estadio', name: 'Isla Estadio', blurb: 'Música, deporte y aplausos', levels: 20, starsToUnlock: 600,
    themes: ['deportes', 'instrumentos', 'gaming'], skyColors: ['#0a1a4a', '#2a6ad0'], biome: 'ciudad' },
  { id: 'cosmos', name: 'Isla Cosmos', blurb: 'Más allá de las estrellas', levels: 25, starsToUnlock: 650,
    themes: ['espacio', 'rickmorty', 'adventure'], skyColors: ['#02010e', '#1d1258'], biome: 'espacio' },
  { id: 'ruta', name: 'Isla Ruta', blurb: 'De punta a punta de España', levels: 20, starsToUnlock: 700,
    themes: ['ciudades', 'comida', 'animales'], skyColors: ['#2a1048', '#c0503a'], biome: 'otono' },
  { id: 'estreno', name: 'Isla Alfombra Roja', blurb: 'Cine, directos y fama', levels: 20, starsToUnlock: 750,
    themes: ['cine', 'tiktok', 'gaming'], skyColors: ['#0a0418', '#3a1a6a'], biome: 'noche' },
  { id: 'roma', name: 'Isla Roma', blurb: 'Proximamente', levels: 20, starsToUnlock: 9999,
    themes: ['roma', 'comida', 'nosotros'], locked: 'proximamente', special: true, skyColors: ['#1a1240', '#4a3a80'] },
];

/** Tema de un nivel: rota entre los temas de la isla; el jefe usa el tema principal. */
export function themeForLevel(island: Island, levelIdx: number): ThemeId {
  if (levelIdx === island.levels - 1) return island.themes[0];
  return island.themes[levelIdx % island.themes.length];
}

// ---------- Biomas: decorado pixel art del mapa de cada isla ----------
export type Biome = 'flores' | 'ciudad' | 'bosque' | 'setas' | 'jardin' | 'noche' | 'parque' | 'playa' | 'nieve' | 'otono' | 'cristal' | 'oceano' | 'espacio' | 'dulce';
export const BIOME_DECO: Record<Biome, string[]> = {
  flores: ['env-cherry', 'env-oak', 'env-bush', 'env-bushflower', 'env-flowers', 'env-flowers2', 'env-rock', 'env-oak2', 'valla', 'cartel', 'tocon'],
  ciudad: ['farola', 'casita', 'env-oak2', 'env-tall', 'fuente', 'valla', 'env-bushflower', 'env-rocks', 'env-bush'],
  bosque: ['env-pine', 'env-oak', 'env-tall', 'env-pine2', 'env-rockmoss', 'env-mush', 'env-fern', 'env-bush', 'tocon', 'tronco', 'pozo'],
  setas: ['env-mush', 'env-mushblue', 'env-mushpink', 'env-nightree', 'env-rockmoss', 'env-fern', 'env-bush', 'env-rocks', 'tocon', 'tronco'],
  jardin: ['env-bushflower', 'env-cherry', 'casita', 'fuente', 'env-bush', 'env-flowers', 'env-flowers2', 'env-oak2', 'valla', 'pozo'],
  noche: ['env-crystal', 'farola', 'env-pine', 'env-nightree', 'meteorito', 'env-rocks', 'env-crystalp', 'cartel', 'casita'],
  parque: ['env-bush', 'env-autumn', 'farola', 'env-oak', 'env-birch', 'fuente', 'env-bushflower', 'env-flowers', 'valla', 'tocon'],
  playa: ['env-palm', 'env-rock', 'env-rocks', 'env-flowers2', 'env-bush', 'cartel', 'tronco'],
  nieve: ['env-snowpine', 'env-snowpine2', 'env-rocksnow', 'env-crystal', 'env-birch', 'env-rocks', 'casita', 'cartel', 'tronco'],
  otono: ['env-autumn', 'env-autumn2', 'env-mush', 'env-pine', 'env-birch', 'env-bush', 'env-rockmoss', 'valla', 'pozo', 'tocon', 'tronco'],
  cristal: ['env-crystal', 'env-crystalp', 'env-rock', 'env-mushblue', 'env-nightree', 'meteorito', 'env-rocks'],
  oceano: ['env-coral', 'env-coral2', 'env-kelp', 'env-rock', 'env-rocks', 'meteorito'],
  espacio: ['planeta', 'cohete', 'env-crystalp', 'satelite', 'meteorito', 'env-rocks'],
  dulce: ['piruleta', 'cupcake', 'env-candytree', 'env-mushpink', 'helado', 'caramelo', 'env-flowers'],
};
const STORY_BIOME: Record<string, Biome> = {
  inicio: 'flores', series: 'ciudad', anime: 'bosque', pixel: 'setas', olaf: 'jardin', musica: 'noche',
  trap: 'cristal', rivas: 'parque', madrid: 'ciudad', viajes: 'playa', roma: 'otono',
};
export const biomeOf = (isl: Island): Biome => isl.biome ?? STORY_BIOME[isl.id] ?? 'flores';

// ---------- Islas procedurales: aparecen una tras otra al terminar la anterior, sin fin ----------
const PRE = ['Isla', 'Cayo', 'Atolón', 'Islote', 'Bahía'];
const NAMES = ['Lavanda', 'Cometa', 'Nebulosa', 'Marea', 'Brisa', 'Luciérnaga', 'Eclipse', 'Coral', 'Bruma', 'Zafiro', 'Amatista', 'Índigo',
  'Polar', 'Lunar', 'Arándano', 'Medianoche', 'Constelación', 'Glaciar', 'Ciruela', 'Tormenta', 'Neblina', 'Orquídea', 'Pólvora', 'Cobalto'];
const BLURBS = ['Nadie había llegado tan lejos', 'Huele a mar y a estrellas', 'Aquí las noches son eternas', 'Un rincón solo para los dos',
  'Más allá del mapa', 'Donde brillan los cristales', 'Bosques que susurran', 'Arena morada y olas azules'];
const SKIES: [string, string][] = [['#1b1150', '#3b2a8a'], ['#0e1a4f', '#2a4fb0'], ['#160d3f', '#4a2fa0'], ['#0b2350', '#1f6fc0'], ['#1d1246', '#5b3fa8'],
  ['#2a0d5a', '#7a3fd0'], ['#0d1f4a', '#2f6db8'], ['#1a0f48', '#5a4ac8'], ['#12124a', '#3a5ad0'], ['#08183a', '#2a7ab0']];
const BIOMES = Object.keys(BIOME_DECO) as Biome[];
const ROMAN = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

export function proceduralIsland(n: number): Island {
  const r = mulberry32(hashStr(`isla-proc:${n}`));
  const pool = (Object.keys(THEMES) as ThemeId[]).filter(t => !THEMES[t].locked);
  const themes: ThemeId[] = [];
  while (themes.length < 3 + Math.floor(r() * 2)) { const t = pool[Math.floor(r() * pool.length)]; if (!themes.includes(t)) themes.push(t); }
  const lap = Math.floor((n - 1) / NAMES.length) + 1;
  return {
    id: `p${n}`,
    name: `${PRE[Math.floor(r() * PRE.length)]} ${NAMES[(n - 1) % NAMES.length]}${ROMAN[Math.min(lap, 10)] ?? ` ${lap}`}`,
    blurb: BLURBS[Math.floor(r() * BLURBS.length)],
    levels: 15 + Math.floor(r() * 3) * 5,
    themes, starsToUnlock: 0,
    skyColors: SKIES[Math.floor(r() * SKIES.length)],
    biome: BIOMES[Math.floor(r() * BIOMES.length)],
    procedural: n,
  };
}

/** Isla por id (historia o procedural "p<n>"). */
export function islandById(id: string): Island | undefined {
  const st = ISLANDS.find(i => i.id === id);
  if (st) return st;
  const m = /^p(\d+)$/.exec(id);
  return m ? proceduralIsland(Number(m[1])) : undefined;
}
