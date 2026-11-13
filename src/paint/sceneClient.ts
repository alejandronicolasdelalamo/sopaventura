import { bufToCanvas, renderSceneBuf, type SceneBuf, type SceneInput } from './scene';
import { dayPart } from '../ui/daytime';
import type { Template } from './model';

/**
 * Pide un escenario al Web Worker. Si el navegador no lo admite (o falla), se calcula en el hilo
 * principal pero en un "tick" aparte, para no bloquear el toque que lo pidio.
 */
let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, { ok: (b: SceneBuf) => void; fail: (e: unknown) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./sceneWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; W?: number; H?: number; buf?: Uint32Array; landmark?: SceneBuf['landmark']; cloud?: string[]; ponds?: SceneBuf['ponds']; list?: Template[]; props?: (Template | null)[]; error?: string }>) => {
      const job = pending.get(e.data.id); if (!job) return;
      pending.delete(e.data.id);
      if (e.data.list) { (job.ok as unknown as (l: BuiltinPack) => void)({ list: e.data.list, props: e.data.props ?? [] }); return; }
      if (e.data.buf) job.ok({ W: e.data.W!, H: e.data.H!, buf: e.data.buf, landmark: e.data.landmark, cloud: e.data.cloud, ponds: e.data.ponds }); else job.fail(e.data.error);
    };
    worker.onerror = () => { // el worker no arranca: todo pasa al hilo principal
      const jobs = [...pending.values()]; pending.clear(); worker?.terminate(); worker = null;
      for (const j of jobs) j.fail('worker');
    };
  } catch { worker = null; }
  return worker;
}

export function renderSceneBufAsync(input: SceneInput): Promise<SceneBuf> {
  const inp = { ...input, part: input.part ?? dayPart() };   // la hora se decide aqui (el worker no ve la URL de la pagina)
  const w = getWorker();
  const local = () => new Promise<SceneBuf>(res => setTimeout(() => res(renderSceneBuf(inp)), 0));
  if (!w) return local();
  return new Promise<SceneBuf>(ok => {
    const id = nextId++;
    pending.set(id, { ok, fail: () => { local().then(ok); } });
    w.postMessage({ id, input: inp });
  });
}

export const renderSceneAsync = (input: SceneInput): Promise<HTMLCanvasElement> => renderSceneBufAsync(input).then(bufToCanvas);

export interface SceneLayers { cv: HTMLCanvasElement; landmark?: { cv: HTMLCanvasElement; left: number; top: number }; cloud: string[]; ponds?: SceneBuf['ponds'] }
/** Escenario del mapa por capas: el fondo y, aparte, el monumento (para animarlo y moverlo con parallax). */
export function renderSceneLayersAsync(input: SceneInput): Promise<SceneLayers> {
  return renderSceneBufAsync({ ...input, layers: true }).then(r => {
    const lm = r.landmark;
    return { cv: bufToCanvas(r), cloud: r.cloud ?? [], ponds: r.ponds, landmark: lm ? { cv: bufToCanvas({ W: lm.W, H: lm.H, buf: lm.buf }), left: lm.left, top: lm.top } : undefined };
  });
}

const backdrops = new Map<string, string>();
const bdKey = (id: string, w: number, h: number) => `${id}:${Math.round(w / 50)}:${Math.round(h / 50)}:${dayPart()}`;
/** Fondo de partida / escena (escenario de la isla como imagen), calculado fuera del hilo principal. */
export function backdropCached(isl: { id: string }, w: number, h: number): string | undefined { return backdrops.get(bdKey(isl.id, w, h)); }
export function backdropAsync(isl: SceneInput['isl'], w: number, h: number): Promise<string> {
  const key = bdKey(isl.id, w, h), hit = backdrops.get(key);
  if (hit) return Promise.resolve(hit);
  return renderSceneAsync({ isl, w, h, nodes: [], top: [w * 0.55, 0], bottom: [w * 0.4, h] }).then(cv => new Promise<string>(res => {
    const done = (u: string) => { backdrops.set(key, u); res(u); };
    try { cv.toBlob(b => done(b ? URL.createObjectURL(b) : cv.toDataURL()), 'image/png'); } catch { done(cv.toDataURL()); }
  }));
}

/** Los dibujos incluidos, generados en el worker (null si no hay worker: hay que generarlos aqui). */
export interface BuiltinPack { list: Template[]; props: (Template | null)[] }
export function builtinFromWorker(): Promise<BuiltinPack | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  return new Promise<BuiltinPack | null>(res => {
    const id = nextId++;
    pending.set(id, { ok: res as unknown as (b: SceneBuf) => void, fail: () => res(null) });
    w.postMessage({ id, type: 'builtin' });
  });
}

/** Un mural (dibujo grande de una isla), generado en un Web Worker aparte para no frenar los escenarios del mapa. */
let muralW: Worker | null | undefined;
const muralPending = new Map<number, (t: Template | null) => void>();
export function muralFromWorker(islandId: string): Promise<Template | null> {
  if (muralW === undefined) {
    try {
      muralW = new Worker(new URL('./sceneWorker.ts', import.meta.url), { type: 'module' });
      muralW.onmessage = (e: MessageEvent<{ id: number; template?: Template | null }>) => { const f = muralPending.get(e.data.id); if (f) { muralPending.delete(e.data.id); f(e.data.template ?? null); } };
      muralW.onerror = () => { const fs = [...muralPending.values()]; muralPending.clear(); muralW?.terminate(); muralW = null; fs.forEach(f => f(null)); };
    } catch { muralW = null; }
  }
  const w = muralW;
  if (!w) return Promise.resolve(null);
  return new Promise<Template | null>(res => { const id = nextId++; muralPending.set(id, res); w.postMessage({ id, type: 'mural', islandId }); });
}
