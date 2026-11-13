import { hashStr } from '../core/rng';
import { getState, update } from '../core/state';
import { weekId } from '../core/extras';
import { builtinTemplates } from './images';
import { TRANSPARENT, type Template } from './model';

/** Dibujo de la semana: uno de los incluidos, gratis esa semana y con premio extra al terminarlo. */
export const WEEKLY_BONUS = 80;

const STARS = ['cerezo', 'arce', 'gato', 'perro', 'paloma', 'leopardo', 'husky', 'zorro', 'buho', 'mariposa', 'medusa', 'galaxia', 'aurora', 'conejo',
  'pinguino', 'panda', 'ballena', 'pulpo', 'tortuga', 'ciervo', 'koala', 'colibri', 'faro', 'astronauta', 'jacaranda', 'alhambra', 'luna', 'olaf'];
function candidates(): Template[] {
  const all = builtinTemplates();
  return STARS.map(id => all.find(t => t.id === id)).filter((t): t is Template => !!t && !t.photo && t.cells.some(c => c !== TRANSPARENT));
}

export function weeklyDrawing(): Template | undefined {
  const list = candidates();
  if (!list.length) return undefined;
  return list[hashStr(`semana:${weekId()}`) % list.length];
}
export const isWeekly = (id: string): boolean => weeklyDrawing()?.id === id;

/** Dias que quedan hasta el lunes. */
export function weeklyDaysLeft(): number {
  const d = new Date().getDay();
  return d === 0 ? 1 : 8 - d;
}

/** Premio una vez por semana. Devuelve las monedas dadas (0 si ya se cobro). */
export function claimWeekly(id: string): number {
  const key = `dibujo:${weekId()}`;
  if (!isWeekly(id) || getState().eventsClaimed.includes(key)) return 0;
  update(s => { s.eventsClaimed.push(key); s.coins += WEEKLY_BONUS; });
  return WEEKLY_BONUS;
}
