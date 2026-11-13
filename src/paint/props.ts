import { makeNoise } from '../core/noise';
import type { ThemeId } from '../data/themes';
import type { Template } from './model';
import { Art, clipY, ell, finish, H, INK, litT, poly, R, seg, tone, union, type ColorFn, type RGB, type SD } from './art';

/**
 * Objetos iconicos de cada tema para los escenarios del mapa (la trompa azul y el paraguas
 * amarillo de HIMYM, el ramen de Naruto, la granada de Granada...). ~32-40 px, sombreados
 * por volumen con brillos especulares y contorno selectivo.
 */
type Spr = () => Template;
const mk = (id: string, w: number, h: number, draw: (a: Art) => void): Template => {
  const a = new Art(w, h);
  draw(a);
  a.outline(INK, 0.7);
  return finish(a, `prop-${id}`, id, 22);
};
/** Sombreado con brillo especular (punto blanco donde la luz pega de lleno). */
const sh = (r: RGB[], off = 0, spec = true): ColorFn => (x, y, s) => (spec && s.light > 0.86 ? r[r.length - 1] : tone(r, litT(s, off), x, y));
const ring = (cx: number, cy: number, rx: number, ry: number, th: number): SD => { const e = ell(cx, cy, rx, ry); return (x, y) => Math.abs(e(x, y)) - th; };
const n9 = makeNoise(9);

const BRASS = R('#4a2a06', '#7a4a0c', '#b07a14', '#e0b02a', '#ffe070', '#fffbe0');
const BLUE = R('#06103a', '#0c2276', '#1a3fbc', '#2f6af0', '#6aa8ff', '#c8e4ff', '#ffffff');
const YELLOW = R('#6a4a00', '#a87a00', '#e0b000', '#ffd400', '#ffe86a', '#fffbd0');
const RED = R('#3a0610', '#6e0e20', '#a81a34', '#e0304e', '#ff7a90', '#ffd0d8');
const WHITE = R('#4a4a6a', '#7a7a9a', '#acacc8', '#d8d8ec', '#f4f4fc', '#ffffff');
const WOOD = R('#24120a', '#43240f', '#6a3c1c', '#98602e', '#c48c4c', '#e8bc80');
const VIO = R('#1e0a46', '#3a1680', '#5e30c0', '#8a5ae8', '#b89cff', '#e8deff');
const GRAY = R('#141226', '#2a2746', '#46426a', '#6c6894', '#9c98c0', '#d4d2ea');
const PINK = R('#4a0a34', '#86185e', '#c03a8e', '#ec70b8', '#ffacdc', '#ffe4f4');
const ORANGE = R('#4a1806', '#86300a', '#c45814', '#f08a2a', '#ffbc66', '#fff0cc');
const CYAN = R('#04283a', '#0a4a66', '#147896', '#2ab0c8', '#7ae4f0', '#d4fcff');

const P: Record<string, Spr> = {
  // HIMYM: la trompa (corno frances) azul robada del restaurante
  trompa: () => mk('trompa', 40, 34, a => {
    a.fill(ring(17, 18, 11.5, 10.5, 2.3), sh(BLUE), 2.5);
    a.fill(ring(16, 18, 6.5, 6, 1.5), sh(BLUE, -0.05), 2);
    // campana conica que se abre (como un corno frances de verdad)
    a.fill(seg(24, 24, 35, 27, 2.2, 6.8), sh(BLUE, 0.05), 3.5);
    a.fill(ell(35.2, 27, 2.2, 6.6, -0.25), (x, y) => tone(R('#02051a', '#081446', '#1a3fbc'), 0.2 + (y - 21) / 26, x, y, 0.5));
    a.fill((x, y) => Math.abs(ell(35.2, 27, 2.6, 7, -0.25)(x, y)) - 0.55, () => BLUE[5]);
    for (const x of [13, 17, 21]) { a.fill(seg(x, 3, x, 9, 1.3), sh(BRASS), 1.5); a.fill(ell(x, 3, 1.8, 1), sh(BRASS, 0.2), 1); }
    a.fill(union(seg(6, 9, 11, 13, 1), seg(2, 7, 6, 9, 1.4, 0.9)), sh(BRASS), 1.5);
  }),
  paraguas: () => mk('paraguas', 34, 40, a => {
    a.fill(union(seg(17, 18, 17, 36, 1), seg(17, 36, 13, 38, 1), seg(13, 38, 12, 35, 1)), sh(WOOD), 1.2);
    a.fill(clipY(ell(17, 17, 16, 13), -9, 17), (x, y, s) => {
      const seam = Math.abs(Math.sin(Math.atan2(y + 0.5 - 17, x + 0.5 - 17) * 3)) < 0.12;
      return tone(YELLOW, litT(s) + (seam ? -0.35 : 0) + (Math.floor((x + 2) / 8) % 2 ? -0.08 : 0.06), x, y);
    }, 8);
    for (let x = 2; x < 33; x += 8) a.fill(ell(x + 3, 17, 4, 1.6), (xx, yy) => (yy > 17 ? tone(YELLOW, 0.35, xx, yy) : null));
    a.fill(seg(17, 2, 17, 5, 0.8), sh(WOOD), 1);
  }),
  lupa: () => mk('lupa', 34, 34, a => {
    a.fill(seg(22, 22, 31, 31, 2.8, 3.2), sh(WOOD), 2.5);
    a.fill(seg(20, 20, 23, 23, 2.6), sh(BRASS), 2);
    a.fill(ring(13, 13, 10, 10, 1.8), sh(BRASS), 2.5);
    a.fill(ell(13, 13, 8.3, 8.3), (x, y) => tone(R('#2a4a8a', '#4a7ac0', '#7ab0e8', '#c0e0ff', '#ffffff'), 0.95 - (x + y - 8) / 22, x, y));
    a.line(8, 9, 11, 7, H('#ffffff'));
  }),
  libro: () => mk('libro', 36, 28, a => {
    a.fill(poly([[1, 22], [18, 26], [35, 22], [35, 25], [18, 28], [1, 25]]), sh(RED), 1.5);
    a.fill(poly([[2, 5], [17, 9], [17, 25], [2, 21]]), (x, y, s) => tone(WHITE, litT(s, 0.15) - (17 - x) * 0.01, x, y), 3);
    a.fill(poly([[34, 5], [19, 9], [19, 25], [34, 21]]), (x, y, s) => tone(WHITE, litT(s), x, y), 3);
    for (let y = 11; y < 21; y += 2) { a.line(5, y - 1, 14, y + 1, H('#9a9ab8')); a.line(22, y + 1, 31, y - 1, H('#9a9ab8')); }
    a.fill(seg(26, 7, 26, 14, 0.7), () => H('#e0304e'));
  }),
  ramen: () => mk('ramen', 38, 34, a => {
    a.fill(union(seg(26, 1, 17, 17, 0.8), seg(30, 2, 21, 17, 0.8)), sh(WOOD), 1);
    a.fill(clipY(ell(19, 17, 17, 15), 17), (x, y, s) => tone(RED, litT(s) + (y === 22 || y === 23 ? 0.3 : 0), x, y), 7);
    for (let x = 6; x < 33; x += 4) a.set(x, 22, H('#ffd0d8'));
    a.fill(ell(19, 17, 17, 4.2), (x, y) => tone(R('#8a4a0a', '#c47a1a', '#eeb04a', '#ffe0a0'), 0.45 + Math.sin(x * 1.3 + y * 2) * 0.25, x, y));
    a.fill(ell(13, 16.5, 3.4, 2.2), (x, y) => (Math.hypot(x + 0.5 - 13, (y + 0.5 - 16.5) * 1.5) < 1.6 ? H('#ff6a9a') : H('#fff6ea')));
    a.fill(ell(23, 16.5, 4.5, 1.7), () => H('#3a6a2a'));
    a.fill(poly([[26, 14], [31, 13], [31, 18], [27, 18]]), () => H('#1a1a22'));
  }),
  llave: () => mk('llave', 24, 38, a => {
    a.fill(seg(12, 0, 12, 7, 0.6), () => H('#3a3658'));
    a.fill(ring(12, 11, 5, 5, 1.4), sh(BRASS), 2);
    a.fill(union(seg(12, 16, 12, 35, 1.5), seg(12, 28, 16, 28, 1.2), seg(12, 32, 16, 32, 1.2), seg(16, 28, 16, 32, 1.1)), sh(BRASS), 1.5);
  }),
  espada: () => mk('espada', 24, 40, a => {
    a.fill(poly([[12, 1], [15, 6], [15, 26], [9, 26], [9, 6]]), (x, y) => tone(WHITE, x < 12 ? 0.92 : 0.45 - (y / 80), x, y, 0.4));
    a.line(12, 5, 12, 25, H('#8a8aa8'));
    a.fill(union(seg(3, 27, 21, 27, 1.6), ell(3, 27, 1.8, 2.2), ell(21, 27, 1.8, 2.2)), sh(BRASS), 1.5);
    a.fill(seg(12, 29, 12, 35, 1.5), (x, y, s) => tone(WOOD, litT(s) + (y % 2 ? -0.2 : 0), x, y), 1.5);
    a.fill(ell(12, 37, 2.4, 2.4), sh(BRASS), 2);
  }),
  pico: () => mk('pico', 34, 34, a => {
    a.fill(seg(7, 31, 23, 10, 1.6), (x, y, s) => tone(WOOD, litT(s) + ((x + y) % 4 === 0 ? -0.15 : 0), x, y), 1.5);
    a.fill(union(seg(10, 5, 23, 9, 2.2, 1.8), seg(23, 9, 30, 21, 1.8, 0.8), seg(10, 5, 5, 11, 1.6, 0.6)), sh(CYAN), 2);
  }),
  globos: () => mk('globos', 34, 44, a => {
    for (const [x, y] of [[9, 14], [25, 13], [17, 8]]) a.line(x, y + 8, 17, 42, H('#d6d4ea'));
    for (const [x, y, c] of [[9, 14, RED], [25, 13, BLUE], [17, 8, VIO]] as const) {
      a.fill(ell(x, y, 7, 8.5), sh(c, 0.05), 6);
      a.fill(poly([[x - 1.5, y + 8.5], [x + 1.5, y + 8.5], [x, y + 10.5]]), () => c[1]);
    }
  }),
  huella: () => mk('huella', 30, 28, a => {
    a.fill(union(ell(15, 19, 8, 6.5), ell(11, 21, 4, 4), ell(19, 21, 4, 4)), sh(VIO), 4);
    for (const [x, y, r] of [[5, 11, 3], [11, 6, 3.4], [19, 6, 3.4], [25, 11, 3]]) a.fill(ell(x, y, r, r * 1.2), sh(VIO), 2.5);
  }),
  entradas: () => mk('entradas', 36, 28, a => {
    for (const [dx, dy, c] of [[0, 2, VIO], [5, 7, BLUE]] as const) {
      const t: [number, number][] = [[2 + dx, 4 + dy], [28 + dx, 1 + dy], [30 + dx, 15 + dy], [4 + dx, 18 + dy]];
      a.fill(poly(t), (x, y, s) => { const notch = Math.abs(x - (20 + dx)) < 0.7; return tone(c, litT(s, 0.1) + (notch ? -0.4 : 0) + (y === 9 + dy ? 0.25 : 0), x, y); }, 3);
    }
    a.fill(ell(14, 15, 3, 3), sh(R('#6a0a2a', '#c0306a', '#ff7aa8', '#ffd0e0')), 2);
  }),
  micro: () => mk('micro', 26, 40, a => {
    a.fill(union(seg(13, 18, 13, 34, 1.4), seg(8, 38, 18, 38, 1.4), seg(13, 34, 13, 38, 1)), sh(GRAY), 1.5);
    a.fill(seg(13, 15, 13, 21, 2.4, 1.8), sh(GRAY, 0.1), 2);
    a.fill(ell(13, 9, 7, 8.5), (x, y, s) => tone(GRAY, litT(s, 0.2) + ((x + y) % 2 ? -0.22 : 0.05), x, y), 6);
    a.fill(seg(6, 13, 20, 13, 1), sh(BRASS), 1);
  }),
  nota: () => mk('nota', 30, 34, a => {
    a.fill(union(seg(11, 6, 11, 25, 1.3), seg(25, 3, 25, 22, 1.3)), sh(VIO), 1.5);
    a.fill(poly([[10, 4], [27, 0], [27, 6], [10, 10]]), sh(VIO, 0.1), 2);
    a.fill(ell(7, 26, 5.5, 4.2, -0.4), sh(VIO, 0.1), 4);
    a.fill(ell(21, 23, 5.5, 4.2, -0.4), sh(VIO, 0.1), 4);
  }),
  vinilo: () => mk('vinilo', 34, 34, a => {
    a.fill(ell(17, 17, 16, 16), (x, y, s) => {
      const r = Math.hypot(x + 0.5 - 17, y + 0.5 - 17), ang = Math.atan2(y + 0.5 - 17, x + 0.5 - 17);
      const sheen = Math.abs(Math.sin(ang * 2 - 0.8)) > 0.9;
      return tone(R('#05040a', '#121020', '#22203a', '#3e3a60', '#7a76a8'), (sheen ? 0.7 : 0.25) + (Math.floor(r) % 2 ? 0.08 : 0) + s.light * 0.1, x, y);
    }, 8);
    a.fill(ell(17, 17, 5.5, 5.5), sh(VIO, 0.2), 3);
    a.fill(ell(17, 17, 1, 1), () => H('#05040a'));
  }),
  carta: () => mk('carta', 36, 28, a => {
    a.fill(poly([[2, 5], [34, 5], [34, 26], [2, 26]]), (x, y, s) => tone(WHITE, litT(s, 0.05), x, y), 4);
    a.fill(poly([[2, 5], [34, 5], [18, 17]]), (x, y, s) => tone(WHITE, litT(s, 0.18), x, y), 3);
    a.line(2, 26, 15, 15, H('#a8a8c8')); a.line(34, 26, 21, 15, H('#a8a8c8'));
    a.fill(union(ell(16, 17, 2.6, 2.6), ell(20, 17, 2.6, 2.6), poly([[13.6, 18], [22.4, 18], [18, 22.5]])), sh(RED), 2);
  }),
  ovillo: () => mk('ovillo', 34, 30, a => {
    a.fill(ell(14, 16, 12, 12), (x, y, s) => tone(VIO, litT(s) + (Math.sin((x - y) * 0.9 + Math.sin(x * 0.3) * 2) > 0.5 ? -0.28 : 0.04), x, y), 8);
    a.fill(seg(6, 9, 22, 21, 0.6), () => VIO[4]);
    a.line(25, 22, 29, 25, VIO[3]); a.line(29, 25, 33, 23, VIO[3]); a.line(33, 23, 31, 28, VIO[3]);
  }),
  pescado: () => mk('pescado', 38, 22, a => {
    a.fill(union(ell(16, 11, 14, 7.5), poly([[27, 11], [37, 2], [35, 11], [37, 20]])), (x, y, s) => {
      const scale = x > 9 && x < 27 && (x + (y % 2) * 2) % 4 === 0;
      return tone(R('#14284a', '#2a4a80', '#4a7ac0', '#8ab4e8', '#d0e8ff', '#ffffff'), litT(s) + (scale ? -0.2 : 0) + (y > 13 ? 0.15 : 0), x, y);
    }, 5);
    a.fill(poly([[14, 4], [22, 3], [20, 7]]), sh(R('#14284a', '#2a4a80', '#4a7ac0')), 1);
    a.fill(ell(7, 9, 2, 2), () => H('#ffffff')); a.set(7, 9, INK);
    a.line(10, 6, 10, 15, H('#1f3a6a'));
  }),
  banco: () => mk('banco', 40, 28, a => {
    for (const x of [6, 34]) a.fill(union(seg(x, 6, x, 26, 1.4), seg(x - 2, 26, x + 2, 26, 1)), sh(GRAY), 1.5);
    for (const y of [5, 10]) a.fill(seg(3, y, 37, y, 1.6), (x, yy, s) => tone(WOOD, litT(s) + (x % 9 === 0 ? -0.25 : 0), x, yy), 1.5);
    a.fill(poly([[2, 15], [38, 15], [38, 19], [2, 19]]), (x, y, s) => tone(WOOD, litT(s, 0.1) + (x % 9 === 0 ? -0.25 : 0), x, y), 2);
  }),
  metro: () => mk('metro', 30, 44, a => {
    a.fill(union(seg(15, 18, 15, 42, 1.4), seg(11, 42, 19, 42, 1.2)), sh(GRAY), 1.5);
    a.fill(poly([[15, 1], [28, 11], [15, 21], [2, 11]]), (x, y, s) => tone(RED, litT(s, 0.05), x, y), 4);
    a.fill(poly([[2.5, 8.5], [27.5, 8.5], [27.5, 13.5], [2.5, 13.5]]), (x, y, s) => tone(BLUE, litT(s, 0.1), x, y), 1.5);
    for (const x0 of [6, 10, 14, 18, 22]) a.line(x0, 11, x0 + 1, 11, H('#ffffff'));
  }),
  osito: () => mk('osito', 34, 38, a => {
    const fur = R('#200e06', '#3a1c0a', '#5e3216', '#8a5226', '#b87a40', '#e0a868');
    const f: ColorFn = (x, y, s) => tone(fur, litT(s) + (n9.value(x / 1.4, y / 1.4) - 0.5) * 0.3, x, y);
    a.fill(union(ell(17, 27, 11, 9.5), ell(9, 35, 4.5, 2.5), ell(25, 35, 4.5, 2.5)), f, 7);
    a.fill(union(ell(7, 23, 3.5, 5, 0.4), ell(27, 23, 3.5, 5, -0.4)), f, 3);
    for (const x of [8, 26]) { a.fill(ell(x, 6, 3.6, 3.6), f, 2.5); a.fill(ell(x, 6.5, 1.6, 1.6), () => fur[4]); }
    a.fill(ell(17, 12, 9, 8), f, 6);
    a.fill(ell(17, 15, 4, 3), (x, y, s) => tone(fur, litT(s, 0.35), x, y), 2.5);
    a.fill(ell(17, 13.6, 1.6, 1.1), () => INK);
    a.set(13, 10, INK); a.set(21, 10, INK); a.set(13, 9, H('#ffffff'));
    a.fill(ell(17, 27, 5, 5), (x, y, s) => tone(fur, litT(s, 0.3), x, y), 3);
  }),
  granada: () => mk('granada', 32, 34, a => {
    a.fill(union(poly([[12, 8], [14, 1], [16, 7]]), poly([[16, 7], [18, 1], [20, 8]])), sh(RED, -0.1), 1.5);
    a.fill(ell(16, 20, 13.5, 12.5), (x, y, s) => tone(RED, litT(s) + (n9.value(x / 2, y / 2) - 0.5) * 0.15, x, y), 9);
    a.fill(clipY(ell(21, 23, 7, 6), 19.5), (x, y) => ((x + y) % 2 ? H('#ff4a6a') : (x % 3 ? H('#a0102a') : H('#ffb0c0'))));
    a.fill(seg(14, 20, 28, 20, 0.6), () => H('#fff0d8'));
  }),
  tienda: () => mk('tienda', 44, 34, a => {
    const c1 = R('#2a0636', '#5a0e5a', '#96227e', '#cc44a8', '#f080d0', '#ffd0f0');
    a.fill(poly([[3, 33], [22, 3], [41, 33]]), (x, y) => tone(c1, x < 22 ? 0.78 - y / 120 : 0.32, x, y, 0.5));
    a.fill(poly([[16, 33], [22, 16], [28, 33]]), (x) => (x < 22 ? H('#1a0420') : H('#36082e')));
    a.fill(poly([[22, 16], [28, 33], [31, 33]]), () => c1[4]);
    a.line(22, 3, 22, 0, H('#d6d4ea'));
    a.line(3, 33, 0, 33, H('#d6d4ea')); a.line(41, 33, 43, 33, H('#d6d4ea'));
  }),
  columna: () => mk('columna', 30, 44, a => {
    a.fill(poly([[2, 2], [28, 2], [26, 7], [4, 7]]), (x, y, s) => tone(WHITE, litT(s, 0.05), x, y), 2);
    a.fill(union(ell(6, 6, 3, 3), ell(24, 6, 3, 3)), (x, y, s) => tone(WHITE, litT(s), x, y), 2);
    a.fill(poly([[7, 8], [23, 8], [22, 37], [8, 37]]), (x, y) => tone(WHITE, (x - 7) % 4 === 0 ? 0.2 : 0.9 - (x - 7) / 22, x, y, 0.5));
    a.fill(poly([[3, 37], [27, 37], [29, 43], [1, 43]]), (x, y, s) => tone(WHITE, litT(s), x, y), 2);
    a.fill(poly([[20, 14], [23, 12], [23, 22], [21, 19]]), () => H('#6a6a8a'));
  }),
  concha: () => mk('concha', 34, 30, a => {
    a.fill(clipY(ell(17, 22, 16, 18), -9, 25), (x, y, s) => {
      const rib = Math.abs(Math.sin(Math.atan2(y + 0.5 - 26, x + 0.5 - 17) * 7)) < 0.22;
      return tone(PINK, litT(s, 0.1) + (rib ? -0.32 : 0), x, y);
    }, 8);
    a.fill(poly([[11, 24], [23, 24], [21, 29], [13, 29]]), sh(PINK, -0.1), 2);
  }),
  estrella: () => mk('estrella', 34, 34, a => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 16, an = -Math.PI / 2 + (i * Math.PI) / 5; pts.push([17 + Math.cos(an) * r, 18 + Math.sin(an) * r]); }
    a.fill(poly(pts), (x, y, s) => tone(ORANGE, litT(s) + ((x * 7 + y * 3) % 6 === 0 ? 0.35 : 0), x, y), 4);
  }),
  farolillo: () => mk('farolillo', 24, 40, a => {
    a.fill(union(seg(12, 0, 12, 7, 0.7), ring(12, 4, 2.6, 2.6, 0.6)), sh(GRAY), 1);
    a.fill(poly([[5, 10], [19, 10], [21, 30], [3, 30]]), (x, y) => tone(R('#ff7a1a', '#ffb43a', '#ffe08a', '#fffbe0'), 1 - Math.abs(x + 0.5 - 12) / 9 - Math.abs(y - 20) / 40, x, y, 0.5));
    for (const x of [8, 16]) a.line(x, 10, x - (x < 12 ? 1 : -1), 30, H('#4a3a5a'));
    a.fill(union(poly([[3, 7], [21, 7], [19, 10], [5, 10]]), poly([[2, 30], [22, 30], [20, 34], [4, 34]])), sh(GRAY), 1.5);
    for (const [x, y] of [[1, 18], [23, 16], [0, 24], [23, 26]]) a.set(x, y, H('#ffe08a'));
  }),
  muneco: () => mk('muneco', 32, 42, a => {
    const snow = R('#6a7ab0', '#98a8d6', '#c4d0f0', '#e8eeff', '#ffffff');
    a.fill(union(seg(5, 27, 1, 20, 0.7), seg(27, 27, 31, 20, 0.7)), sh(WOOD), 1);
    a.fill(ell(16, 32, 12, 9.5), sh(snow), 8);
    a.fill(ell(16, 17, 8.5, 7.5), sh(snow), 6);
    for (const y of [27, 31, 35]) a.fill(ell(16, y, 1.2, 1.2), () => H('#2a2440'));
    a.fill(union(seg(7, 22, 25, 22, 1.8), seg(21, 22, 23, 29, 1.6)), (x, y, s) => tone(RED, litT(s) + (x % 3 === 0 ? -0.2 : 0), x, y), 1.5);
    a.fill(poly([[16, 17], [23, 18.5], [16, 20]]), () => H('#f08a2a'));
    a.set(13, 15, INK); a.set(19, 15, INK);
    a.fill(union(poly([[8, 10], [24, 10], [24, 12], [8, 12]]), poly([[10, 10], [22, 10], [21, 2], [11, 2]])), sh(GRAY, -0.1), 2);
  }),
  taza: () => mk('taza', 34, 34, a => {
    a.fill(ell(25, 20, 6, 5.5), (x, y, s) => (Math.hypot((x + 0.5 - 25) / 3.2, (y + 0.5 - 20) / 3) < 1 ? null : tone(VIO, litT(s), x, y)), 2);
    a.fill(poly([[4, 11], [25, 11], [23, 31], [6, 31]]), (x, y, s) => tone(VIO, litT(s, 0.05) + (y === 20 || y === 21 ? 0.3 : 0), x, y), 4);
    a.fill(ell(14.5, 11.5, 10.5, 2.6), () => H('#4a2410'));
    a.fill(ell(12, 11, 3, 1.2), () => H('#ffffff'));
    for (const [x, y] of [[10, 7], [11, 5], [10, 3], [16, 7], [17, 5], [16, 3]]) a.set(x, y, H('#d6d4ea'));
  }),
  donut: () => mk('donut', 36, 30, a => {
    a.fill(ell(18, 15, 16, 12), (x, y, s) => {
      const rr = Math.hypot((x + 0.5 - 18) / 16, (y + 0.5 - 15) / 12);
      if (rr < 0.32) return null;
      const icing = rr < 0.85 - (n9.value(x / 2, y / 2) - 0.5) * 0.2;
      return tone(icing ? PINK : R('#4a1a06', '#8a4214', '#c47a34', '#eab070'), litT(s, 0.05), x, y);
    }, 7);
    for (const [x, y, c] of [[10, 9, '#7dd3fc'], [22, 8, '#ffd86b'], [27, 14, '#ffffff'], [8, 17, '#a5f3fc'], [18, 21, '#ffd86b'], [25, 19, '#7dd3fc'], [14, 7, '#ffffff']] as const) { a.set(x, y, H(c)); a.set(x + 1, y, H(c)); }
  }),
  balon: () => mk('balon', 32, 32, a => {
    a.fill(ell(16, 16, 14.5, 14.5), (x, y, s) => {
      // pentagono central + cinco alrededor (balon clasico)
      const px = x + 0.5, py = y + 0.5;
      const pent = (cx: number, cy: number, r: number, rot: number) => { const an = Math.atan2(py - cy, px - cx) - rot, k = Math.PI / 5; return Math.hypot(px - cx, py - cy) < r * Math.cos(k) / Math.cos(((an % (2 * k)) + 2 * k) % (2 * k) - k); };
      let patch = pent(16, 16, 4.6, -Math.PI / 2);
      for (let i = 0; i < 5 && !patch; i++) { const an = -Math.PI / 2 + Math.PI / 5 + (i * 2 * Math.PI) / 5; patch = pent(16 + Math.cos(an) * 11.5, 16 + Math.sin(an) * 11.5, 4.2, an + Math.PI / 2); }
      const seam = !patch && Math.abs(Math.sin(Math.atan2(py - 16, px - 16) * 5 + Math.PI / 2)) > 0.97 && Math.hypot(px - 16, py - 16) > 5 && Math.hypot(px - 16, py - 16) < 9;
      return patch ? tone(R('#07060e', '#1a1830', '#3a3658'), litT(s), x, y) : tone(seam ? GRAY : WHITE, litT(s, 0.1), x, y);
    }, 9);
  }),
  trofeo: () => mk('trofeo', 34, 40, a => {
    a.fill(poly([[9, 34], [25, 34], [26, 39], [8, 39]]), (x, y, s) => tone(WOOD, litT(s), x, y), 2);
    a.fill(union(seg(17, 22, 17, 33, 2), ell(17, 33, 6, 1.6)), sh(BRASS), 2);
    for (const m of [1, -1]) a.fill(ring(17 + m * 12, 10, 4, 5, 1.2), sh(BRASS), 1.5);
    a.fill(clipY(ell(17, 5, 11, 18), 2), sh(BRASS, 0.05), 7);
    a.fill(poly([[17, 7], [18.5, 10], [21.5, 10], [19, 12], [20, 15], [17, 13], [14, 15], [15, 12], [12.5, 10], [15.5, 10]]), () => H('#fff6c0'));
  }),
  guitarra: () => mk('guitarra', 28, 44, a => {
    a.fill(poly([[11, 0], [17, 0], [17, 5], [11, 5]]), (x, y, s) => tone(WOOD, litT(s, -0.2), x, y), 1.5);
    for (const y of [1, 3]) { a.set(10, y, H('#d6d4ea')); a.set(18, y, H('#d6d4ea')); }
    a.fill(seg(14, 4, 14, 22, 1.6), (x, y, s) => tone(WOOD, litT(s, -0.1) + (y % 3 === 0 ? -0.3 : 0), x, y), 1.5);
    a.fill(union(ell(14, 26, 7.5, 6), ell(14, 35, 10, 7.5)), (x, y, s) => tone(R('#300a50', '#561890', '#8432c8', '#b06aef', '#dcb8ff', '#ffffff'), litT(s), x, y), 6);
    a.fill(ell(14, 29, 3, 3), () => H('#0a0612'));
    a.fill(poly([[10, 36], [18, 36], [18, 38], [10, 38]]), sh(WOOD), 1);
    a.line(14, 4, 14, 37, H('#efe8ff'));
  }),
  tambor: () => mk('tambor', 36, 32, a => {
    a.fill(union(seg(24, 2, 31, 0, 0.8), seg(12, 2, 5, 0, 0.8)), sh(WOOD), 1);
    a.fill(poly([[4, 10], [32, 10], [32, 27], [4, 27]]), (x, y, s) => {
      const zig = Math.abs(((x + (y - 10)) % 8) - 4) < 0.8 || Math.abs(((x - (y - 10) + 80) % 8) - 4) < 0.8;
      return tone(RED, litT(s) + (zig && y > 12 && y < 25 ? 0.4 : 0), x, y);
    }, 4);
    for (const y of [11, 26]) a.fill(seg(4, y, 32, y, 1.2), sh(BRASS), 1);
    a.fill(ell(18, 10, 14, 3.6), sh(WHITE, 0.2), 3);
  }),
};

/** Que objetos iconicos aparecen en cada tema (ids de P o de dibujos ya existentes). */
export const THEME_PROPS: Record<ThemeId, string[]> = {
  himym: ['trompa', 'paraguas'], castle: ['lupa', 'libro'], naruto: ['ramen', 'shuriken'], aot: ['llave', 'muralla'], rickmorty: ['portal'],
  adventure: ['espada', 'flor'], minecraft: ['bloque', 'pico'], pokemon: ['capsula'], gaming: ['mando'], ghibli: ['globos'],
  comida: ['pizza'], animales: ['huella'], citas: ['corazon', 'entradas'], kanye: ['vinilo', 'micro'], luchork: ['micro', 'nota'],
  amaia: ['nota', 'micro'], dvalentino: ['vinilo', 'nota'], mvrk: ['micro'], lhaine: ['nota'], pantera: ['micro', 'vinilo'],
  taylor: ['nota', 'vinilo'], lana: ['vinilo'], nosotros: ['corazon', 'carta'], olaf: ['ovillo', 'pescado', 'huella'],
  rivas: ['banco', 'metro'], metro: ['metro'], metromad: ['metro'], madrid: ['osito', 'metro'], granada: ['granada'],
  cercedilla: ['tienda'], roma: ['columna'], gente: ['globos'], oceano: ['concha', 'estrella'], espacio: ['planeta', 'cohete'],
  bosque: ['farolillo', 'seta'], invierno: ['muneco', 'taza'], postres: ['donut', 'cupcake'], deportes: ['balon', 'trofeo'],
  instrumentos: ['guitarra', 'tambor'],
  ciudades: ['cartel', 'metro', 'fuente'], cine: ['entradas', 'micro'], tiktok: ['micro', 'nota', 'mando'],
};

const cache = new Map<string, Template>();
/** Sprite de objeto iconico por id (null si no es un prop propio). */
export function propSprite(id: string): Template | null {
  if (!P[id]) return null;
  let t = cache.get(id);
  if (!t) { t = P[id](); cache.set(id, t); }
  return t;
}
export const PROP_IDS = Object.keys(P);
/** Sprites ya generados (por el Web Worker): se guardan para no volver a dibujarlos aqui. */
/** `list` va en el mismo orden que PROP_IDS (la clave de la cache es el id del prop, no el de la plantilla). */
export function injectProps(list: (Template | null)[]): void { PROP_IDS.forEach((id, i) => { const t = list[i]; if (t && !cache.has(id)) cache.set(id, t); }); }
