import { ISLANDS } from '../data/islands';
import { getState, update, type State } from './state';
import { islandComplete, totalStars } from './progress';

export interface Achievement { id: string; name: string; desc: string; coins: number; test: (s: State) => boolean }

const islandDone = (s: State, id: string) => {
  const isl = ISLANDS.find(i => i.id === id)!;
  return islandComplete(s, isl);
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primera', name: 'Primera sopa', desc: 'Completa tu primer nivel', coins: 10, test: s => s.stats.levelsDone >= 1 },
  { id: 'diez', name: 'Calentando', desc: 'Completa 10 niveles', coins: 20, test: s => s.stats.levelsDone >= 10 },
  { id: 'cincuenta', name: 'Vicio sano', desc: 'Completa 50 niveles', coins: 60, test: s => s.stats.levelsDone >= 50 },
  { id: 'cien', name: 'Maestra de las letras', desc: 'Completa 100 niveles', coins: 120, test: s => s.stats.levelsDone >= 100 },
  { id: 'perfecto', name: 'Sin una ayuda', desc: 'Consigue 3 estrellas', coins: 10, test: s => s.stats.perfect >= 1 },
  { id: 'perfecto10', name: 'Perfeccionista', desc: '10 niveles con 3 estrellas', coins: 50, test: s => s.stats.perfect >= 10 },
  { id: 'palabras100', name: 'Ojo de lince', desc: 'Encuentra 100 palabras', coins: 30, test: s => s.stats.wordsFound >= 100 },
  { id: 'palabras1000', name: 'Diccionario andante', desc: 'Encuentra 1000 palabras', coins: 150, test: s => s.stats.wordsFound >= 1000 },
  { id: 'racha3', name: 'Tres días seguidos', desc: 'Racha de 3 días', coins: 20, test: s => s.streak.count >= 3 },
  { id: 'racha7', name: 'Una semana juntos', desc: 'Racha de 7 días', coins: 70, test: s => s.streak.count >= 7 },
  { id: 'racha30', name: 'Un mes sin faltar', desc: 'Racha de 30 días', coins: 300, test: s => s.streak.count >= 30 },
  { id: 'diario', name: 'Reto del día', desc: 'Completa un reto diario', coins: 15, test: s => s.stats.dailyDone >= 1 },
  { id: 'diario7', name: 'Constancia', desc: '7 retos diarios', coins: 80, test: s => s.stats.dailyDone >= 7 },
  { id: 'estrellas50', name: 'Cielo estrellado', desc: 'Reúne 50 estrellas', coins: 40, test: s => totalStars(s) >= 50 },
  { id: 'estrellas200', name: 'Vía láctea', desc: 'Reúne 200 estrellas', coins: 120, test: s => totalStars(s) >= 200 },
  { id: 'isla1', name: 'Isla Cuchi completada', desc: 'Termina la primera isla', coins: 40, test: s => islandDone(s, 'inicio') },
  { id: 'titan', name: 'Lo que nos unió', desc: 'Termina la Isla Titán', coins: 80, test: s => islandDone(s, 'anime') },
  { id: 'olafisla', name: 'Reino gatuno', desc: 'Termina la Isla Olaf', coins: 60, test: s => islandDone(s, 'olaf') },
  { id: 'pintora', name: 'Primera obra', desc: 'Termina un dibujo de pintar por números', coins: 30, test: s => s.stats.paintDone >= 1 },
  { id: 'pintora5', name: 'Galería propia', desc: 'Termina 5 dibujos', coins: 100, test: s => s.stats.paintDone >= 5 },
  { id: 'combo', name: 'Combo x4', desc: 'Encadena un combo x4 en modo puntos', coins: 25, test: s => s.stats.bestCombo >= 4 },
  { id: 'mensajero', name: 'Cartero', desc: 'Envía 5 mensajes', coins: 20, test: s => s.stats.messagesSent >= 5 },
  { id: 'huevos', name: 'Cazadora de huevos', desc: 'Encuentra 3 huevos de pascua', coins: 50, test: s => s.eggs.length >= 3 },
];

/** Concede los logros nuevos y devuelve cuales. */
export function checkAchievements(): Achievement[] {
  const s = getState();
  const fresh = ACHIEVEMENTS.filter(a => !s.achievements.includes(a.id) && a.test(s));
  if (fresh.length) update(st => { fresh.forEach(a => { st.achievements.push(a.id); st.coins += a.coins; }); });
  return fresh;
}
