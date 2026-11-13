import { makeNoise } from '../core/noise';
import { mulberry32 } from '../core/rng';
import type { Template } from './model';
import { Art, BARK, clipY, ell, finish, furT, GREEN, H, INK, litT, poly, R, roughen, seg, tone, union, type ColorFn } from './art';

/**
 * Segunda tanda de pixel art: decorados del mapa (pinos, palmeras, setas, cristales...)
 * que tambien se pueden pintar (faciles), y mas animales detallados.
 */
const SNOW = R('#5a6a9a', '#8a9ac8', '#c4d0f0', '#eef3ff', '#ffffff');
const STONE = R('#1d1a33', '#322d52', '#4c4673', '#6d6895', '#948fb8', '#bcb8d8');
const CRYS = R('#1b1060', '#2f2aa8', '#3f6df0', '#5fb0ff', '#a5ecff', '#effcff');
const VIOLET = R('#2a0d5a', '#4a1f96', '#6d3fd0', '#9a6cf0', '#c7a8ff', '#efe6ff');

function pino(snow: boolean): Template {
  const a = new Art(32, 44), n = makeNoise(snow ? 52 : 51);
  a.fill(seg(16, 43.5, 16, 34, 2.2, 1.8), (x, y, s) => tone(BARK, litT(s), x, y), 1.5);
  const tiers: [number, number, number][] = [[33, 13, 18], [26, 10.5, 12], [19, 8, 6], [12, 5, 1]];
  for (const [base, hw, top] of tiers) {
    a.fill(roughen(poly([[16 - hw * 1.3, base], [16, top], [16 + hw * 1.3, base]]), n, 0.5, 1.3), (x, y, s) => {
      const snowy = snow && ((s.d > -2.6 + (n.value(x / 1.5, y) - 0.5) * 2 && y < base - 1.5) || (base - y < 1.6 && n.value(x / 2, 3) > 0.4));
      return tone(snowy ? SNOW : GREEN, litT(s, snowy ? 0.15 : -0.08) + (n.fbm(x / 1.4, y / 1.4) - 0.5) * 0.5 + (y > base - 3 ? -0.2 : 0), x, y);
    }, 3);
  }
  a.outline(INK, 0.6);
  return finish(a, snow ? 'pino-nevado' : 'pino', snow ? 'Pino nevado' : 'Pino', 20, { price: 0 });
}

function palmera(): Template {
  const a = new Art(44, 44), n = makeNoise(53);
  const trunk = R('#3a2414', '#5e3c1f', '#86592e', '#ab7a43', '#cc9c5e');
  const pts: [number, number][] = [[24, 43], [23, 36], [21, 29], [20, 22], [21, 15], [23, 11]];
  for (let i = 0; i < pts.length - 1; i++)
    a.fill(seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2.6 - i * 0.25, 2.4 - i * 0.25), (x, y, s) => tone(trunk, litT(s) + (y % 3 === 0 ? -0.35 : 0), x, y), 2);
  const frond = (ang: number, len: number) => {
    const cx = 23, cy = 11, ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len * 0.7 + len * 0.25;
    const mx = (cx + ex) / 2, my = (cy + ey) / 2 - 3;
    a.fill(union(seg(cx, cy, mx, my, 2.6, 2.2), seg(mx, my, ex, ey, 2.2, 0.6)), (x, y, s) => tone(GREEN, litT(s, 0.05) + ((x + y) % 2 ? -0.12 : 0.05) + (n.value(x, y) - 0.5) * 0.3, x, y), 2.5);
  };
  [Math.PI * 0.95, Math.PI * 1.2, Math.PI * 1.5, Math.PI * 1.78, Math.PI * 0.05, Math.PI * 0.6].forEach((g, i) => frond(g, 15 + (i % 2) * 3));
  for (const [x, y] of [[21, 14], [25, 14], [23, 15.5]]) a.fill(ell(x, y, 1.9, 1.9), (xx, yy, s) => tone(R('#3a2414', '#6e4a22', '#9c7038'), litT(s), xx, yy), 1.5);
  a.outline(INK, 0.6);
  return finish(a, 'palmera', 'Palmera', 22, { price: 20 });
}

function roca(): Template {
  const a = new Art(36, 26), n = makeNoise(54);
  a.fill(roughen(union(ell(15, 18, 12, 8), ell(24, 19, 9, 6.5), ell(13, 21, 9, 4.5)), n, 1, 2), (x, y, s) => {
    const moss = y < 15 + (n.fbm(x / 3, 2) - 0.5) * 6 && s.ny < 0.2;
    return tone(moss ? GREEN : STONE, litT(s, moss ? -0.05 : 0) + (n.fbm(x / 2, y / 2) - 0.5) * 0.45, x, y);
  }, 6);
  a.outline(INK, 0.6);
  return finish(a, 'roca', 'Roca con musgo', 16, { price: 0 });
}

function seta(): Template {
  const a = new Art(32, 34), n = makeNoise(55);
  a.fill(roughen(union(ell(16, 27, 6, 7), ell(16, 32, 8, 2.4)), n, 0.4, 2), (x, y, s) => tone(R('#8a80a8', '#bdb6d4', '#e4e0f2', '#fbfaff'), litT(s, 0.1), x, y), 4);
  const cap = clipY(ell(16, 18, 15, 12), -9, 20.5);
  a.fill(cap, (x, y, s) => {
    const [d1] = n.worley(x / 4.2, y / 3.2);
    if (d1 < 0.24 && y < 19) return tone(R('#c9c2e0', '#efeaff', '#ffffff'), litT(s, 0.2), x, y);
    return tone(VIOLET, litT(s) + (n.fbm(x / 2, y / 2) - 0.5) * 0.3, x, y);
  }, 6);
  a.fill(ell(16, 20.6, 13, 1.4), () => H('#3a2a6a'));
  a.outline(INK, 0.6);
  return finish(a, 'seta', 'Seta mágica', 18, { price: 0 });
}

function cristal(): Template {
  const a = new Art(34, 40), n = makeNoise(56);
  const shard = (cx: number, base: number, h: number, w: number, tilt: number) => {
    const pts: [number, number][] = [[cx - w, base], [cx - w + tilt, base - h * 0.75], [cx + tilt, base - h], [cx + w + tilt, base - h * 0.75], [cx + w, base]];
    a.fill(poly(pts), (x, y) => {
      const left = x + 0.5 < cx + tilt * ((base - y) / h);
      const t = (left ? 0.75 : 0.4) + (base - y) / h * 0.2 + (Math.abs(x + 0.5 - (cx + tilt * 0.5)) < 0.8 ? 0.25 : 0) + (n.value(x, y) - 0.5) * 0.2;
      return tone(CRYS, t, x, y, 0.5);
    });
  };
  shard(9, 38, 18, 4, -3); shard(25, 38, 16, 4, 3); shard(17, 39, 30, 5.5, 0); shard(13, 39, 10, 3, -1);
  a.fill(roughen(ell(17, 38.5, 15, 3), n, 0.6, 2), (x, y, s) => tone(STONE, litT(s), x, y), 2);
  a.outline(INK, 0.6);
  a.set(17, 6, H('#ffffff')); a.set(16, 7, H('#ffffff')); a.set(18, 7, H('#ffffff')); a.set(17, 8, H('#ffffff'));
  return finish(a, 'cristal', 'Cristal brillante', 18, { price: 20 });
}

function farola(): Template {
  const a = new Art(26, 50);
  const metal = R('#100c24', '#221c44', '#3a3270', '#5a52a0');
  a.fill(union(seg(13, 48, 13, 14, 1.4), ell(13, 48, 4.2, 1.6), seg(13, 40, 13, 42, 2.2)), (x, y, s) => tone(metal, litT(s), x, y), 1.5);
  a.fill(poly([[7, 13], [13, 6], [19, 13]]), (x, y, s) => tone(metal, litT(s, 0.1), x, y), 2);
  a.fill(poly([[8, 13], [18, 13], [16, 20], [10, 20]]), (x, y) => tone(R('#ffb84a', '#ffd86b', '#fff2b8', '#ffffff'), 0.95 - Math.abs(x + 0.5 - 13) / 7 - (y - 13) / 16, x, y, 0.6));
  a.fill(poly([[9, 20], [17, 20], [16, 22], [10, 22]]), () => metal[1]);
  a.outline(INK, 0.6);
  for (const [x, y] of [[4, 15], [22, 15], [3, 19], [23, 19], [6, 24], [20, 24], [13, 3]]) a.set(x, y, H('#ffe08a'));
  return finish(a, 'farola', 'Farola', 16, { price: 0 });
}

function casita(): Template {
  const a = new Art(44, 42), n = makeNoise(57);
  const wall = R('#5a4a8a', '#7a6ab0', '#a194d4', '#c9c0ee', '#ebe6ff');
  const roof = R('#1f1040', '#341c6a', '#4f2c9a', '#6f45c8', '#9370ea');
  a.fill(seg(34, 14, 34, 6, 2.2), (x, y, s) => tone(STONE, litT(s), x, y), 1.5);
  a.fill(poly([[7, 22], [37, 22], [37, 41], [7, 41]]), (x, y, s) => tone(wall, litT(s, 0.05) + (y % 4 === 0 ? -0.18 : 0) + (n.value(x / 2, y) - 0.5) * 0.2, x, y), 3);
  a.fill(poly([[3, 23], [22, 6], [41, 23]]), (x, y, s) => tone(roof, litT(s) + ((y + Math.floor(x / 4) * 2) % 4 === 0 ? -0.25 : 0), x, y), 3);
  a.fill(poly([[18, 29], [26, 29], [26, 41], [18, 41]]), (x, y, s) => tone(R('#2a1810', '#4a2c1c', '#6e4428'), litT(s), x, y), 2);
  a.set(24, 35, H('#ffd86b'));
  for (const wx of [10, 29]) {
    a.fill(poly([[wx, 27], [wx + 5.5, 27], [wx + 5.5, 33], [wx, 33]]), (x, y) => tone(R('#ffb84a', '#ffd86b', '#fff2b8'), 0.9 - (y - 27) / 8, x, y));
    a.line(wx + 2.5, 27, wx + 2.5, 33, H('#3a2a6a')); a.line(wx, 30, wx + 5, 30, H('#3a2a6a'));
  }
  a.outline(INK, 0.6);
  return finish(a, 'casita', 'Casita con luz', 24, { price: 30 });
}

// ---------- animales nuevos ----------
function conejo(): Template {
  const a = new Art(64, 64), n = makeNoise(61);
  const fur = R('#5a4e66', '#857a92', '#ada3ba', '#d2cadc', '#efeaf4', '#ffffff');
  const pink = R('#a85a78', '#d888a4', '#f5b8cc');
  const ff = (off = 0): ColorFn => (x, y, s) => tone(fur, litT(s, off) + furT(n, x, y, 0.3), x, y);
  a.fill(roughen(union(ell(32, 52, 16, 12), ell(22, 59, 8, 4.5), ell(42, 59, 8, 4.5)), n, 1.2, 1.5), ff(), 9);
  a.fill(roughen(ell(48, 54, 5, 4.5), n, 1.4, 1.2), ff(0.2), 3);
  for (const m of [1, -1]) {
    a.fill(roughen(ell(32 + 8 * m, 14, 4.8, 13, 0.12 * m), n, 0.6, 1.5), ff(), 4);
    a.fill(ell(32 + 8 * m, 15, 2.3, 10, 0.12 * m), (x, y, s) => tone(pink, litT(s) + furT(n, x, y), x, y), 2);
  }
  a.fill(roughen(union(ell(32, 34, 12.5, 11), ell(25, 38, 6, 5), ell(39, 38, 6, 5)), n, 0.9, 1.4), ff(0.05), 8);
  for (const ex of [26.5, 37.5]) {
    a.fill(ell(ex, 33, 2.8, 3.1), () => INK);
    a.fill(ell(ex, 33.2, 2, 2.3), (x, y) => tone(R('#1a0e2a', '#3a1f5a', '#6a3fa0'), (y + 0.5 - 31) / 4, x, y, 0.4));
    a.set(ex - 1, 32, H('#ffffff'));
  }
  a.fill(poly([[30.3, 38], [33.7, 38], [32, 40]]), (x, y) => tone(pink, 1 - (y - 38) / 2.5, x, y));
  a.fill(union(ell(29.5, 41.5, 2.8, 2), ell(34.5, 41.5, 2.8, 2)), ff(0.35), 2);
  for (const ex of [24, 40]) a.fill(ell(ex, 39, 2, 1.2), () => H('#f5b8cc'));
  a.outline(INK);
  a.line(32, 40, 32, 42, H('#5a4e66'));
  return finish(a, 'conejo', 'Conejito', 28, { price: 60 });
}

function pinguino(): Template {
  const a = new Art(64, 64), n = makeNoise(62);
  const dark = R('#0b0c1c', '#181a33', '#272b4f', '#3a4070', '#545c94');
  const white = R('#8890b0', '#bcc2dc', '#e4e8f6', '#ffffff');
  const orange = R('#9a3a08', '#d8641a', '#f59a38', '#ffc870');
  for (const fx of [25, 39]) a.fill(ell(fx, 60, 6, 2.4), (x, y, s) => tone(orange, litT(s), x, y), 2);
  a.fill(roughen(ell(32, 41, 17, 19), n, 0.4, 2), (x, y, s) => tone(dark, litT(s) + furT(n, x, y, 0.15), x, y), 10);
  for (const m of [1, -1]) a.fill(ell(32 + 16 * m, 42, 4, 12, -0.35 * m), (x, y, s) => tone(dark, litT(s, -0.05), x, y), 3);
  a.fill(roughen(ell(32, 45, 11.5, 14.5), n, 0.4, 2), (x, y, s) => tone(white, litT(s, 0.15) + furT(n, x, y, 0.15), x, y), 8);
  a.fill(ell(32, 20, 13, 11.5), (x, y, s) => tone(dark, litT(s, 0.05), x, y), 8);
  for (const m of [1, -1]) a.fill(ell(32 + 5.4 * m, 21, 4.5, 5.4), (x, y, s) => tone(white, litT(s, 0.2), x, y), 3);
  for (const ex of [27, 37]) { a.fill(ell(ex, 20.5, 1.9, 2.3), () => INK); a.set(ex - 1, 19, H('#ffffff')); }
  a.fill(poly([[28, 25.5], [36, 25.5], [32, 31]]), (x, y) => tone(orange, 1 - (y - 25.5) / 5.5, x, y));
  for (const cx of [24, 40]) a.fill(ell(cx, 27, 2.2, 1.4), () => H('#9fb8ff'));
  a.outline(INK);
  return finish(a, 'pinguino', 'Pingüino', 26, { price: 70 });
}

function panda(): Template {
  const a = new Art(64, 64), n = makeNoise(63);
  const black = R('#07070d', '#16161f', '#2a2a38', '#43435a');
  const white = R('#8c8ca4', '#c0c0d4', '#e6e6f2', '#ffffff');
  const bamboo = R('#1f4a22', '#2f6b2a', '#4a8c2f', '#7cbf45', '#b8e07a');
  a.fill(union(seg(49, 63, 52, 30, 2.2), seg(52, 30, 54, 12, 2)), (x, y, s) => tone(bamboo, litT(s) + (y % 9 === 0 ? -0.5 : 0), x, y), 2);
  a.fill(union(ell(56, 22, 5, 2, -0.6), ell(57, 34, 5, 2, 0.5)), (x, y, s) => tone(bamboo, litT(s, 0.1), x, y), 2);
  a.fill(roughen(ell(30, 52, 18, 13), n, 1.2, 1.5), (x, y, s) => tone(Math.abs(x + 0.5 - 30) > 12 || y > 58 ? black : white, litT(s) + furT(n, x, y, 0.2), x, y), 9);
  for (const m of [1, -1]) a.fill(roughen(ell(30 + 13 * m, 16, 5.4, 5), n, 0.6, 1.4), (x, y, s) => tone(black, litT(s), x, y), 3);
  a.fill(roughen(union(ell(30, 30, 15, 13), ell(30, 36, 11, 8)), n, 0.9, 1.4), (x, y, s) => tone(white, litT(s, 0.1) + furT(n, x, y, 0.2), x, y), 9);
  for (const m of [1, -1]) {
    a.fill(ell(30 + 6 * m, 29, 4, 5.2, 0.5 * m), (x, y, s) => tone(black, litT(s, 0.1), x, y), 3);
    a.fill(ell(30 + 6 * m, 28.5, 1.6, 1.8), () => H('#f4f4fa'));
    a.set(30 + 6 * m, 28, H('#07070d'));
  }
  a.fill(ell(30, 35.5, 3.2, 2.2), (x, y, s) => tone(black, litT(s), x, y), 2);
  a.fill(roughen(ell(43, 46, 5.5, 5), n, 0.5, 1.4), (x, y, s) => tone(black, litT(s), x, y), 3);
  a.outline(INK);
  a.line(30, 37, 30, 39, black[1]); a.line(30, 39, 27, 40, black[1]); a.line(30, 39, 33, 40, black[1]);
  return finish(a, 'panda', 'Panda con bambú', 26, { price: 90 });
}

function ballena(): Template {
  const a = new Art(64, 64), n = makeNoise(64), rng = mulberry32(64);
  const sea = R('#02041a', '#050b30', '#0a1a50', '#123078', '#1d4aa0');
  const body = R('#101a4a', '#1c2f7a', '#2c4aa8', '#4672d0', '#6f9cf0');
  const belly = R('#6a7cb0', '#a2b2dc', '#d6deff');
  a.fill(union(poly([[50, 34], [62, 24], [60, 34], [63, 44]]), seg(44, 36, 54, 35, 4, 2)), (x, y, s) => tone(body, litT(s), x, y), 3);
  a.fill(ell(28, 36, 22, 13, -0.05), (x, y, s) => {
    const lowr = y > 38 + (x - 28) * 0.05;
    const groove = lowr && (y - 38) % 2 === 0 && x < 34;
    return tone(lowr ? belly : body, litT(s) + (groove ? -0.3 : 0) + (n.fbm(x / 3, y / 3) - 0.5) * 0.2, x, y);
  }, 9);
  a.fill(ell(30, 46, 7, 2.5, 0.5), (x, y, s) => tone(body, litT(s, -0.1), x, y), 2);
  a.fill(ell(14, 34, 1.6, 1.6), () => INK); a.set(13, 33, H('#ffffff'));
  for (let i = 0; i < 6; i++) a.set(20 + i * 0.6 + (i % 2), 22 - i * 2.2, H(i < 3 ? '#a5ecff' : '#effcff'));
  a.set(19, 20, H('#a5ecff')); a.set(23, 18, H('#a5ecff'));
  a.outline(INK, 0.55);
  a.bg((x, y) => {
    if (rng() < 0.015) return H('#5f7fd6');
    const ray = Math.sin((x * 0.5 + y * 0.2) * 0.6) > 0.9 && y < 30;
    if (y > 58 && n.value(x / 3, 5) > 0.45) return tone(R('#1a1240', '#2c1f6a', '#45309a'), (y - 58) / 6, x, y);
    return tone(sea, 0.95 - y / 64 + (ray ? 0.2 : 0), x, y);
  });
  return finish(a, 'ballena', 'Ballena azul', 28, { price: 130 });
}

let built: Template[] | null = null;
/** Decorados (tambien pintables, faciles) + animales nuevos. */
export function moreArt(): Template[] {
  if (built) return built;
  built = [conejo(), pinguino(), panda(), ballena(), pino(false), pino(true), palmera(), roca(), seta(), cristal(), farola(), casita()];
  return built;
}
export const DECO_IDS = ['pino', 'pino-nevado', 'palmera', 'roca', 'seta', 'cristal', 'farola', 'casita', 'cerezo', 'arbusto', 'arce'] as const;
export type DecoId = (typeof DECO_IDS)[number];
