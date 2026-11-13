import { hexToRgb, luminance, TRANSPARENT, type PaintOp, type Template } from './model';

export interface PaintCallbacks {
  onSelect?(color: number): void;
  onColorComplete?(color: number): void;
  onComplete?(): void;
  onOp?(op: PaintOp): void;
  onProgress?(painted: number, total: number): void;
  onWrongTap?(): void;
  onPaintTick?(n: number): void;
  /** Un color acaba de completarse: la pantalla lanza el barrido de brillo (con CSS, no en el lienzo). */
  onShine?(): void;
}

/** auto: un toque pinta todo el color · zone: un toque (o arrastre) pinta la zona conectada · classic: casilla a casilla */
export type PaintMode = 'auto' | 'zone' | 'classic';
interface Pending { i: number; t: number; add: boolean }
interface Pop { i: number; t0: number }
/** Chispa de color: coordenadas en casillas (se queda pegada al dibujo aunque se mueva la camara). */
interface Spark { x: number; y: number; vx: number; vy: number; t0: number; life: number; c: number; white: boolean }
const SPARK_MAX = 120;

const WAVE_MAX_MS = 900;
const ATLAS = 48;

export class PaintEngine {
  readonly w: number;
  readonly h: number;
  painted: Uint8Array;                 // estado logico (lo que ya esta pintado, aunque la ola aun no lo muestre)
  by: Uint8Array;
  order: number[] = [];                // casillas en orden de pintado (para guardar y para el time-lapse)
  selected = -1;
  mode: PaintMode = 'auto';
  role: 1 | 2 = 1;

  private shown: Uint8Array;           // lo que se ve pintado ahora mismo
  private remainLogical: number[];
  private remainShown: number[];
  private fired: boolean[];
  private total: number;
  private paintedLogical = 0;
  private shownCount = 0;
  private silent = false;
  private tid = 0;
  private g: CanvasRenderingContext2D;
  private dpr = 1;
  private W = 0; private H = 0;
  private ox = 0; private oy = 0; private s = 1; private fitS = 1;
  private colorCv: HTMLCanvasElement; private colorData: ImageData; private color32: Uint32Array;
  private hlCv: HTMLCanvasElement; private hlData: ImageData; private hl32: Uint32Array;
  private grayOf: number[]; private rgb: [number, number, number][];
  private atlasGray!: HTMLCanvasElement; private atlasDark!: HTMLCanvasElement;
  private pending: Pending[] = []; private pi = 0;
  private pops: Pop[] = [];
  private undoStack: PaintOp[] = [];
  private applied = new Set<string>();
  private seq = 0;
  private raf = 0; private dirty = true; private imgDirty = true; private lastDraw = 0;
  private hintCell = -1; private hintUntil = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture: null | { kind: 'pan' | 'paint' | 'pinch'; startX: number; startY: number; t0: number; moved: boolean; lastX: number; lastY: number; lastT: number; vx: number; vy: number; pinchD?: number } = null;
  private inertia = { vx: 0, vy: 0 };
  private anim: null | { t0: number; dur: number; from: [number, number, number]; to: [number, number, number] } = null;
  private reveal: null | { t0: number; dur: number } = null;
  private popStyle: string[] = [];
  private sparks: Spark[] = [];
  /** Time-lapse en marcha: se ve limpio (sin cuadricula, numeros, chispas ni sonidos por casilla). */
  private lapse = false;
  private lapseTimer = 0;
  private putDirty = false;
  private authorView = false;
  private authorCv: HTMLCanvasElement | null = null;
  private inset = 0;               // px de abajo tapados por una hoja (resultado): el dibujo se encuadra por encima
  private ro: ResizeObserver;
  private destroyed = false;
  private completeFired = false;

  constructor(private canvas: HTMLCanvasElement, readonly tpl: Template, private cb: PaintCallbacks = {}) {
    this.w = tpl.w; this.h = tpl.h;
    const n = tpl.w * tpl.h;
    this.painted = new Uint8Array(n); this.by = new Uint8Array(n); this.shown = new Uint8Array(n);
    this.g = canvas.getContext('2d')!;
    this.rgb = tpl.palette.map(hexToRgb);
    this.grayOf = tpl.palette.map(p => Math.round(150 + luminance(p) * 95));
    this.remainLogical = new Array(tpl.palette.length).fill(0);
    for (const c of tpl.cells) if (c !== TRANSPARENT) this.remainLogical[c]++;
    this.remainShown = this.remainLogical.slice();
    this.fired = this.remainLogical.map(v => v === 0);
    this.total = this.remainLogical.reduce((a, b) => a + b, 0);

    this.colorCv = document.createElement('canvas'); this.colorCv.width = this.w; this.colorCv.height = this.h;
    this.colorData = this.colorCv.getContext('2d')!.createImageData(this.w, this.h); this.color32 = new Uint32Array(this.colorData.data.buffer);
    this.hlCv = document.createElement('canvas'); this.hlCv.width = this.w; this.hlCv.height = this.h;
    this.hlData = this.hlCv.getContext('2d')!.createImageData(this.w, this.h); this.hl32 = new Uint32Array(this.hlData.data.buffer);
    this.buildAtlas();

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize(true);
    this.request();
  }

  // ------------------------------------------------------------------ API publica
  get remaining(): number[] { return this.remainLogical.slice(); }
  get paintedCount(): number { return this.paintedLogical; }
  get totalCells(): number { return this.total; }
  get isComplete(): boolean { return this.paintedLogical === this.total; }

  select(c: number, focus = false): void {
    if (c === this.selected) return;
    this.selected = c;
    this.imgDirty = true;
    this.cb.onSelect?.(c);
    if (focus) this.focusColor(c);
    this.request();
  }

  /** Siguiente color sin terminar (el mas parecido en orden). */
  nextIncomplete(from = this.selected): number {
    const n = this.tpl.palette.length;
    for (let k = 1; k <= n; k++) { const c = (from + k + n) % n; if (this.remainLogical[c] > 0) return c; }
    return -1;
  }

  setMode(m: PaintMode): void { this.mode = m; }
  fit(): void { this.fitView(true); }

  /** Lleva la camara a la casilla sin pintar del color elegido mas cercana al centro. Devuelve la casilla o -1. */
  hint(): number {
    if (this.selected < 0) return -1;
    const cx = (this.W / 2 - this.ox) / this.s, cy = (this.H / 2 - this.oy) / this.s;
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.tpl.cells.length; i++) {
      if (this.tpl.cells[i] !== this.selected || this.painted[i]) continue;
      const d = (i % this.w + 0.5 - cx) ** 2 + (Math.floor(i / this.w) + 0.5 - cy) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return -1;
    this.hintCell = best; this.hintUntil = performance.now() + 4000;
    this.flyTo((best % this.w) + 0.5, Math.floor(best / this.w) + 0.5, Math.max(this.s, 14));
    return best;
  }

  undo(): boolean {
    const op = this.undoStack.pop();
    if (!op) return false;
    const cells = op.c.filter(i => this.painted[i]);
    if (!cells.length) return this.undo();
    const uop: PaintOp = { id: this.newId(), t: 'u', c: cells, by: this.role, ts: Date.now() };
    this.apply(uop, true, true);
    this.cb.onOp?.(uop);
    this.select(this.tpl.cells[cells[0]]);
    return true;
  }
  get canUndo(): boolean { return this.undoStack.length > 0; }

  /** Operacion venida del otro movil. */
  applyRemote(op: PaintOp, animate = true): void {
    if (this.applied.has(op.id)) return;
    this.apply(op, animate, false);
  }

  /** Carga operaciones guardadas sin animar (reconstruir el dibujo). */
  loadOps(ops: PaintOp[]): void {
    this.silent = true;
    for (const op of ops) if (!this.applied.has(op.id)) this.apply(op, false, false);
    this.flushPendingNow();
    this.silent = false;
  }

  /** Estado compacto para guardar en el movil. */
  exportState(): { order: number[]; by: number[] } {
    return { order: this.order.slice(), by: this.order.map(i => this.by[i]) };
  }
  importState(st: { order: number[]; by: number[] }): void {
    const ops: PaintOp[] = [];
    // una sola operacion grande agrupa por autor
    const groups = new Map<number, number[]>();
    st.order.forEach((i, k) => { const a = st.by[k] || 1; (groups.get(a) ?? groups.set(a, []).get(a)!).push(i); });
    groups.forEach((c, by) => ops.push({ id: `imp-${by}-${this.seq++}`, t: 'p', c, by: by as 1 | 2, ts: 0 }));
    this.loadOps(ops);
    // conservar el orden original para el time-lapse
    this.order = st.order.filter(i => this.painted[i]);
  }

  /** Reproduccion acelerada del dibujo pintandose. */
  playTimelapse(ms = 7000, onEnd?: () => void): void {
    this.reveal = null; this.sparks = []; this.lapse = true;
    clearTimeout(this.lapseTimer);
    if (onEnd) this.lapseTimer = window.setTimeout(() => { this.lapse = false; onEnd(); }, ms + 900);
    const order = this.order.slice();
    this.pending = []; this.pi = 0;
    this.shown.fill(0); this.shownCount = 0;
    this.remainShown = this.remainLogical.map((_, c) => this.tpl.cells.reduce((a, v) => a + (v === c ? 1 : 0), 0));
    this.pops = [];
    this.imgDirty = true;
    const t0 = performance.now() + 250, step = ms / Math.max(1, order.length);
    order.forEach((i, k) => this.pending.push({ i, t: t0 + k * step, add: true }));
    this.selected = -1; this.imgDirty = true;   // sin color elegido: no hay resaltado ni numeros
    this.fitView(true);
    this.request();
  }

  /** Barrido de brillo al completar un color: lo dibuja la pantalla con CSS (en el lienzo costaba un fotograma entero cada vez). */
  shineNow(_ms = 800): void { this.cb.onShine?.(); }

  /** Rectangulo (px del lienzo) que ocupa el dibujo AHORA (con el zoom y el desplazamiento actuales). */
  artRect(): { x: number; y: number; w: number; h: number } { return { x: this.ox, y: this.oy, w: this.w * this.s, h: this.h * this.s }; }

  /** Rectangulo (px del lienzo) que ocupara el dibujo ya encuadrado (sin hoja de resultado, o por encima de ella). */
  finalRect(): { x: number; y: number; w: number; h: number } {
    return { x: (this.W - this.w * this.fitS) / 2, y: (this.H - this.inset - this.h * this.fitS) / 2, w: this.w * this.fitS, h: this.h * this.fitS };
  }

  /** Puntos claros del dibujo (en fracciones 0..1) donde colocar destellos. */
  brightSpots(n = 12): { x: number; y: number; big: boolean }[] {
    const lit: number[] = [];
    for (let i = 0; i < this.tpl.cells.length; i++) { const c = this.tpl.cells[i]; if (c !== TRANSPARENT && luminance(this.tpl.palette[c]) > 0.72) lit.push(i); }
    const out: { x: number; y: number; big: boolean }[] = [];
    for (let k = 0; k < Math.min(n, lit.length); k++) {
      const i = lit.splice(Math.floor(Math.random() * lit.length), 1)[0];
      out.push({ x: ((i % this.w) + 0.5) / this.w, y: (Math.floor(i / this.w) + 0.5) / this.h, big: k < 4 });
    }
    return out;
  }

  /** Chispas desde un punto del dibujo (en casillas), p. ej. al llegar a un hito. */
  burst(cx: number, cy: number, n = 40, color = -1): void {
    const now = performance.now();
    for (let k = 0; k < n && this.sparks.length < SPARK_MAX * 1.6; k++) {
      const a = Math.random() * 6.283, v = 0.003 + Math.random() * 0.01;
      this.sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.004, t0: now, life: 600 + Math.random() * 500, c: color >= 0 ? color : Math.floor(Math.random() * this.rgb.length), white: k % 3 === 0 });
    }
    this.request();
  }

  /** Autores distintos que han pintado (1 = Nico, 2 = Izana). */
  get authors(): number[] { return [...new Set(this.order.map(i => this.by[i]).filter(Boolean))]; }

  /** Tiñe cada casilla segun quien la pinto (azul y rosa), para ver como os habeis repartido el dibujo. */
  setAuthorView(on: boolean): void {
    this.authorView = on;
    if (on) {
      const cv = this.authorCv ?? (this.authorCv = document.createElement('canvas'));
      cv.width = this.w; cv.height = this.h;
      const g = cv.getContext('2d')!, im = g.createImageData(this.w, this.h), d = new Uint32Array(im.data.buffer);
      for (const i of this.order) d[i] = this.by[i] === 2 ? this.pack([255, 92, 170]) : this.pack([64, 150, 255]);
      g.putImageData(im, 0, 0);
    }
    this.request();
  }

  /** Reserva `px` abajo (una hoja de resultado) y reencuadra el dibujo en el resto. */
  setBottomInset(px: number): void { this.inset = Math.max(0, px); this.resize(); this.fitView(true); }

  /** Centro del dibujo (en casillas), para lanzar chispas desde ahi. */
  get center(): [number, number] { return [this.w / 2, this.h / 2]; }

  /** Revelado final: de casillas a imagen suave con barrido de brillo. */
  revealFinal(ms = 1400): void {
    // Todo pintado de golpe (sin olas ni pops pendientes) y una banda de brillo pequeña que solo se desplaza.
    for (const p of this.pending) this.reveal1(p, false);
    this.pending = []; this.pi = 0; this.pops = [];
    for (let i = 0; i < this.tpl.cells.length; i++) { const c = this.tpl.cells[i]; if (c !== TRANSPARENT) { this.color32[i] = this.pack(this.rgb[c]); this.hl32[i] = 0; } }
    this.colorCv.getContext('2d')!.putImageData(this.colorData, 0, 0);
    this.imgDirty = false;
    clearTimeout(this.lapseTimer); this.lapse = false;
    this.reveal = { t0: performance.now(), dur: ms };
    this.selected = -1;
    this.fitView(true);
    this.request();
  }

  /** Miniatura de lo pintado hasta ahora (para la galeria). */
  thumbnail(size = 96, full = true): string {
    const c = document.createElement('canvas');
    const sc = size / Math.max(this.w, this.h);
    c.width = Math.max(1, Math.round(this.w * sc)); c.height = Math.max(1, Math.round(this.h * sc));
    const t = document.createElement('canvas'); t.width = this.w; t.height = this.h;
    const tg = t.getContext('2d')!; const id = tg.createImageData(this.w, this.h); const d32 = new Uint32Array(id.data.buffer);
    for (let i = 0; i < this.tpl.cells.length; i++) {
      const cidx = this.tpl.cells[i]; if (cidx === TRANSPARENT) continue;
      d32[i] = (full || this.painted[i]) ? this.pack(this.rgb[cidx]) : this.pack([225, 225, 225]);
    }
    tg.putImageData(id, 0, 0);
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  destroy(): void {
    this.destroyed = true;
    clearTimeout(this.lapseTimer);
    cancelAnimationFrame(this.raf);
    if (this.tid) clearTimeout(this.tid);
    this.ro.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown); c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp); c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('wheel', this.onWheel);
  }

  // ------------------------------------------------------------------ nucleo de pintado
  private newId(): string { return `${this.role}-${Date.now().toString(36)}-${this.seq++}`; }

  /** Aplica una operacion al estado logico y programa su animacion. */
  private apply(op: PaintOp, animate: boolean, local: boolean, origin?: number): void {
    this.applied.add(op.id);
    if (this.pi > 0) { this.pending = this.pending.slice(this.pi); this.pi = 0; }
    const now = performance.now();
    const cells = op.c;
    if (op.t === 'p') {
      const todo = cells.filter(i => i >= 0 && i < this.painted.length && !this.painted[i] && this.tpl.cells[i] !== TRANSPARENT);
      if (!todo.length) return;
      const ox = origin ?? todo[0];
      const sorted = animate ? this.byDistance(todo, ox) : todo;
      const maxD = animate ? this.dist(sorted[sorted.length - 1], ox) : 0;
      const per = animate ? Math.min(34, WAVE_MAX_MS / Math.max(1, maxD)) : 0;
      for (const i of sorted) {
        this.painted[i] = 1; this.by[i] = op.by; this.order.push(i);
        this.remainLogical[this.tpl.cells[i]]--;
        this.pending.push({ i, t: animate ? now + this.dist(i, ox) * per : 0, add: true });
      }
      this.paintedLogical += todo.length;
      if (local) this.undoStack.push(op);
    } else {
      const todo = cells.filter(i => this.painted[i]);
      const ox = todo[todo.length - 1];
      const sorted = animate ? this.byDistance(todo, ox).reverse() : todo;
      const per = animate ? Math.min(20, 500 / Math.max(1, todo.length)) : 0;
      sorted.forEach((i, k) => {
        this.painted[i] = 0; this.by[i] = 0;
        this.remainLogical[this.tpl.cells[i]]++;
        this.fired[this.tpl.cells[i]] = false;
        this.pending.push({ i, t: animate ? now + k * per : 0, add: false });
      });
      const gone = new Set(todo);
      this.order = this.order.filter(i => !gone.has(i));
      this.paintedLogical -= todo.length;
      this.completeFired = false;
    }
    this.pending.sort((a, b) => a.t - b.t);
    this.cb.onProgress?.(this.paintedLogical, this.total);
    this.request();
  }

  private dist(i: number, o: number): number { return Math.hypot((i % this.w) - (o % this.w), Math.floor(i / this.w) - Math.floor(o / this.w)); }
  private byDistance(cells: number[], o: number): number[] { return cells.slice().sort((a, b) => this.dist(a, o) - this.dist(b, o)); }

  private flushPendingNow(): void {
    for (const p of this.pending) this.reveal1(p, false);
    this.pending = []; this.pi = 0;
    this.imgDirty = true;
    this.request();
  }

  private reveal1(p: Pending, withPop: boolean): void {
    if (this.lapse) withPop = false;
    const c = this.tpl.cells[p.i];
    if (p.add && !this.shown[p.i]) {
      this.shown[p.i] = 1; this.remainShown[c]--; this.shownCount++;
      if (withPop && this.pops.length < 90) this.pops.push({ i: p.i, t0: performance.now() });
      if (withPop && this.sparks.length < SPARK_MAX && (this.pi % 2 === 0 || this.w * this.h < 1800)) {
        const now = performance.now(), n = this.s > 9 ? 3 : 2;
        for (let k = 0; k < n; k++) this.sparks.push({ x: (p.i % this.w) + 0.5, y: Math.floor(p.i / this.w) + 0.5, vx: (Math.random() - 0.5) * 0.007, vy: -(0.002 + Math.random() * 0.007), t0: now, life: 420 + Math.random() * 380, c, white: k === 1 });
      }
      this.color32[p.i] = this.pack(this.rgb[c]); this.hl32[p.i] = 0;
      this.putDirty = true;
      if (withPop) this.cb.onPaintTick?.(this.pops.length);
      if (this.remainShown[c] === 0 && !this.fired[c]) { this.fired[c] = true; if (!this.silent) this.cb.onColorComplete?.(c); }
      if (this.shownCount === this.total && !this.completeFired && this.paintedLogical === this.total) {
        this.completeFired = true; if (!this.silent) this.cb.onComplete?.();
      }
    } else if (!p.add && this.shown[p.i]) {
      this.shown[p.i] = 0; this.remainShown[c]++; this.shownCount--;
      this.imgDirty = true; this.rebuildCell(p.i);
    }
  }

  private pack(c: [number, number, number]): number { return (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; }

  private rebuildCell(i: number): void {
    const c = this.tpl.cells[i];
    if (c === TRANSPARENT) { this.color32[i] = 0; this.hl32[i] = 0; return; }
    if (this.shown[i]) { this.color32[i] = this.pack(this.rgb[c]); this.hl32[i] = 0; return; }
    const gray = this.grayOf[c], isSel = c === this.selected;
    const g = this.selected >= 0 && !isSel ? Math.round(gray + (246 - gray) * 0.4) : isSel ? Math.max(120, gray - 28) : gray;
    this.color32[i] = this.pack([g, g, g]);
    this.hl32[i] = isSel ? this.pack([255, 226, 110]) : 0;
  }

  private rebuildAll(): void {
    for (let i = 0; i < this.tpl.cells.length; i++) this.rebuildCell(i);
    this.colorCv.getContext('2d')!.putImageData(this.colorData, 0, 0);
    this.hlCv.getContext('2d')!.putImageData(this.hlData, 0, 0);
    this.imgDirty = false; this.putDirty = false;
  }

  // ------------------------------------------------------------------ atlas de numeros
  private buildAtlas(): void {
    const n = Math.max(1, this.tpl.palette.length), cols = 8, rows = Math.ceil(n / cols);
    const mkAtlas = (color: string, bold: boolean) => {
      const cv = document.createElement('canvas'); cv.width = cols * ATLAS; cv.height = rows * ATLAS;
      const g = cv.getContext('2d')!;
      g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `${bold ? 'bold ' : ''}${n > 9 ? 30 : 36}px ui-monospace, monospace`;
      for (let i = 0; i < n; i++) g.fillText(String(i + 1), (i % cols) * ATLAS + ATLAS / 2, Math.floor(i / cols) * ATLAS + ATLAS / 2 + 2);
      return cv;
    };
    this.atlasGray = mkAtlas('rgba(70,60,95,.62)', false);
    this.atlasDark = mkAtlas('#241a3d', true);
  }

  // ------------------------------------------------------------------ vista / camara
  private resize(first = false): void {
    this.W = this.canvas.clientWidth; this.H = this.canvas.clientHeight;
    // tope de resolucion: 2x y como mucho ~2,2 millones de pixeles (los fillRect/drawImage a pantalla completa cuestan por pixel)
    this.dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(2.2e6 / Math.max(1, this.W * this.H)));
    const cw = Math.round(this.W * this.dpr), ch = Math.round(this.H * this.dpr);
    if (this.canvas.width !== cw) this.canvas.width = cw;      // reasignar el tamaño vacia y realoja el lienzo: solo si cambia de verdad
    if (this.canvas.height !== ch) this.canvas.height = ch;
    this.fitS = Math.min((this.W - 20) / this.w, (this.H - this.inset - 20) / this.h);
    if (first || this.s < this.fitS * 0.5) this.fitView(false);
    else this.clamp();
    this.dirty = true; this.request();
  }

  private fitView(animate: boolean): void {
    const to: [number, number, number] = [(this.W - this.w * this.fitS) / 2, (this.H - this.inset - this.h * this.fitS) / 2, this.fitS];
    if (animate && this.W) this.anim = { t0: performance.now(), dur: 500, from: [this.ox, this.oy, this.s], to };
    else { this.ox = to[0]; this.oy = to[1]; this.s = to[2]; }
    this.dirty = true; this.request();
  }

  private clamp(): void {
    this.s = Math.max(this.fitS * 0.85, Math.min(64, this.s));
    const iw = this.w * this.s, ih = this.h * this.s, m = 60;
    this.ox = iw <= this.W ? (this.W - iw) / 2 : Math.max(this.W - iw - m, Math.min(m, this.ox));
    const H = this.H - this.inset;   // zona visible (sin la hoja de resultado)
    this.oy = ih <= H ? (H - ih) / 2 : Math.max(H - ih - m, Math.min(m, this.oy));
  }

  private flyTo(cx: number, cy: number, scale: number): void {
    const s = Math.min(64, scale);
    this.anim = { t0: performance.now(), dur: 450, from: [this.ox, this.oy, this.s], to: [this.W / 2 - cx * s, this.H / 2 - cy * s, s] };
    this.request();
  }

  /** Centra la camara en el color elegido (en su casilla mas cercana) sin acercar demasiado. */
  private focusColor(c: number): void {
    if (this.remainLogical[c] === 0) return;
    const cx = (this.W / 2 - this.ox) / this.s, cy = (this.H / 2 - this.oy) / this.s;
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.tpl.cells.length; i++) {
      if (this.tpl.cells[i] !== c || this.painted[i]) continue;
      const d = (i % this.w - cx) ** 2 + (Math.floor(i / this.w) - cy) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const vis = this.visibleRange();
    if (best >= 0) {
      const x = best % this.w, y = Math.floor(best / this.w);
      if (x < vis.x0 || x > vis.x1 || y < vis.y0 || y > vis.y1) this.flyTo(x + 0.5, y + 0.5, this.s);
    }
  }

  private visibleRange() {
    return { x0: Math.max(0, Math.floor(-this.ox / this.s)), y0: Math.max(0, Math.floor(-this.oy / this.s)),
             x1: Math.min(this.w - 1, Math.ceil((this.W - this.ox) / this.s)), y1: Math.min(this.h - 1, Math.ceil((this.H - this.oy) / this.s)) };
  }

  private cellAt(px: number, py: number): number {
    const x = Math.floor((px - this.ox) / this.s), y = Math.floor((py - this.oy) / this.s);
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x;
  }

  // ------------------------------------------------------------------ gestos
  private pos(e: PointerEvent) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  private onDown = (e: PointerEvent): void => {
    if (this.reveal) return;
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.pos(e);
    this.pointers.set(e.pointerId, p);
    this.inertia = { vx: 0, vy: 0 }; this.anim = null;
    const now = performance.now();
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.gesture = { kind: 'pinch', startX: p.x, startY: p.y, t0: now, moved: true, lastX: (a.x + b.x) / 2, lastY: (a.y + b.y) / 2, lastT: now, vx: 0, vy: 0, pinchD: Math.hypot(a.x - b.x, a.y - b.y) };
      return;
    }
    const idx = this.cellAt(p.x, p.y);
    const paintDrag = (this.mode === 'classic' || this.mode === 'zone') && idx >= 0 && this.tpl.cells[idx] === this.selected && !this.painted[idx];
    this.gesture = { kind: paintDrag ? 'paint' : 'pan', startX: p.x, startY: p.y, t0: now, moved: false, lastX: p.x, lastY: p.y, lastT: now, vx: 0, vy: 0 };
    if (paintDrag) this.paintCells(this.mode === 'zone' ? this.zoneOf(idx) : [idx], idx);
  };

  private onMove = (e: PointerEvent): void => {
    const gst = this.gesture;
    if (!gst || !this.pointers.has(e.pointerId)) return;
    const p = this.pos(e);
    this.pointers.set(e.pointerId, p);
    const now = performance.now();
    if (gst.kind === 'pinch' && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ratio = d / (gst.pinchD || d);
      const ns = Math.max(this.fitS * 0.85, Math.min(64, this.s * ratio));
      const k = ns / this.s;
      this.ox = mx - (mx - this.ox) * k + (mx - gst.lastX);
      this.oy = my - (my - this.oy) * k + (my - gst.lastY);
      this.s = ns; gst.pinchD = d; gst.lastX = mx; gst.lastY = my;
      this.clamp(); this.request();
      return;
    }
    if (gst.kind === 'paint') {
      const idx = this.cellAt(p.x, p.y);
      if (idx >= 0 && this.tpl.cells[idx] === this.selected && !this.painted[idx]) this.paintCells(this.mode === 'zone' ? this.zoneOf(idx) : [idx], idx);
      gst.moved = true;
      return;
    }
    const dx = p.x - gst.lastX, dy = p.y - gst.lastY;
    if (!gst.moved && Math.hypot(p.x - gst.startX, p.y - gst.startY) < 7) return;
    gst.moved = true;
    const dt = Math.max(1, now - gst.lastT);
    gst.vx = 0.8 * gst.vx + 0.2 * (dx / dt); gst.vy = 0.8 * gst.vy + 0.2 * (dy / dt);
    this.ox += dx; this.oy += dy; gst.lastX = p.x; gst.lastY = p.y; gst.lastT = now;
    this.clamp(); this.request();
  };

  private onUp = (e: PointerEvent): void => {
    const gst = this.gesture;
    this.pointers.delete(e.pointerId);
    if (!gst) return;
    if (this.pointers.size > 0) {
      if (gst.kind === 'pinch') {
        const rem = [...this.pointers.values()][0];
        this.gesture = { ...gst, kind: 'pan', moved: true, lastX: rem.x, lastY: rem.y, lastT: performance.now(), vx: 0, vy: 0 };
      }
      return;
    }
    this.gesture = null;
    const p = this.pos(e);
    const quick = performance.now() - gst.t0 < 600;
    if (gst.kind === 'pan' && !gst.moved && quick) { this.tap(p.x, p.y); return; }
    if (gst.kind === 'pan' && gst.moved && performance.now() - gst.lastT < 90) {
      this.inertia = { vx: gst.vx, vy: gst.vy };
      if (Math.hypot(gst.vx, gst.vy) > 0.05) this.request();
    }
    if (gst.kind === 'paint') { /* la ola de color completo la gestiona paintCells */ }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const ns = Math.max(this.fitS * 0.85, Math.min(64, this.s * Math.exp(-e.deltaY * 0.0015))), k = ns / this.s;
    this.ox = mx - (mx - this.ox) * k; this.oy = my - (my - this.oy) * k; this.s = ns;
    this.clamp(); this.request();
  };

  private tap(x: number, y: number): void {
    const idx = this.cellAt(x, y);
    if (idx < 0) return;
    const c = this.tpl.cells[idx];
    if (c === TRANSPARENT || this.painted[idx]) return;
    if (c !== this.selected) { this.select(c); this.cb.onWrongTap?.(); return; }
    if (this.mode === 'classic') this.paintCells([idx], idx);
    else if (this.mode === 'zone') this.paintCells(this.zoneOf(idx), idx);
    else this.paintCells(this.unpaintedOf(c), idx);   // modo "por color": toda la ola desde la casilla tocada
  }

  /** Zona: casillas sin pintar del mismo color unidas por arriba/abajo/izquierda/derecha a la tocada. */
  zoneOf(start: number): number[] {
    const c = this.tpl.cells[start], out: number[] = [], seen = new Uint8Array(this.tpl.cells.length), stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      out.push(i);
      const x = i % this.w, y = (i / this.w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < this.w - 1 ? i + 1 : -1, y > 0 ? i - this.w : -1, y < this.h - 1 ? i + this.w : -1]) {
        if (j >= 0 && !seen[j] && this.tpl.cells[j] === c && !this.painted[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    return out;
  }

  private unpaintedOf(c: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.tpl.cells.length; i++) if (this.tpl.cells[i] === c && !this.painted[i]) out.push(i);
    return out;
  }

  private paintCells(cells: number[], origin: number): void {
    const op: PaintOp = { id: this.newId(), t: 'p', c: cells, by: this.role, ts: Date.now() };
    this.apply(op, true, true, origin);
    this.cb.onOp?.(op);
  }

  // ------------------------------------------------------------------ render
  private request(): void {
    this.dirty = true;
    if (this.tid) { clearTimeout(this.tid); this.tid = 0; }
    if (!this.raf && !this.destroyed) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    this.raf = 0;
    if (this.destroyed) return;
    // animacion de camara
    if (this.anim) {
      const t = Math.min(1, (now - this.anim.t0) / this.anim.dur), e = 1 - (1 - t) ** 3;
      this.ox = this.anim.from[0] + (this.anim.to[0] - this.anim.from[0]) * e;
      this.oy = this.anim.from[1] + (this.anim.to[1] - this.anim.from[1]) * e;
      this.s = this.anim.from[2] + (this.anim.to[2] - this.anim.from[2]) * e;
      if (t >= 1) { this.anim = null; this.clamp(); }
    }
    // inercia
    if (Math.abs(this.inertia.vx) + Math.abs(this.inertia.vy) > 0.02 && !this.gesture) {
      const dt = Math.min(32, now - (this.lastDraw || now));
      this.ox += this.inertia.vx * dt; this.oy += this.inertia.vy * dt;
      const f = Math.pow(0.94, dt / 16); this.inertia.vx *= f; this.inertia.vy *= f;
      this.clamp();
    }
    // reveals pendientes
    while (this.pi < this.pending.length && this.pending[this.pi].t <= now) { this.reveal1(this.pending[this.pi], this.pending[this.pi].t > 0); this.pi++; }
    if (this.pi > 256 && this.pi === this.pending.length) { this.pending = []; this.pi = 0; }
    if (this.lapse && !this.anim && now - this.lastDraw < 30) { this.raf = requestAnimationFrame(this.frame); return; }   // el time-lapse no necesita mas de ~30 fps
    if (this.imgDirty) this.rebuildAllIfNeeded(); else if (this.putDirty) this.putAll();
    this.draw(now);
    this.lastDraw = now;

    const animating = this.anim || this.pi < this.pending.length || this.pops.length || this.sparks.length > 0 ||
      Math.abs(this.inertia.vx) + Math.abs(this.inertia.vy) > 0.02 || (this.hintCell >= 0 && now < this.hintUntil);
    if (animating) this.raf = requestAnimationFrame(this.frame);
    else if (this.selected >= 0 && !this.reveal) this.tid = window.setTimeout(() => { this.tid = 0; if (!document.hidden) this.request(); else this.frameLater(); }, 66); // pulso del color elegido / destellos del final
  };

  /** Pestaña oculta: no se dibuja, pero se sigue comprobando para retomar al volver. */
  private frameLater(): void { this.tid = window.setTimeout(() => { this.tid = 0; if (!document.hidden) this.request(); else this.frameLater(); }, 500); }

  /** Solo sube a los lienzos pequeños lo ya escrito (no recalcula las casillas). */
  private putAll(): void {
    this.colorCv.getContext('2d')!.putImageData(this.colorData, 0, 0);
    this.hlCv.getContext('2d')!.putImageData(this.hlData, 0, 0);
    this.putDirty = false;
  }

  private rebuildAllIfNeeded(): void {
    // Las celdas ya actualizadas una a una (reveal1) estan al dia; al cambiar seleccion se rehace todo.
    this.rebuildAll();
  }

  private draw(now: number): void {
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    const iw = this.w * this.s, ih = this.h * this.s;
    g.imageSmoothingEnabled = false;
    // papel
    if (!this.lapse) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(this.ox + 4, this.oy + 5, iw, ih); }
    g.fillStyle = '#fffdf6'; g.fillRect(this.ox, this.oy, iw, ih);

    if (this.reveal) { this.drawReveal(now, iw, ih); return; }

    g.drawImage(this.colorCv, this.ox, this.oy, iw, ih);
    if (this.selected >= 0) {
      g.globalAlpha = 0.28 + 0.42 * (0.5 + 0.5 * Math.sin(now / 240));
      g.drawImage(this.hlCv, this.ox, this.oy, iw, ih);
      g.globalAlpha = 1;
    }
    const v = this.visibleRange();
    if (this.s >= 9 && !this.lapse) {
      // cuadricula
      g.strokeStyle = 'rgba(40,30,70,.16)'; g.lineWidth = 1; g.beginPath();
      for (let x = v.x0; x <= v.x1 + 1; x++) { const px = Math.round(this.ox + x * this.s) + 0.5; g.moveTo(px, Math.max(0, this.oy + v.y0 * this.s)); g.lineTo(px, Math.min(this.H, this.oy + (v.y1 + 1) * this.s)); }
      for (let y = v.y0; y <= v.y1 + 1; y++) { const py = Math.round(this.oy + y * this.s) + 0.5; g.moveTo(Math.max(0, this.ox + v.x0 * this.s), py); g.lineTo(Math.min(this.W, this.ox + (v.x1 + 1) * this.s), py); }
      g.stroke();
      // numeros desde el atlas
      const sz = this.s * 0.62, off = (this.s - sz) / 2, cols = 8;
      g.imageSmoothingEnabled = true;
      for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
        const i = y * this.w + x, c = this.tpl.cells[i];
        if (c === TRANSPARENT || this.shown[i]) continue;
        g.drawImage(c === this.selected ? this.atlasDark : this.atlasGray, (c % cols) * ATLAS, Math.floor(c / cols) * ATLAS, ATLAS, ATLAS, this.ox + x * this.s + off, this.oy + y * this.s + off, sz, sz);
      }
      g.imageSmoothingEnabled = false;
    }
    // "pops" de las casillas recien pintadas
    if (this.pops.length) {
      this.pops = this.pops.filter(p => now - p.t0 < 280);
      for (const p of this.pops) {
        const t = (now - p.t0) / 280, k = 1 + 0.45 * Math.sin(Math.PI * t), c = this.tpl.cells[p.i];
        const cx = this.ox + ((p.i % this.w) + 0.5) * this.s, cy = this.oy + (Math.floor(p.i / this.w) + 0.5) * this.s, sz = this.s * k;
        const col = this.popStyle[c] ??= `rgb(${this.rgb[c].join(',')})`;
        g.globalAlpha = 0.28 * (1 - t); g.fillStyle = col; g.fillRect(cx - sz * 0.95, cy - sz * 0.95, sz * 1.9, sz * 1.9);   // halo de color
        g.globalAlpha = 1; g.fillStyle = col; g.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
        g.globalAlpha = 0.55 * (1 - t); g.fillStyle = '#fff'; g.fillRect(cx - sz / 2, cy - sz / 2, sz, sz); g.globalAlpha = 1;
      }
    }
    this.drawSparks(now);
    // pista
    if (this.hintCell >= 0 && now < this.hintUntil) {
      const cx = this.ox + ((this.hintCell % this.w) + 0.5) * this.s, cy = this.oy + (Math.floor(this.hintCell / this.w) + 0.5) * this.s;
      const r = this.s * (0.9 + 0.5 * Math.abs(Math.sin(now / 220)));
      g.strokeStyle = '#ff3d8b'; g.lineWidth = 3; g.strokeRect(cx - r / 2, cy - r / 2, r, r);
    }
  }

  private sparkCols: string[] = [];
  /** Color de la chispa: el del dibujo, un poco mas claro (para que se vea sobre el papel). */
  private sparkStyle(c: number): string {
    return this.sparkCols[c] ??= `rgb(${this.rgb[c].map(v => Math.min(255, Math.round(v + (255 - v) * 0.18))).join(',')})`;
  }
  private drawSparks(now: number): void {
    if (!this.sparks.length) return;
    const g = this.g, G = 0.000028, px = Math.max(2, Math.round(this.s * 0.2));
    this.sparks = this.sparks.filter(k => now - k.t0 < k.life);
    // se agrupan por color y por 4 niveles de transparencia: un solo fillStyle/globalAlpha por grupo (mucho mas barato que uno por chispa)
    const groups = new Map<string, number[]>();
    for (const k of this.sparks) {
      const age = now - k.t0, t = age / k.life;
      const x = this.ox + (k.x + k.vx * age) * this.s, y = this.oy + (k.y + k.vy * age + 0.5 * G * age * age) * this.s;
      const z = Math.max(2, Math.ceil(px * (1 - t * 0.5))), lvl = Math.max(1, Math.min(4, Math.ceil(Math.min(1, 1.6 * (1 - t)) * 4)));
      const key = (k.white ? '#fff' : this.sparkStyle(k.c)) + '|' + lvl;
      let arr = groups.get(key); if (!arr) groups.set(key, arr = []);
      arr.push(Math.round(x - z / 2), Math.round(y - z / 2), z);
    }
    groups.forEach((arr, key) => {
      const [col, lvl] = key.split('|');
      g.fillStyle = col; g.globalAlpha = Number(lvl) / 4;
      g.beginPath();
      for (let i = 0; i < arr.length; i += 3) g.rect(arr[i], arr[i + 1], arr[i + 2], arr[i + 2]);
      g.fill();
    });
    g.globalAlpha = 1;
  }

  /** Obra terminada: el lienzo se dibuja UNA vez (arte + marco); el brillo y los destellos son capas CSS encima. */
  private drawReveal(now: number, iw: number, ih: number): void {
    const g = this.g;
    g.drawImage(this.colorCv, this.ox, this.oy, iw, ih);
    if (this.authorView && this.authorCv) { g.globalAlpha = 0.58; g.drawImage(this.authorCv, this.ox, this.oy, iw, ih); g.globalAlpha = 1; }
    // marco de galeria: oscuro por dentro, dorado por fuera y esquinas marcadas
    g.strokeStyle = '#3a2a8a'; g.lineWidth = 4; g.strokeRect(this.ox - 2, this.oy - 2, iw + 4, ih + 4);
    g.strokeStyle = '#ffd86b'; g.lineWidth = 3; g.strokeRect(this.ox - 7.5, this.oy - 7.5, iw + 15, ih + 15);
    g.fillStyle = '#fff3b0'; for (const [cx, cy] of [[0, 0], [iw, 0], [0, ih], [iw, ih]]) g.fillRect(this.ox + cx - 10, this.oy + cy - 10, 6, 6);
    this.drawSparks(now);
  }
}
