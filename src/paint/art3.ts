import { makeNoise } from '../core/noise';
import { mulberry32 } from '../core/rng';
import type { Template } from './model';
import { Art, BARK, clipY, ell, finish, furT, GREEN, H, INK, litT, poly, R, roughen, seg, tone, union, type ColorFn } from './art';

/** Tercera tanda: decorados de los biomas nuevos (mar, espacio, dulces) y mas dibujos detallados. */
const CORAL = R('#4a0f5a', '#7a1f8a', '#b03fb8', '#e070d0', '#ffa8ec');
const SEA = R('#02041a', '#050b30', '#0a1a50', '#123078', '#1d4aa0');
const PLANET = R('#1a1060', '#2f2aa8', '#5a4ae0', '#8a7cff', '#c4b8ff', '#f0ecff');
const CANDY = R('#5a1050', '#9a2a8a', '#d050c0', '#f08ae0', '#ffc8f4');

// ---------- decorados ----------
function coral(): Template {
  const a = new Art(36, 36), n = makeNoise(71);
  const br = (x1: number, y1: number, x2: number, y2: number, r: number) => seg(x1, y1, x2, y2, r, r * 0.7);
  const shape = union(br(18, 35, 18, 18, 2.6), br(18, 26, 9, 14, 2), br(18, 22, 27, 10, 2), br(9, 14, 6, 6, 1.6), br(27, 10, 30, 3, 1.4), br(18, 18, 17, 6, 1.8), br(12, 30, 5, 22, 1.8), br(24, 30, 31, 22, 1.8));
  a.fill(roughen(shape, n, 0.4, 1.4), (x, y, s) => tone(CORAL, litT(s) + (n.value(x / 1.3, y / 1.3) > 0.75 ? 0.3 : 0), x, y), 2.2);
  a.outline(INK, 0.6);
  return finish(a, 'coral', 'Coral', 16, { price: 0 });
}

function alga(): Template {
  const a = new Art(28, 44), n = makeNoise(72);
  for (const [x0, ph, h] of [[9, 0, 40], [16, 1.7, 34], [21, 3.1, 28]] as const) {
    let d = (_x: number, _y: number) => Infinity;
    for (let y = 43; y > 43 - h; y -= 3) {
      const sx = x0 + Math.sin(y * 0.25 + ph) * 3, nx = x0 + Math.sin((y - 3) * 0.25 + ph) * 3, prev = d, s2 = seg(sx, y, nx, y - 3, 1.8 - (43 - y) / h);
      d = (x, yy) => Math.min(prev(x, yy), s2(x, yy));
    }
    a.fill(d, (x, y, s) => tone(GREEN, litT(s, 0.05) + (n.value(x, y / 2) - 0.5) * 0.4, x, y), 1.6);
  }
  a.outline(INK, 0.6);
  return finish(a, 'alga', 'Algas', 14, { price: 0 });
}

function planeta(): Template {
  const a = new Art(44, 36), n = makeNoise(73);
  const ring = (front: boolean) => a.fill((x, y) => {
    const u = (x - 22) / 21, v = (y - 18) / 6.5, r = Math.hypot(u, v);
    if (r > 1 || r < 0.72) return 1;
    return front === (y > 18) ? -1 : 1;
  }, (x, y) => tone(R('#3a2a7a', '#7a6ad0', '#b8acf6', '#e8e2ff'), 0.5 + Math.sin(Math.hypot((x - 22) / 21, (y - 18) / 6.5) * 40) * 0.25 + (x < 22 ? 0.2 : -0.1), x, y));
  ring(false);
  a.fill(ell(22, 18, 12, 12), (x, y, s) => tone(PLANET, litT(s) + Math.sin(y * 0.9 + n.fbm(x / 5, y / 5) * 4) * 0.12, x, y), 10);
  ring(true);
  a.outline(INK, 0.55);
  return finish(a, 'planeta', 'Planeta con anillos', 20, { price: 20 });
}

function cohete(): Template {
  const a = new Art(30, 46);
  const hull = R('#5a5a80', '#9a9ac0', '#d6d6ee', '#ffffff');
  const red = R('#4a1060', '#7a2fa8', '#a75ae0', '#d0a0ff');
  a.fill(union(poly([[6, 34], [10, 26], [10, 36]]), poly([[24, 34], [20, 26], [20, 36]])), (x, y, s) => tone(red, litT(s), x, y), 2);
  a.fill(union(ell(15, 22, 6, 15), clipY(ell(15, 30, 6, 8), -9, 36)), (x, y, s) => tone(y < 12 ? red : hull, litT(s, 0.1), x, y), 5);
  a.fill(ell(15, 20, 3, 3), (x, y) => tone(R('#0a1a50', '#2a6ad0', '#8ad8ff'), 1 - (y - 17) / 6, x, y));
  a.fill(poly([[11, 36], [19, 36], [17, 39], [13, 39]]), () => H('#3a3a5a'));
  a.fill(poly([[12, 39], [18, 39], [15, 46]]), (x, y) => tone(R('#ff6a2a', '#ffb84a', '#fff2b8'), 1 - (y - 39) / 7, x, y, 0.5));
  a.outline(INK, 0.6);
  return finish(a, 'cohete', 'Cohete', 16, { price: 20 });
}

function piruleta(): Template {
  const a = new Art(28, 44);
  a.fill(seg(14, 43, 14, 22, 1.2), () => H('#efe8ff'));
  a.fill(ell(14, 13, 12, 12), (x, y, s) => {
    const ang = Math.atan2(y + 0.5 - 13, x + 0.5 - 14), r = Math.hypot(x + 0.5 - 14, y + 0.5 - 13);
    const sw = Math.sin(ang * 2 + r * 0.55) > 0;
    return tone(sw ? CANDY : R('#2a3a9a', '#4a6ae0', '#8ab0ff', '#d6e6ff'), litT(s, 0.05), x, y);
  }, 6);
  a.outline(INK, 0.6);
  a.set(9, 7, H('#ffffff')); a.set(10, 6, H('#ffffff'));
  return finish(a, 'piruleta', 'Piruleta', 16, { price: 0 });
}

function cupcake(): Template {
  const a = new Art(34, 38), n = makeNoise(75);
  a.fill(poly([[7, 22], [27, 22], [24, 37], [10, 37]]), (x, y, s) => tone(R('#3a1a5a', '#5a2f8a', '#8a5ac0', '#b48ae6'), litT(s) + (x % 3 === 0 ? -0.25 : 0), x, y), 2);
  a.fill(roughen(union(ell(17, 20, 12, 5), ell(17, 15, 9, 5), ell(17, 10, 5.5, 4)), n, 0.5, 1.6), (x, y, s) => tone(CANDY, litT(s, 0.15), x, y), 4);
  for (const [x, y, c] of [[12, 18, '#7dd3fc'], [20, 15, '#ffd86b'], [15, 12, '#a5f3fc'], [23, 19, '#ffffff'], [10, 21, '#ffd86b']] as const) a.set(x, y, H(c));
  a.fill(ell(17, 5, 2.6, 2.6), (x, y, s) => tone(R('#5a0a2a', '#a01a4a', '#e04a7a'), litT(s), x, y), 2);
  a.outline(INK, 0.6);
  return finish(a, 'cupcake', 'Cupcake', 18, { price: 0 });
}

// ---------- dibujos grandes ----------
function pulpo(): Template {
  const a = new Art(64, 64), n = makeNoise(81), rng = mulberry32(81);
  const skin = R('#2a0a4a', '#4a1a7a', '#7a2fb0', '#a85ae0', '#d29aff', '#f2e0ff');
  const ff: ColorFn = (x, y, s) => tone(skin, litT(s) + (n.value(x / 1.7, y / 1.7) > 0.78 ? 0.3 : 0), x, y);
  for (let k = 0; k < 8; k++) {
    const base = 20 + k * 3.4, dir = (base - 32) / 12, ph = k * 0.9;
    let d = (_x: number, _y: number) => Infinity;
    let px = base, py = 36;
    for (let t = 1; t <= 10; t++) {
      const nx = base + dir * t * 2.2 + Math.sin(t * 0.8 + ph) * 2, ny = 36 + t * 2.5 - (t > 8 ? (t - 8) * 2.5 : 0);
      const prev = d, sg = seg(px, py, nx, ny, 3 - t * 0.24, 3 - (t + 1) * 0.24);
      d = (x, y) => Math.min(prev(x, y), sg(x, y));
      px = nx; py = ny;
    }
    a.fill(d, ff, 2);
  }
  a.fill(roughen(union(ell(32, 22, 15, 16), ell(32, 34, 13, 6)), n, 0.3, 2), ff, 10);
  for (const ex of [26, 38]) {
    a.fill(ell(ex, 29, 3.4, 3.6), () => H('#fbf8ff'));
    a.fill(ell(ex + 0.5, 29.6, 2, 2.6), () => INK);
    a.set(ex, 28, H('#ffffff'));
  }
  a.line(30, 35, 34, 35, H('#2a0a4a'));
  a.outline(INK);
  a.bg((x, y) => (rng() < 0.012 ? H('#5f7fd6') : y > 60 && n.value(x / 3, 2) > 0.4 ? tone(R('#1a1240', '#2c1f6a'), 0.5, x, y) : tone(SEA, 0.9 - y / 70, x, y)));
  return finish(a, 'pulpo', 'Pulpo', 28, { price: 110 });
}

function tortuga(): Template {
  const a = new Art(64, 64), n = makeNoise(82), rng = mulberry32(82);
  const shell = R('#1a2a1a', '#2f4a22', '#4a6a2a', '#7a8a3a', '#b0b050', '#e0d890');
  const skin = R('#1a3a3a', '#2a5a5a', '#4a8a7a', '#7ab8a0', '#b8e0c8');
  for (const [x1, y1, x2, y2] of [[22, 26, 8, 16], [40, 28, 54, 18], [24, 42, 14, 50], [40, 42, 48, 50]]) a.fill(union(seg(x1, y1, x2, y2, 4, 2.4)), (x, y, s) => tone(skin, litT(s) + (n.value(x / 1.5, y / 1.5) > 0.7 ? -0.2 : 0), x, y), 3);
  a.fill(union(ell(50, 34, 6.5, 5.5), seg(44, 34, 50, 34, 4)), (x, y, s) => tone(skin, litT(s, 0.05), x, y), 4);
  a.fill(ell(52, 32.5, 1.3, 1.3), () => INK);
  a.fill(ell(30, 34, 16, 12.5, -0.05), (x, y, s) => {
    const [d1, d2] = n.worley(x / 5.5, y / 5);
    if (d2 - d1 < 0.1) return shell[0];
    return tone(shell, litT(s) + (0.4 - d1) * 0.6, x, y);
  }, 8);
  a.outline(INK, 0.6);
  a.bg((x, y) => {
    if (rng() < 0.01) return H('#a5ecff');
    const ray = Math.sin((x - y * 0.4) * 0.3) > 0.88;
    return tone(R('#041a3a', '#08305a', '#0e4a80', '#1a6aa8', '#3a90c8'), 0.95 - y / 64 + (ray ? 0.18 : 0), x, y);
  });
  return finish(a, 'tortuga', 'Tortuga marina', 28, { price: 120 });
}

function ciervo(): Template {
  const a = new Art(64, 64), n = makeNoise(83);
  const fur = R('#3a1a0a', '#6a3a18', '#9a5a2a', '#c4823e', '#e2aa66', '#f6d6a2');
  const ant = R('#3a2a20', '#6a5440', '#a08868', '#d6c4a0');
  const ff = (off = 0): ColorFn => (x, y, s) => tone(fur, litT(s, off) + furT(n, x, y, 0.25), x, y);
  for (const m of [1, -1]) {
    const X = (v: number) => 32 + (v - 32) * m;
    a.fill(union(seg(X(27), 14, X(18), 4, 1.3, 0.9), seg(X(22), 9, X(14), 8, 1, 0.6), seg(X(19), 5, X(20), 0, 0.9, 0.5), seg(X(24), 11, X(26), 3, 0.9, 0.5)), (x, y, s) => tone(ant, litT(s), x, y), 1.5);
    a.fill(roughen(ell(X(19), 20, 6.5, 3.2, 0.4 * m), n, 0.4, 1.5), ff(-0.05), 3);
    a.fill(ell(X(19.5), 20, 3.8, 1.6, 0.4 * m), () => H('#e8b8c0'));
  }
  a.fill(roughen(union(ell(32, 60, 17, 10), ell(32, 48, 9, 9)), n, 1, 1.4), ff(), 8);
  a.fill(roughen(ell(32, 54, 6, 7), n, 0.8, 1.4), ff(0.35), 4);
  a.fill(roughen(union(ell(32, 25, 10, 9), ell(32, 34, 6.5, 8)), n, 0.5, 1.5), ff(0.05), 7);
  a.fill(ell(32, 38, 4.5, 3.5), ff(0.35), 3);
  a.fill(ell(32, 39.5, 2.8, 2), (x, y, s) => tone(R('#08070d', '#26202e', '#544a5e'), litT(s), x, y), 2);
  for (const ex of [27, 37]) { a.fill(ell(ex, 27, 2.2, 2.5), () => INK); a.set(ex - 1, 26, H('#ffffff')); }
  for (const [x, y] of [[29, 18], [35, 19], [32, 21]]) a.set(x, y, H('#f6d6a2'));
  a.outline(INK);
  return finish(a, 'ciervo', 'Ciervo del bosque', 28, { price: 110 });
}

function koala(): Template {
  const a = new Art(64, 64), n = makeNoise(84);
  const fur = R('#2a2a3a', '#4a4a60', '#707088', '#9a9ab0', '#c8c8d8', '#eeeef6');
  const ff = (off = 0): ColorFn => (x, y, s) => tone(fur, litT(s, off) + furT(n, x, y, 0.3), x, y);
  a.fill(roughen(union(seg(46, 64, 50, 20, 4, 3.5), ell(54, 28, 6, 2.5, -0.5)), n, 0.5, 2), (x, y, s) => tone(BARK, litT(s) + (n.fbm(x / 2, y / 6) - 0.5) * 0.6, x, y), 3);
  for (const [x, y] of [[56, 22], [58, 30], [44, 18]]) a.fill(ell(x, y, 4, 1.8, 0.6), (xx, yy, s) => tone(GREEN, litT(s, 0.1), xx, yy), 2);
  a.fill(roughen(ell(34, 50, 14, 12), n, 1, 1.4), ff(), 8);
  a.fill(roughen(ell(34, 52, 7, 7), n, 0.8, 1.4), ff(0.35), 4);
  a.fill(roughen(ell(44, 44, 5, 3.5, -0.6), n, 0.6, 1.4), ff(-0.05), 3);
  for (const m of [1, -1]) {
    a.fill(roughen(ell(32 + 14 * m, 18, 8, 7.5), n, 1.4, 1.2), ff(-0.05), 4);
    a.fill(roughen(ell(32 + 14 * m, 18.5, 4.5, 4.5), n, 0.8, 1.2), ff(0.4), 3);
  }
  a.fill(roughen(ell(32, 28, 13, 11.5), n, 0.6, 1.4), ff(0.05), 8);
  a.fill(ell(32, 31, 4.2, 5.4), (x, y, s) => tone(R('#08070d', '#1e1a28', '#3e3650', '#6a6080'), litT(s), x, y), 3);
  for (const ex of [25.5, 38.5]) { a.fill(ell(ex, 26, 1.8, 2), () => INK); a.set(ex - 1, 25, H('#ffffff')); }
  a.outline(INK);
  return finish(a, 'koala', 'Koala dormilón', 26, { price: 90 });
}

function colibri(): Template {
  const a = new Art(64, 64), n = makeNoise(85);
  const body = R('#0a2a3a', '#0f4a5a', '#1a7a8a', '#2ab0b8', '#6ae0d8', '#c8fff4');
  const throat = R('#3a0a5a', '#6a1a9a', '#a03ad8', '#d07aff');
  const flower = R('#2a0a4a', '#5a1a8a', '#8a3ac8', '#b87aee', '#e6c4ff');
  a.fill(union(seg(14, 63, 18, 44, 1.2), ell(12, 52, 5, 2, 0.6)), (x, y, s) => tone(GREEN, litT(s), x, y), 2);
  for (let k = 0; k < 6; k++) { const ang = Math.PI * 0.6 + k * 0.32; a.fill(ell(18 + Math.cos(ang) * 6, 40 + Math.sin(ang) * 6, 4.5, 2.2, ang), (x, y, s) => tone(flower, litT(s, 0.1), x, y), 2.5); }
  a.fill(roughen(union(ell(44, 18, 15, 6, -0.6), ell(48, 26, 12, 4.5, -0.25)), n, 0.4, 1.3), (x, y, s) => tone(R('#4a6a8a', '#7a9ab8', '#b0c8e0', '#e0ecf8'), litT(s, 0.15) + ((x + y) % 3 === 0 ? -0.2 : 0), x, y), 3);
  a.fill(poly([[46, 40], [56, 48], [52, 50], [44, 44]]), (x, y, s) => tone(body, litT(s, -0.15), x, y), 2);
  a.fill(ell(40, 36, 10, 6.5, 0.55), (x, y, s) => tone(body, litT(s) + (n.value(x / 1.4, y / 1.4) - 0.5) * 0.4, x, y), 6);
  a.fill(ell(33, 30, 5.5, 5), (x, y, s) => tone(body, litT(s, 0.05), x, y), 4);
  a.fill(clipY(ell(35, 33, 4.5, 3.5), 31), (x, y, s) => tone(throat, litT(s, 0.15) + (n.value(x, y) - 0.5) * 0.4, x, y), 3);
  a.fill(seg(29, 29.5, 20, 33, 0.8, 0.4), () => H('#1a1426'));
  a.fill(ell(32.5, 28.5, 1.2, 1.2), () => INK); a.set(32, 28, H('#ffffff'));
  a.outline(INK, 0.6);
  return finish(a, 'colibri', 'Colibrí', 28, { price: 100 });
}

function faro(): Template {
  const a = new Art(64, 64), n = makeNoise(86), rng = mulberry32(86);
  const sky = R('#03021a', '#070532', '#0d0a48', '#1a1460', '#2a1f78');
  const tower = R('#2a2450', '#4a4280', '#8a82c0', '#d8d4f4', '#ffffff');
  const stripe = R('#2a0a4a', '#4a1a7a', '#7a3ab8', '#a86ae0');
  // haz de luz
  a.fill((x, y) => { const dx = x - 36, dy = y - 16; return dy > 4 || dy < -10 || dx < 0 ? 1 : Math.abs(dy - dx * 0.12) - dx * 0.18; }, (x, y) => tone(R('#3a3a7a', '#6a6ab0', '#b8b8e8'), 0.9 - (x - 36) / 40, x, y, 0.8));
  a.fill(poly([[23, 50], [41, 50], [37, 20], [27, 20]]), (x, y, s) => tone(Math.floor((y - 20) / 7) % 2 ? stripe : tower, litT(s), x, y), 4);
  a.fill(poly([[25, 20], [39, 20], [39, 12], [25, 12]]), (x, y) => tone(R('#ffb84a', '#ffd86b', '#fff2b8', '#ffffff'), 1 - Math.abs(x + 0.5 - 32) / 9, x, y, 0.6));
  a.fill(poly([[23, 12], [41, 12], [32, 5]]), (x, y, s) => tone(stripe, litT(s), x, y), 2);
  a.fill(poly([[22, 21], [42, 21], [42, 23], [22, 23]]), () => H('#1a1438'));
  a.fill(roughen(union(ell(32, 58, 26, 9), ell(12, 56, 12, 6)), n, 1, 2), (x, y, s) => tone(R('#0a0820', '#16123a', '#2a2458', '#433a80'), litT(s), x, y), 4);
  a.outline(INK, 0.5);
  a.bg((x, y) => {
    if (y > 52) return tone(R('#020418', '#08123a', '#122a6a'), 0.6 - (y - 52) / 30 + (Math.sin(x * 0.9 + y) > 0.85 ? 0.3 : 0), x, y);
    if (rng() < 0.025) return rng() < 0.5 ? H('#ffffff') : H('#a8d4ff');
    return tone(sky, y / 56 + (n.fbm(x / 10, y / 6) - 0.5) * 0.3, x, y);
  });
  a.fill(ell(52, 9, 4, 4), (x, y, s) => tone(R('#c8c0a0', '#f0e8c8', '#fffbea'), litT(s, 0.2), x, y), 3);
  return finish(a, 'faro', 'Faro en la noche', 30, { price: 150 });
}

function astronauta(): Template {
  const a = new Art(64, 64), n = makeNoise(87), rng = mulberry32(87);
  const suit = R('#4a4a6a', '#7a7a9a', '#b0b0c8', '#e0e0ee', '#ffffff');
  a.bg((x, y) => (rng() < 0.03 ? H(rng() < 0.5 ? '#ffffff' : '#c4b5fd') : tone(R('#02010e', '#07052a', '#0d0a40', '#1a1458'), 0.2 + n.fbm(x / 12, y / 12) * 0.9, x, y)));
  a.fill(ell(50, 50, 11, 11), (x, y, s) => tone(PLANET, litT(s) + Math.sin(y * 0.8) * 0.1, x, y), 8);
  a.fill(poly([[21, 30], [43, 30], [44, 46], [20, 46]]), (x, y, s) => tone(R('#3a3a5a', '#5a5a7a', '#8a8aa8'), litT(s), x, y), 3);
  for (const m of [1, -1]) {
    a.fill(seg(32 + 11 * m, 32, 32 + 19 * m, 22, 3.6, 3.2), (x, y, s) => tone(suit, litT(s), x, y), 3);
    a.fill(seg(32 + 6 * m, 46, 32 + 9 * m, 58, 4, 3.8), (x, y, s) => tone(suit, litT(s), x, y), 3);
  }
  a.fill(ell(32, 39, 11, 11), (x, y, s) => tone(suit, litT(s, 0.05), x, y), 7);
  a.fill(poly([[28, 36], [36, 36], [36, 42], [28, 42]]), (x, y) => (x === 30 && y === 38 ? H('#ff6a8a') : x === 33 && y === 38 ? H('#7dd3fc') : H('#5a5a7a')));
  a.fill(ell(32, 22, 10, 9.5), (x, y, s) => tone(suit, litT(s, 0.05), x, y), 6);
  a.fill(ell(32, 23, 7, 6), (x, y) => tone(R('#0a1a50', '#1a3a90', '#3a6ae0', '#7aa8ff', '#e0f0ff'), 0.9 - (y - 17) / 10 - (x - 25) / 30, x, y, 0.7));
  a.set(28, 19, H('#ffffff')); a.set(29, 19, H('#ffffff')); a.set(28, 20, H('#ffffff'));
  a.outline(INK, 0.5);
  return finish(a, 'astronauta', 'Astronauta', 30, { price: 140 });
}

let built: Template[] | null = null;
export function artTres(): Template[] {
  if (built) return built;
  built = [pulpo(), tortuga(), ciervo(), koala(), colibri(), faro(), astronauta(), coral(), alga(), planeta(), cohete(), piruleta(), cupcake()];
  return built;
}
