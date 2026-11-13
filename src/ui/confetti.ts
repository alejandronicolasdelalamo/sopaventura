import { reducedMotion } from './dom';

interface P { x: number; y: number; vx: number; vy: number; s: number; c: string; life: number }

const COLORS = ['#ff7eb6', '#ffd86b', '#8fe3c0', '#a678de', '#7ec8ff', '#fff8e8'];
let canvas: HTMLCanvasElement | null = null;
let parts: P[] = [];
let raf = 0;

function ensure(): CanvasRenderingContext2D {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
  }
  const dpr = 1;   // confeti de pixeles de 4px: no hace falta alta resolucion (mucho mas ligero en movil)
  if (canvas.width !== innerWidth * dpr) { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
  const g = canvas.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}

function loop(): void {
  const g = ensure();
  g.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 20);
  if (parts.length > 160) parts.splice(0, parts.length - 160);
  for (const p of parts) {
    p.vy += 0.22; p.x += p.vx; p.y += p.vy; p.life--;
    g.fillStyle = p.c;
    g.fillRect(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4, p.s, p.s); // alineado a "pixel"
  }
  if (parts.length) raf = requestAnimationFrame(loop);
  else { g.clearRect(0, 0, innerWidth, innerHeight); raf = 0; }
}

/** Confeti pixelado. Con "reducir movimiento" solo un destello corto. */
export function confetti(x = innerWidth / 2, y = innerHeight / 3, count = 70, colors: string[] = COLORS): void {
  const n = reducedMotion() ? Math.min(12, count) : count;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, s: 4 + Math.floor(Math.random() * 2) * 4, c: colors[i % colors.length], life: 70 + Math.random() * 40 });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}

export function confettiRain(ms = 2200): void {
  const end = performance.now() + ms;
  const tick = () => {
    confetti(Math.random() * innerWidth, -10, 4);
    if (performance.now() < end) setTimeout(tick, 120);
  };
  tick();
}
