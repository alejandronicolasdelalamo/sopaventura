import { mulberry32 } from '../core/rng';
import { TRANSPARENT, type Template } from './model';

/**
 * Sprites de entorno en estilo "videojuego": formas limpias, sombreado por cubos de 3 tonos (luz arriba-izquierda),
 * brillos puntuales, grupos de hojas bien definidos y contorno oscuro. Sin ruido ni tramado.
 * Rampa de cada material: [contorno, sombra, medio, luz, brillo].
 */
type Ramp = [string, string, string, string, string];

const GREEN: Ramp = ['#0f2f1c', '#1d5a2c', '#2f8a3c', '#56b24a', '#a0e070'];
const GREEN2: Ramp = ['#10301f', '#1f6034', '#37923f', '#62bd4c', '#b6f080'];
const AUTUMN: Ramp = ['#4a1a10', '#9a3a14', '#d4621c', '#f09a2c', '#ffd868'];
const AUTUMN2: Ramp = ['#4a2010', '#a8481a', '#d87a22', '#f2b13a', '#ffe08a'];
const CHERRY: Ramp = ['#4a1a40', '#b04a86', '#e878b0', '#ffa8d0', '#ffe4f0'];
const NIGHT: Ramp = ['#080c3a', '#1a2a7a', '#3a5ac8', '#6a92f0', '#b8d4ff'];
const CANDY: Ramp = ['#6a1a52', '#c04a9a', '#f27ac4', '#ffaee2', '#fff2fa'];
const PINE: Ramp = ['#08261a', '#124a2c', '#1f7040', '#379a54', '#7ad68a'];
const TRUNK: Ramp = ['#2a140c', '#4a2814', '#6e3e1e', '#96602e', '#c08a4c'];
const BIRCHT: Ramp = ['#2c2a38', '#8a8698', '#c8c4d4', '#eceaf4', '#ffffff'];
const STONE: Ramp = ['#1c1a30', '#403a62', '#6a6490', '#9a96bc', '#cfcce6'];
const MOSS: Ramp = ['#10301a', '#26602c', '#3e8a3a', '#68b04a', '#a8e070'];
const SNOW: Ramp = ['#3a4a7a', '#9ab0dc', '#d4e2fa', '#f2f8ff', '#ffffff'];
const REDCAP: Ramp = ['#4a0a1a', '#a01a3a', '#d83a50', '#ff6a78', '#ffc0c8'];
const BLUECAP: Ramp = ['#0a1a4a', '#2a46b0', '#4a78e8', '#80b0ff', '#d0e4ff'];
const PINKCAP: Ramp = ['#5a1a46', '#b84a96', '#f080c8', '#ffb0e4', '#ffe8f6'];
const CRYS: Ramp = ['#10206a', '#2a6ad0', '#4ab4f0', '#9ae8ff', '#ffffff'];
const CRYSP: Ramp = ['#3a1070', '#8a3ad8', '#c070f8', '#e8b0ff', '#ffffff'];
const CORAL: Ramp = ['#5a1030', '#c83a5a', '#f2688a', '#ff9ab0', '#ffd8e0'];
const CORAL2: Ramp = ['#2a1060', '#6a3ad0', '#9a68f0', '#c8a8ff', '#f0e4ff'];
const KELP: Ramp = ['#06241c', '#0f5a3a', '#1c8a52', '#40b872', '#90e8a8'];
const PALM: Ramp = ['#0a2c18', '#17642e', '#2a9a44', '#52c860', '#a4f090'];
const STEM: Ramp = ['#5a3a30', '#b89080', '#e6c8b4', '#f8e6d6', '#ffffff'];

/** Lienzo de indices a colores (strings) con utilidades de dibujo. */
class Px {
  c: (string | null)[];
  constructor(public w: number, public h: number) { this.c = new Array(w * h).fill(null); }
  set(x: number, y: number, col: string | null): void { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col; }
  get(x: number, y: number): string | null { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.c[y * this.w + x] : null; }
  rect(x: number, y: number, w: number, h: number, col: string): void { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col); }
  line(x1: number, y1: number, x2: number, y2: number, col: string, th = 1): void {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= n; i++) { const x = x1 + ((x2 - x1) * i) / n, y = y1 + ((y2 - y1) * i) / n; for (let a = 0; a < th; a++) for (let b = 0; b < th; b++) this.set(x + a - Math.floor(th / 2), y + b - Math.floor(th / 2), col); }
  }
  /** Rodea la silueta con el color de contorno (y deja la figura 1 px mas grande por cada lado). */
  outline(col: string): void {
    const src = this.c.slice();
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < this.w && y < this.h ? src[y * this.w + x] : null);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src[y * this.w + x]) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) this.c[y * this.w + x] = col;
    }
  }
}

/** Pixel dentro de un circulo sombreado a 3 tonos (luz arriba-izquierda) con brillo en el punto mas iluminado. */
function blob(g: Px, cx: number, cy: number, r: number, R: Ramp, opts: { rim?: boolean; hi?: boolean } = {}): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r, d = u * u + v * v;
    if (d > 1) continue;
    const light = -(u * 0.62 + v * 0.78);
    let col = light > 0.34 ? R[3] : light < -0.22 ? R[1] : R[2];
    if (opts.hi !== false && light > 0.78 && d < 0.55) col = R[4];
    if (opts.rim !== false && d > 0.7 && v > 0.15) col = R[1];     // el borde inferior del grupo queda en sombra: separa los grupos
    g.set(x, y, col);
  }
}

function toTemplate(g: Px, id: string, name: string): Template {
  const pal: string[] = [], idx = new Map<string, number>();
  const cells = new Uint8Array(g.w * g.h).fill(TRANSPARENT);
  g.c.forEach((col, i) => { if (!col) return; let k = idx.get(col); if (k === undefined) { k = pal.length; pal.push(col); idx.set(col, k); } cells[i] = k; });
  return { id, name, w: g.w, h: g.h, palette: pal, cells, price: 0, source: 'builtin' };
}

function trunk(g: Px, cx: number, baseY: number, topY: number, tw: number, R: Ramp = TRUNK): void {
  for (let y = topY; y <= baseY; y++) {
    const flare = y > baseY - 3 ? Math.ceil((y - (baseY - 3)) / 1.5) : 0;
    const x0 = Math.round(cx - tw / 2) - (y > baseY - 3 ? Math.min(2, flare) : 0), x1 = Math.round(cx + tw / 2) + (y > baseY - 3 ? Math.min(2, flare) : 0);
    for (let x = x0; x < x1; x++) g.set(x, y, x === x0 ? R[3] : x >= x1 - Math.max(1, Math.round(tw / 3)) ? R[1] : R[2]);
    if ((y + Math.round(cx)) % 5 === 0 && tw > 2) g.set(x0 + 1, y, R[1]);   // muesca de corteza
  }
}

/** Arbol de copa redonda hecha de grupos de hojas. */
function tree(id: string, name: string, w: number, h: number, crown: Ramp, seed: number, o: { trunkR?: Ramp; tall?: number; dots?: string[] } = {}): Template {
  const g = new Px(w, h), rng = mulberry32(seed);
  const cx = w / 2, ch = Math.round(h * (o.tall ? 0.72 : 0.64)), tw = Math.max(3, Math.round(w * 0.1));
  trunk(g, cx, h - 2, Math.round(h * 0.5), tw, o.trunkR ?? TRUNK);
  const rx = w * 0.47, ry = ch * 0.47, cy = ch * 0.5 + 1;
  // grupos de hojas colocados a mano alrededor del centro: arriba, laterales, centro y abajo
  const lay: [number, number, number][] = [[0, -0.5, 0.5], [-0.58, -0.2, 0.46], [0.58, -0.2, 0.46], [0, 0.02, 0.54], [-0.52, 0.34, 0.44], [0.52, 0.34, 0.44], [0, 0.5, 0.44]];
  if (w >= 40) lay.push([-0.86, 0.08, 0.34], [0.86, 0.08, 0.34], [-0.3, 0.55, 0.34], [0.3, 0.55, 0.34]);
  const blobs: { x: number; y: number; r: number }[] = lay.map(([ax, ay, ar]) => ({ x: cx + ax * rx + (rng() - 0.5) * 1.5, y: cy + ay * ry + (rng() - 0.5) * 1.5, r: Math.max(4, ar * Math.min(rx * 1.05, ry * 1.3)) }));
  blobs.sort((p, q) => p.y - q.y);   // los de abajo se dibujan los ultimos (delante)
  blobs.forEach(b => blob(g, b.x, b.y, b.r, crown));
  if (o.dots) for (let i = 0; i < 9; i++) { const b = blobs[Math.floor(rng() * blobs.length)]; g.set(b.x + (rng() - 0.5) * b.r, b.y + (rng() - 0.4) * b.r, o.dots[i % o.dots.length]); }
  g.outline(crown[0]);
  return toTemplate(g, id, name);
}

/** Pino: pisos triangulares con una mitad iluminada y la otra en sombra; con nieve opcional. */
function pine(id: string, name: string, w: number, h: number, R: Ramp, snow: boolean, tiers: number): Template {
  const g = new Px(w, h), cx = w / 2;
  trunk(g, cx, h - 2, h - 7, 3);
  const tierH = Math.floor((h - 6) / tiers) + 3;
  for (let t = tiers - 1; t >= 0; t--) {
    const y0 = 1 + t * Math.floor((h - 10) / tiers), y1 = Math.min(h - 6, y0 + tierH), half = (w / 2 - 1) * (0.42 + 0.58 * ((t + 1) / tiers));
    for (let y = y0; y <= y1; y++) {
      const k = (y - y0) / Math.max(1, y1 - y0), hw = Math.max(0.5, half * k);
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw - 0.5); x++) {
        const left = x < cx, edge = Math.abs(x + 0.5 - cx) > hw - 1.2;
        let col = left ? (edge ? R[3] : R[2]) : (edge ? R[1] : R[1]);
        if (!left && !edge) col = R[2] === col ? R[1] : R[1];
        if (left && !edge && k > 0.55) col = R[2];
        if (snow && k < 0.4 + (t === 0 ? 0.15 : 0.05) && ((x + y) % 7 !== 0)) col = left ? SNOW[3] : SNOW[2];
        if (snow && k >= 0.4 && k < 0.5 && (x % 3 === 0)) col = SNOW[1];
        if (y === y1) col = snow ? SNOW[1] : R[1];                                     // faldon en sombra
        g.set(x, y, col);
      }
    }
  }
  g.outline(R[0]);
  return toTemplate(g, id, name);
}

function palm(id: string, name: string, w: number, h: number): Template {
  const g = new Px(w, h), bx = w * 0.45, top: [number, number] = [w * 0.56, h * 0.36];
  // tronco curvo con anillos
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, x = bx + (top[0] - bx) * t * t + (1 - t) * 0, y = h - 2 + (top[1] - (h - 2)) * t;
    const th = 3 - Math.round(t);
    for (let a = 0; a < th; a++) g.set(x + a, y, a === 0 ? TRUNK[3] : a === th - 1 ? TRUNK[1] : TRUNK[2]);
    if (i % 4 === 0) g.set(x, y, TRUNK[1]);
  }
  const [tx, ty] = top;
  const fronds: [number, number, number][] = [[-1, -0.35, 17], [1, -0.45, 17], [-0.9, 0.2, 16], [0.95, 0.15, 16], [0, -1, 11], [-0.5, -0.85, 14], [0.55, -0.9, 14]];
  for (const [dx, dy, len] of fronds) {
    let px = tx, py = ty;
    for (let s = 0; s < len; s++) {
      const t = s / len;
      px += dx * (1 - t * 0.2); py += dy * (1 - t) + t * 0.9;
      const col = t < 0.5 ? PALM[3] : PALM[2];
      g.set(px, py, col); g.set(px, py + 1, PALM[2]); g.set(px, py + 2, PALM[1]);
      if (s % 2 === 0 && s > 1) { g.set(px, py - 1, PALM[3]); g.set(px + (dx < 0 ? -1 : 1), py + 1, PALM[1]); g.set(px + (dx < 0 ? -1 : 1), py + 2, PALM[1]); }
    }
  }
  g.rect(Math.round(tx) - 1, Math.round(ty), 3, 2, TRUNK[1]);
  g.set(tx - 2, ty + 3, '#7a4a20'); g.set(tx + 2, ty + 3, '#7a4a20'); g.set(tx, ty + 4, '#7a4a20');   // cocos
  g.outline(PALM[0]);
  return toTemplate(g, id, name);
}

function bush(id: string, name: string, w: number, h: number, R: Ramp, seed: number, dots?: string[]): Template {
  const g = new Px(w, h), rng = mulberry32(seed), n = Math.max(3, Math.round(w / 7));
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), r = h * (0.36 + rng() * 0.12 + (1 - Math.abs(k - 0.5) * 1.4) * 0.12);
    blob(g, 3 + k * (w - 6), h - r - 1 - rng() * 2, r, R);
  }
  if (dots) for (let i = 0; i < 7; i++) { const x = 3 + rng() * (w - 6), y = h * 0.3 + rng() * h * 0.45; g.set(x, y, dots[i % dots.length]); if (rng() < 0.5) g.set(x + 1, y, dots[i % dots.length]); }
  g.outline(R[0]);
  return toTemplate(g, id, name);
}

/** Roca con facetas: cara superior clara, lateral izquierdo medio y derecho oscuro. */
function rock(id: string, name: string, w: number, h: number, R: Ramp, seed: number, o: { snow?: boolean; moss?: boolean } = {}): Template {
  const g = new Px(w, h), rng = mulberry32(seed);
  const pts: [number, number][] = [[0.04, 0.95], [0.0, 0.62], [0.16, 0.26], [0.44, 0.04], [0.7, 0.1], [0.94, 0.4], [1, 0.72], [0.9, 0.96]];
  const P = pts.map(([x, y]) => [x * (w - 1) + (rng() - 0.5), y * (h - 1) + (rng() - 0.5)] as [number, number]);
  const inside = (x: number, y: number) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const cx = w * 0.5;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x + 0.5, y + 0.5)) continue;
    const top = y < h * 0.34 + (x < cx ? (cx - x) * 0.3 : (x - cx) * 0.55);
    let col = top ? R[3] : x < cx * 0.85 ? R[2] : x > w * 0.62 ? R[1] : R[2];
    if (y > h * 0.86) col = R[1];
    if (top && y < h * 0.2 && x < cx) col = R[4];
    if (o.snow && top) col = y < h * 0.22 ? SNOW[4] : SNOW[2];
    if (o.moss && top && (x * 3 + y) % 5 < 2) col = MOSS[2 + (x % 2)];
    g.set(x, y, col);
  }
  // grieta
  g.line(Math.round(w * 0.5), Math.round(h * 0.42), Math.round(w * 0.42), Math.round(h * 0.66), R[1]);
  g.outline(R[0]);
  return toTemplate(g, id, name);
}

function rocks(id: string, name: string, R: Ramp, snow = false): Template {
  const a = rock('a', '', 18, 14, R, 3, { snow }), b = rock('b', '', 12, 10, R, 7, { snow }), c = rock('c', '', 9, 8, R, 11, { snow });
  const g = new Px(34, 16);
  const stamp = (t: Template, ox: number, oy: number) => { for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) { const k = t.cells[y * t.w + x]; if (k !== TRANSPARENT) g.set(ox + x, oy + y, t.palette[k]); } };
  stamp(a, 9, 2); stamp(b, 0, 6); stamp(c, 25, 8);
  return toTemplate(g, id, name);
}

function flowers(id: string, name: string, w: number, h: number, cols: string[], seed: number): Template {
  const g = new Px(w, h), rng = mulberry32(seed);
  const n = Math.max(3, Math.round(w / 4));
  for (let i = 0; i < n; i++) {
    const x = 2 + (i / (n - 1)) * (w - 5), top = 2 + rng() * (h * 0.4), col = cols[i % cols.length];
    g.line(x, h - 1, x + (rng() - 0.5) * 2, top + 2, GREEN[2]);
    g.set(x - 2, h - 3 - rng() * 2, GREEN[3]); g.set(x + 2, h - 4 - rng() * 2, GREEN[3]);
    g.set(x, top, '#ffe36a');
    g.set(x - 1, top, col); g.set(x + 1, top, col); g.set(x, top - 1, col); g.set(x, top + 1, col);
  }
  g.rect(0, h - 2, w, 1, GREEN[1]);
  return toTemplate(g, id, name);
}

function giantMushroom(id: string, name: string, w: number, h: number, cap: Ramp): Template {
  const g = new Px(w, h), cx = w / 2, capH = Math.round(h * 0.55);
  const sx = Math.round(cx - w * 0.13), sw = Math.max(4, Math.round(w * 0.26));
  for (let y = capH - 2; y < h - 1; y++) for (let x = sx; x < sx + sw; x++) g.set(x, y, x < sx + 1 ? STEM[3] : x >= sx + sw - 2 ? STEM[1] : STEM[2]);
  g.rect(sx - 1, h - 2, sw + 2, 1, STEM[1]);
  for (let y = 0; y < capH; y++) {
    const k = y / capH, hw = (w / 2 - 1) * Math.sqrt(Math.max(0, 1 - Math.pow(1 - k * 1.1, 2)));
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw - 0.5); x++) {
      const u = (x - cx) / Math.max(1, hw), light = -(u * 0.6) + (0.5 - k) * 0.8;
      g.set(x, y, light > 0.4 ? cap[3] : light < -0.2 ? cap[1] : cap[2]);
    }
  }
  const spots: [number, number, number][] = [[0.28, 0.28, 2.4], [0.62, 0.2, 2], [0.5, 0.5, 2.6], [0.8, 0.5, 1.6]];
  for (const [fx, fy, r] of spots) for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) if ((x / (r * 1.1)) ** 2 + (y / r) ** 2 <= 1) g.set(fx * w + x, fy * capH + y, '#fff6e6');
  g.line(2, capH - 1, w - 3, capH - 1, cap[1]);
  g.outline(cap[0]);
  return toTemplate(g, id, name);
}

function crystal(id: string, name: string, w: number, h: number, R: Ramp, seed: number): Template {
  const g = new Px(w, h), rng = mulberry32(seed);
  const prism = (cx: number, base: number, pw: number, ph: number) => {
    for (let y = base - ph; y <= base; y++) {
      const k = (y - (base - ph)) / ph, hw = k < 0.25 ? pw * (0.25 + k * 3) : pw;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw - 0.5); x++) {
        const u = (x + 0.5 - cx) / Math.max(1, hw);
        g.set(x, y, u < -0.25 ? R[3] : u > 0.2 ? R[1] : R[2]);
        if (u > -0.7 && u < -0.5 && k > 0.3 && k < 0.7) g.set(x, y, R[4]);
      }
    }
  };
  const n = 3 + Math.floor(w / 18);
  for (let i = 0; i < n; i++) prism(5 + (i / Math.max(1, n - 1)) * (w - 10) + (rng() - 0.5) * 4, h - 1 - Math.round(rng() * 3), 2.6 + rng() * 2.4, h * (0.45 + rng() * 0.5));
  g.outline(R[0]);
  return toTemplate(g, id, name);
}

function coral(id: string, name: string, w: number, h: number, R: Ramp, seed: number): Template {
  const g = new Px(w, h), rng = mulberry32(seed);
  const branch = (x: number, y: number, ang: number, len: number, th: number): void => {
    if (len < 3) { blob(g, x, y, 2, R, { rim: false }); return; }
    const x2 = x + Math.sin(ang) * len, y2 = y - Math.cos(ang) * len;
    g.line(x, y, x2, y2, R[2], th);
    g.line(x - 1, y, x2 - 1, y2, R[3], 1);
    branch(x2, y2, ang - 0.5 - rng() * 0.3, len * 0.7, Math.max(1, th - 1));
    if (len > 7) branch(x2, y2, ang + 0.5 + rng() * 0.3, len * 0.66, Math.max(1, th - 1));
  };
  branch(w / 2, h - 3, 0, h * 0.3, 3);
  branch(w * 0.3, h - 3, -0.5, h * 0.22, 2);
  branch(w * 0.7, h - 3, 0.5, h * 0.22, 2);
  g.outline(R[0]);
  return toTemplate(g, id, name);
}

function kelp(id: string, name: string, w: number, h: number): Template {
  const g = new Px(w, h);
  for (let k = 0; k < 3; k++) {
    const bx = 4 + k * (w - 8) / 2, hh = h * (0.7 + (k % 2) * 0.3);
    for (let y = h - 1; y > h - hh; y--) {
      const t = (h - y) / hh, x = bx + Math.sin(t * 6 + k) * 2.5;
      g.set(x, y, KELP[3]); g.set(x + 1, y, KELP[2]); g.set(x + 2, y, KELP[1]);
      if (Math.floor(t * 14) % 3 === 0) { g.set(x - 1, y, KELP[3]); g.set(x + 3, y - 1, KELP[2]); }
    }
  }
  g.outline(KELP[0]);
  return toTemplate(g, id, name);
}

function fern(id: string, name: string, w: number, h: number): Template {
  const g = new Px(w, h);
  for (let k = -3; k <= 3; k++) {
    const len = h * (0.95 - Math.abs(k) * 0.12);
    for (let s = 0; s < len; s++) {
      const t = s / len, x = w / 2 + k * (1 + t * 2.4), y = h - 1 - s * (1 - Math.abs(k) * 0.08);
      g.set(x, y, t > 0.6 ? GREEN[3] : GREEN[2]); g.set(x + 1, y, GREEN[1]);
      if (s % 3 === 0) { g.set(x - 1, y, GREEN[3]); g.set(x + 2, y, GREEN[2]); }
    }
  }
  g.outline(GREEN[0]);
  return toTemplate(g, id, name);
}

let cache: Template[] | null = null;
/** Todos los sprites de entorno (ids "env-*"). */
export function envTemplates(): Template[] {
  if (cache) return cache;
  cache = [
    tree('env-oak', 'Roble', 46, 50, GREEN, 11),
    tree('env-oak2', 'Roble pequeño', 32, 38, GREEN2, 23),
    tree('env-tall', 'Árbol alto', 30, 52, GREEN, 37, { tall: 1 }),
    tree('env-cherry', 'Cerezo en flor', 46, 50, CHERRY, 51, { dots: ['#ffffff', '#ffd0e8'] }),
    tree('env-autumn', 'Arce otoñal', 44, 48, AUTUMN, 63),
    tree('env-autumn2', 'Árbol de otoño', 32, 38, AUTUMN2, 71),
    tree('env-birch', 'Abedul', 30, 46, GREEN2, 83, { trunkR: BIRCHT, tall: 1 }),
    tree('env-nightree', 'Árbol de noche', 42, 48, NIGHT, 97, { dots: ['#ffe86a', '#9ae8ff'] }),
    tree('env-candytree', 'Árbol de caramelo', 40, 46, CANDY, 101, { trunkR: ['#4a1a30', '#7a2a50', '#b05a80', '#e08aae', '#ffc0d8'], dots: ['#ffffff', '#ffe36a', '#7dd3fc'] }),
    pine('env-pine', 'Pino', 28, 50, PINE, false, 4),
    pine('env-pine2', 'Pino pequeño', 20, 36, PINE, false, 3),
    pine('env-snowpine', 'Pino nevado', 30, 52, PINE, true, 4),
    pine('env-snowpine2', 'Pino nevado pequeño', 22, 38, PINE, true, 3),
    palm('env-palm', 'Palmera', 44, 52),
    bush('env-bush', 'Arbusto', 30, 20, GREEN, 5),
    bush('env-bushflower', 'Arbusto con flores', 30, 20, GREEN2, 9, ['#ff6a9a', '#ffe36a', '#ffffff']),
    bush('env-bushberry', 'Arbusto con bayas', 26, 16, GREEN, 13, ['#e03a4a', '#ff6a78']),
    fern('env-fern', 'Helecho', 24, 16),
    rock('env-rock', 'Roca', 26, 20, STONE, 3),
    rock('env-rock2', 'Roca grande', 36, 28, STONE, 21),
    rock('env-rockmoss', 'Roca con musgo', 28, 22, STONE, 5, { moss: true }),
    rock('env-rocksnow', 'Roca nevada', 28, 22, STONE, 7, { snow: true }),
    rocks('env-rocks', 'Piedras', STONE),
    flowers('env-flowers', 'Flores', 26, 14, ['#ff6a9a', '#ffe36a', '#ffffff', '#b08aff'], 5),
    flowers('env-flowers2', 'Margaritas', 22, 14, ['#ffffff', '#ffe9f4'], 17),
    giantMushroom('env-mush', 'Seta gigante', 34, 36, REDCAP),
    giantMushroom('env-mushblue', 'Seta azul', 30, 32, BLUECAP),
    giantMushroom('env-mushpink', 'Seta rosa', 30, 32, PINKCAP),
    crystal('env-crystal', 'Cristales', 34, 34, CRYS, 4),
    crystal('env-crystalp', 'Cristales morados', 30, 30, CRYSP, 8),
    coral('env-coral', 'Coral rosa', 36, 34, CORAL, 6),
    coral('env-coral2', 'Coral morado', 32, 30, CORAL2, 12),
    kelp('env-kelp', 'Algas', 26, 36),
  ];
  return cache;
}
