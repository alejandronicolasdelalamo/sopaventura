import { update } from '../core/state';
import { getTemplate } from '../paint/catalog';
import { thumb } from '../paint/store';
import { sfx } from '../ui/audio';
import { button, el, modal } from '../ui/dom';
import { pixelIcon } from '../ui/icons';

/** Paginas del tutorial corto de las novedades (palabras extra, tipos de nivel, modos, ayudas). */
const PAGES: { icon: string; title: string; text: string; list?: string[] }[] = [
  { icon: 'star', title: 'Palabras extra', text: 'En cada tablero hay palabras escondidas que NO están en la lista. Si las encuentras, te dan monedas. Cualquier palabra real vale.', list: ['Cuenta cuántas hay en la barra amarilla', 'La 5ª extra seguida da premio doble', 'El Radar te dice dónde mirar'] },
  { icon: 'bolt', title: 'Tipos de nivel', text: 'Cada nivel puede traer un reto distinto. El cartel de entrada te dice cuál es.', list: ['Lluvia: muchas palabras cortas', 'Al revés: las palabras van en todas direcciones', 'Niebla: una nube tapa las letras', 'Trampa: las letras de relleno engañan', 'Jefe: forma rara + niebla'] },
  { icon: 'play', title: 'Modos de juego', text: 'Jugar > Aventura tiene cinco modos y cada uno guarda su propio progreso.', list: ['Chill: sin prisa', 'Contrarreloj: gana el tiempo', 'Con puntos: combos y rapidez', 'Acertijos: solo ves pistas', 'A ciegas: ni siquiera ves las palabras'] },
  { icon: 'bulb', title: 'Ayudas y misiones', text: 'Pistas, Revelar y potenciadores (Congelar, Limpiar, Rayo, Radar). Cada semana hay misiones con monedas en tu Perfil.', list: ['Puedes cambiar el tamaño del tablero en Ajustes', 'Toca las criaturas del mapa: dan monedas'] },
];

/** Tutorial corto de las novedades, con Olaf. Se marca como visto al cerrarlo. */
export function showNews(): void {
  let i = 0;
  const box = el('div', 'pause-box news-box');
  const close = modal(box, { dismissable: false, cls: 'news-modal' });
  const done = () => { update(s => { s.settings.newsSeen = true; }); close(); };
  const draw = () => {
    const pg = PAGES[i];
    box.replaceChildren();
    const head = el('div', 'news-head');
    const olafT = getTemplate('olaf');
    if (olafT) { const im = el('img', 'news-olaf'); im.src = thumb(olafT, 'color', 64); im.alt = ''; head.append(im); }
    head.append(pixelIcon(pg.icon, '#ffd86b', 'picon big'), el('h2', '', pg.title));
    box.append(head, el('p', '', pg.text));
    if (pg.list) { const ul = el('ul', 'news-list'); pg.list.forEach(t => ul.append(el('li', '', t))); box.append(ul); }
    const dots = el('div', 'news-dots');
    PAGES.forEach((_, k) => dots.append(el('i', k === i ? 'on' : '')));
    const row = el('div', 'btn-col');
    row.append(button(i === PAGES.length - 1 ? '¡Entendido!' : 'Siguiente', 'btn big', () => { sfx('tap'); if (i === PAGES.length - 1) done(); else { i++; draw(); } }));
    if (i < PAGES.length - 1) row.append(button('Saltar', 'btn small ghost', () => { sfx('tap'); done(); }));
    box.append(dots, row);
  };
  draw();
}
