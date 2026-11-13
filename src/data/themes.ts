// Temas del juego. Las palabras reales se rellenan en la Fase 7.
// Sin tildes, con Ñ. Los datos dudosos van a la lista "a verificar".
export type ThemeId =
  | 'himym' | 'castle' | 'naruto' | 'aot' | 'rickmorty' | 'adventure' | 'minecraft'
  | 'pokemon' | 'gaming' | 'ghibli' | 'comida' | 'animales' | 'citas'
  | 'kanye' | 'luchork' | 'amaia' | 'dvalentino' | 'mvrk' | 'lhaine'
  | 'pantera' | 'taylor' | 'lana'
  | 'nosotros' | 'olaf' | 'rivas' | 'metro' | 'metromad' | 'madrid' | 'granada' | 'cercedilla' | 'roma' | 'gente'
  | 'oceano' | 'espacio' | 'bosque' | 'invierno' | 'postres' | 'deportes' | 'instrumentos' | 'ciudades' | 'cine' | 'tiktok';

export interface Theme {
  id: ThemeId;
  name: string;
  palette: { bg: string; bg2: string; accent: string; ink: string };
  special?: boolean;
  locked?: 'proximamente';
}

const t = (id: ThemeId, name: string, bg: string, bg2: string, accent: string, extra: Partial<Theme> = {}): Theme =>
  ({ id, name, palette: { bg, bg2, accent, ink: '#fff7ff' }, ...extra });

export const THEMES: Record<ThemeId, Theme> = {
  himym: t('himym', 'Como conoci a vuestra madre', '#2b3a67', '#496ddb', '#ffd166'),
  castle: t('castle', 'Castle', '#3b2f2f', '#7a5c4f', '#e9c46a'),
  naruto: t('naruto', 'Naruto', '#7a3e00', '#ff8c1a', '#2a2a72'),
  aot: t('aot', 'Attack on Titan', '#2f3a2f', '#6b8e6b', '#c0a060', { special: true }),
  rickmorty: t('rickmorty', 'Rick y Morty', '#0f5132', '#7ddf64', '#00b4d8'),
  adventure: t('adventure', 'Hora de Aventuras', '#3aa0ff', '#9be7ff', '#ffd23f'),
  minecraft: t('minecraft', 'Minecraft', '#3f6b2b', '#7fb04a', '#8b5a2b'),
  pokemon: t('pokemon', 'Pokemon', '#b3202a', '#ff6b6b', '#ffd23f'),
  gaming: t('gaming', 'Ragebite y gaming', '#1a1a2e', '#5a2d82', '#ff3b3b'),
  ghibli: t('ghibli', 'Disney / Pixar / Ghibli', '#2a6f97', '#a9d6e5', '#f4a261'),
  comida: t('comida', 'Comida', '#9c3d1d', '#f4a259', '#ffe066'),
  animales: t('animales', 'Animales', '#386641', '#a7c957', '#f2e8cf'),
  citas: t('citas', 'Citas y planes', '#7b2d5b', '#ff7eb6', '#ffe0f0'),
  kanye: t('kanye', 'Kanye West', '#222222', '#555555', '#e63946'),
  luchork: t('luchork', 'Lucho RK', '#3a0ca3', '#7209b7', '#f72585'),
  amaia: t('amaia', 'Amaia', '#f4a6c0', '#ffe3ec', '#6a4c93'),
  dvalentino: t('dvalentino', 'D.Valentino', '#4a0d0d', '#9b2226', '#ee9b00', { special: true }),
  mvrk: t('mvrk', 'MVRK', '#0b0b1a', '#2d2d6b', '#00f5d4'),
  lhaine: t('lhaine', 'Lhaine', '#2d1b4e', '#6c4ab6', '#ffb4e6'),
  pantera: t('pantera', 'La Pantera', '#101010', '#3d3d3d', '#ffd60a'),
  taylor: t('taylor', 'Taylor Swift', '#5e60ce', '#b8c0ff', '#ffd6ff'),
  lana: t('lana', 'Lana Del Rey', '#8d5a97', '#f6c6d0', '#fff1e6'),
  nosotros: t('nosotros', 'Nosotros', '#6a1b9a', '#ff7eb6', '#fff0f7', { special: true }),
  olaf: t('olaf', 'Olaf', '#4a4e69', '#c9ada7', '#f2e9e4', { special: true }),
  rivas: t('rivas', 'Rivas', '#3d5a80', '#98c1d9', '#ee6c4d'),
  metro: t('metro', 'Metro línea 9', '#6b2d8c', '#b366d9', '#ffd86b'),
  metromad: t('metromad', 'Metro de Madrid', '#1f4e8c', '#5aa0e6', '#ffd23f'),
  madrid: t('madrid', 'Madrid', '#8c2f39', '#e8826b', '#ffe29a'),
  granada: t('granada', 'Granada', '#b5651d', '#f1c27d', '#8e2c1f'),
  cercedilla: t('cercedilla', 'Cercedilla', '#2d6a4f', '#95d5b2', '#b08968'),
  roma: t('roma', 'Roma', '#6d6875', '#e5989b', '#ffcdb2', { locked: 'proximamente' }),
  gente: t('gente', 'Nuestra gente', '#2a9d8f', '#8ad7cc', '#ffe66d'),
  oceano: t('oceano', 'Fondo del mar', '#0b1d5c', '#2a6fc4', '#7dd3fc'),
  espacio: t('espacio', 'El espacio', '#0d0a2e', '#3b2a8a', '#c4b5fd'),
  bosque: t('bosque', 'Bosque encantado', '#14301a', '#3f7a3a', '#c4e77a'),
  invierno: t('invierno', 'Invierno', '#1e3a6a', '#9ab8e6', '#ffffff'),
  postres: t('postres', 'Dulces y postres', '#5b2a6e', '#c48ae0', '#ffd6f0'),
  deportes: t('deportes', 'Deportes', '#123a6a', '#3b82f6', '#ffd86b'),
  instrumentos: t('instrumentos', 'Instrumentos', '#2a1450', '#6d3fd0', '#ffd86b'),
  ciudades: t('ciudades', 'Ciudades de España', '#5a1a2a', '#c0503a', '#ffd86b'),
  cine: t('cine', 'Cine español', '#1a0a2a', '#6a1a4a', '#ffd86b'),
  tiktok: t('tiktok', 'TikTok y Twitch', '#0a0a1a', '#3a1a6a', '#22d3ee'),
};
