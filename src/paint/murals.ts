import type { Island } from '../data/islands';
import { THEMES } from '../data/themes';
import { renderSceneBuf } from './scene';
import { despeckle, quantize } from './quantize';
export { despeckle, quantize };
import type { Template } from './model';

/**
 * Murales pintables: el escenario pixel art de cada isla (cielo, montañas, camino, arboles y objetos iconicos)
 * convertido a un dibujo por numeros de 96x144 con ~28 colores. Es lo mas grande y complejo del juego:
 * se regala al completar la isla (o se compra).
 */
export const MURAL_W = 96, MURAL_H = 144, MURAL_COLORS = 28, MURAL_PRICE = 250;
export const muralId = (islandId: string): string => `mural-${islandId}`;

export function muralTemplate(isl: Island): Template {
  const PX = 3, w = MURAL_W * PX, h = MURAL_H * PX;
  // camino en S de abajo a arriba (solo para que el escenario dibuje el sendero)
  const nodes = Array.from({ length: 8 }, (_, i) => [w * (0.5 + 0.26 * Math.sin(i * 1.05 + 0.4)), h - 50 - i * ((h - 150) / 7)] as [number, number]);
  const { W, H, buf } = renderSceneBuf({ isl, w, h, nodes, top: [w * 0.55, 0], bottom: [w * 0.4, h], part: 'day' });
  const { palette, cells } = quantize(buf, MURAL_COLORS);
  despeckle(cells, W, H);
  return { id: muralId(isl.id), name: `Mural: ${isl.name}`, w: W, h: H, palette, cells, theme: isl.themes[0] in THEMES ? isl.themes[0] : undefined, price: MURAL_PRICE, unlockIsland: isl.id, source: 'builtin' };
}

/** Islas con mural: las de la historia (no las bloqueadas ni las sin fin). */
export const muralIslandIds = (all: Island[]): string[] => all.filter(i => !i.locked && !i.procedural).map(i => i.id);
