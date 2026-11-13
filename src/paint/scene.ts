import { bayer, makeNoise } from '../core/noise';
import { hashStr, mulberry32 } from '../core/rng';
import { biomeOf, BIOME_DECO, type Biome, type Island } from '../data/islands';
import { builtinTemplates } from './images';
import { hexToRgb, TRANSPARENT, type Template } from './model';
import { propSprite, THEME_PROPS } from './props';
import { dayPart, type DayPart } from '../ui/daytime';
import { gridPx } from '../ui/grid';
import { despeckle, quantize } from './quantize';

const ALWAYS_DARK = new Set<Biome>(['noche', 'cristal', 'setas', 'espacio', 'oceano']);

/**
 * Escenario pixel art completo de una isla del mapa (vista que sube hacia el horizonte):
 * cielo con sol/luna, nubes, montañas y linea de arboles arriba; terreno con franjas tramadas;
 * camino de tierra serpenteante por el que van los niveles; arboles, rocas, flores y
 * objetos iconicos de los temas de la isla a los lados.
 */
type C = [number, number, number];
const hx = (s: string): C => hexToRgb(s);
const rs = (...h: string[]) => h.map(hx);

interface Style {
  sky: C[]; sun?: { c: C[]; x: number; y: number; r: number }; clouds?: C[];
  mountains: [C, C][]; treeline?: C[]; ground: C[]; stripes: number; path: C[]; flowers: C[]; tuft?: C; pebble: C;
  stars?: number; extra?: 'sea' | 'city' | 'craters' | 'sprinkles' | 'snowfall' | 'bubbles' | 'shore';
}

const S: Record<Biome, Style> = {
  flores: { sky: rs('#2a1a5a', '#4a2a7e', '#7a3a90', '#b8508e', '#e8768a', '#ffa47a', '#ffd08a'), sun: { c: rs('#ffd8a0', '#fff0c8', '#fffbea'), x: 0.75, y: 0.62, r: 9 },
    clouds: rs('#c8708a', '#f0a090', '#ffd0b0', '#fff0dc'), mountains: [[hx('#4a2f7a'), hx('#6a4a9a')], [hx('#1f4a3a'), hx('#2f6a4a')]], treeline: rs('#1a3a2a', '#2a5a32', '#3f7a3a'),
    ground: rs('#1f4a2a', '#2c6230', '#3f7c36', '#5a9a40', '#7ab84c', '#9cd060'), stripes: 0.5, path: rs('#8a6a4a', '#c8a878', '#ead2a0', '#fff2d0'),
    flowers: rs('#ff5a7a', '#ffd86b', '#ffffff', '#c48aff'), tuft: hx('#2a5a2a'), pebble: hx('#a89070') },
  otono: { sky: rs('#5a1a3a', '#a03a3a', '#d8603a', '#f08a3a', '#f8b050', '#ffd27a'), sun: { c: rs('#ffd88a', '#fff2c0', '#fffbe8'), x: 0.8, y: 0.55, r: 10 },
    clouds: rs('#e08a5a', '#f8c080', '#ffe6b8'), mountains: [[hx('#3a5a2a'), hx('#4a7a32')], [hx('#2a4a1f'), hx('#3a6a28')]], treeline: rs('#1a4a22', '#2a6a2a', '#4a8a32'),
    ground: rs('#8a3a10', '#b0521a', '#d07424', '#e8922e', '#f4ac40', '#fac860'), stripes: 0.8, path: rs('#5a2a10', '#7a3e18', '#9a5626', '#b87038'),
    flowers: rs('#ffe08a', '#fff6c8'), tuft: hx('#a04a14'), pebble: hx('#6a3414'), stars: 0.002 },
  bosque: { sky: rs('#0c2230', '#14384a', '#1f5060', '#2f6a72', '#4a8a88', '#78ae9e'), clouds: rs('#7aa8a0', '#b8d8cc', '#eaf6ee'),
    mountains: [[hx('#14303a'), hx('#1f4a4a')], [hx('#0e2a1e'), hx('#1a402a')]], treeline: rs('#0a1e14', '#143a20', '#1f5228'),
    ground: rs('#0e2614', '#163a1c', '#205024', '#2e682c', '#408236', '#58a040'), stripes: 0.35, path: rs('#3a2010', '#5e3a1e', '#86562e', '#ac7844'),
    flowers: rs('#c4e77a', '#7ae0c0'), tuft: hx('#0a2a12'), pebble: hx('#6a6a7a') },
  setas: { sky: rs('#140a30', '#22124a', '#341c62', '#4a2a7a', '#6a3e92', '#8e5aa8'), stars: 0.01,
    mountains: [[hx('#24164a'), hx('#3a2a6a')], [hx('#14203a'), hx('#203a4a')]], treeline: rs('#0e1a24', '#14303a', '#1f4a48'),
    ground: rs('#0e1e2a', '#14303a', '#1c4446', '#265a50', '#327058', '#448a62'), stripes: 0.4, path: rs('#2a1a4a', '#46307a', '#6a52a8', '#9a84d8'),
    flowers: rs('#d07aff', '#7ae8ff', '#ffffff'), tuft: hx('#0a2028'), pebble: hx('#8a7ac8') },
  jardin: { sky: rs('#3a4aa8', '#4a66c4', '#6a86da', '#8ea8ea', '#b4c8f6', '#d8e4ff'), sun: { c: rs('#fff0b0', '#fffae0', '#ffffff'), x: 0.2, y: 0.4, r: 8 },
    clouds: rs('#b0c0f0', '#d8e2ff', '#ffffff'), mountains: [[hx('#5a6ac8'), hx('#7a8ae0')], [hx('#2a6a4a'), hx('#3a8a5a')]], treeline: rs('#1f5a32', '#2f7a3a', '#4a9a44'),
    ground: rs('#245a2a', '#2f7032', '#3c8a3a', '#4c9e42', '#62b44e', '#7ec85c'), stripes: 1, path: rs('#7a7088', '#a8a0b8', '#d0cadc', '#f0ecf6'),
    flowers: rs('#ff8ab0', '#ffffff', '#ffd86b', '#a08aff'), tuft: hx('#1f4a22'), pebble: hx('#9a92aa') },
  noche: { sky: rs('#04031a', '#08062a', '#0e0a3c', '#160f50', '#201662', '#2c1f74'), stars: 0.03, sun: { c: rs('#c8c0e8', '#ece6ff', '#ffffff'), x: 0.25, y: 0.35, r: 7 },
    mountains: [[hx('#1a1450'), hx('#2c2478')], [hx('#0e0a30'), hx('#1c1650')]], treeline: rs('#07061c', '#0e0c2e', '#16123e'),
    ground: rs('#0a0824', '#110e34', '#1a1546', '#241e58', '#30286c', '#3e3480'), stripes: 0.5, path: rs('#1a3a6a', '#2a5aa0', '#4a8ad8', '#8ac8ff'),
    flowers: rs('#7ae8ff', '#c4b5fd', '#ffffff'), tuft: hx('#0a0820'), pebble: hx('#5a5a9a') },
  cristal: { sky: rs('#05031a', '#0c0830', '#160e48', '#221660', '#2e1e78', '#3c2890'), stars: 0.025,
    mountains: [[hx('#22186a'), hx('#3a2a9a')], [hx('#120c40'), hx('#22186a')]], treeline: rs('#0a0828', '#140e3c', '#1e1650'),
    ground: rs('#0c0a2c', '#14103c', '#1e1850', '#2a2266', '#382e7c', '#483c92'), stripes: 0.3, path: rs('#3a1a6a', '#5a30a0', '#8a5ad8', '#c49aff'),
    flowers: rs('#5fb0ff', '#a5ecff', '#c49aff'), pebble: hx('#7a6ad0') },
  parque: { sky: rs('#1a2a6a', '#2a4290', '#3e5cb0', '#5a7ac8', '#7c9ad8', '#a8bce8'), sun: { c: rs('#ffe8b0', '#fff6dc', '#ffffff'), x: 0.7, y: 0.5, r: 8 },
    clouds: rs('#8aa0d8', '#b8c8ee', '#e8eeff'), mountains: [[hx('#3a4a90'), hx('#5068b0')], [hx('#1f4a3a'), hx('#2c6a48')]], treeline: rs('#143a24', '#205a30', '#2f7a3a'),
    ground: rs('#1c4a26', '#265e2c', '#337434', '#428a3c', '#56a046', '#6eb652'), stripes: 0.6, path: rs('#6a5a50', '#9a887a', '#c4b4a2', '#e6d8c6'),
    flowers: rs('#ffd86b', '#ff8ab0', '#ffffff'), tuft: hx('#1a4020'), pebble: hx('#8a8090') },
  ciudad: { sky: rs('#0e1a4a', '#16286a', '#203c8a', '#2e52a6', '#4068bc', '#5a82d0'), stars: 0.01, sun: { c: rs('#dcd8f0', '#f4f2ff', '#ffffff'), x: 0.5, y: 0.6, r: 12 },
    clouds: rs('#6a86c8', '#a8bce8', '#e0e8ff'), mountains: [], extra: 'city', treeline: rs('#123a2a', '#1a5232', '#246a3a'),
    ground: rs('#18402a', '#1f5232', '#28663a', '#337a42', '#40904c', '#52a658'), stripes: 0.5, path: rs('#3a3a52', '#5a5a76', '#7e7e9c', '#a6a6c2'),
    flowers: rs('#ffd86b', '#ffffff'), tuft: hx('#123a22'), pebble: hx('#7a7a94') },
  playa: { sky: rs('#3a1a6a', '#6a2a8a', '#a8408e', '#e0607e', '#f88a6a', '#ffb870', '#ffd890'), sun: { c: rs('#ffcf80', '#fff0c0', '#fffbe8'), x: 0.35, y: 0.78, r: 11 },
    clouds: rs('#d8708a', '#f8a890', '#ffd8b8'), mountains: [], extra: 'shore',
    ground: rs('#b08850', '#c8a060', '#dcb874', '#ecca88', '#f6dc9e', '#fcecc0'), stripes: 0.6, path: rs('#8a6a40', '#a8845a', '#c4a070', '#dcbc8c'),
    flowers: rs('#ffffff', '#ff9ab0', '#ffd0a0'), pebble: hx('#9a7a5a') },
  nieve: { sky: rs('#141a50', '#1f2c70', '#2e428e', '#4460ac', '#6482c6', '#90aade', '#c0d0f0'), stars: 0.015, extra: 'snowfall',
    clouds: rs('#8a9ad0', '#c0ccf0', '#f0f4ff'), mountains: [[hx('#6a7ab8'), hx('#e8eeff')], [hx('#4a5a9a'), hx('#c8d4f4')]], treeline: rs('#14283a', '#1f3e4a', '#2c5458'),
    ground: rs('#7a8ac0', '#98a8d6', '#b6c4e8', '#d0dcf4', '#e6eefc', '#f8fbff'), stripes: 0.4, path: rs('#4a6aa8', '#6a8ec8', '#94b4e4', '#c4dcfa'),
    flowers: rs('#ffffff', '#a5ecff'), pebble: hx('#6a7aa8') },
  oceano: { sky: rs('#0a3a7a', '#0e3070', '#102862', '#102054', '#0e1a46', '#0c1438'), extra: 'bubbles',
    mountains: [[hx('#14285a'), hx('#203a78')], [hx('#0e1c46'), hx('#18306a')]], treeline: rs('#0a1a3a', '#10284a', '#1a3a5a'),
    ground: rs('#3a3070', '#4a3e86', '#5c4e9a', '#7060ac', '#8676bc', '#a094cc'), stripes: 0.5, path: rs('#8a7aa8', '#b0a2c8', '#d4cae4', '#f0eafa'),
    flowers: rs('#ff70d0', '#ffd0f0', '#7ae8ff'), tuft: hx('#2a6a4a'), pebble: hx('#5a4a8a') },
  espacio: { sky: rs('#020110', '#05031c', '#09062a', '#0e0a38', '#140e46', '#1a1254'), stars: 0.05, sun: { c: rs('#3a2f9a', '#6a5ae0', '#a89aff', '#e0d8ff'), x: 0.72, y: 0.45, r: 14 },
    mountains: [[hx('#2a2450'), hx('#4a4280')], [hx('#1a1638'), hx('#2e2858')]], extra: 'craters',
    ground: rs('#24203e', '#2e2a4e', '#3a3660', '#4a4674', '#5c5888', '#706c9c'), stripes: 0.2, path: rs('#5a4aa0', '#7a6ac8', '#a89ae8', '#d8d0ff'),
    flowers: rs('#a5ecff', '#c4b5fd', '#ffffff'), pebble: hx('#1a1830') },
  dulce: { sky: rs('#5a1a7a', '#7a2a9a', '#a046b6', '#c868cc', '#e690dc', '#f8b8ea', '#ffdcf6'), sun: { c: rs('#fff0b0', '#fffae0', '#ffffff'), x: 0.3, y: 0.5, r: 9 },
    clouds: rs('#f0a0e0', '#ffd0f4', '#ffffff'), mountains: [[hx('#a04ac0'), hx('#e08ae8')], [hx('#7a2a9a'), hx('#c060d0')]], extra: 'sprinkles',
    ground: rs('#a04a9a', '#bc60b0', '#d478c4', '#e692d4', '#f2aee2', '#fac8ee'), stripes: 0.6, path: rs('#3a1a0a', '#5a2c14', '#7e4422', '#a26034'),
    flowers: rs('#7dd3fc', '#ffd86b', '#ffffff', '#a5f3fc'), pebble: hx('#8a3a8a') },
};

/** Monumento de cada isla en el horizonte: [dibujo, escala]. Da a cada mundo una silueta que se reconoce de un vistazo. */
const LANDMARK: Record<string, [string, number]> = {
  inicio: ['cerezo', 0.8], series: ['portal', 1.2], anime: ['muralla', 1.2], pixel: ['bloque', 1.2], olaf: ['olaf', 1.1], musica: ['disco', 1.2], trap: ['luna', 1.2],
  rivas: ['casita', 0.8], madrid: ['fuente', 1.2], viajes: ['pino', 1], abisal: ['coral', 1.2], bosque: ['ciervo', 0.7], glaciar: ['pinguino', 0.7],
  golosa: ['cupcake', 1.1], estadio: ['mando', 1.4], cosmos: ['planeta', 0.9], ruta: ['cartel', 1.2], estreno: ['mariposa', 0.7],
};
const LANDMARK_POOL: [string, number][] = [['ciervo', 0.7], ['pinguino', 0.7], ['panda', 0.7], ['koala', 0.7], ['zorro', 0.7], ['husky', 0.7], ['leopardo', 0.7], ['conejo', 0.7], ['gato', 0.7], ['perro', 0.7], ['buho', 0.7], ['colibri', 0.7]];
const landmarkFor = (isl: Island): [string, number] | undefined => LANDMARK[isl.id] ?? (isl.procedural ? LANDMARK_POOL[hashStr(isl.id) % LANDMARK_POOL.length] : undefined);

const maskCache = new Map<string, Uint8Array>();
/** 1 = parte del objeto. Si el dibujo trae fondo (plano como Olaf, o degradado como la ballena), se quita rellenando desde los bordes por colores parecidos al de la esquina. */
function solidMask(t: Template): Uint8Array {
  const hit = maskCache.get(t.id); if (hit) return hit;
  const m = new Uint8Array(t.w * t.h);
  const bg = t.cells[0];
  const pal = t.palette.map(hexToRgb), seed = bg === TRANSPARENT ? [0, 0, 0] : pal[bg];
  const near = (c: number) => { const q = pal[c]; return (q[0] - seed[0]) ** 2 + (q[1] - seed[1]) ** 2 + (q[2] - seed[2]) ** 2 < 120 * 120; };
  for (let i = 0; i < m.length; i++) m[i] = t.cells[i] === TRANSPARENT ? 0 : 1;
  if (bg !== TRANSPARENT) {
    const stack: number[] = [];
    for (let x = 0; x < t.w; x++) { stack.push(x, (t.h - 1) * t.w + x); }
    for (let y = 0; y < t.h; y++) { stack.push(y * t.w, y * t.w + t.w - 1); }
    while (stack.length) {
      const i = stack.pop()!;
      if (!m[i] || !(t.cells[i] === bg || near(t.cells[i]))) continue;
      m[i] = 0;
      const x = i % t.w, y = (i / t.w) | 0;
      if (x > 0) stack.push(i - 1); if (x < t.w - 1) stack.push(i + 1); if (y > 0) stack.push(i - t.w); if (y < t.h - 1) stack.push(i + t.w);
    }
  }
  maskCache.set(t.id, m);
  return m;
}

export const HORIZON_CSS = 208;      // alto (px de pantalla) del cielo pintado arriba de cada isla

export interface SceneInput {
  isl: Island; w: number; h: number; nodes: [number, number][]; top: [number, number]; bottom: [number, number]; part?: DayPart;
  /** true: el monumento del horizonte NO se pinta en el fondo, sino que se devuelve aparte para poder animarlo y darle parallax (el mapa). */
  layers?: boolean;
  /** Bloqueo de paleta: reduce todo el escenario a ~24 colores propios del mundo (por defecto si). */
  lock?: boolean;
}
export interface SceneSprite { W: number; H: number; buf: Uint32Array; left: number; top: number }
/** Resultado sin DOM (se puede calcular en un Web Worker): W x H pixeles RGBA empaquetados. */
export interface SceneBuf { W: number; H: number; buf: Uint32Array; landmark?: SceneSprite; cloud?: string[]; ponds?: { x: number; y: number; w: number; h: number }[] }

const byId = new Map<string, Template>();
/** Plantillas incluidas (sin lo personal/importado: el escenario no lo necesita y asi no depende del estado ni del DOM). */
const builtin = (id: string): Template | undefined => { if (!byId.size) builtinTemplates().forEach(t => byId.set(t.id, t)); return byId.get(id); };

export function renderSceneBuf({ isl, w, h, nodes, top, bottom, part: partIn, layers, lock = true }: SceneInput): SceneBuf {
  // pixel de arte de 3 px en movil (caben objetos mas grandes) y 4 px en pantallas anchas
  const PX = gridPx(w), HORIZON = Math.round(HORIZON_CSS / PX);
  const W = Math.ceil(w / PX), Hh = Math.ceil(h / PX);
  const part = partIn ?? dayPart(), biome = biomeOf(isl);
  const tinted = part !== 'day' && !ALWAYS_DARK.has(biome);
  const st = tinted && part === 'night' ? { ...S[biome], sun: undefined } : S[biome];
  const n = makeNoise(hashStr(isl.id) & 0xffff), rng = mulberry32(hashStr(`scene:${isl.id}`));
  const buf = new Uint32Array(W * Hh);
  const pack = (c: C) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
  const put = (x: number, y: number, c: C) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < Hh) buf[y * W + x] = pack(c); };
  const pick = (r: C[], t: number, x: number, y: number, d = 0.9) => r[Math.max(0, Math.min(r.length - 1, Math.floor(Math.max(0, Math.min(0.9999, t)) * r.length + (bayer(x, y) - 0.5) * d)))];
  const mix = (a: C, b: C, t: number): C => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round) as C;
  const horizonC = st.sky[st.sky.length - 1];
  /** Degradado en bandas planas: solo una costura de tablero de ajedrez entre bandas (nada de ruido). */
  const band = (r: C[], t: number, x: number, y: number): C => {
    const f = Math.max(0, Math.min(0.9999, t)) * r.length, i = Math.floor(f), fr = f - i, chk = (x + y) & 1;
    if (fr > 0.86 && chk && i < r.length - 1) return r[i + 1];
    if (fr < 0.14 && !chk && i > 0) return r[i - 1];
    return r[i];
  };
  const hash = (x: number, y: number) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(hashStr(isl.id), 40503)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ponds: { x: number; y: number; w: number; h: number }[] = [];

  // ---- cielo ----
  for (let y = 0; y < HORIZON; y++) for (let x = 0; x < W; x++) {
    let c = band(st.sky, (y / HORIZON) * 1.02, x, y);
    if (st.extra === 'bubbles' && Math.sin((x - y * 0.5) * 0.18 + n.value(x / 8, 1) * 3) > 0.9) c = mix(c, hx('#7ab0ff'), 0.35);
    put(x, y, c);
  }
  if (st.stars) for (let i = 0; i < W * HORIZON * st.stars; i++) {
    const sx = Math.floor(rng() * W), sy = Math.floor(rng() * HORIZON * 0.8), big = rng() < 0.12;
    put(sx, sy, rng() < 0.3 ? hx('#ffffff') : hx('#a8c8ff'));
    if (big) { put(sx - 1, sy, hx('#6a88d8')); put(sx + 1, sy, hx('#6a88d8')); put(sx, sy - 1, hx('#6a88d8')); put(sx, sy + 1, hx('#6a88d8')); }
  }
  if (st.sun) {
    // disco plano de 3 tonos con aureola de tablero de ajedrez
    const sx = st.sun.x * W, sy = st.sun.y * HORIZON, R0 = st.sun.r, sc = st.sun.c;
    for (let y = Math.floor(sy - R0 - 6); y <= sy + R0 + 6; y++) for (let x = Math.floor(sx - R0 - 6); x <= sx + R0 + 6; x++) {
      const d = Math.hypot(x + 0.5 - sx, y + 0.5 - sy);
      if (y >= HORIZON) continue;
      if (d < R0) put(x, y, d < R0 * 0.5 ? sc[sc.length - 1] : d < R0 * 0.82 ? sc[Math.min(1, sc.length - 1)] : sc[0]);
      else if (d < R0 + 2.5 && ((x + y) & 1)) put(x, y, mix(sc[0], horizonC, 0.35));
      else if (d < R0 + 6 && ((x & 1) === 0) && ((y & 1) === 0)) put(x, y, mix(sc[0], horizonC, 0.7));
    }
  }
  if (st.clouds) {
    // nubes de bolitas con base plana: luz arriba, medio y sombra abajo
    const cl = st.clouds, nC = cl.length, hi = cl[nC - 1], mid = cl[Math.max(0, nC - 2)], lo = cl[Math.max(0, nC - 3)];
    for (let k = 0; k < Math.max(2, Math.round(W / 45)); k++) {
      const cx = rng() * W, cy = 10 + rng() * HORIZON * 0.5, cw = 14 + rng() * 22, ph = 4 + rng() * 3;
      const np = 3 + Math.floor(cw / 7);
      const puffs = Array.from({ length: np }, (_, i) => ({ x: cx - cw / 2 + (i / (np - 1)) * cw, r: ph * (0.55 + 0.45 * Math.sin((Math.PI * i) / (np - 1))) * (0.85 + rng() * 0.35) }));
      const baseY = Math.floor(cy + ph * 0.35), topAt = new Map<number, number>();
      const inCloud = (x: number, y: number) => y <= baseY && puffs.some(p => Math.hypot(x + 0.5 - p.x, (y + 0.5 - cy) * 1.05) < p.r);
      for (let y = Math.floor(cy - ph * 1.6); y <= baseY; y++) for (let x = Math.floor(cx - cw / 2 - ph); x <= cx + cw / 2 + ph; x++) if (inCloud(x, y) && !topAt.has(x)) topAt.set(x, y);
      for (let y = Math.floor(cy - ph * 1.6); y <= baseY; y++) for (let x = Math.floor(cx - cw / 2 - ph); x <= cx + cw / 2 + ph; x++) {
        if (!inCloud(x, y)) continue;
        const dy = y - (topAt.get(x) ?? y);
        put(x, y, y >= baseY - 1 ? lo : dy < 2 ? hi : mid);
      }
    }
  }
  // ---- montañas / ciudad / mar en el horizonte ----
  st.mountains.forEach(([base, rim], l) => {
    // cadenas limpias: arista clara arriba, ladera izquierda iluminada y derecha en sombra; la lejana se funde con el horizonte
    const fade = l === 0 ? 0.3 : 0, b = mix(base, horizonC, fade), r2 = mix(rim, horizonC, fade * 0.6);
    const tops: number[] = [];
    for (let x = 0; x < W; x++) {
      const ridge = 1 - Math.abs(n.fbm(x / (26 + l * 10) + l * 7, l * 5, 2) - 0.5) * 2;
      tops.push(Math.floor(HORIZON - 4 - ridge * (16 - l * 5) + l * 2));
    }
    for (let x = 0; x < W; x++) {
      const top = tops[x], lit = x > 0 && tops[x - 1] > top;
      for (let y = Math.max(0, top); y < HORIZON + 2; y++) {
        const dy = y - top;
        put(x, y, dy === 0 ? r2 : lit ? (dy < 6 ? mix(b, r2, 0.5) : b) : (dy < 2 ? b : mix(b, [10, 6, 40], 0.2)));
      }
    }
  });
  if (st.extra === 'city') {
    const layers = [['#16285a', '#22408a'], ['#0e1a40', '#1a2c64']] as const;
    layers.forEach(([dark, win], l) => {
      let x = -2;
      while (x < W) {
        const bw = 4 + Math.floor(rng() * 7), bh = 8 + Math.floor(rng() * (l ? 18 : 26));
        for (let yy = HORIZON + 2 - bh; yy < HORIZON + 2; yy++) for (let xx = x; xx < x + bw; xx++) {
          const winOn = l === 1 && (xx - x) % 2 === 1 && (yy % 3 === 0) && rng() < 0.45;
          put(xx, yy, winOn ? hx('#ffd86b') : hx(yy === HORIZON + 2 - bh ? win : dark));
        }
        if (rng() < 0.2) put(x + Math.floor(bw / 2), HORIZON + 1 - bh, hx(dark));
        x += bw + (l ? 0 : 1);
      }
    });
  }
  if (st.extra === 'shore') {
    for (let y = HORIZON - 12; y < HORIZON + 4; y++) for (let x = 0; x < W; x++) {
      const t = (y - (HORIZON - 12)) / 16;
      const wave = Math.sin(x * 0.4 + y * 1.7) > 0.7;
      put(x, y, wave ? hx('#c8b0ff') : pick(rs('#2a1a6a', '#3a2a8a', '#5a3ea8', '#7a5ac0'), 0.8 - t * 0.7, x, y));
    }
  }
  if (st.treeline) {
    // copas redondeadas en dos tonos con luz arriba
    const tl = st.treeline;
    for (let x = 0; x < W; x++) {
      const bump = Math.abs(Math.sin(x * 0.5 + n.value(x / 9, 2) * 6)), hgt = 4 + Math.floor(bump * 4 + n.fbm(x / 7, 9, 2) * 3);
      for (let y = HORIZON - hgt; y < HORIZON + 3; y++) {
        const dy = y - (HORIZON - hgt);
        put(x, y, dy < 2 ? tl[Math.min(2, tl.length - 1)] : dy < 5 ? tl[Math.min(1, tl.length - 1)] : tl[0]);
      }
    }
  }

  // ---- monumento de la isla, asomando por el horizonte (algo desvaido: queda lejos) ----
  let landmarkOut: SceneSprite | undefined;
  {
    const lm = landmarkFor(isl), t = lm ? builtin(lm[0]) : undefined;
    if (lm && t) {
      const sc = lm[1], tw = Math.round(t.w * sc), th = Math.round(t.h * sc);
      const rgbs = t.palette.map(hexToRgb), solid = solidMask(t);
      const left = Math.round(W * (st.sun && st.sun.x > 0.5 ? 0.24 : 0.76) - tw / 2), topY = HORIZON + 1 - th;
      const lmBuf = layers ? new Uint32Array(tw * th) : null;
      // de noche / atardecer el monumento se tiñe igual que el cielo
      const tintLm: [C, number] | null = tinted ? [part === 'night' ? [16, 12, 52] : part === 'dusk' ? [255, 110, 100] : [255, 196, 170], part === 'night' ? 0.62 : part === 'dusk' ? 0.24 : 0.16] : null;
      for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
        const si = Math.floor(ty / sc) * t.w + Math.floor(tx / sc), c = t.cells[si];
        if (c === TRANSPARENT || !solid[si]) continue;
        let col = mix(rgbs[c] as unknown as C, horizonC, 0.2);
        if (lmBuf) { if (tintLm) col = mix(col, tintLm[0], tintLm[1]); lmBuf[ty * tw + tx] = pack(col); }
        else put(left + tx, topY + ty, col);
      }
      if (lmBuf) landmarkOut = { W: tw, H: th, buf: lmBuf, left, top: topY };
    }
  }

  // ---- terreno ----
  // relieve: campo de alturas de baja frecuencia en 4 niveles; el borde alto recibe luz y el pie de cada escalon, sombra
  const lev = new Int8Array(W * Hh);
  const RELIEF = st.extra === 'craters' || st.extra === 'bubbles' ? 0.4 : 1;
  for (let y = HORIZON + 2; y < Hh; y++) for (let x = 0; x < W; x++) lev[y * W + x] = Math.floor(n.fbm(x / 30 + 7, y / 22 + 3, 3) * 4);
  for (let y = HORIZON + 2; y < Hh; y++) {
    const far = Math.max(0, 1 - (y - HORIZON) / 40);
    for (let x = 0; x < W; x++) {
      // manchas grandes de color en bandas limpias (sin ruido fino); solo la costura es de tablero de ajedrez
      const q = Math.floor(n.fbm(x / 26 + 3, y / 16, 2) * 4) / 4;
      const L = lev[y * W + x], up = y > HORIZON + 2 ? lev[(y - 1) * W + x] : L, dn = y < Hh - 1 ? lev[(y + 1) * W + x] : L;
      const ridge = (L > up ? 0.1 : 0) - (L > dn ? 0.1 : 0);          // luz en el borde de arriba, sombra al pie
      let t = 0.34 + (q - 0.4) * 0.55 * Math.max(0.5, st.stripes) + far * 0.3 + ((L - 1.5) * 0.04 + ridge) * RELIEF;
      if (st.extra !== 'craters' && st.extra !== 'bubbles' && (Math.floor(y / 9) % 2 === 0) && st.stripes >= 1) t += 0.08;
      let c = band(st.ground, t, x, y);
      if (far > 0) c = mix(c, horizonC, Math.round(far * 3) / 3 * 0.32);
      put(x, y, c);
    }
  }
  if (st.extra === 'craters') for (let i = 0; i < (W * Hh) / 900; i++) {
    const cx = rng() * W, cy = HORIZON + 8 + rng() * (Hh - HORIZON), r = 2 + rng() * 5;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot((x - cx) / r, (y - cy) / (r * 0.7));
      if (d < 1) put(x, y, d > 0.75 ? (y < cy ? st.ground[0] : st.ground[4]) : st.ground[1]);
    }
  }

  // ---- camino (campo de distancias estampado) ----
  const dist = new Float32Array(W * Hh).fill(99);
  const pts: [number, number][] = [[bottom[0] / PX, Hh + 6], ...nodes.map(([x, y]) => [x / PX, y / PX] as [number, number]), [top[0] / PX, HORIZON + 4]];
  const curve: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const steps = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      curve.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  const baseR = 6.5;
  for (const [cx, cy] of curve) {
    const r = baseR * Math.min(1, 0.35 + (cy - HORIZON) / 50) + (n.value(cx / 6, cy / 6) - 0.5) * 1.6;
    const R2 = r + 3;
    for (let y = Math.floor(cy - R2); y <= cy + R2; y++) {
      if (y < HORIZON || y >= Hh) continue;
      for (let x = Math.floor(cx - R2); x <= cx + R2; x++) {
        if (x < 0 || x >= W) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r;
        const i = y * W + x;
        if (d < dist[i]) dist[i] = d;
      }
    }
  }
  for (let y = HORIZON; y < Hh; y++) for (let x = 0; x < W; x++) {
    const d = dist[y * W + x];
    if (d > 1.4) continue;
    if (d > 0.3) { put(x, y, mix(st.ground[0], [8, 6, 24], 0.45)); continue; }                      // contorno oscuro
    if (d > -1.3) { put(x, y, st.path[1]); continue; }                                              // borde mas oscuro (el camino "se hunde")
    const h = hash(x >> 1, y >> 1);
    put(x, y, d > -2.2 ? st.path[2] : h < 0.07 ? st.path[3] : h > 0.93 ? st.path[1] : st.path[2]);   // cuerpo liso con motas sueltas
  }
  // piedrecitas y hierba al borde del camino
  for (let y = HORIZON + 3; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const d = dist[y * W + x];
    if (d > -1.2 && d < 0.2 && rng() < 0.03) { put(x, y, st.pebble); put(x + 1, y, mix(st.pebble, [255, 255, 255], 0.35)); put(x, y + 1, mix(st.pebble, [0, 0, 0], 0.35)); }
    else if (d >= 1.6 && d < 3.4 && st.tuft && rng() < 0.05) { put(x, y, st.tuft); put(x - 1, y - 1, st.tuft); put(x + 1, y - 1, st.tuft); put(x, y - 1, mix(st.tuft, [255, 255, 255], 0.2)); }
  }
  const free = (x: number, y: number, m: number) => { const xi = Math.round(x), yi = Math.round(y); return xi >= 0 && yi >= 0 && xi < W && yi < Hh && dist[yi * W + xi] > m; };

  // ---- detalles pequeños: hierba, flores, piedras ----
  const area = W * (Hh - HORIZON);
  for (let i = 0; i < area / 85; i++) {
    const x = rng() * W, y = HORIZON + 6 + rng() * (Hh - HORIZON - 6);
    if (!free(x, y, 2.5)) continue;
    const kind = rng();
    if (kind < 0.5 && st.tuft) {
      const lt = mix(st.tuft, [255, 255, 255], 0.22);
      put(x, y, st.tuft); put(x - 1, y - 1, st.tuft); put(x + 1, y - 1, st.tuft); put(x, y - 1, lt); put(x - 1, y - 2, lt); put(x + 1, y - 2, st.tuft); put(x, y - 2, st.tuft);
    } else if (kind < 0.8) {
      const fc = st.flowers[Math.floor(rng() * st.flowers.length)];
      if (st.extra === 'sprinkles') { put(x, y, fc); put(x + 1, y + (rng() < 0.5 ? 1 : 0), fc); }
      else {
        if (st.tuft) { put(x, y, st.tuft); put(x, y - 1, st.tuft); }
        put(x - 1, y - 2, fc); put(x + 1, y - 2, fc); put(x, y - 3, fc); put(x, y - 1 - 1, mix(fc, [255, 255, 255], 0.2)); put(x, y - 2, [255, 226, 110]);
      }
    } else { put(x, y, st.pebble); put(x + 1, y, mix(st.pebble, [255, 255, 255], 0.3)); put(x, y + 1, mix(st.pebble, [0, 0, 0], 0.3)); }
  }
  if (st.extra === 'snowfall' || st.extra === 'bubbles') for (let i = 0; i < area / 160; i++) {
    const x = rng() * W, y = rng() * Hh;
    put(x, y, hx(st.extra === 'bubbles' ? '#a5ecff' : '#ffffff'));
    if (st.extra === 'bubbles' && rng() < 0.3) { put(x + 1, y - 1, hx('#a5ecff')); put(x - 1, y - 1, hx('#a5ecff')); put(x, y - 2, hx('#a5ecff')); }
  }

  // ---- estanque(s): agua con orilla, reflejos, nenufares y juncos (o hielo / chocolate segun el mundo) ----
  const pondPix: number[] = [];
  const POND: Partial<Record<Biome, { water: string[]; shore: string; n: number }>> = {
    flores: { water: ['#2a5aa0', '#3a7ac8', '#5a9ee6', '#9ad0f8'], shore: '#d8c890', n: 1 },
    parque: { water: ['#2a5aa0', '#3a7ac8', '#5a9ee6', '#9ad0f8'], shore: '#c8b888', n: 1 },
    jardin: { water: ['#2a5aa0', '#3a7ac8', '#5a9ee6', '#9ad0f8'], shore: '#d8c890', n: 1 },
    bosque: { water: ['#1f4a6a', '#2a6a8a', '#3a8aa8', '#7ac4d0'], shore: '#8a7a50', n: 2 },
    otono: { water: ['#2a4a7a', '#3a64a0', '#5a86c4', '#a0c4ea'], shore: '#a88a50', n: 1 },
    playa: { water: ['#1a7ab0', '#2a9ad0', '#5ac0e8', '#b0e8f8'], shore: '#f0e0a8', n: 1 },
    nieve: { water: ['#7aa8d0', '#9ac4e8', '#c0e0f8', '#f0faff'], shore: '#f4f8ff', n: 1 },
    dulce: { water: ['#4a2214', '#6a3220', '#8a4a30', '#c08060'], shore: '#f8c8e0', n: 1 },
  };
  const pd = POND[biome];
  if (pd) {
    const wc = pd.water.map(hx);
    for (let k = 0; k < pd.n; k++) {
      let placed = false;
      for (let tries = 0; tries < 60 && !placed; tries++) {
        const rx = 9 + rng() * 6, ry = 4.5 + rng() * 3, cx = rx + 4 + rng() * (W - 2 * rx - 8), cy = HORIZON + 22 + ry + rng() * (Hh - HORIZON - 40 - ry);
        if (cy + ry >= Hh - 6) continue;
        // lejos del camino y de los demas estanques
        let ok = true;
        for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) if (dist[Math.round(cy + b * ry) * W + Math.round(Math.max(0, Math.min(W - 1, cx + a * rx)))] < 5) ok = false;
        if (!ok || pondPix.some(i => Math.abs((i % W) - cx) < rx * 2 && Math.abs(((i / W) | 0) - cy) < ry * 2)) continue;
        placed = true;
        ponds.push({ x: Math.round(cx - rx), y: Math.round(cy - ry), w: Math.round(rx * 2), h: Math.round(ry * 2) });
        for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
          if (x < 0 || x >= W || y < HORIZON || y >= Hh) continue;
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.hypot(dx, dy) + (n.value(x / 3, y / 3) - 0.5) * 0.18;
          if (d > 1.18) continue;
          pondPix.push(y * W + x);
          if (d > 0.98) { put(x, y, bayer(x, y) < 0.7 ? hx(pd.shore) : mix(hx(pd.shore), [0, 0, 0], 0.18)); continue; }   // orilla
          if (d > 0.86) { put(x, y, wc[0]); continue; }                                                                        // borde oscuro del agua
          const t = 0.2 + (1 - dy * 0.5) * 0.35 + (dx < 0 ? 0.05 : 0);
          put(x, y, pick(wc as C[], t, x, y, 0.5));
        }
        // reflejos y destellos
        for (let r = 0; r < 4; r++) { const x = cx - rx * 0.5 + rng() * rx, y = cy - ry * 0.4 + rng() * ry * 0.8; const w2 = 2 + Math.floor(rng() * 3); for (let q = 0; q < w2; q++) put(x + q, y, wc[3]); }
        // nenufares y juncos
        for (let l = 0; l < 2; l++) { const lx = cx + (rng() - 0.5) * rx, ly = cy + (rng() - 0.3) * ry * 0.6; put(lx, ly, hx('#3a9a4a')); put(lx + 1, ly, hx('#58c060')); put(lx - 1, ly, hx('#2e7a3a')); if (rng() < 0.6) put(lx + 1, ly - 1, hx('#ffb0d0')); }
        for (let r = 0; r < 3; r++) { const rxp = cx + (rng() < 0.5 ? -1 : 1) * (rx * (0.8 + rng() * 0.18)), ryp = cy + (rng() - 0.5) * ry; for (let h = 0; h < 4; h++) put(rxp, ryp - h, h === 3 ? hx('#7a5a3a') : hx('#4a8a3a')); }
      }
    }
  }

  // ---- objetos grandes (decorado del bioma) y objetos iconicos de los temas ----
  const occ = new Uint8Array(W * Hh);
  for (const i of pondPix) occ[i] = 1;
  const nodeArt = nodes.map(([x, y]) => [x / PX, y / PX]);
  interface Item { t: Template; x: number; y: number }
  const items: Item[] = [];
  const canPlace = (t: Template, x0: number, y0: number, edgeOk: boolean) => {
    let bad = 0, total = 0;
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
      if (t.cells[y * t.w + x] === TRANSPARENT) continue;
      const X = Math.round(x0 + x), Y = Math.round(y0 + y);
      total++;
      if (X < 0 || X >= W) { if (!edgeOk) return false; continue; }
      if (Y < HORIZON - 4 || Y >= Hh - 2) return false;
      if (occ[Y * W + X] || dist[Y * W + X] < 1.5) bad++;
    }
    if (bad / Math.max(1, total) > 0.04) return false;
    // no tapar ningun nivel (cada nodo ocupa ~18x20 pixeles de arte, mas la estrellas y el avatar)
    return !nodeArt.some(([nx, ny]) => x0 < nx + 11 && x0 + t.w > nx - 11 && y0 < ny + 13 && y0 + t.h > ny - 22);
  };
  // Variedad: cada objeto como mucho 2 veces por isla (los arboles grandes, 3)
  const used = new Map<string, number>();
  const limitOf = (t: Template) => (t.w > 40 && !t.id.startsWith('prop-') ? 3 : 2);
  const place = (t: Template, tries: number, edge: boolean, near: boolean) => {
    if ((used.get(t.id) ?? 0) >= limitOf(t)) return false;
    for (let k = 0; k < tries; k++) {
      let x0: number;
      if (edge) x0 = rng() < 0.5 ? -t.w * (0.2 + rng() * 0.35) : W - t.w * (0.45 + rng() * 0.35);
      else x0 = rng() * (W - t.w);
      const y0 = HORIZON + 4 + rng() * (Hh - HORIZON - t.h - 6);
      if (near) { const cx = Math.round(x0 + t.w / 2), by = Math.round(y0 + t.h - 1); if (cx < 0 || cx >= W || by >= Hh) continue; const dp = pathDist(cx, by); if (dp > 40 || dp < 10) continue; }
      if (!canPlace(t, x0, y0, edge)) continue;
      for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.cells[y * t.w + x] !== TRANSPARENT) { const X = Math.round(x0 + x), Y = Math.round(y0 + y); if (X >= 0 && X < W && Y < Hh) occ[Y * W + X] = 1; }
      items.push({ t, x: Math.round(x0), y: Math.round(y0) });
      used.set(t.id, (used.get(t.id) ?? 0) + 1);
      return true;
    }
    return false;
  };
  const sparse = curve.filter((_, i) => i % 3 === 0);
  const pathDist = (x: number, y: number) => { let m = 1e9; for (const [cx, cy] of sparse) { const d = (cx - x) ** 2 + (cy - y) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
  const decos = BIOME_DECO[biomeOf(isl)].map(id => builtin(id)).filter((t): t is Template => !!t);
  const big = decos.filter(t => t.w > 40), small = decos.filter(t => t.w <= 40);
  const rows = (Hh - HORIZON) / 40;
  // primero los objetos iconicos de los temas (junto al camino, para que se vean), luego arboles grandes en los bordes y algo pequeño
  const icons = [...new Set(isl.themes.flatMap(th => THEME_PROPS[th] ?? []))].map(id => propSprite(id) ?? builtin(id)).filter((t): t is Template => !!t && t.w <= 48);
  const shuffled = <T,>(arr: T[]) => arr.map(v => [rng(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  // iconicos: cada uno 2 veces como mucho, repartidos a lo largo del camino
  for (const t of [...shuffled(icons), ...shuffled(icons)]) place(t, 140, false, true);
  /** Coloca un objeto pequeño cerca de un punto (para formar grupos naturales). */
  const placeNear = (t: Template, cx: number, by: number, spread: number) => {
    if ((used.get(t.id) ?? 0) >= 3) return false;
    for (let k = 0; k < 14; k++) {
      const x0 = cx + (rng() - 0.5) * spread - t.w / 2, y0 = by - t.h + 2 + (rng() - 0.3) * 8;
      if (!canPlace(t, x0, y0, true)) continue;
      for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.cells[y * t.w + x] !== TRANSPARENT) { const X = Math.round(x0 + x), Y = Math.round(y0 + y); if (X >= 0 && X < W && Y < Hh) occ[Y * W + X] = 1; }
      items.push({ t, x: Math.round(x0), y: Math.round(y0) });
      used.set(t.id, (used.get(t.id) ?? 0) + 1);
      return true;
    }
    return false;
  };
  const grove = () => {
    const it = items[items.length - 1];
    if (!it || small.length === 0) return;
    const cx = it.x + it.t.w / 2, by = it.y + it.t.h;
    const n2 = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < n2; k++) placeNear(shuffled(small)[0], cx + (k ? 1 : -1) * it.t.w * 0.45, by, 26);
  };
  // decorado del bioma: recorre la lista mezclada varias veces (el limite evita repetir)
  for (let lap = 0; lap < 3; lap++) {
    for (const t of shuffled(big)) if (place(t, 16, true, false)) grove();
    for (const t of shuffled(small)) place(t, 18, rng() < 0.45, false);
  }

  items.sort((a, b) => a.y + a.t.h - (b.y + b.t.h));
  for (const { t, x, y } of items) {
    const rgb = t.palette.map(hexToRgb) as C[];
    // sombra proyectada: la silueta del objeto "tumbada" hacia la derecha y abajo (la luz viene de arriba a la izquierda) + contacto con el suelo
    const sy = y + t.h - 1, sw = t.w * 0.34;
    const shade = (xx: number, yy: number, k: number) => { if (xx >= 0 && xx < W && yy >= HORIZON && yy < Hh && !occ[yy * W + xx]) put(xx, yy, mix(unpack(buf[yy * W + xx]), [10, 6, 30], k)); };
    for (let yy = 0; yy < t.h; yy++) for (let xx = 0; xx < t.w; xx++) {
      if (t.cells[yy * t.w + xx] === TRANSPARENT) continue;
      const hgt = Math.min(34, t.h - 1 - yy);
      const px = x + xx + Math.round(hgt * 0.55), py = sy + 1 + Math.round(hgt * 0.22);
      shade(px, py, 0.22);
    }
    for (let yy = sy - 1; yy <= sy + 1; yy++) for (let xx = Math.floor(x + t.w / 2 - sw); xx <= x + t.w / 2 + sw; xx++) {
      if (Math.hypot((xx - (x + t.w / 2)) / sw, (yy - sy) / 1.6) < 1) shade(xx, yy, 0.36);
    }
    // Acabado "currado": contorno oscuro (del propio color del borde), luz en los bordes que miran al sol y base mas oscura
    const solidAt = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < t.w && yy < t.h && t.cells[yy * t.w + xx] !== TRANSPARENT;
    const INK: C = [14, 8, 36];
    for (let yy = -1; yy <= t.h; yy++) for (let xx = -1; xx <= t.w; xx++) {
      if (solidAt(xx, yy)) continue;
      const nb = [[xx - 1, yy], [xx + 1, yy], [xx, yy - 1], [xx, yy + 1]].find(([a, b]) => solidAt(a, b));
      if (nb) put(x + xx, y + yy, mix(rgb[t.cells[nb[1] * t.w + nb[0]]], INK, 0.66));
    }
    for (let yy = 0; yy < t.h; yy++) for (let xx = 0; xx < t.w; xx++) {
      const c = t.cells[yy * t.w + xx];
      if (c === TRANSPARENT) continue;
      let col = rgb[c];
      if (!solidAt(xx - 1, yy) || !solidAt(xx, yy - 1)) col = mix(col, [255, 250, 230], 0.2);          // luz arriba-izquierda
      else if (!solidAt(xx, yy + 1) || !solidAt(xx + 1, yy)) col = mix(col, INK, 0.2);                    // sombra abajo-derecha
      put(x + xx, y + yy, col);
    }
  }

  // ---- hora del dia: tinte de noche (con luna y estrellas), atardecer o amanecer ----
  if (tinted) {
    const tint: C = part === 'night' ? [16, 12, 52] : part === 'dusk' ? [255, 110, 100] : [255, 196, 170];
    const kS = part === 'night' ? 0.62 : part === 'dusk' ? 0.24 : 0.16, kG = part === 'night' ? 0.5 : part === 'dusk' ? 0.12 : 0.07;
    for (let y = 0; y < Hh; y++) { const k = y < HORIZON ? kS : kG; for (let x = 0; x < W; x++) { const i = y * W + x; buf[i] = pack(mix(unpack(buf[i]), tint, k)); } }
    if (part === 'night') {
      for (let i = 0; i < W * HORIZON * 0.015; i++) { const x = Math.floor(rng() * W), y = Math.floor(rng() * HORIZON * 0.7); put(x, y, rng() < 0.4 ? hx('#ffffff') : hx('#b8c8ff')); }
      const mx = W * 0.78, my = HORIZON * 0.28, mr = 6;
      for (let y = Math.floor(my - mr); y <= my + mr; y++) for (let x = Math.floor(mx - mr); x <= mx + mr; x++) {
        const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
        if (d < mr && Math.hypot(x + 0.5 - mx - 2.5, y + 0.5 - my + 1.5) > mr * 0.85) put(x, y, d < mr - 1 ? hx('#f4f0ff') : hx('#c8c0e8'));
      }
    }
  }

  // ---- bloqueo de paleta: todo el mundo usa solo ~24 colores (los suyos) y sin pixeles sueltos ----
  if (lock) {
    const q = quantize(buf, LOCK_COLORS);
    despeckle(q.cells, W, Hh);
    const pal = q.palette.map(hexToRgb);
    for (let i = 0; i < buf.length; i++) buf[i] = pack(pal[q.cells[i]] as unknown as C);
  }

  return { W, H: Hh, buf, landmark: landmarkOut, cloud: cloudColors(isl, part), ponds };
}

/** Colores de las nubes del mundo a esa hora (para las nubes que flotan y las transiciones entre islas). */
export function cloudColors(isl: Island, part: DayPart): string[] {
  const biome = biomeOf(isl), base = S[biome].clouds ?? S[biome].sky.slice(-4);
  const tinted = part !== 'day' && !ALWAYS_DARK.has(biome);
  if (!tinted) return base.map(c => '#' + [c[0], c[1], c[2]].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''));
  const tint: C = part === 'night' ? [16, 12, 52] : part === 'dusk' ? [255, 110, 100] : [255, 196, 170];
  const k = part === 'night' ? 0.55 : part === 'dusk' ? 0.28 : 0.18;
  return base.map(c => '#' + [0, 1, 2].map(i => Math.round(c[i] + (tint[i] - c[i]) * k).toString(16).padStart(2, '0')).join(''));
}
const LOCK_COLORS = 64;

/** Pasa el resultado a un canvas (hilo principal). */
export function bufToCanvas({ W, H, buf }: SceneBuf): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const im = g.createImageData(W, H);
  new Uint32Array(im.data.buffer).set(buf);
  g.putImageData(im, 0, 0);
  return cv;
}

export function renderScene(input: SceneInput): HTMLCanvasElement { return bufToCanvas(renderSceneBuf(input)); }

function unpack(v: number): C { return [v & 255, (v >> 8) & 255, (v >> 16) & 255]; }
