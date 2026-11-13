import type { Biome } from '../data/islands';
import { reducedMotion } from './dom';
import { gridPx } from './grid';

/**
 * Particulas ambientales de cada mundo (nieve, petalos, luciernagas, burbujas, estrellas...) sobre el mapa.
 * Un solo canvas de baja resolucion (pixel art, 3 px por pixel), ~15 fps, en pausa si la pestaña no se ve.
 */
type Kind = 'fall' | 'rise' | 'twinkle' | 'float';
interface Look { kind: Kind; cols: string[]; n: number; speed: number; sway: number; size: number }
const LOOK: Record<Biome, Look> = {
  flores: { kind: 'fall', cols: ['#ffb6d9', '#ff8ac0', '#ffe0f0'], n: 34, speed: 0.22, sway: 0.7, size: 2 },
  ciudad: { kind: 'float', cols: ['#ffe9a8', '#fff3c8', '#ffd06a'], n: 26, speed: 0.1, sway: 0.5, size: 1 },
  bosque: { kind: 'float', cols: ['#d4ff7a', '#fff38a', '#a8ffb0'], n: 34, speed: 0.12, sway: 0.6, size: 1 },
  setas: { kind: 'rise', cols: ['#7ae7ff', '#ff9ad5', '#c9a8ff'], n: 36, speed: 0.16, sway: 0.5, size: 1 },
  jardin: { kind: 'float', cols: ['#fff38a', '#ffd9f0', '#ffffff'], n: 26, speed: 0.1, sway: 0.7, size: 1 },
  noche: { kind: 'twinkle', cols: ['#ffffff', '#a8c8ff', '#d9ccff'], n: 44, speed: 0, sway: 0, size: 1 },
  parque: { kind: 'fall', cols: ['#9fe870', '#6fc850', '#d8f08a'], n: 22, speed: 0.2, sway: 0.9, size: 2 },
  playa: { kind: 'twinkle', cols: ['#ffffff', '#fff3c0', '#bfefff'], n: 30, speed: 0, sway: 0, size: 1 },
  nieve: { kind: 'fall', cols: ['#ffffff', '#dfe8ff', '#c8dcff'], n: 60, speed: 0.32, sway: 0.4, size: 1 },
  otono: { kind: 'fall', cols: ['#ff9a3a', '#e0602a', '#ffd06a'], n: 30, speed: 0.26, sway: 1, size: 2 },
  cristal: { kind: 'twinkle', cols: ['#bfefff', '#e0d0ff', '#ffffff'], n: 40, speed: 0, sway: 0, size: 1 },
  oceano: { kind: 'rise', cols: ['#bfe8ff', '#8fd0ff', '#ffffff'], n: 40, speed: 0.28, sway: 0.6, size: 2 },
  espacio: { kind: 'twinkle', cols: ['#ffffff', '#cfe6ff', '#ffe0a0'], n: 60, speed: 0, sway: 0, size: 1 },
  dulce: { kind: 'fall', cols: ['#ff7eb6', '#ffd86b', '#7ae7ff', '#c9a8ff'], n: 30, speed: 0.24, sway: 0.5, size: 2 },
};
interface P { x: number; y: number; p: number; v: number; c: string }
const PX = gridPx();

export function mountAmbient(host: HTMLElement, top: () => number): { set(b: Biome): void; stop(): void } {
  const cv = document.createElement('canvas');
  cv.className = 'ambient'; cv.setAttribute('aria-hidden', 'true');
  host.append(cv);
  const g = cv.getContext('2d')!;
  let look = LOOK.flores, W = 0, H = 0, raf = 0, last = 0, stopped = false;
  let ps: P[] = [];
  const seed = () => {
    ps = Array.from({ length: look.n }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6.28, v: 0.6 + Math.random() * 0.8, c: look.cols[Math.floor(Math.random() * look.cols.length)] }));
  };
  const size = () => {
    const t = top();
    cv.style.top = `${t}px`; cv.style.height = `calc(100% - ${t}px)`;
    W = Math.max(40, Math.ceil(host.clientWidth / PX)); H = Math.max(40, Math.ceil((host.clientHeight - t) / PX));
    cv.width = W; cv.height = H; seed();
  };
  const frame = (t: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    if (t - last < 66) return;
    const dt = Math.min(100, t - last) / 33; last = t;
    g.clearRect(0, 0, W, H);
    for (const q of ps) {
      if (look.kind === 'fall') { q.y += look.speed * q.v * dt * 2; q.x += Math.sin(t / 900 + q.p) * look.sway * 0.35 * dt; if (q.y > H + 2) { q.y = -2; q.x = Math.random() * W; } }
      else if (look.kind === 'rise') { q.y -= look.speed * q.v * dt * 2; q.x += Math.sin(t / 700 + q.p) * look.sway * 0.3 * dt; if (q.y < -2) { q.y = H + 2; q.x = Math.random() * W; } }
      else if (look.kind === 'float') { q.x += Math.sin(t / 1300 + q.p) * look.sway * 0.4 * dt; q.y += Math.cos(t / 1700 + q.p * 2) * look.sway * 0.3 * dt; }
      if (q.x < -2) q.x = W + 1; else if (q.x > W + 2) q.x = -1;
      if (q.y < -3) q.y = H; else if (q.y > H + 3) q.y = -2;
      g.fillStyle = q.c;
      const a = look.kind === 'twinkle' ? 0.25 + 0.75 * Math.max(0, Math.sin(t / 500 + q.p * 3)) : look.kind === 'float' ? 0.35 + 0.65 * Math.max(0, Math.sin(t / 450 + q.p * 3)) : 0.85;
      g.globalAlpha = a;
      const x = Math.round(q.x), y = Math.round(q.y);
      g.fillRect(x, y, look.size, look.size === 2 ? 1 : 1);
      if (look.kind === 'twinkle' && a > 0.9) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
    }
    g.globalAlpha = 1;
  };
  size();
  const start = () => { if (!reducedMotion() && !stopped && !document.hidden) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } };
  const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else start(); };
  const ro = new ResizeObserver(size); ro.observe(host);
  document.addEventListener('visibilitychange', vis);
  start();
  return {
    set(b) { const n = LOOK[b] ?? LOOK.flores; if (n !== look) { look = n; seed(); } },
    stop() { stopped = true; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); cv.remove(); },
  };
}
