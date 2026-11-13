/** Hora del dia y temporada reales (con ?hora=night / ?temporada=invierno para probar). */
export type DayPart = 'dawn' | 'day' | 'dusk' | 'night';
export type Season = 'invierno' | 'primavera' | 'verano' | 'otono';

const q = () => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(); } };

export function dayPart(d = new Date()): DayPart {
  const o = q().get('hora') as DayPart | null;
  if (o && ['dawn', 'day', 'dusk', 'night'].includes(o)) return o;
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 6.5 && h < 9) return 'dawn';
  if (h >= 9 && h < 18.5) return 'day';
  if (h >= 18.5 && h < 21) return 'dusk';
  return 'night';
}

export function season(d = new Date()): Season {
  const o = q().get('temporada') as Season | null;
  if (o && ['invierno', 'primavera', 'verano', 'otono'].includes(o)) return o;
  const m = d.getMonth();
  return m === 11 || m <= 1 ? 'invierno' : m <= 4 ? 'primavera' : m <= 7 ? 'verano' : 'otono';
}

export const SEASON_NAME: Record<Season, string> = { invierno: 'Invierno', primavera: 'Primavera', verano: 'Verano', otono: 'Otoño' };

/** Saludo segun la hora (para Olaf y los personajes del mapa). */
export function greeting(): string {
  return { dawn: '¡Buenos días!', day: '¡Hola!', dusk: '¡Buenas tardes!', night: '¡Buenas noches!' }[dayPart()];
}
