import { getState, update, type State } from './state';
import { todayStr } from './levels';

/* ------------------------------------------------------------------ sopas regaladas */
/** Una sopa hecha a mano por uno para el otro, con un mensaje que se revela al terminarla. */
export interface GiftSoup { title: string; words: string[]; message: string }
const SOUP_PREFIX = 'SOPA:';
export const encodeSoup = (g: GiftSoup): string => SOUP_PREFIX + JSON.stringify(g);
export function decodeSoup(body: string): GiftSoup | null {
  if (!body.startsWith(SOUP_PREFIX)) return null;
  try {
    const g = JSON.parse(body.slice(SOUP_PREFIX.length)) as GiftSoup;
    return Array.isArray(g.words) && g.words.length ? g : null;
  } catch { return null; }
}

/* ------------------------------------------------------------------ historial de partidas */
export interface PlayRecord { t: number; key: string; mode: string; stars: number; secs: number; words: number; win: boolean }
export function recordPlay(r: Omit<PlayRecord, 't'>): void {
  update(s => { s.history = [...(s.history ?? []), { ...r, t: Date.now() }].slice(-300); });
}

/* ------------------------------------------------------------------ reto semanal de pareja */
export const WEEK_GOAL = 60, WEEK_REWARD = 60;
/** Identificador de semana ISO (lunes a domingo), p. ej. "2026-W46". */
export function weekId(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
export function myWeekWords(s: State = getState()): number { return s.week?.id === weekId() ? s.week.words : 0; }
export function addWeekWords(n: number): void {
  update(s => { const id = weekId(); if (s.week?.id !== id) s.week = { id, words: 0, claimed: false }; s.week.words += n; });
}
export function claimWeek(): boolean {
  const s = getState();
  if (s.week?.id !== weekId() || s.week.claimed) return false;
  update(x => { x.week.claimed = true; x.coins += WEEK_REWARD; });
  return true;
}

/* ------------------------------------------------------------------ fechas especiales */
export interface SpecialEvent { id: string; name: string; date: Date; days: number; today: boolean; gift: number; once?: boolean }
const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Siguiente vez que llega una fecha anual MM-DD (hoy incluido). */
function nextYearly(mmdd: string, now: Date): Date {
  const [m, d] = mmdd.split('-').map(Number);
  let c = new Date(now.getFullYear(), m - 1, d);
  if (c < startOfDay(now)) c = new Date(now.getFullYear() + 1, m - 1, d);
  return c;
}
/** Fechas vuestras: solo las que son reales (aniversario 1/9, conoceros 10/7) + las que pongáis en Ajustes. */
export function upcomingEvents(now = new Date(), s: State = getState()): SpecialEvent[] {
  const list: Omit<SpecialEvent, 'days' | 'today'>[] = [
    { id: 'aniversario', name: 'Nuestro aniversario', date: nextYearly('09-01', now), gift: 150 },
    { id: 'conocernos', name: 'Aniversario de conocernos', date: nextYearly('07-10', now), gift: 80 },
    { id: 'sanvalentin', name: 'San Valentín', date: nextYearly('02-14', now), gift: 80 },
    { id: 'navidad', name: 'Navidad', date: nextYearly('12-25', now), gift: 100 },
    { id: 'nochevieja', name: 'Nochevieja', date: nextYearly('12-31', now), gift: 60 },
  ];
  const sd = s.specialDates ?? {};
  if (sd.nico) list.push({ id: 'cumple-nico', name: 'Cumpleaños de Nico', date: nextYearly(sd.nico, now), gift: 120 });
  if (sd.izana) list.push({ id: 'cumple-izana', name: 'Cumpleaños de Izana', date: nextYearly(sd.izana, now), gift: 120 });
  if (sd.roma) { const r = new Date(`${sd.roma}T00:00:00`); if (!isNaN(+r) && r >= startOfDay(now)) list.push({ id: 'roma', name: 'Viaje a Roma', date: r, gift: 200, once: true }); }
  const today = startOfDay(now).getTime();
  return list.map(e => {
    const days = Math.round((startOfDay(e.date).getTime() - today) / DAY);
    return { ...e, days, today: days === 0 };
  }).sort((a, b) => a.days - b.days);
}
const claimKey = (e: SpecialEvent) => `${e.id}:${e.once ? 'unica' : e.date.getFullYear()}`;
export const eventClaimed = (e: SpecialEvent, s: State = getState()): boolean => (s.eventsClaimed ?? []).includes(claimKey(e));
export function claimEvent(e: SpecialEvent): boolean {
  if (!e.today || eventClaimed(e)) return false;
  update(s => { s.eventsClaimed = [...(s.eventsClaimed ?? []), claimKey(e)]; s.coins += e.gift; });
  return true;
}

/* ------------------------------------------------------------------ copia de seguridad */
const PREFIX = 'nuestra-sopa:';
export function exportBackup(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(PREFIX) && !k.includes(':cache:') && !k.includes(':queue:')) data[k] = localStorage.getItem(k)!;
  }
  return JSON.stringify({ app: 'nuestra-sopa', v: 1, date: todayStr(), data }, null, 1);
}
export function importBackup(json: string): { ok: boolean; error?: string } {
  try {
    const b = JSON.parse(json) as { app?: string; data?: Record<string, string> };
    if (b.app !== 'nuestra-sopa' || !b.data) return { ok: false, error: 'Ese archivo no es una copia de SopaVentura.' };
    if (!b.data[`${PREFIX}state:v1`]) return { ok: false, error: 'A la copia le falta el progreso.' };
    for (const [k, v] of Object.entries(b.data)) if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
    return { ok: true };
  } catch { return { ok: false, error: 'No se pudo leer el archivo.' }; }
}

/* ------------------------------------------------------------------ misiones semanales */
export interface MissionDef { id: string; text: string; goal: number; reward: number; ev: string }
export const MISSION_POOL: MissionDef[] = [
  { id: 'extras8', text: 'Encuentra 8 palabras extra', goal: 8, reward: 40, ev: 'extras' },
  { id: 'riddle3', text: 'Gana 3 niveles en Acertijos', goal: 3, reward: 45, ev: 'levels:riddle' },
  { id: 'timed3', text: 'Gana 3 niveles en Contrarreloj', goal: 3, reward: 45, ev: 'levels:timed' },
  { id: 'points2', text: 'Gana 2 niveles en Con puntos', goal: 2, reward: 40, ev: 'levels:points' },
  { id: 'blind2', text: 'Gana 2 niveles A ciegas', goal: 2, reward: 50, ev: 'levels:blind' },
  { id: 'chill5', text: 'Gana 5 niveles en cualquier modo', goal: 5, reward: 35, ev: 'levels' },
  { id: 'perfect2', text: 'Completa 2 niveles sin fallos ni pistas', goal: 2, reward: 50, ev: 'perfect' },
  { id: 'words40', text: 'Encuentra 40 palabras', goal: 40, reward: 30, ev: 'words' },
  { id: 'paint1', text: 'Termina un dibujo por números', goal: 1, reward: 40, ev: 'paint' },
  { id: 'critters5', text: 'Toca 5 criaturas del mapa', goal: 5, reward: 25, ev: 'critters' },
  { id: 'streak5', text: 'Haz un extra 5 veces seguidas en un nivel', goal: 1, reward: 45, ev: 'extrastreak' },
];
/** 4 misiones por semana, siempre las mismas para la misma semana. */
export function ensureMissions(): void {
  const id = weekId();
  if (getState().missions?.week === id) return;
  const pool = [...MISSION_POOL];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const picked: MissionDef[] = [];
  while (picked.length < 4 && pool.length) { h = (h * 1103515245 + 12345) >>> 0; picked.push(pool.splice(h % pool.length, 1)[0]); }
  update(s => { s.missions = { week: id, items: picked.map(m => ({ id: m.id, n: 0, claimed: false })) }; });
}
/** Suma progreso a las misiones de esta semana que escuchan ese evento. */
export function missionEvent(ev: string, n = 1): void {
  ensureMissions();
  update(s => { for (const it of s.missions.items) { const d = MISSION_POOL.find(m => m.id === it.id); if (d && d.ev === ev && it.n < d.goal) it.n = Math.min(d.goal, it.n + n); } });
}
export function claimMission(id: string): number {
  ensureMissions();
  const it = getState().missions.items.find(x => x.id === id), d = MISSION_POOL.find(m => m.id === id);
  if (!it || !d || it.claimed || it.n < d.goal) return 0;
  update(s => { const x = s.missions.items.find(y => y.id === id)!; x.claimed = true; s.coins += d.reward; });
  return d.reward;
}

/* ------------------------------------------------------------------ retos entre los dos ("supera mi tiempo") */
import type { LevelSpec, Mode } from './levels';
export interface Challenge { spec: LevelSpec; mode: Mode; secs: number }
const CHALLENGE_PREFIX = 'RETO:';
export function encodeChallenge(c: Challenge): string {
  let body = CHALLENGE_PREFIX + JSON.stringify(c);
  if (body.length > 5500) body = CHALLENGE_PREFIX + JSON.stringify({ ...c, spec: { ...c.spec, clues: {} } });   // el tablero se genera igual sin pistas
  return body;
}
export function decodeChallenge(body: string): Challenge | null {
  if (!body.startsWith(CHALLENGE_PREFIX)) return null;
  try {
    const c = JSON.parse(body.slice(CHALLENGE_PREFIX.length)) as Challenge;
    return c?.spec && Array.isArray(c.spec.words) && c.secs > 0 ? c : null;
  } catch { return null; }
}
