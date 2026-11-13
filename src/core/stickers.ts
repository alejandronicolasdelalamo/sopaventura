import type { Island } from '../data/islands';
import { THEME_PROPS, PROP_IDS, propSprite } from '../paint/props';
import { getTemplate } from '../paint/catalog';
import type { Template } from '../paint/model';
import { season, type Season } from '../ui/daytime';
import { getState, update } from './state';

/**
 * Album de pegatinas: los objetos iconicos de cada tema (trompa, paraguas, ramen...).
 * Se ganan al completar islas, al ganar un jefe con 3 estrellas, con la palabra secreta
 * y con la primera victoria de cada temporada.
 */
export const SEASON_STICKER: Record<Season, string> = { invierno: 'muneco', primavera: 'flor', verano: 'concha', otono: 'taza' };

const NAMES: Record<string, string> = {
  trompa: 'Trompa azul', paraguas: 'Paraguas amarillo', lupa: 'Lupa', libro: 'Libro', ramen: 'Ramen', llave: 'Llave', espada: 'Espada',
  pico: 'Pico', globos: 'Globos', huella: 'Huella', entradas: 'Entradas', micro: 'Micro', nota: 'Nota musical', vinilo: 'Vinilo', carta: 'Carta',
  ovillo: 'Ovillo', pescado: 'Pescado', banco: 'Banco del parque', metro: 'Metro', osito: 'Osito', granada: 'Granada', tienda: 'Tienda de campaña',
  columna: 'Columna romana', concha: 'Concha', estrella: 'Estrella de mar', farolillo: 'Farolillo', muneco: 'Muñeco de nieve', taza: 'Taza calentita',
  donut: 'Donut', balon: 'Balón', trofeo: 'Trofeo', guitarra: 'Guitarra', tambor: 'Tambor', pizza: 'Pizza', corazon: 'Corazón', shuriken: 'Shuriken',
  muralla: 'Muralla', portal: 'Portal', flor: 'Flor', bloque: 'Bloque', capsula: 'Cápsula', mando: 'Mando', disco: 'Disco', luna: 'Luna', olaf: 'Olaf',
};

const art = (id: string): Template | undefined => propSprite(id) ?? getTemplate(id);

let all: string[] | null = null;
export function allStickers(): string[] {
  if (all) return all;
  const ids = new Set<string>([...PROP_IDS, ...Object.values(THEME_PROPS).flat(), ...Object.values(SEASON_STICKER), 'olaf']);
  all = [...ids].filter(id => !!art(id));
  return all;
}
export const stickerArt = art;
export const stickerName = (id: string): string => NAMES[id] ?? id[0].toUpperCase() + id.slice(1);
export const hasSticker = (id: string): boolean => (getState().stickers ?? []).includes(id);

/** Da las pegatinas que falten; devuelve solo las nuevas. */
export function giveStickers(ids: string[]): string[] {
  const fresh = [...new Set(ids)].filter(id => allStickers().includes(id) && !hasSticker(id));
  if (fresh.length) update(s => { s.stickers = [...(s.stickers ?? []), ...fresh]; });
  return fresh;
}

export function islandStickers(isl: Island): string[] {
  const ids = isl.themes.flatMap(t => THEME_PROPS[t] ?? []);
  if (isl.id === 'olaf') ids.push('olaf');
  return [...new Set(ids)].filter(id => allStickers().includes(id));
}

/** Una pegatina que aun no tengas (primero las de la isla). */
export function randomMissing(isl?: Island): string | null {
  const pool = [...(isl ? islandStickers(isl) : []), ...allStickers()].filter(id => !hasSticker(id));
  return pool.length ? pool[Math.floor(Math.random() * Math.min(pool.length, isl ? 4 : pool.length))] : null;
}

/** Primera victoria de la temporada: su pegatina (una vez por temporada y año). */
export function seasonSticker(): string[] {
  const s = season(), key = `temporada:${s}:${new Date().getFullYear()}`;
  if (getState().eventsClaimed.includes(key)) return [];
  update(st => { st.eventsClaimed.push(key); });
  return giveStickers([SEASON_STICKER[s]]);
}
