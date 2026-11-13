import { hashStr, mulberry32 } from '../core/rng';
import { THEMES, type ThemeId } from '../data/themes';

const W = 54, H = 96;
const cache = new Map<string, string>();

const hex = (c: string): [number, number, number] => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a: string, b: string, t: number): string => {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
};

type Motif = 'stars' | 'clouds' | 'hearts' | 'notes' | 'blocks' | 'sparks' | 'snow';
const MOTIF: Partial<Record<ThemeId, Motif>> = {
  nosotros: 'hearts', citas: 'hearts', olaf: 'hearts', amaia: 'hearts', taylor: 'stars', lana: 'clouds', mvrk: 'stars', lhaine: 'stars', pantera: 'sparks', gaming: 'sparks',
  minecraft: 'blocks', pokemon: 'sparks', kanye: 'notes', luchork: 'notes', dvalentino: 'notes', adventure: 'clouds', ghibli: 'clouds', granada: 'sparks',
  cercedilla: 'clouds', aot: 'snow', naruto: 'sparks', rickmorty: 'stars', himym: 'clouds', castle: 'stars', rivas: 'clouds', metro: 'sparks', metromad: 'sparks', madrid: 'clouds', gente: 'hearts', comida: 'sparks', animales: 'clouds', roma: 'clouds',
};

const SPRITES: Record<Motif, string[]> = {
  stars: ['.#.', '###', '.#.'],
  clouds: ['.##..', '#####', '#####'],
  hearts: ['.#.#.', '#####', '.###.', '..#..'],
  notes: ['..##', '..#.', '##..', '##..'],
  blocks: ['###', '#.#', '###'],
  sparks: ['#.#', '.#.', '#.#'],
  snow: ['.#.', '###', '.#.'],
};

/** Fondo pixel art propio de cada tema, generado a partir de su paleta (sin imagenes con copyright). */
export function themeBackground(theme: ThemeId): string {
  const hit = cache.get(theme);
  if (hit) return hit;
  const { bg, bg2, accent } = THEMES[theme].palette;
  const rng = mulberry32(hashStr(`bg:${theme}`));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;

  // Cielo en bandas (efecto "dither" por escalones)
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = mix(bg, bg2, i / (bands - 1));
    g.fillRect(0, Math.floor((i * H) / bands), W, Math.ceil(H / bands));
  }
  // Motivo disperso
  const motif = MOTIF[theme] ?? 'sparks';
  const sprite = SPRITES[motif];
  g.fillStyle = mix(accent, '#ffffff', 0.35);
  g.globalAlpha = 0.55;
  const n = motif === 'clouds' ? 4 : 11;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rng() * (W - 6)), y = Math.floor(rng() * (H * 0.6));
    sprite.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === '#') g.fillRect(x + rx, y + ry, 1, 1); }));
  }
  g.globalAlpha = 1;
  // Tres capas de montañas/colinas, cada vez mas oscuras y cercanas
  for (let layer = 0; layer < 3; layer++) {
    g.fillStyle = mix(bg, '#000000', 0.18 + layer * 0.18);
    let h = H * (0.62 + layer * 0.1), v = 0;
    for (let x = 0; x < W; x++) {
      v += (rng() - 0.5) * 2.2;
      v = Math.max(-5, Math.min(5, v));
      h += v * 0.35;
      const top = Math.floor(h + Math.sin(x / (5 + layer * 2) + layer) * 3);
      g.fillRect(x, top, 1, H - top);
    }
  }
  const url = c.toDataURL();
  cache.set(theme, url);
  return url;
}
