/** Tamaño en pantalla (px CSS) de cada "pixel de arte": el mismo para cielo, escenarios, particulas y bordes de la interfaz. */
export const gridPx = (width: number = typeof innerWidth === 'number' ? innerWidth : 390): number => (width < 600 ? 3 : 4);
