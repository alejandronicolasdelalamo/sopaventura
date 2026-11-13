import { reducedMotion } from './dom';

/**
 * Particulas pixel art (chispas, estallidos, fuegos) en UN solo canvas a resolucion 1x.
 * Solo anima mientras hay particulas vivas; maximo 320 a la vez (ligero en movil).
 */
interface Part { x: number; y: number; vx: number; vy: number; g: number; s: number; c: string; life: number; max: number; kind: 'sq' | 'spark' }
let cv: HTMLCanvasElement | null = null, g: CanvasRenderingContext2D | null = null;
let parts: Part[] = [];
let raf = 0, last = 0;

function ensure(): CanvasRenderingContext2D {
  if (!cv) {
    cv = document.createElement('canvas');
    cv.className = 'fx-layer';
    cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv);
    g = cv.getContext('2d')!;
  }
  if (cv.width !== innerWidth || cv.height !== innerHeight) { cv.width = innerWidth; cv.height = innerHeight; }
  return g!;
}

function loop(t: number): void {
  const c = ensure();
  const dt = Math.min(3, (t - (last || t)) / 16.7); last = t;
  c.clearRect(0, 0, cv!.width, cv!.height);
  for (const p of parts) {
    p.vy += p.g * dt; p.vx *= Math.pow(0.97, dt); p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    const k = Math.max(0, p.life / p.max);
    c.globalAlpha = Math.min(1, k * 1.6);
    c.fillStyle = p.c;
    const s = Math.max(1, Math.round(p.s * (p.kind === 'spark' ? k : 0.5 + k * 0.5)));
    const x = Math.round(p.x / 2) * 2, y = Math.round(p.y / 2) * 2;
    if (p.kind === 'spark') { c.fillRect(x - s, y, s * 2 + 1, 1); c.fillRect(x, y - s, 1, s * 2 + 1); }
    else c.fillRect(x - s / 2, y - s / 2, s, s);
  }
  c.globalAlpha = 1;
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 20);
  if (parts.length) raf = requestAnimationFrame(loop);
  else { raf = 0; last = 0; c.clearRect(0, 0, cv!.width, cv!.height); }
}
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
const push = (p: Part) => { if (parts.length < 320) parts.push(p); };

/** Estallido radial de cuadraditos y chispas. */
export function burst(x: number, y: number, colors: string[], n = 18, power = 1): void {
  if (reducedMotion()) return;
  ensure();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (1.5 + Math.random() * 3.5) * power;
    push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2 * power, g: 0.12, s: 3 + Math.round(Math.random() * 3), c: colors[i % colors.length], life: 28 + Math.random() * 22, max: 50, kind: i % 4 === 0 ? 'spark' : 'sq' });
  }
  kick();
}

/** Destellos que suben suavemente (brillo al acertar). */
export function sparkle(x: number, y: number, color = '#fffbe0', n = 6): void {
  if (reducedMotion()) return;
  ensure();
  for (let i = 0; i < n; i++) push({ x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 0.8, g: 0, s: 3 + Math.round(Math.random() * 2), c: color, life: 30 + Math.random() * 20, max: 50, kind: 'spark' });
  kick();
}

/** Fuego artificial: sube y explota. */
export function firework(x: number, y: number, colors: string[]): void {
  if (reducedMotion()) return;
  setTimeout(() => burst(x, y, colors, 34, 1.5), 0);
  setTimeout(() => sparkle(x, y, colors[0], 8), 120);
}
