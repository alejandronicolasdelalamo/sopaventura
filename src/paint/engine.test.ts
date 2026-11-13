import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../core/rng';
import { PaintEngine } from './engine';
import { TRANSPARENT, paintableCount, type PaintOp, type Template } from './model';

// ---- Entorno falso: sin navegador, solo lo que usa el motor ----
let frames: Array<(t: number) => void> = [];
function fakeCtx() {
  const noop = () => {};
  return new Proxy({}, {
    get: (_t, k) => {
      if (k === 'createImageData') return (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'getImageData') return (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'createLinearGradient') return () => ({ addColorStop: noop });
      return noop;
    }, set: () => true,
  });
}
function fakeCanvas(w = 400, h = 400) {
  const handlers: Record<string, (e: unknown) => void> = {};
  return {
    clientWidth: w, clientHeight: h, width: 0, height: 0, style: {},
    getContext: () => fakeCtx(), addEventListener: (n: string, f: (e: unknown) => void) => { handlers[n] = f; }, removeEventListener: () => {},
    setPointerCapture: () => {}, getBoundingClientRect: () => ({ left: 0, top: 0 }), handlers,
  };
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal('document', { createElement: () => fakeCanvas(1, 1) });
  vi.stubGlobal('window', { devicePixelRatio: 2, setTimeout, clearTimeout });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => vi.unstubAllGlobals());

/** Avanza el tiempo para que terminen todas las animaciones pendientes. */
const flush = (ms = 5000) => { const t = performance.now() + ms; for (let i = 0; i < 4; i++) { const f = frames.splice(0); f.forEach(cb => cb(t + i * 16)); } };

function template(w: number, h: number, k: number, seed = 3): Template {
  const rng = mulberry32(seed);
  const cells = new Uint8Array(w * h);
  for (let i = 0; i < cells.length; i++) cells[i] = Math.floor(rng() * k);
  return { id: 't', name: 't', w, h, palette: Array.from({ length: k }, (_, i) => `#${(i * 8).toString(16).padStart(2, '0')}80c0`), cells, price: 0, source: 'builtin' };
}

function tapAt(cv: ReturnType<typeof fakeCanvas>, x: number, y: number) {
  const e = (extra = {}) => ({ pointerId: 1, clientX: x, clientY: y, ...extra });
  cv.handlers.pointerdown(e()); cv.handlers.pointerup(e());
}
/** Posicion en pantalla del centro de la casilla (vista ajustada: 400px, margen 10). */
const center = (t: Template, i: number) => { const s = Math.min(380 / t.w, 380 / t.h), ox = (400 - t.w * s) / 2, oy = (400 - t.h * s) / 2; return [ox + ((i % t.w) + 0.5) * s, oy + (Math.floor(i / t.w) + 0.5) * s]; };

describe('motor de pintar por numeros', () => {
  it('toque 1 elige el color; toque 2 pinta TODAS las casillas de ese color', () => {
    const t = template(8, 8, 4), cv = fakeCanvas();
    const ops: PaintOp[] = [], done: number[] = [];
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, { onOp: o => ops.push(o), onColorComplete: c => done.push(c) });
    const i = t.cells.findIndex(c => c === 2);
    const [x, y] = center(t, i);
    tapAt(cv, x, y);                       // selecciona
    expect(e.selected).toBe(2);
    expect(ops).toHaveLength(0);
    tapAt(cv, x, y);                       // pinta
    const expected = t.cells.filter(c => c === 2).length;
    expect(ops).toHaveLength(1);
    expect(ops[0].c).toHaveLength(expected);
    flush();
    expect(e.remaining[2]).toBe(0);
    expect(done).toEqual([2]);
    expect(e.paintedCount).toBe(expected);
  });

  it('la ola empieza en la casilla tocada (orden por distancia)', () => {
    const t = template(16, 16, 2), cv = fakeCanvas();
    const ops: PaintOp[] = [];
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, { onOp: o => ops.push(o) });
    const i = t.cells.findIndex(c => c === 0);
    e.select(0);
    const [x, y] = center(t, i);
    tapAt(cv, x, y);
    expect(ops[0].c[0]).toBe(i);
    void e;
  });

  it('modo clasico: un toque pinta una sola casilla', () => {
    const t = template(8, 8, 3), cv = fakeCanvas();
    const ops: PaintOp[] = [];
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, { onOp: o => ops.push(o) });
    e.setMode('classic'); e.select(1);
    const i = t.cells.findIndex(c => c === 1);
    tapAt(cv, ...(center(t, i) as [number, number]));
    expect(ops[0].c).toEqual([i]);
  });

  it('deshacer devuelve las casillas y se puede repetir', () => {
    const t = template(8, 8, 3), cv = fakeCanvas();
    const ops: PaintOp[] = [];
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, { onOp: o => ops.push(o) });
    e.select(0);
    const i = t.cells.findIndex(c => c === 0);
    const [x, y] = center(t, i);
    tapAt(cv, x, y); flush();
    expect(e.paintedCount).toBeGreaterThan(0);
    expect(e.undo()).toBe(true);
    flush();
    expect(e.paintedCount).toBe(0);
    expect(ops.map(o => o.t)).toEqual(['p', 'u']);
    expect(e.canUndo).toBe(false);
    expect(e.undo()).toBe(false);
  });

  it('operaciones remotas: se aplican una sola vez y llevan autor', () => {
    const t = template(8, 8, 3), cv = fakeCanvas();
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, {});
    const cells = [...t.cells.keys()].filter(i => t.cells[i] === 1);
    const op: PaintOp = { id: 'remoto-1', t: 'p', c: cells, by: 2, ts: 1 };
    e.applyRemote(op); e.applyRemote(op);
    flush();
    expect(e.paintedCount).toBe(cells.length);
    expect(e.by[cells[0]]).toBe(2);
  });

  it('ignora operaciones sobre casillas vacias (transparentes)', () => {
    const t = template(4, 4, 2), cv = fakeCanvas();
    t.cells[5] = TRANSPARENT;
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, {});
    e.applyRemote({ id: 'x', t: 'p', c: [5], by: 2, ts: 1 });
    expect(e.paintedCount).toBe(0);
    expect(e.totalCells).toBe(15);
  });

  it('al pintar todos los colores se dispara onComplete una sola vez', () => {
    const t = template(10, 10, 5), cv = fakeCanvas();
    let complete = 0;
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, { onComplete: () => complete++ });
    for (let c = 0; c < 5; c++) { e.select(c); const i = t.cells.findIndex(v => v === c); const [x, y] = center(t, i); tapAt(cv, x, y); flush(); }
    flush();
    expect(e.isComplete).toBe(true);
    expect(complete).toBe(1);
  });

  it('guardar y cargar reconstruye el dibujo sin disparar celebraciones', () => {
    const t = template(10, 10, 4), cv = fakeCanvas();
    const a = new PaintEngine(cv as unknown as HTMLCanvasElement, t, {});
    a.applyRemote({ id: 'o1', t: 'p', c: [...t.cells.keys()].filter(i => t.cells[i] === 0), by: 1, ts: 1 }, false);
    a.applyRemote({ id: 'o2', t: 'p', c: [...t.cells.keys()].filter(i => t.cells[i] === 1), by: 2, ts: 2 }, false);
    flush();
    const saved = a.exportState();
    let fired = 0;
    const b = new PaintEngine(fakeCanvas() as unknown as HTMLCanvasElement, t, { onColorComplete: () => fired++ });
    b.importState(saved);
    expect(b.paintedCount).toBe(a.paintedCount);
    expect(b.remaining).toEqual(a.remaining);
    expect(fired).toBe(0);
  });

  it('rendimiento: 128x128 con 30 colores (ola completa + 60 fotogramas de logica)', () => {
    const t = template(128, 128, 30), cv = fakeCanvas(390, 700);
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, {});
    expect(paintableCount(t)).toBe(128 * 128);
    e.select(0);
    const i = t.cells.findIndex(c => c === 0);
    let t0 = performance.now();
    const [x, y] = center(t, i);
    // la vista de 128x128 es pequeña: el toque debe caer en la casilla, usamos el metodo interno equivalente
    (e as unknown as { paintCells(c: number[], o: number): void }).paintCells([...t.cells.keys()].filter(k => t.cells[k] === 0), i);
    const waveMs = performance.now() - t0;
    t0 = performance.now();
    const base = performance.now();
    for (let f = 0; f < 60; f++) { const cb = frames.splice(0); cb.forEach(fn => fn(base + f * 16)); }
    const perFrame = (performance.now() - t0) / 60;
    flush();
    expect(e.remaining[0]).toBe(0);
    console.log(`128x128/30 colores: ola ${waveMs.toFixed(1)} ms, ${perFrame.toFixed(2)} ms/fotograma (sin dibujo real)`);
    expect(waveMs).toBeLessThan(150);
    expect(perFrame).toBeLessThan(8);
    void x; void y;
  });

  it('modo por zonas: un toque pinta solo la zona conectada del color, no todo el color', () => {
    // 6x1: A A B A A B  -> la zona izquierda de A son 2 casillas; la otra A no esta conectada
    const t: Template = { id: 'z', name: 'z', w: 6, h: 1, palette: ['#ff0000', '#0000ff'], cells: new Uint8Array([0, 0, 1, 0, 0, 1]), price: 0, source: 'builtin' };
    const cv = fakeCanvas();
    const ops: PaintOp[] = [];
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, { onOp: o => ops.push(o) });
    e.setMode('zone');
    expect(e.zoneOf(0).sort()).toEqual([0, 1]);
    expect(e.zoneOf(3).sort()).toEqual([3, 4]);
    e.select(0);
    const [x, y] = center(t, 0);
    tapAt(cv, x, y);
    expect(ops).toHaveLength(1);
    expect([...ops[0].c].sort()).toEqual([0, 1]);   // solo su zona
    flush();
    expect(e.remaining[0]).toBe(2);                   // la otra zona sigue por pintar
  });

  it('autores: se distinguen por quien pinto cada casilla', () => {
    const t = template(6, 6, 3), cv = fakeCanvas();
    const e = new PaintEngine(cv as unknown as HTMLCanvasElement, t, {});
    e.role = 1;
    e.applyRemote({ id: 'a', t: 'p', c: [0, 1, 2], by: 1, ts: 1 }, false);
    expect(e.authors).toEqual([1]);
    e.applyRemote({ id: 'b', t: 'p', c: [3, 4], by: 2, ts: 2 }, false);
    expect(e.authors.sort()).toEqual([1, 2]);
    e.setAuthorView(true);                            // no debe fallar
    e.setAuthorView(false);
  });
});
