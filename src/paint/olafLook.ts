import { getTemplate } from './catalog';
import { TRANSPARENT, type Template } from './model';

/** Olaf evoluciona con las estrellas: se va poniendo accesorios pixel art encima de su dibujo. */
export const OLAF_STAGES = [
  { stars: 0, name: 'Olaf', acc: 'nada' },
  { stars: 20, name: 'Olaf con bufanda', acc: 'bufanda' },
  { stars: 60, name: 'Olaf molón', acc: 'gafas de sol' },
  { stars: 120, name: 'Olaf aventurero', acc: 'gorro de lana' },
  { stars: 200, name: 'Olaf campeón', acc: 'medalla' },
  { stars: 320, name: 'Rey Olaf', acc: 'corona' },
] as const;

export function olafStage(stars: number): number {
  let k = 0;
  OLAF_STAGES.forEach((s, i) => { if (stars >= s.stars) k = i; });
  return k;
}

/** Plantilla de Olaf con los accesorios de su etapa (sin fondo). En diciembre lleva gorro de Navidad. */
export function olafTemplate(stars: number, xmas = new Date().getMonth() === 11): Template | undefined {
  const base = getTemplate('olaf');
  if (!base) return undefined;
  const stage = olafStage(stars);
  const W = base.w, H = base.h;
  const pal = [...base.palette];
  const cells = base.cells.slice();
  for (let i = 0; i < cells.length; i++) if (cells[i] === 7) cells[i] = TRANSPARENT;
  const col = (hex: string) => { let i = pal.indexOf(hex); if (i < 0) { pal.push(hex); i = pal.length - 1; } return i; };
  const set = (x: number, y: number, hex: string) => { if (x >= 0 && y >= 0 && x < W && y < H) cells[y * W + x] = col(hex); };
  const rect = (x: number, y: number, w: number, h: number, hex: string) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, hex); };
  // parte de arriba de la cabeza en el centro
  let top = 0;
  while (top < H && cells[top * W + 16] === TRANSPARENT) top++;
  const cx = 16;
  const dome = (rows: [number, string][], y0: number) => rows.forEach(([w, c], i) => rect(cx - Math.floor(w / 2), y0 + i, w, 1, c));

  if (stage >= 1) {   // bufanda roja con flecos
    rect(9, 21, 15, 2, '#e0335a'); rect(9, 22, 15, 1, '#a01a40');
    for (let x = 10; x < 24; x += 3) set(x, 21, '#ff8aa8');
    rect(19, 23, 3, 3, '#e0335a'); rect(19, 25, 3, 1, '#a01a40'); set(19, 26, '#ffd86b'); set(21, 26, '#ffd86b');
  }
  if (stage >= 2) {   // gafas de sol
    rect(10, 13, 5, 3, '#1d1b2e'); rect(18, 13, 5, 3, '#1d1b2e'); rect(15, 13, 3, 1, '#1d1b2e');
    set(11, 13, '#7ad8ff'); set(19, 13, '#7ad8ff'); set(12, 14, '#3a3a6a'); set(20, 14, '#3a3a6a');
  }
  if (stage >= 4) {   // medalla de oro
    set(15, 23, '#3a6ae0'); set(17, 23, '#3a6ae0'); set(16, 24, '#3a6ae0');
    rect(15, 25, 3, 3, '#e0a000'); rect(15, 25, 2, 2, '#ffd23a'); set(15, 25, '#fff2a0');
  }
  if (stage >= 5) {   // corona
    const y = top - 1;
    rect(cx - 5, y, 11, 2, '#e0a000'); rect(cx - 5, y, 11, 1, '#ffd23a');
    [cx - 5, cx, cx + 5].forEach(x => { set(x, y - 1, '#ffd23a'); set(x, y - 2, '#ffd23a'); });
    [cx - 3, cx + 3].forEach(x => set(x, y - 1, '#ffd23a'));
    set(cx, y + 1, '#e0335a'); set(cx - 3, y + 1, '#3ad0ff'); set(cx + 3, y + 1, '#3ad0ff'); set(cx, y - 3, '#fff2a0');
  } else if (xmas) {  // gorro de Navidad
    dome([[3, '#e0335a'], [5, '#e0335a'], [7, '#e0335a'], [9, '#c0203a'], [11, '#ffffff']], top - 4);
    rect(cx + 3, top - 5, 2, 1, '#e0335a'); rect(cx + 5, top - 4, 2, 2, '#ffffff');
  } else if (stage >= 3) {  // gorro de lana azul con pompon
    rect(cx - 1, top - 6, 3, 2, '#ffffff');
    dome([[5, '#3a6ae0'], [9, '#5a8af0'], [11, '#3a6ae0'], [11, '#2a4ab0']], top - 4);
    for (let x = cx - 4; x <= cx + 4; x += 2) set(x, top - 2, '#ffd86b');
  }
  return { ...base, id: `olaf-st${stage}${xmas ? 'x' : ''}`, palette: pal, cells };
}
