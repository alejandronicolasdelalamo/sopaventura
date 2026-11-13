import { makeNoise } from '../core/noise';
import { mulberry32 } from '../core/rng';
import type { Template } from './model';
import { Art, BARK, ell, finish, GREEN, H, INK, LX, LY, LZ, litT, poly, R, roughen, seg, tone, union, type RGB } from './art';

/** Cuarta tanda: decorados variados para que los escenarios no se repitan. */
const STONE = R('#1d1a33', '#322d52', '#4c4673', '#6d6895', '#948fb8', '#bcb8d8');
const WOOD = R('#24120a', '#43240f', '#6a3c1c', '#98602e', '#c48c4c', '#e8bc80');
const BIRCH = R('#3a3448', '#8a8498', '#d0cad8', '#f4f0f8');
const LIME = R('#1a3a0e', '#2f5a14', '#4a7e1c', '#72a42a', '#a6cc40', '#d8ec7a');
const JACA = R('#1e0a46', '#341670', '#52289e', '#7444c8', '#9a70e6', '#c4a6ff', '#ece0ff');
const DARKG = R('#06160c', '#0c2614', '#143a1c', '#1f5226', '#2e6a30', '#45883a');
const VIO = R('#1e0a46', '#3a1680', '#5e30c0', '#8a5ae8', '#b89cff', '#e8deff');
const PINKF = R('#5a1040', '#9a2a70', '#d85aa8', '#f8a0d4', '#ffe0f2');

/** Arbol pequeño de racimos (como los de la referencia) con tronco ramificado. */
function arbolito(id: string, name: string, w: number, h: number, crown: RGB[], trunk: RGB[], seed: number, shape: 'round' | 'tall'): Template {
  const a = new Art(w, h), n = makeNoise(seed), rng = mulberry32(seed);
  const cx = w / 2, base = h - 1;
  const crownCy = shape === 'tall' ? h * 0.42 : h * 0.38, rx = shape === 'tall' ? w * 0.26 : w * 0.42, ry = shape === 'tall' ? h * 0.36 : h * 0.3;
  a.fill(union(seg(cx, base, cx - 0.5, crownCy + ry * 0.3, w * 0.07, w * 0.045), seg(cx, crownCy + ry * 0.5, cx - rx * 0.5, crownCy, w * 0.03, w * 0.015), seg(cx, crownCy + ry * 0.4, cx + rx * 0.5, crownCy - ry * 0.1, w * 0.03, w * 0.015)),
    (x, y, s) => tone(trunk, litT(s) + (trunk === BIRCH && (y * 7 + x) % 9 === 0 ? -0.6 : (n.fbm(x / 1.3, y / 4) - 0.5) * 0.4), x, y), 2);
  const blobs: { x: number; y: number; r: number }[] = [];
  const count = shape === 'tall' ? 22 : 16;
  for (let i = 0; i < count; i++) {
    const r = Math.min(rx, ry) * (0.35 + rng() * 0.3), t = rng() * Math.PI * 2, k = Math.sqrt(rng());
    blobs.push({ x: cx + Math.cos(t) * k * (rx - r * 0.6), y: crownCy + Math.sin(t) * k * (ry - r * 0.6), r });
  }
  blobs.sort((p, q) => p.y - q.y);
  const sd = (x: number, y: number) => { let d = Infinity; for (const b of blobs) d = Math.min(d, Math.hypot(x - b.x, y - b.y) - b.r); return d + (n.fbm(x / 2.2, y / 2.2, 3) - 0.5) * 4; };
  a.fill(sd, (x, y, s) => {
    const px = x + 0.5, py = y + 0.5;
    let b = blobs[0];
    for (let i = blobs.length - 1; i >= 0; i--) if (Math.hypot(px - blobs[i].x, py - blobs[i].y) < blobs[i].r + 1) { b = blobs[i]; break; }
    const nx = Math.max(-1, Math.min(1, (px - b.x) / b.r)), ny = Math.max(-1, Math.min(1, (py - b.y) / b.r)), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    if (n.value(px / 1.6 + 40, py / 1.6) < (s.d > -2 ? (shape === 'tall' ? 0.15 : 0.28) : 0.04)) return null;
    const [c1] = n.worley(px / 2.4, py / 2.4);
    return tone(crown, ((nx * LX + ny * LY + nz * LZ) + 0.45) / 1.45 + (0.35 - c1) * 0.8 - Math.max(0, (py - crownCy) / ry) * 0.2, x, y);
  }, 3);
  return finish(a, id, name, 20, { price: 0 });
}

function tocon(): Template {
  const a = new Art(32, 26), n = makeNoise(91);
  a.fill(roughen(union(poly([[5, 9], [27, 9], [29, 24], [3, 24]]), ell(4, 23, 4, 2.5), ell(28, 23, 4, 2.5)), n, 0.4, 1.5), (x, y, s) => tone(WOOD, litT(s) + (x % 4 === 0 ? -0.25 : 0), x, y), 3);
  a.fill(ell(16, 9, 11, 4), (x, y) => { const r = Math.hypot((x + 0.5 - 16) / 11, (y + 0.5 - 9) / 4); return tone(R('#6a3c1c', '#b07a44', '#e2b47c', '#f4d8a8'), Math.floor(r * 4) % 2 ? 0.45 : 0.8, x, y, 0.3); });
  a.fill(ell(9, 21, 2.4, 1.8), () => H('#c4e77a'));
  a.outline(INK, 0.65);
  return finish(a, 'tocon', 'Tocón', 14);
}

function tronco(): Template {
  const a = new Art(44, 20), n = makeNoise(92);
  a.fill(seg(6, 11, 38, 11, 6.5), (x, y, s) => tone(WOOD, litT(s) + (n.fbm(x / 6, y / 1.2) - 0.5) * 0.5, x, y), 5);
  a.fill(ell(38, 11, 3, 6.5), (x, y) => { const r = Math.hypot((x + 0.5 - 38) / 3, (y + 0.5 - 11) / 6.5); return tone(R('#6a3c1c', '#b07a44', '#e2b47c'), Math.floor(r * 3) % 2 ? 0.3 : 0.8, x, y, 0.3); });
  for (const [x, y] of [[14, 5], [24, 4], [30, 6]]) a.fill(ell(x, y, 3, 1.6), (xx, yy, s) => tone(GREEN, litT(s, 0.1), xx, yy), 1.5);
  a.outline(INK, 0.65);
  return finish(a, 'tronco', 'Tronco caído', 14);
}

function arbustoFlor(): Template {
  const a = new Art(40, 28), n = makeNoise(93);
  a.fill(roughen(union(ell(12, 18, 10, 9), ell(26, 17, 11, 10), ell(19, 12, 9, 8)), n, 1, 1.6), (x, y, s) => tone(DARKG, litT(s, 0.05) + (0.3 - n.worley(x / 2.4, y / 2.4)[0]) * 0.8, x, y), 5);
  const rng = mulberry32(93);
  for (let i = 0; i < 16; i++) { const x = 4 + rng() * 32, y = 5 + rng() * 18; if (a.get(Math.round(x), Math.round(y))) { a.set(x, y, PINKF[3]); a.set(x + 1, y, PINKF[2]); a.set(x, y - 1, PINKF[4]); } }
  a.outline(INK, 0.6);
  return finish(a, 'arbusto-flor', 'Arbusto en flor', 18);
}

function hierbaAlta(): Template {
  const a = new Art(30, 30), rng = mulberry32(94);
  for (let i = 0; i < 16; i++) {
    const x0 = 3 + rng() * 24, h = 12 + rng() * 16, bend = (rng() - 0.5) * 8;
    a.fill(seg(x0, 29, x0 + bend, 29 - h, 1.1, 0.3), (x, y, s) => tone(LIME, litT(s) + (y / 60), x, y), 1);
    if (i % 5 === 0) a.fill(ell(x0 + bend, 29 - h, 1.3, 2.8), () => H('#5a3216'));
  }
  a.outline(INK, 0.55);
  return finish(a, 'hierba-alta', 'Hierba alta', 14);
}

function piedras(): Template {
  const a = new Art(34, 18), n = makeNoise(95);
  for (const [x, y, rx, ry] of [[9, 12, 7, 5], [21, 13, 8, 4.5], [15, 8, 5, 4], [29, 14, 4, 3]]) a.fill(roughen(ell(x, y, rx, ry), n, 0.5, 1.5), (xx, yy, s) => tone(STONE, litT(s) + (n.value(xx / 2, yy / 2) - 0.5) * 0.3, xx, yy), 3);
  a.outline(INK, 0.6);
  return finish(a, 'piedras', 'Piedras', 12);
}

function valla(): Template {
  const a = new Art(44, 22);
  for (const y of [8, 15]) a.fill(seg(1, y, 43, y, 1.3), (x, yy, s) => tone(WOOD, litT(s, 0.05), x, yy), 1.5);
  for (let x = 4; x < 44; x += 9) a.fill(poly([[x - 2, 21], [x + 2, 21], [x + 2, 4], [x, 1], [x - 2, 4]]), (xx, y, s) => tone(WOOD, litT(s) + (y % 5 === 0 ? -0.2 : 0), xx, y), 2);
  a.outline(INK, 0.6);
  return finish(a, 'valla', 'Valla de madera', 12);
}

function cartel(): Template {
  const a = new Art(30, 36);
  a.fill(seg(15, 8, 15, 35, 1.5), (x, y, s) => tone(WOOD, litT(s, -0.1), x, y), 1.5);
  a.fill(poly([[3, 6], [24, 6], [28, 10], [24, 14], [3, 14]]), (x, y, s) => tone(WOOD, litT(s, 0.1) + (y === 10 ? -0.2 : 0), x, y), 2);
  a.fill(poly([[27, 17], [6, 17], [2, 21], [6, 25], [27, 25]]), (x, y, s) => tone(WOOD, litT(s, 0.05) + (y === 21 ? -0.2 : 0), x, y), 2);
  for (const [x1, x2, y] of [[7, 20, 10], [9, 23, 21]]) for (let x = x1; x < x2; x += 3) a.set(x, y, H('#3a2010'));
  a.outline(INK, 0.6);
  return finish(a, 'cartel', 'Cartel de camino', 14);
}

function pozo(): Template {
  const a = new Art(36, 40), n = makeNoise(96);
  a.fill(union(seg(6, 14, 6, 30, 1.3), seg(30, 14, 30, 30, 1.3)), (x, y, s) => tone(WOOD, litT(s), x, y), 1.5);
  a.fill(poly([[2, 14], [18, 3], [34, 14]]), (x, y, s) => tone(R('#3a0a24', '#6a1a40', '#9a2e5a', '#c8507a'), litT(s) + ((x + y * 2) % 5 === 0 ? -0.2 : 0), x, y), 3);
  a.fill(seg(6, 18, 30, 18, 0.8), () => WOOD[2]); a.fill(seg(18, 18, 18, 24, 0.5), () => H('#d6d4ea'));
  a.fill(union(poly([[3, 26], [33, 26], [32, 39], [4, 39]]), ell(18, 26, 15, 3)), (x, y, s) => { const [d1, d2] = n.worley(x / 3.5, y / 2.5); return tone(STONE, litT(s) + (d2 - d1 < 0.1 ? -0.35 : 0.05), x, y); }, 3);
  a.fill(ell(18, 26, 12, 2), () => H('#0a1a3a'));
  a.outline(INK, 0.6);
  return finish(a, 'pozo', 'Pozo de piedra', 18);
}

function fuente(): Template {
  const a = new Art(42, 34), n = makeNoise(97);
  const water = R('#1a3a8a', '#2f6af0', '#6aa8ff', '#c8e4ff', '#ffffff');
  a.fill(union(ell(21, 27, 19, 6), poly([[2, 27], [40, 27], [39, 32], [3, 32]])), (x, y, s) => tone(STONE, litT(s, 0.1) + (n.value(x / 2, y) - 0.5) * 0.2, x, y), 3);
  a.fill(ell(21, 26, 16, 4), (x, y) => tone(water, 0.5 + Math.sin(x * 0.9 + y * 2) * 0.3, x, y));
  a.fill(union(seg(21, 26, 21, 12, 1.8), ell(21, 12, 6, 2)), (x, y, s) => tone(STONE, litT(s, 0.1), x, y), 2);
  for (const m of [1, -1]) for (let t = 0; t < 1; t += 0.08) a.set(21 + m * t * 9, 9 + t * t * 15 - t * 4, water[3]);
  a.fill(ell(21, 6, 2, 3), () => water[4]);
  a.outline(INK, 0.6);
  return finish(a, 'fuente', 'Fuente', 16);
}

function helado(): Template {
  const a = new Art(26, 40);
  a.fill(poly([[6, 17], [20, 17], [13, 39]]), (x, y) => tone(R('#6a3a10', '#a86a28', '#d8a058', '#f4cc90'), ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) ? 0.2 : 0.7, x, y, 0.3));
  for (const [x, y, r, c] of [[13, 15, 7, PINKF], [9, 9, 5.5, R('#3a1a60', '#6a3ab0', '#a07ae8', '#e0d0ff')], [17, 8, 5.5, R('#0a3a5a', '#1a7ab0', '#5ac0f0', '#d0f4ff')]] as const)
    a.fill(ell(x, y, r, r * 0.9), (xx, yy, s) => (s.light > 0.86 ? c[c.length - 1] : tone(c, litT(s, 0.1), xx, yy)), 4);
  a.fill(ell(13, 3, 2, 2), () => H('#e0304e'));
  a.outline(INK, 0.6);
  return finish(a, 'helado', 'Helado', 18);
}

function caramelo(): Template {
  const a = new Art(36, 20);
  const c = R('#0a3a5a', '#1a7ab0', '#5ac0f0', '#d0f4ff', '#ffffff');
  a.fill(union(poly([[2, 3], [10, 10], [2, 17]]), poly([[34, 3], [26, 10], [34, 17]])), (x, y, s) => tone(c, litT(s, -0.1), x, y), 2);
  a.fill(ell(18, 10, 9, 7), (x, y, s) => tone(Math.floor((x - y + 40) / 3) % 2 ? c : PINKF, litT(s, 0.05), x, y), 5);
  a.outline(INK, 0.6);
  return finish(a, 'caramelo', 'Caramelo', 16);
}

function satelite(): Template {
  const a = new Art(44, 28);
  const panel = R('#0a1440', '#1a2f8a', '#2f5ad0', '#6a9aff');
  for (const x0 of [1, 29]) a.fill(poly([[x0, 8], [x0 + 14, 8], [x0 + 14, 20], [x0, 20]]), (x, y) => tone(panel, (x - x0) % 4 === 0 || (y - 8) % 4 === 0 ? 0.1 : 0.7 - (y - 8) / 30, x, y, 0.4));
  a.fill(seg(15, 14, 29, 14, 0.8), () => H('#9c98c0'));
  a.fill(ell(22, 14, 6, 7), (x, y, s) => tone(R('#4a2a06', '#a87a14', '#e0b02a', '#ffe070', '#fffbe0'), litT(s, 0.1), x, y), 5);
  a.fill(union(seg(22, 7, 26, 1, 0.6), ell(26, 1.5, 1.5, 1.5)), () => H('#d4d2ea'));
  a.outline(INK, 0.6);
  return finish(a, 'satelite', 'Satélite', 18);
}

function coralAzul(): Template {
  const a = new Art(34, 28), n = makeNoise(98);
  const c = R('#0a1a4a', '#14308a', '#2a5ad0', '#5a9aff', '#a8d4ff');
  a.fill(roughen(union(ell(17, 18, 13, 9), ell(10, 12, 6, 6), ell(24, 11, 7, 7), ell(17, 8, 5, 5)), n, 0.8, 1.4), (x, y, s) => { const [d1] = n.worley(x / 2.2, y / 2.2); return tone(c, litT(s) + (d1 < 0.2 ? 0.35 : 0), x, y); }, 5);
  a.outline(INK, 0.6);
  return finish(a, 'coral-azul', 'Coral cerebro', 14);
}

function meteorito(): Template {
  const a = new Art(30, 24), n = makeNoise(99);
  a.fill(roughen(ell(15, 13, 13, 10), n, 1.4, 2), (x, y, s) => {
    const [d1] = n.worley(x / 4, y / 4);
    return tone(VIO, litT(s, -0.1) + (d1 < 0.18 ? -0.35 : 0) + (n.value(x, y) > 0.85 ? 0.4 : 0), x, y);
  }, 7);
  a.outline(INK, 0.6);
  return finish(a, 'meteorito', 'Meteorito', 14);
}

let built: Template[] | null = null;
export function decoVariados(): Template[] {
  if (built) return built;
  built = [
    arbolito('arbol-redondo', 'Árbol frondoso', 46, 52, LIME, BARK, 101, 'round'),
    arbolito('abedul', 'Abedul', 40, 56, R('#3a4a0e', '#5a7a14', '#8aae24', '#c0d84a', '#eef49a'), BIRCH, 102, 'tall'),
    arbolito('jacaranda', 'Jacaranda', 48, 50, JACA, BARK, 103, 'round'),
    arbolito('cipres', 'Ciprés', 26, 58, DARKG, BARK, 104, 'tall'),
    arbolito('arbol-azul', 'Árbol de luz', 44, 50, R('#06163a', '#0c2a66', '#1a4aa0', '#2f78d0', '#5ab0f0', '#a8e4ff', '#e0f8ff'), BARK, 105, 'round'),
    tocon(), tronco(), arbustoFlor(), hierbaAlta(), piedras(), valla(), cartel(), pozo(), fuente(), helado(), caramelo(), satelite(), coralAzul(), meteorito(),
  ];
  return built;
}
