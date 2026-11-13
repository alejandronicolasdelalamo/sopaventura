/**
 * Avatares pixel art 24x28 generados por capas. Todo se dibuja en codigo (sin imagenes), asi que es
 * personalizable y pesa casi nada. Los predeterminados se parecen a Nico y a Izana.
 */
export type HairStyle = 'corto' | 'despeinado' | 'largo-ondas' | 'largo-liso' | 'coleta' | 'mono' | 'rizos' | 'calvo';
export type Facial = 'nada' | 'bigote' | 'perilla' | 'barba';
export type Glasses = 'no' | 'gafas' | 'sol';
export type Top = 'camiseta' | 'sudadera' | 'tirantes';

export interface AvatarCfg {
  skin: number; hair: HairStyle; hairColor: number; eyes: number; facial: Facial; freckles: boolean;
  glasses: Glasses; top: Top; topColor: number; necklace: boolean; bg: number;
}

export const SKINS = ['#fbd8c0', '#f0c0a4', '#e0ac8a', '#c68863', '#a06a45', '#6b4429'];
export const HAIR_COLORS = ['#1e1612', '#33231b', '#5a3a24', '#a4452a', '#c8651a', '#e0b860', '#d9d4cc', '#ff7eb6', '#5a8bff', '#a678de'];
export const EYE_COLORS = ['#4b2e1e', '#6b4a2a', '#2f6b3a', '#2f5fa0', '#6b6f75'];
export const TOP_COLORS = ['#7f8794', '#1d2a4a', '#f2e65a', '#d4366f', '#2f7d4f', '#e0457b', '#ffffff', '#1d1b2e', '#c8651a', '#6c8cff'];
export const BG_COLORS = ['#ffd1e6', '#c4d0ff', '#cfeee0', '#ffe9a8', '#e0d0ff', '#d9d9e3'];

export const HAIR_NAMES: Record<HairStyle, string> = {
  corto: 'Corto', despeinado: 'Despeinado', 'largo-ondas': 'Largo ondas', 'largo-liso': 'Largo liso', coleta: 'Coleta', mono: 'Moño', rizos: 'Rizos', calvo: 'Calvo',
};

/** Parecidos a Nico (pelo oscuro despeinado con mullet, bigote y perilla, sudadera gris) e Izana (melena larga ondulada cobriza, pecas, top azul marino, colgante). */
export const DEFAULT_NICO: AvatarCfg = { skin: 1, hair: 'despeinado', hairColor: 1, eyes: 1, facial: 'perilla', freckles: false, glasses: 'no', top: 'sudadera', topColor: 0, necklace: false, bg: 1 };
export const DEFAULT_IZANA: AvatarCfg = { skin: 0, hair: 'largo-ondas', hairColor: 3, eyes: 1, facial: 'nada', freckles: true, glasses: 'no', top: 'tirantes', topColor: 1, necklace: true, bg: 0 };
export const defaultAvatar = (role: 'nico' | 'izana'): AvatarCfg => ({ ...(role === 'nico' ? DEFAULT_NICO : DEFAULT_IZANA) });

export function randomAvatar(rng: () => number): AvatarCfg {
  const p = <T>(a: readonly T[]) => a[Math.floor(rng() * a.length)];
  return {
    skin: Math.floor(rng() * SKINS.length), hair: p(Object.keys(HAIR_NAMES) as HairStyle[]), hairColor: Math.floor(rng() * HAIR_COLORS.length),
    eyes: Math.floor(rng() * EYE_COLORS.length), facial: p<Facial>(['nada', 'nada', 'bigote', 'perilla', 'barba']), freckles: rng() < 0.35,
    glasses: p<Glasses>(['no', 'no', 'gafas', 'sol']), top: p<Top>(['camiseta', 'sudadera', 'tirantes']), topColor: Math.floor(rng() * TOP_COLORS.length),
    necklace: rng() < 0.3, bg: Math.floor(rng() * BG_COLORS.length),
  };
}

// ------------------------------------------------------------------ rasterizador
const W = 24, H = 28;
const rgb = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (r: number, g: number, b: number) => `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const dark = (c: string, t = 0.25) => mix(c, '#000000', t);
const light = (c: string, t = 0.25) => mix(c, '#ffffff', t);

class Buf {
  px: string[];
  constructor(bg: string) { this.px = new Array(W * H).fill(bg); }
  set(x: number, y: number, c: string) { if (x >= 0 && y >= 0 && x < W && y < H) this.px[y * W + x] = c; }
  get(x: number, y: number) { return this.px[y * W + x]; }
  rect(x: number, y: number, w: number, h: number, c: string) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  /** Dibuja el tramo [x0,x1] y su espejo (la cara es simetrica respecto a x=11.5). */
  sym(y: number, x0: number, x1: number, c: string) { for (let x = x0; x <= x1; x++) { this.set(x, y, c); this.set(23 - x, y, c); } }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, clip?: (x: number, y: number) => boolean) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && (!clip || clip(x, y))) this.set(x, y, c);
    }
  }
}

function backHair(b: Buf, cfg: AvatarCfg, H0: string, Hd: string) {
  switch (cfg.hair) {
    case 'despeinado': // mullet: mechones largos detras de las orejas
      for (let y = 10; y <= 18; y++) b.sym(y, y > 15 ? 4 : 3, 6, y % 3 === 0 ? Hd : H0);
      b.set(3, 19, Hd); b.set(20, 19, Hd); b.set(5, 19, H0); b.set(18, 19, H0);
      break;
    case 'largo-ondas': case 'largo-liso': {
      const wavy = cfg.hair === 'largo-ondas';
      b.ellipse(11.5, 14, 9.8, 12.8, H0, (_x, y) => y >= 2 && y <= 27);
      if (wavy) for (let y = 8; y <= 27; y++) { const o = Math.round(Math.sin(y * 0.95) * 1.1); b.set(2 + o, y, Hd); b.set(21 - o, y, Hd); b.set(1 + o, y, H0); }
      break;
    }
    case 'coleta': b.rect(19, 7, 3, 9, H0); b.rect(19, 8, 3, 1, '#d4366f'); b.set(20, 16, Hd); b.set(21, 15, Hd); break;
    case 'mono': break;
    default: break;
  }
}

function frontHair(b: Buf, cfg: AvatarCfg, H0: string, Hd: string, Hl: string) {
  switch (cfg.hair) {
    case 'corto': case 'coleta': case 'mono': case 'rizos':
      b.sym(2, 8, 11, H0); b.sym(3, 6, 11, H0); for (let y = 4; y <= 6; y++) b.sym(y, 5, 11, H0);
      b.sym(7, 5, 9, H0); b.sym(8, 5, 6, H0); b.sym(9, 5, 5, H0);
      b.set(8, 3, Hl); b.set(9, 3, Hl); b.set(10, 4, Hl);
      b.sym(6, 5, 5, Hd);
      if (cfg.hair === 'mono') { b.ellipse(11.5, 2, 3.4, 2.6, H0); b.set(10, 1, Hl); b.set(11, 1, Hl); }
      if (cfg.hair === 'rizos') [[4, 4], [4, 7], [6, 1], [8, 0], [11, 0], [13, 0], [15, 1], [17, 1], [19, 4], [19, 7], [5, 2], [18, 2], [9, 1], [14, 1]].forEach(([x, y]) => b.set(x, y, H0));
      break;
    case 'despeinado': {
      b.sym(2, 6, 11, H0); b.sym(3, 5, 11, H0); for (let y = 4; y <= 6; y++) b.sym(y, 5, 11, H0);
      // puas
      [[7, 1], [10, 0], [13, 0], [16, 1], [5, 2], [18, 2], [9, 1], [14, 1], [12, 1], [8, 0], [17, 2]].forEach(([x, y], i) => b.set(x, y, i % 3 === 0 ? Hd : H0));
      b.set(11, 0, Hd); b.set(6, 1, H0); b.set(15, 0, H0);
      // flequillo ladeado
      b.sym(7, 5, 9, H0); b.set(10, 7, H0); b.set(11, 7, H0); b.set(14, 7, H0);
      b.sym(8, 5, 7, H0); b.set(7, 8, Hd); b.set(16, 8, Hd);
      for (let y = 9; y <= 11; y++) b.sym(y, 5, y === 9 ? 6 : 5, H0);
      b.set(8, 3, Hl); b.set(9, 3, Hl); b.set(14, 4, Hl); b.set(13, 3, Hl);
      break;
    }
    case 'largo-ondas': case 'largo-liso': {
      b.sym(2, 8, 11, H0); b.sym(3, 6, 11, H0); for (let y = 4; y <= 6; y++) b.sym(y, 5, 11, H0);
      b.sym(7, 5, 10, H0); b.sym(8, 5, 8, H0);
      for (let y = 9; y <= 14; y++) b.sym(y, 5, 6, H0);
      for (let y = 15; y <= 18; y++) b.sym(y, 4, 5, H0);
      // raya en medio
      b.set(11, 2, Hd); b.set(12, 2, Hd); b.set(11, 3, Hd); b.set(12, 3, Hd); b.set(11, 4, Hd); b.set(12, 5, Hd);
      b.set(8, 4, Hl); b.set(9, 3, Hl); b.set(15, 5, Hl); b.set(14, 4, Hl);
      // mechones por delante de los hombros
      const wavy = cfg.hair === 'largo-ondas';
      for (let y = 19; y <= 27; y++) { const o = wavy ? Math.round(Math.sin(y * 1.1) * 1) : 0; b.sym(y, 3 + o, 5 + o, y % 3 === 0 ? Hd : H0); }
      break;
    }
    case 'calvo': b.set(9, 4, light(SKINS[cfg.skin], 0.35)); b.set(10, 3, light(SKINS[cfg.skin], 0.35)); break;
  }
}

/** Dibuja el avatar en un buffer de colores. */
function render(cfg: AvatarCfg): Buf {
  const skin = SKINS[cfg.skin] ?? SKINS[1], skinD = dark(skin, 0.14), skinL = light(skin, 0.1);
  const H0 = HAIR_COLORS[cfg.hairColor] ?? HAIR_COLORS[1], Hd = dark(H0, 0.28), Hl = light(H0, 0.28);
  const top = TOP_COLORS[cfg.topColor] ?? TOP_COLORS[0], topD = dark(top, 0.2), topL = light(top, 0.18);
  const eye = EYE_COLORS[cfg.eyes] ?? EYE_COLORS[0];
  const b = new Buf(BG_COLORS[cfg.bg] ?? BG_COLORS[0]);

  backHair(b, cfg, H0, Hd);

  // cuello y torso
  b.rect(10, 17, 4, 5, skinD);
  if (cfg.top === 'tirantes') {
    b.ellipse(11.5, 30, 12, 9.5, skin, (_x, y) => y >= 20);                      // hombros y pecho al aire
    b.ellipse(11.5, 33, 9.6, 9, top, (_x, y) => y >= 24);                         // el top
    b.rect(6, 21, 2, 4, top); b.rect(16, 21, 2, 4, top);                          // tirantes
    b.rect(7, 24, 10, 1, topL);
  } else {
    b.ellipse(11.5, 30, 12, 9.5, top, (_x, y) => y >= 20);
    b.rect(2, 24, 1, 4, topD); b.rect(21, 24, 1, 4, topD);
    if (cfg.top === 'sudadera') {
      b.ellipse(11.5, 20.6, 4.3, 2.6, topD, (_x, y) => y >= 19);                  // cuello de la sudadera
      b.ellipse(11.5, 20.2, 3, 1.7, skinD, (_x, y) => y >= 19);
      b.rect(4, 26, 1, 2, topD); b.rect(19, 26, 1, 2, topD);
      b.rect(15, 24, 3, 2, light(top, 0.1)); b.set(16, 24, '#8a9a6a'); b.set(17, 25, '#8a9a6a');   // detalle del pecho
    } else {
      b.ellipse(11.5, 20.5, 3.4, 2.2, skinD, (_x, y) => y >= 19);
      b.rect(8, 22, 8, 1, topL);
    }
  }
  b.rect(10, 18, 4, 1, dark(skin, 0.25));                                        // sombra bajo la barbilla

  // cabeza y orejas
  b.ellipse(11.5, 11.5, 6.7, 7.7, skin);
  b.rect(4, 11, 1, 3, skin); b.rect(19, 11, 1, 3, skin);
  b.set(4, 12, skinD); b.set(19, 12, skinD);
  b.sym(18, 8, 9, skinD);

  // cara
  const brow = dark(H0, 0.2);
  b.rect(7, 9, 3, 1, brow); b.rect(14, 9, 3, 1, brow);
  b.rect(8, 11, 2, 2, eye); b.rect(14, 11, 2, 2, eye);
  b.set(9, 11, '#f7f2ec'); b.set(15, 11, '#f7f2ec');
  b.set(11, 14, skinD); b.set(12, 14, skinD);
  const lip = '#b5524a';
  if (cfg.facial === 'nada') { b.rect(10, 16, 4, 1, lip); b.set(9, 15, mix(lip, skin, 0.4)); b.set(14, 15, mix(lip, skin, 0.4)); }
  else b.rect(10, 16, 4, 1, lip);
  if (cfg.freckles) [[7, 13], [9, 14], [8, 14], [10, 13], [14, 13], [16, 13], [15, 14], [17, 14], [12, 12], [11, 12]].forEach(([x, y]) => b.set(x, y, mix(skin, '#a4552e', 0.55)));

  // vello facial
  if (cfg.facial !== 'nada') {
    b.rect(9, 15, 6, 1, H0);
    if (cfg.facial === 'perilla') { b.rect(10, 17, 4, 2, H0); b.set(9, 17, Hd); b.set(14, 17, Hd); [[7, 16], [7, 17], [8, 18], [16, 16], [16, 17], [15, 18]].forEach(([x, y]) => b.set(x, y, mix(skin, H0, 0.5))); }
    if (cfg.facial === 'barba') {
      for (let y = 14; y <= 19; y++) for (let x = 5; x <= 18; x++) {
        const inHead = ((x + 0.5 - 11.5) / 6.7) ** 2 + ((y + 0.5 - 11.5) / 7.7) ** 2 <= 1;
        if (inHead && !(y === 16 && x >= 10 && x <= 13) && !(y <= 15 && x >= 8 && x <= 15 && y < 15)) b.set(x, y, (x + y) % 5 === 0 ? Hd : H0);
      }
      b.rect(10, 16, 4, 1, lip);
    }
  }

  frontHair(b, cfg, H0, Hd, Hl);

  // gafas
  if (cfg.glasses === 'gafas') {
    const f = '#2a2a3a';
    for (const x0 of [7, 13]) { b.rect(x0, 10, 4, 1, f); b.rect(x0, 13, 4, 1, f); b.rect(x0, 10, 1, 4, f); b.rect(x0 + 3, 10, 1, 4, f); }
    b.rect(11, 11, 2, 1, f);
  } else if (cfg.glasses === 'sol') {
    const f = '#1d1b2e';
    b.rect(6, 10, 5, 3, f); b.rect(13, 10, 5, 3, f); b.rect(11, 10, 2, 1, f); b.set(7, 10, '#5a5a7a'); b.set(14, 10, '#5a5a7a');
  }

  // colgante
  if (cfg.necklace && cfg.top !== 'sudadera') {
    const gold = '#e0b040';
    [[9, 21], [10, 22], [11, 23], [12, 23], [13, 22], [14, 21]].forEach(([x, y]) => b.set(x, y, gold));
    b.set(11, 24, '#8a2a3a'); b.set(12, 24, '#8a2a3a'); b.set(11, 24, gold);
  }
  void skinL;
  return b;
}

const cache = new Map<string, string>();

/** URL de imagen (PNG) del avatar, ampliado con vecino mas cercano. */
export function avatarUrl(cfg: AvatarCfg, scale = 6): string {
  const key = `${JSON.stringify(cfg)}@${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const b = render(cfg);
  const c = document.createElement('canvas');
  c.width = W * scale; c.height = H * scale;
  const g = c.getContext('2d')!;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = b.px[y * W + x]; g.fillRect(x * scale, y * scale, scale, scale); }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export const AVATAR_W = W, AVATAR_H = H;

export function avatarImg(cfg: AvatarCfg, px = 72, cls = 'avatar'): HTMLImageElement {
  const i = document.createElement('img');
  i.className = cls;
  i.src = avatarUrl(cfg, 6);
  i.width = px; i.height = Math.round((px * H) / W);
  i.alt = '';
  return i;
}
