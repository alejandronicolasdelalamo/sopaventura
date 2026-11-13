import { bayer, makeNoise } from '../core/noise';
import { mulberry32 } from '../core/rng';
import { reducedMotion } from './dom';
import { dayPart, season, type DayPart } from './daytime';

/**
 * Fondo pixel art del menu: cielo nocturno morado/azul con galaxia espiral, nubes,
 * estrellas que titilan, estrellas fugaces y montañas. Todo generado (sin imagenes externas).
 */
import { gridPx } from './grid';   // un solo tamaño de pixel para cielo, escenarios, particulas y bordes
type RGB = [number, number, number];
const hx = (s: string): RGB => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

const SKIES: Record<DayPart, RGB[]> = {
  night: ['#05031a', '#08052a', '#0c0838', '#110b47', '#170f57', '#1f1468', '#2a1a7c', '#36218f'].map(hx),
  dawn: ['#1a1f6a', '#2a2e8a', '#423ea6', '#6a4ab8', '#9a5ab8', '#d070a8', '#f496a0', '#ffc4a0'].map(hx),
  day: ['#2830a0', '#2e3cb0', '#3648be', '#4058cc', '#4c6ad8', '#5c7ee2', '#7294ea', '#90aef2'].map(hx),
  dusk: ['#12083a', '#24105a', '#3e1872', '#622282', '#902e88', '#c0447e', '#e66a72', '#ff9a6a'].map(hx),
};
let SKY = SKIES.night;
const GAL = ['#1a2470', '#2338a6', '#3456d6', '#4f7cf5', '#7a6cff', '#a58cff', '#d2c4ff', '#f4f0ff'].map(hx);
const CV_NIGHT = ['#1c0f4f', '#2c1773', '#43229b', '#6131c2', '#8a55e6', '#b48cff'].map(hx);
const CB_NIGHT = ['#0c1a4f', '#12287a', '#1b3ea6', '#2a5fd0', '#4a8af0', '#86bfff'].map(hx);
const CV_DAY = ['#5a4ac8', '#7a6ad8', '#9a8ae6', '#bcaef2', '#dcd2fa', '#ffffff'].map(hx);
const CB_DAY = ['#4a68d0', '#6284e0', '#82a2ec', '#a8c0f4', '#d0deff', '#ffffff'].map(hx);
const CV_DUSK = ['#3a1258', '#5a1a70', '#8a2a80', '#c04a86', '#ee7a8a', '#ffb49a'].map(hx);
const CV_DAWN = ['#4a3a9a', '#7a5ab8', '#b07ac8', '#e0a0c8', '#ffc8c0', '#ffe8d8'].map(hx);
let CLOUD_V = CV_NIGHT, CLOUD_B = CB_NIGHT;
const MOUNT = [['#140c3a', '#2a1c6e'], ['#0b0727', '#1d1458'], ['#05031a', '#120c3d']].map(([a, b]) => [hx(a), hx(b)] as const);

interface Static { w: number; h: number; part: DayPart; img: ImageData; stars: { x: number; y: number; c: RGB; p: number; s: number }[] }
let cache: Static | null = null;

function build(w: number, h: number, part: DayPart): Static {
  const n = makeNoise(77), rng = mulberry32(1234);
  SKY = SKIES[part];
  CLOUD_V = part === 'night' ? CV_NIGHT : part === 'day' ? CV_DAY : part === 'dawn' ? CV_DAWN : CV_DUSK;
  CLOUD_B = part === 'night' ? CB_NIGHT : part === 'day' ? CB_DAY : part === 'dawn' ? CB_DAY : CV_DUSK;
  const night = part === 'night';
  const img = new ImageData(w, h);
  const d = img.data;
  const put = (x: number, y: number, c: RGB) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  // d = fuerza del tramado: el cielo lleva tramado completo; nubes y galaxia menos, para que el borde salga limpio y no "sucio"
  const ramp = (r: RGB[], t: number, x: number, y: number, d = 1) => r[Math.max(0, Math.min(r.length - 1, Math.floor(t * r.length + (bayer(x, y) - 0.5) * d)))];

  const portrait = h > w;
  const gx = w * (portrait ? 0.62 : 0.66), gy = h * (portrait ? 0.3 : 0.45), R = Math.min(w, h) * (portrait ? 0.42 : 0.36);
  const ang = -0.32, ca = Math.cos(ang), sa = Math.sin(ang);
  const mountTop = h * 0.78;
  const mixc = (p: RGB, q: RGB, t: number): RGB => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t].map(Math.round) as RGB;
  /** Degradado en bandas planas con una costura de tablero de ajedrez (limpio, sin ruido). */
  const band = (r: RGB[], t: number, x: number, y: number): RGB => {
    const f = Math.max(0, Math.min(0.9999, t)) * r.length, i = Math.floor(f), fr = f - i, chk = (x + y) & 1;
    if (fr > 0.84 && chk && i < r.length - 1) return r[i + 1];
    if (fr < 0.16 && !chk && i > 0) return r[i - 1];
    return r[i];
  };

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = band(SKY, Math.pow(y / h, 1.35) * 0.98, x, y);
    // galaxia espiral inclinada, en bandas planas
    const dx = x - gx, dy = y - gy;
    const rx = (dx * ca - dy * sa) / R, ry = (dx * sa + dy * ca) / (R * 0.42);
    const r = Math.hypot(rx, ry);
    if (night && r < 1.25) {
      const th = Math.atan2(ry, rx);
      const arms = Math.pow(0.5 + 0.5 * Math.cos(2 * th - 7 * Math.log(r + 0.08)), 2.2);
      const I = Math.exp(-r * 5.5) * 1.6 + arms * Math.exp(-r * 2.1) * 0.85 * (0.8 + 0.4 * n.fbm(x / 9, y / 9, 2)) - 0.12;
      if (I > 0.1) c = GAL[Math.max(0, Math.min(GAL.length - 1, Math.floor(Math.min(0.999, I) * GAL.length)))];
    }
    put(x, y, c);
  }
  // sol de dia (bajito al amanecer y al atardecer): disco plano de 3 tonos con aureola de ajedrez
  if (!night) {
    const sx = w * (part === 'dawn' ? 0.25 : 0.72), sy = h * (part === 'day' ? 0.2 : 0.66), sr = Math.min(w, h) * 0.085;
    const sc = (part === 'day' ? ['#fff0a8', '#fff8d0', '#ffffff'] : ['#ff9a5a', '#ffc080', '#fff0c0']).map(hx);
    for (let y = Math.floor(sy - sr * 2); y <= sy + sr * 2; y++) for (let x = Math.floor(sx - sr * 2); x <= sx + sr * 2; x++) {
      const d2 = Math.hypot(x + 0.5 - sx, y + 0.5 - sy);
      if (d2 < sr) put(x, y, d2 < sr * 0.5 ? sc[2] : d2 < sr * 0.82 ? sc[1] : sc[0]);
      else if (d2 < sr * 1.25 && ((x + y) & 1)) put(x, y, mixc(sc[0], SKY[4], 0.4));
      else if (d2 < sr * 1.7 && (x & 1) === 0 && (y & 1) === 0) put(x, y, mixc(sc[0], SKY[4], 0.7));
    }
  }
  // nubes de bolitas con base plana: luz arriba, tono medio y sombra abajo (3 colores, sin ruido)
  const puffCloud = (cx: number, cy: number, cw: number, ph: number, pal: RGB[], seed: number) => {
    const rg = mulberry32(seed), np = 4 + Math.floor(cw / 9);
    const puffs = Array.from({ length: np }, (_, i) => ({ x: cx - cw / 2 + (i / (np - 1)) * cw, r: ph * (0.5 + 0.5 * Math.sin((Math.PI * i) / (np - 1))) * (0.8 + rg() * 0.4) }));
    const baseY = Math.floor(cy + ph * 0.35), top = new Map<number, number>();
    const inside = (x: number, y: number) => y <= baseY && puffs.some(p => Math.hypot(x + 0.5 - p.x, (y + 0.5 - cy) * 1.05) < p.r);
    const n2 = pal.length, hi = pal[n2 - 1], mid = pal[n2 - 3], lo = pal[n2 - 4];
    for (let y = Math.floor(cy - ph * 1.7); y <= baseY; y++) for (let x = Math.floor(cx - cw / 2 - ph); x <= cx + cw / 2 + ph; x++) if (inside(x, y) && !top.has(x)) top.set(x, y);
    for (let y = Math.floor(cy - ph * 1.7); y <= baseY; y++) for (let x = Math.floor(cx - cw / 2 - ph); x <= cx + cw / 2 + ph; x++) {
      if (!inside(x, y)) continue;
      const dy = y - (top.get(x) ?? y);
      put(x, y, y >= baseY - 1 ? lo : dy < 2 ? hi : mid);
    }
  };
  const cw0 = Math.min(w, 220);
  puffCloud(w * 0.18, h * 0.1, cw0 * 0.3, h * 0.04, CLOUD_V, 3);
  puffCloud(w * 0.84, h * 0.19, cw0 * 0.28, h * 0.036, CLOUD_B, 11);
  puffCloud(w * 0.3, h * 0.5, cw0 * 0.36, h * 0.045, CLOUD_V, 23);
  puffCloud(w * 0.9, h * 0.6, cw0 * 0.24, h * 0.03, CLOUD_B, 31);
  // estrellas fijas
  const stars: Static['stars'] = [];
  const nStars = Math.floor((w * h) / (night ? 70 : part === 'day' ? 1e9 : 260));
  for (let i = 0; i < nStars; i++) {
    const x = Math.floor(rng() * w), y = Math.floor(rng() * mountTop);
    const c = hx(['#ffffff', '#cfe6ff', '#d9ccff', '#8fd8ff'][Math.floor(rng() * 4)]);
    if (rng() < 0.18) stars.push({ x, y, c, p: rng() * 6.28, s: 1 + rng() * 2.5 });
    else put(x, y, rng() < 0.6 ? c.map(v => v * 0.6) as RGB : c);
  }
  // montañas en tres capas: arista iluminada, ladera izquierda con luz, derecha en sombra; pinos en la cresta de la capa cercana
  MOUNT.forEach(([dark, rim], l) => {
    const base = mountTop + l * h * 0.065, tops: number[] = [];
    for (let x = 0; x < w; x++) {
      const ridge = Math.abs(n.fbm(x / (34 - l * 8) + l * 9, l * 3.3, 3) - 0.5) * 2;
      tops.push(Math.floor(base - (1 - ridge) * h * (0.16 - l * 0.035)));
    }
    for (let x = 0; x < w; x++) {
      const top = tops[x], lit = x > 0 && tops[x - 1] > top;
      for (let y = Math.max(0, top); y < h; y++) {
        const dy = y - top;
        put(x, y, dy < 1 + l ? rim : lit && dy < 7 ? mixc(dark, rim, 0.45) : dark);
      }
    }
    if (l === 2) {
      // siluetas de pinos sobre la cresta delantera
      const rg = mulberry32(99);
      for (let x = 2; x < w - 2; x += 5 + Math.floor(rg() * 9)) {
        const hh = 7 + Math.floor(rg() * 8), by = tops[x] + 2;
        for (let k = 0; k < hh; k++) {
          const hw = Math.floor((k / hh) * 3.2) + (k > hh * 0.7 ? 1 : 0);
          for (let q = -hw; q <= hw; q++) put(x + q, by - hh + k, q < 0 && k % 3 === 1 ? mixc(dark, rim, 0.5) : dark);
        }
        put(x, by + 1, dark);
      }
    }
  });
  return { w, h, part, img, stars };
}

interface Meteor { x: number; y: number; vx: number; vy: number; life: number; len: number }
interface Flake { x: number; y: number; vx: number; vy: number; p: number; c: string }
const SEASON_FX = {
  invierno: { cols: ['#ffffff', '#dfe8ff'], vy: 0.35, sway: 0.4 },
  primavera: { cols: ['#ffb6d9', '#ff8ac0', '#ffe0f0'], vy: 0.25, sway: 0.8 },
  verano: { cols: ['#fff38a', '#d4ff7a'], vy: -0.05, sway: 0.5 },
  otono: { cols: ['#ff9a3a', '#e0602a', '#ffd06a'], vy: 0.3, sway: 0.9 },
} as const;

export function mountSky(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'sky-bg';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const g = canvas.getContext('2d')!;
  let raf = 0, stopped = false, last = 0;
  const meteors: Meteor[] = [];
  let nextMeteor = 800;
  const rng = mulberry32(Date.now() & 0xffff);
  const fx = SEASON_FX[season()];
  const flakes: Flake[] = [];

  const size = () => {
    const w = Math.max(80, Math.ceil(host.clientWidth / gridPx())), h = Math.max(80, Math.ceil(host.clientHeight / gridPx()));
    const part = dayPart();
    if (!cache || cache.w !== w || cache.h !== h || cache.part !== part) cache = build(w, h, part);
    canvas.width = w; canvas.height = h;
    flakes.length = 0;
    for (let i = 0; i < Math.round((w * h) / 900); i++) flakes.push({ x: rng() * w, y: rng() * h, vx: (rng() - 0.5) * 0.2, vy: fx.vy * (0.6 + rng() * 0.8), p: rng() * 6.28, c: fx.cols[Math.floor(rng() * fx.cols.length)] });
  };

  const frame = (t: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    if (t - last < 66) return;               // ~15 fps: movimiento "a saltos" de pixel art
    const dt = last ? t - last : 66; last = t;
    if (!cache) return;
    const { w, h } = cache;
    g.putImageData(cache.img, 0, 0);
    for (const s of cache.stars) {
      const k = 0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p);
      g.fillStyle = `rgb(${s.c.join(',')})`;
      g.globalAlpha = 0.35 + k * 0.65;
      g.fillRect(s.x, s.y, 1, 1);
      if (k > 0.85) { g.fillRect(s.x - 1, s.y, 3, 1); g.fillRect(s.x, s.y - 1, 1, 3); }
    }
    g.globalAlpha = 1;
    // particulas de temporada: nieve, petalos, luciernagas u hojas
    for (const f of flakes) {
      f.x += (f.vx + Math.sin(t / 900 + f.p) * fx.sway * 0.3) * (dt / 33); f.y += f.vy * (dt / 33);
      if (f.y > h + 2) { f.y = -2; f.x = rng() * w; } if (f.y < -3) { f.y = h; } if (f.x < -2) f.x = w; if (f.x > w + 2) f.x = 0;
      g.fillStyle = f.c;
      if (fx === SEASON_FX.verano) { g.globalAlpha = Math.max(0, Math.sin(t / 400 + f.p * 3)); g.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); g.globalAlpha = 1; }
      else if (fx === SEASON_FX.invierno) g.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
      else { g.fillRect(Math.round(f.x), Math.round(f.y), 2, 1); if (Math.sin(t / 300 + f.p) > 0) g.fillRect(Math.round(f.x) + 1, Math.round(f.y) + 1, 1, 1); }
    }
    nextMeteor -= dt;
    if (cache.part === 'night' && nextMeteor <= 0 && meteors.length < 3) {
      meteors.push({ x: w * (0.3 + rng() * 0.8), y: -2 + rng() * h * 0.3, vx: -(0.9 + rng() * 0.6), vy: 0.55 + rng() * 0.35, life: 1, len: 8 + Math.floor(rng() * 10) });
      nextMeteor = 1600 + rng() * 3200;
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * (dt / 22); m.y += m.vy * (dt / 22); m.life -= dt / 2200;
      for (let k = m.len; k >= 0; k--) {
        const a = (1 - k / m.len) * m.life;
        g.fillStyle = k < 2 ? '#ffffff' : k < m.len / 2 ? '#9fd8ff' : '#8a6cff';
        g.globalAlpha = Math.max(0, a);
        g.fillRect(Math.round(m.x - m.vx * k * 0.9), Math.round(m.y - m.vy * k * 0.9), 1, 1);
      }
      g.globalAlpha = Math.max(0, m.life);
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(m.x) - 1, Math.round(m.y), 3, 1); g.fillRect(Math.round(m.x), Math.round(m.y) - 1, 1, 3);
      g.globalAlpha = 1;
      if (m.life <= 0 || m.x < -20 || m.y > h) meteors.splice(i, 1);
    }
  };

  size();
  if (reducedMotion()) { last = 0; frame(1000); cancelAnimationFrame(raf); }
  else raf = requestAnimationFrame(frame);
  const ro = new ResizeObserver(() => { size(); if (reducedMotion()) { last = 0; frame(1000); cancelAnimationFrame(raf); } });
  ro.observe(host);
  const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else if (!reducedMotion()) raf = requestAnimationFrame(frame); };
  document.addEventListener('visibilitychange', vis);
  return () => { stopped = true; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); };
}
