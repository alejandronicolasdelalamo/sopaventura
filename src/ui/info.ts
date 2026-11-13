import { getTemplate } from '../paint/catalog';
import { thumb } from '../paint/store';
import { sfx } from './audio';
import { button, el, modal } from './dom';
import { pixelIcon } from './icons';

export interface GuidePage { icon: string; title: string; text: string; list?: string[] }

/** Explicaciones del juego, por temas. Cada tema son una o varias paginas que se pueden recorrer hacia delante y hacia atras. */
export const TOPICS: Record<string, { label: string; pages: GuidePage[] }> = {
  jugar: {
    label: 'Menú Jugar',
    pages: [{ icon: 'play', title: 'Menú Jugar', text: 'Desliza las tarjetas y toca la que quieras.', list: ['Aventura: las islas, con cinco modos', 'Reto diario: un tablero nuevo cada día', 'Infinito: islas que nunca se acaban', 'A dos: duelo, equipo o pintar juntos', 'Relax: pintar por números o colorear'] }],
  },
  extras: {
    label: 'Palabras extra',
    pages: [{ icon: 'star', title: 'Palabras extra', text: 'En cada tablero hay palabras escondidas que NO están en la lista. Cualquier palabra real que encuentres también cuenta y te da monedas.', list: ['En la barra amarilla ves las que llevas', 'La 5ª seguida sin fallar da premio doble', 'El Radar te dice dónde mirar'] }],
  },
  niveles: {
    label: 'Tipos de nivel',
    pages: [{ icon: 'bolt', title: 'Tipos de nivel', text: 'Cada nivel puede traer un reto distinto. El cartel de entrada te dice cuál es.', list: ['Lluvia: muchas palabras cortas', 'Al revés: las palabras van en todas direcciones', 'Niebla: una nube tapa las letras', 'Trampa: las letras de relleno engañan', 'Jefe: forma rara + niebla'] }],
  },
  modos: {
    label: 'Modos de la aventura',
    pages: [{ icon: 'play', title: 'Modos de juego', text: 'Jugar > Aventura tiene cinco modos y cada uno guarda su propio progreso.', list: ['Chill: sin prisa', 'Contrarreloj: gana el tiempo', 'Con puntos: combos y rapidez', 'Acertijos: solo ves pistas', 'A ciegas: ni siquiera ves las palabras'] }],
  },
  ayudas: {
    label: 'Ayudas y misiones',
    pages: [
      { icon: 'bulb', title: 'Ayudas', text: 'Si te atascas puedes usar estas ayudas. Se gastan con monedas o con las que ya tengas.', list: ['Pista: marca la primera letra de una palabra', 'Revelar: te da una palabra entera', 'Congelar: para el reloj 10 s (contrarreloj)', 'Limpiar: apaga unos segundos las letras que sobran', 'Rayo: ilumina la fila de una palabra', 'Radar: marca una zona cerca de una extra'] },
      { icon: 'trophy', title: 'Misiones', text: 'Cada semana hay misiones con monedas en tu Perfil.', list: ['Puedes cambiar el tamaño del tablero en Ajustes', 'Toca las criaturas del mapa: dan monedas'] },
    ],
  },
  pintar: {
    label: 'Pintar por números',
    pages: [
      { icon: 'brush', title: 'Pintar por números', text: 'Cada casilla lleva un número. Elige ese color abajo y toca la casilla para pintarla.', list: ['Pinta casilla a casilla: toca o arrastra', 'Cuando terminas un color NO cambia solo: elige tú el siguiente', 'Con el botón de arriba puedes pasar a "por zonas"'] },
      { icon: 'target', title: 'Herramientas', text: 'Para moverte por el dibujo y pedir ayuda.', list: ['Pellizca con dos dedos para acercar o alejar', 'Arrastra con dos dedos para moverte', 'Pista: lleva la vista a una casilla del color elegido', 'Deshacer borra lo último que pintaste', 'Ver todo encuadra el dibujo entero'] },
    ],
  },
};

/** Orden de las paginas del tutorial de novedades. */
export const NEWS_TOPICS = ['extras', 'niveles', 'modos', 'ayudas'];

/**
 * Visor de explicaciones: se puede ir adelante y ATRAS, con puntos de progreso. `onClose` se llama al cerrar (con "Entendido", "Saltar" o tocando fuera).
 */
export function openGuide(pages: GuidePage[], opts: { dismissable?: boolean; onClose?: () => void } = {}): void {
  let i = 0;
  const box = el('div', 'pause-box news-box');
  const closeModal = modal(box, { dismissable: opts.dismissable ?? true, cls: 'news-modal' });
  let closed = false;
  const close = () => { if (closed) return; closed = true; closeModal(); opts.onClose?.(); };
  if (opts.dismissable ?? true) {
    const backdrop = box.closest('.modal-back');
    backdrop?.addEventListener('pointerdown', e => { if (e.target === backdrop && !closed) { closed = true; opts.onClose?.(); } });
  }
  const draw = () => {
    const pg = pages[i], last = i === pages.length - 1;
    box.replaceChildren();
    const head = el('div', 'news-head');
    const olafT = getTemplate('olaf');
    if (olafT) { const im = el('img', 'news-olaf'); im.src = thumb(olafT, 'color', 64); im.alt = ''; head.append(im); }
    head.append(pixelIcon(pg.icon, '#ffd86b', 'picon big'), el('h2', '', pg.title));
    box.append(head, el('p', '', pg.text));
    if (pg.list) { const ul = el('ul', 'news-list'); pg.list.forEach(t => ul.append(el('li', '', t))); box.append(ul); }
    if (pages.length > 1) {
      const dots = el('div', 'news-dots');
      pages.forEach((_, k) => dots.append(el('i', k === i ? 'on' : '')));
      box.append(dots);
    }
    const nav = el('div', 'news-nav');
    if (i > 0) { const b = button('Atrás', 'btn small ghost', () => { sfx('tap'); i--; draw(); }); b.prepend(pixelIcon('back', 'currentColor', 'picon')); nav.append(b); }
    nav.append(button(last ? (opts.dismissable === false ? '¡Entendido!' : 'Entendido') : 'Siguiente', 'btn big', () => { sfx('tap'); if (last) close(); else { i++; draw(); } }));
    box.append(nav);
    if (!last && pages.length > 1) box.append(button('Saltar', 'btn small ghost news-skip', () => { sfx('tap'); close(); }));
  };
  draw();
}

/** Abre la explicación de un tema (o de varios seguidos). */
export function showInfo(...topics: string[]): void {
  const pages = topics.flatMap(t => TOPICS[t]?.pages ?? []);
  if (!pages.length) return;
  sfx('tap');
  openGuide(pages);
}

/** Boton redondo con una "i" que abre la explicacion del tema. */
export function infoButton(topic: string | string[], cls = ''): HTMLButtonElement {
  const topics = Array.isArray(topic) ? topic : [topic];
  const b = button('', `btn small icon-btn info-btn ${cls}`.trim(), () => showInfo(...topics));
  b.append(pixelIcon('info', '#fff'));
  b.setAttribute('aria-label', `Información: ${topics.map(t => TOPICS[t]?.label ?? t).join(', ')}`);
  b.title = 'Información';
  return b;
}
