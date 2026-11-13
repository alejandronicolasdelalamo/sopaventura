import { ISLANDS } from '../data/islands';
import { getState } from '../core/state';
import { islandComplete } from '../core/progress';
import { builtinReady, builtinTemplates, injectBuiltin, olafBase, warmBuiltin } from './images';
import { builtinFromWorker, muralFromWorker } from './sceneClient';
import { muralIslandIds, muralTemplate } from './murals';
import { fromJson, toJson, TRANSPARENT, type Template, type TemplateJson } from './model';
import { privateTemplates } from './private';
import { injectProps, PROP_IDS, propSprite, THEME_PROPS } from './props';
import { isWeekly } from './weekly';
import { stickerName } from '../core/stickers';
import type { ThemeId } from '../data/themes';

/** Los objetos iconicos (pegatinas) tambien se pintan: se desbloquean al conseguir su pegatina. */
let objs: Template[] | null = null;
function objectTemplates(): Template[] {
  if (objs) return objs;
  const themeOf = (id: string) => (Object.entries(THEME_PROPS).find(([, ids]) => ids.includes(id))?.[0] as ThemeId | undefined);
  objs = PROP_IDS.map(id => { const t = propSprite(id)!; return { ...t, id: `obj-${id}`, name: stickerName(id), price: 0, theme: themeOf(id), source: 'builtin' as const }; });
  return objs;
}

let custom: Template[] = [];
const CACHE = 'nuestra-sopa:cache:templates';

export function setCustomTemplates(list: TemplateJson[], persist = true): void {
  custom = list.map(fromJson);
  if (persist) try { localStorage.setItem(CACHE, JSON.stringify(list)); } catch { /* la cache es opcional */ }
}
export function loadCachedTemplates(): void {
  try { const raw = localStorage.getItem(CACHE); if (raw) setCustomTemplates(JSON.parse(raw) as TemplateJson[], false); } catch { /* ignorar */ }
}

// Dibujos importados por el usuario desde una imagen (solo en este movil).
const MINE = 'nuestra-sopa:mis-dibujos';
let mine: Template[] | null = null;
function myTemplates(): Template[] {
  if (mine) return mine;
  try { mine = (JSON.parse(localStorage.getItem(MINE) ?? '[]') as TemplateJson[]).map(fromJson); } catch { mine = []; }
  return mine;
}
export function addMyTemplate(t: Template): boolean {
  const list = [...myTemplates().filter(x => x.id !== t.id), t];
  try { localStorage.setItem(MINE, JSON.stringify(list.map(toJson))); mine = list; return true; } catch { return false; }
}
export function removeMyTemplate(id: string): void {
  const list = myTemplates().filter(x => x.id !== id);
  try { localStorage.setItem(MINE, JSON.stringify(list.map(toJson))); } catch { /* ignorar */ }
  mine = list;
}
export const isMine = (id: string): boolean => myTemplates().some(t => t.id === id);

/** Dificultad segun casillas y colores: 0 facil, 1 media, 2 dificil, 3 experto. */
export function difficulty(t: Template): 0 | 1 | 2 | 3 {
  let cells = 0; for (const c of t.cells) if (c !== TRANSPARENT) cells++;
  const score = cells * (1 + t.palette.length / 20);
  return score < 700 ? 0 : score < 2200 ? 1 : score < 4200 ? 2 : 3;
}
export const DIFF_NAME = ['Fácil', 'Media', 'Difícil', 'Experto'] as const;

/** Incluidos + personales (private/) + los de la nube + importados. Si un id se repite, gana el ultimo. */
export const allTemplates = (): Template[] => {
  const m = new Map<string, Template>();
  [...builtinTemplates(), ...objectTemplates(), ...murals, ...privateTemplates(), ...custom, ...myTemplates()].forEach(t => m.set(t.id, t));
  return [...m.values()];
};
/** Murales de isla (dibujos grandes): se generan al abrir Pintar, no al arrancar. */
let murals: Template[] = [];
let muralsAsked = false;
const addMural = (t: Template) => { murals = [...murals.filter(x => x.id !== t.id), t]; };

/** Pide los murales en segundo plano (uno a uno). `onAdd` avisa cuando llega alguno para repintar la lista. */
export function ensureMurals(onAdd: () => void): void {
  const ids = muralIslandIds(ISLANDS);
  if (muralsAsked) { if (murals.length) onAdd(); return; }
  muralsAsked = true;
  let k = 0, t = 0;
  const next = async (): Promise<void> => {
    if (k >= ids.length) return;
    const id = ids[k++];
    let m = murals.find(x => x.id === `mural-${id}`) ?? (await muralFromWorker(id));
    if (!m) { // sin worker: en el hilo principal, uno por tanda
      await new Promise<void>(res => setTimeout(res, 40));
      try { m = muralTemplate(ISLANDS.find(i => i.id === id)!); } catch { m = null; }
    }
    if (m) { addMural(m); clearTimeout(t); t = window.setTimeout(onAdd, 200); }
    setTimeout(() => void next(), 120);
  };
  void next();
}

export const getTemplate = (id: string): Template | undefined => {
  if (id === 'olaf' && !builtinReady()) return olafBase();
  const hit = allTemplates().find(t => t.id === id);
  if (hit || !id.startsWith('mural-')) return hit;
  // abrir un mural antes de que llegue del worker: se genera aqui (una sola vez)
  const isl = ISLANDS.find(i => `mural-${i.id}` === id);
  if (!isl) return undefined;
  const m = muralTemplate(isl); addMural(m); return m;
};

/** Tras pintar el menu: va generando los dibujos en ratos libres (cada tanda cede el hilo), asi abrir el mapa no se atasca. */
export function warmTemplates(): void {
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? (window as unknown as { requestIdleCallback: (f: () => void, o: { timeout: number }) => void }).requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 60));
  let chain = Promise.resolve();
  const step = (fn: () => void) => { chain = chain.then(() => new Promise<void>(res => idle(() => { try { fn(); } finally { res(); } }))); };
  // Lo normal: el Web Worker genera los dibujos y aqui solo se recogen (sin tirones). Si no hay worker, por tandas.
  void builtinFromWorker().then(pack => {
    if (pack) { injectBuiltin(pack.list); injectProps(pack.props); } else warmBuiltin(step);
    step(() => { objectTemplates(); });
  });
}

const islandDone = (id: string) => {
  const isl = ISLANDS.find(i => i.id === id);
  return !!isl && islandComplete(getState(), isl);   // en cualquier modo
};

/** Un dibujo esta disponible si es gratis, se compro, o se regalo por completar su isla. Las fotos de Nico siempre. */
export function unlockHint(t: Template): string {
  if (t.id.startsWith('obj-')) return 'Consigue su pegatina';
  const isl = ISLANDS.find(i => i.id === t.unlockIsland);
  return isl ? `Se regala al completar ${isl.name}` : '';
}

export function isUnlocked(t: Template): boolean {
  const s = getState();
  if (t.id.startsWith('obj-')) return (s.stickers ?? []).includes(t.id.slice(4));
  if (isWeekly(t.id)) return true;
  // Regalo por isla: solo se abre al completarla (o comprandolo si tiene precio). Sin isla y sin precio: libre.
  return (!t.unlockIsland && t.price === 0) || s.owned.includes(`img:${t.id}`) || (!!t.unlockIsland && islandDone(t.unlockIsland));
}
