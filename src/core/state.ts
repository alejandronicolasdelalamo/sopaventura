import type { AvatarCfg } from '../avatar/avatar';
import { hashStr } from './rng';

export type Role = 'nico' | 'izana';

export interface Settings {
  music: boolean;
  sfx: boolean;
  vibrate: boolean;
  theme: 'auto' | 'light' | 'dark';
  paintMode: 'auto' | 'zone' | 'classic';
  reduceMotion: boolean;
  pinHash: number | null;
  lastMode: 'chill' | 'timed' | 'points' | 'riddle' | 'blind';
  colorblind: boolean;     // paleta apta para daltonismo + tramas en las capsulas
  bigText: boolean;        // letras mas grandes en el tablero y la lista
  tutorialDone: boolean;   // ya vio el tutorial de la primera partida
  newsSeen: boolean;       // ya vio el tutorial de las novedades
  boardSize: number;       // 0 = automatico; 10..13 = tamaño maximo del tablero
  musicVol: number;        // 0..1
  sfxVol: number;          // 0..1
}

export interface Stats {
  wordsFound: number;
  levelsDone: number;
  perfect: number;
  hintsUsed: number;
  paintDone: number;
  dailyDone: number;
  messagesSent: number;
  bestCombo: number;
}

export interface State {
  v: 1;
  role: Role | null;
  stars: Record<string, number>;
  coins: number;
  hints: number;
  reveals: number;
  owned: string[];
  skin: string;
  achievements: string[];
  streak: { count: number; last: string };
  daily: Record<string, number>;
  endlessBest: number;
  stats: Stats;
  eggs: string[];
  quick: string[];
  paintDone: string[];
  vouchers: string[];
  romaUnlocked: boolean;
  settings: Settings;
  avatar: AvatarCfg | null;
  recentWords: string[];   // ultimas palabras que han salido (para no repetirlas)
  history: { t: number; key: string; mode: string; stars: number; secs: number; words: number; win: boolean }[];
  week: { id: string; words: number; claimed: boolean };        // reto semanal de pareja
  specialDates: { nico?: string; izana?: string; roma?: string }; // MM-DD (cumpleaños) y AAAA-MM-DD (Roma)
  eventsClaimed: string[];                                        // regalos de fechas especiales ya abiertos
  myWords: [string, string][];                                    // palabras propias [palabra, pista]
  powerups: { freeze: number; clean: number; bolt: number; radar?: number };      // potenciadores
  missions: { week: string; items: { id: string; n: number; claimed: boolean }[] };  // misiones semanales
  modeBest: Record<string, { secs: number; extras: number }>;   // mejores marcas por modo
  critters: { day: string; n: number };                           // criaturas tocadas hoy en el mapa
  stickers: string[];                                             // album de pegatinas
}

const KEY = 'nuestra-sopa:state:v1';

export const DEFAULT_QUICK = ['¡Te quierooo!', 'ok mañana 💜', 'Te echo de menos', '¿Jugamos una?', 'Eres lo mejor', 'Buenas noches, Cuchi'];

function fresh(): State {
  return {
    v: 1, role: null, stars: {}, coins: 50, hints: 2, reveals: 1, owned: [], skin: 'clasico',
    achievements: [], streak: { count: 0, last: '' }, daily: {}, endlessBest: 0,
    stats: { wordsFound: 0, levelsDone: 0, perfect: 0, hintsUsed: 0, paintDone: 0, dailyDone: 0, messagesSent: 0, bestCombo: 0 },
    eggs: [], quick: [...DEFAULT_QUICK], paintDone: [], vouchers: [], romaUnlocked: false,
    avatar: null, recentWords: [], history: [], week: { id: '', words: 0, claimed: false }, specialDates: {}, eventsClaimed: [], myWords: [], powerups: { freeze: 1, clean: 1, bolt: 1, radar: 1 }, stickers: [], missions: { week: '', items: [] }, modeBest: {}, critters: { day: '', n: 0 },
    settings: { music: true, sfx: true, vibrate: true, theme: 'auto', paintMode: 'classic', reduceMotion: false, pinHash: null, lastMode: 'chill', colorblind: false, bigText: false, tutorialDone: false, newsSeen: false, boardSize: 0, musicVol: 0.8, sfxVol: 0.9 },
  };
}

let state: State = load();
const subs = new Set<(s: State) => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<State>;
      const f = fresh();
      const merged = { ...f, ...p, stats: { ...f.stats, ...p.stats }, settings: { ...f.settings, ...p.settings }, streak: { ...f.streak, ...p.streak } };
      if (merged.settings.paintMode === 'auto') merged.settings.paintMode = 'classic';   // "por color" (pintar todo de golpe) ya no existe: se pinta casilla a casilla
      return merged;
    }
  } catch { /* sin almacenamiento: empezamos de cero */ }
  return fresh();
}

export const getState = (): State => state;

export function update(fn: (s: State) => void): State {
  fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignorar */ }
  subs.forEach(cb => cb(state));
  return state;
}

export function subscribe(cb: (s: State) => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

/** Solo para tests: reemplaza el estado. */
export function resetState(s?: Partial<State>): void {
  state = { ...fresh(), ...s };
  try { localStorage.removeItem(KEY); } catch { /* ignorar */ }
}

export const pinHash = (pin: string): number => hashStr(`nuestra-sopa:${pin}`);

export function addCoins(n: number): void {
  update(s => { s.coins = Math.max(0, s.coins + n); });
}
