import { ISLANDS, islandById, proceduralIsland, type Island } from '../data/islands';
import { getState, update, type State } from './state';
import { todayStr } from './levels';

/**
 * Cada modo (chill, contrarreloj, puntos, acertijos, a ciegas) y el infinito tienen su PROPIO progreso:
 * la clave de un nivel lleva el "cubo" delante ("timed|inicio:3"). El cubo chill usa la clave de siempre ("inicio:3").
 */
export type Bucket = string;   // 'chill' | 'timed' | 'points' | 'riddle' | 'blind' | 'infinito'
export const levelKey = (islandId: string, idx: number, bucket: Bucket = 'chill') => (bucket === 'chill' ? '' : `${bucket}|`) + `${islandId}:${idx}`;
export const bucketOfKey = (key: string): Bucket => (key.includes('|') ? key.slice(0, key.indexOf('|')) : 'chill');
const baseKey = (key: string) => (key.includes('|') ? key.slice(key.indexOf('|') + 1) : key);
const SPECIAL = ['inf:', 'daily:', 'custom:'];

/** Compatibilidad: el progreso es el estado completo. */
export const loadProgress = (): State => getState();

/** Estrellas totales (todos los modos juntos) o, con `bucket`, solo las de ese modo. */
export function totalStars(p: State = getState(), bucket?: Bucket): number {
  return Object.entries(p.stars)
    .filter(([k]) => !SPECIAL.some(x => baseKey(k).startsWith(x)) && (bucket === undefined || bucketOfKey(k) === bucket))
    .reduce((a, [, v]) => a + v, 0);
}

const BUCKETS: Bucket[] = ['chill', 'timed', 'points', 'riddle', 'blind', 'infinito'];
/** Isla completa: al menos 1 estrella en todos sus niveles (en ese modo; sin `bucket`, en cualquiera). */
export function islandComplete(p: State, isl: Island, bucket?: Bucket): boolean {
  const one = (b: Bucket) => { for (let k = 0; k < isl.levels; k++) if (!(p.stars[levelKey(isl.id, k, b)] ?? 0)) return false; return true; };
  return bucket !== undefined ? one(bucket) : BUCKETS.some(one);
}

export function isIslandUnlocked(p: State, islandId: string, bucket: Bucket = 'chill'): boolean {
  const isl = islandById(islandId);
  if (!isl) return false;
  if (isl.procedural) {
    // Infinito: la primera isla esta abierta; las demas, al completar la anterior (con el progreso propio del infinito).
    if (isl.procedural === 1) return true;
    const prev = proceduralIsland(isl.procedural - 1);
    return isIslandUnlocked(p, prev.id, bucket) && islandComplete(p, prev, bucket);
  }
  if (isl.locked) return isl.id === 'roma' && p.romaUnlocked;
  return totalStars(p, bucket) >= isl.starsToUnlock;
}

/** Un nivel esta abierto si es el primero de la isla o el anterior tiene al menos 1 estrella. */
export function isLevelUnlocked(p: State, islandId: string, idx: number, bucket: Bucket = 'chill'): boolean {
  if (!isIslandUnlocked(p, islandId, bucket)) return false;
  if (idx === 0) return true;
  return (p.stars[levelKey(islandId, idx - 1, bucket)] ?? 0) > 0;
}

/** Todas las islas abiertas completadas (al menos 1 estrella en cada nivel) => final del juego. */
export function gameFinished(p: State = getState()): boolean {
  // El final se desbloquea con las islas originales (hasta Isla Maleta); las nuevas son extra
  const lastOriginal = ISLANDS.findIndex(i => i.id === 'viajes');
  return ISLANDS.slice(0, lastOriginal + 1).filter(i => !i.locked).every(i => islandComplete(p, i));
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

export interface CompleteResult { firstTime: boolean; coins: number; stars: number }

/** Registra un nivel terminado. Devuelve las monedas ganadas. */
export function completeLevel(key: string, stars: number, coins: number, wordsFound: number, hintsUsed: number): CompleteResult {
  let firstTime = false;
  update(s => {
    const prev = s.stars[key] ?? 0;
    firstTime = prev === 0;
    s.stars[key] = Math.max(prev, stars);
    s.coins += coins;
    s.stats.levelsDone += 1;
    s.stats.wordsFound += wordsFound;
    s.stats.hintsUsed += hintsUsed;
    if (stars === 3) s.stats.perfect += 1;
    const t = todayStr();
    if (s.streak.last !== t) {
      s.streak = { count: s.streak.last === yesterday() ? s.streak.count + 1 : 1, last: t };
    }
    if (key.startsWith('daily:')) { s.daily[key.slice(6)] = stars; s.stats.dailyDone += 1; }
    if (key.startsWith('inf:')) s.endlessBest = Math.max(s.endlessBest, Number(key.slice(4)));
  });
  return { firstTime, coins, stars };
}

/** Islas del mapa: la historia (Aventura) o, en el Infinito, las generadas abiertas + la siguiente (bloqueada, de aliciente). */
export function mapIslands(p: State = getState(), bucket: Bucket = 'chill'): Island[] {
  if (bucket !== 'infinito') return [...ISLANDS];
  const out: Island[] = [];
  let n = 1;
  while (n < 500 && isIslandUnlocked(p, `p${n}`, bucket)) out.push(proceduralIsland(n++));
  out.push(proceduralIsland(n));
  return out;
}
