import type { LevelSpec, Mode } from '../core/levels';
import { getState } from '../core/state';
import { THEMES } from '../data/themes';
import { sfx } from '../ui/audio';
import { button, el, modal } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { navigate } from '../ui/router';

export const MODES: { id: Mode; name: string; desc: string; icon: string }[] = [
  { id: 'chill', name: 'Chill', desc: 'Sin tiempo ni presión', icon: 'heart' },
  { id: 'timed', name: 'Contrarreloj', desc: 'Con temporizador', icon: 'fire' },
  { id: 'points', name: 'Con puntos', desc: 'Tiempo, combos y bonus', icon: 'star' },
  { id: 'riddle', name: 'Acertijos', desc: 'Pistas en vez de lista', icon: 'bulb' },
  { id: 'blind', name: 'A ciegas', desc: 'Sin lista: solo el tema y cuantas faltan', icon: 'eye' },
];

/** Hoja para elegir modo antes de empezar un nivel. */
export function openLevelSheet(spec: LevelSpec, next?: () => void, replace = false, mode?: Mode): void {
  // Si ya se eligio el modo en la pantalla "Jugar", se entra directo al nivel.
  if (mode) { navigate('game', { spec, mode, next }, replace); return; }
  const box = el('div', 'sheet');
  box.append(el('h2', '', spec.title));
  const t = THEMES[spec.theme];
  const sub = el('p', 'sheet-sub', `${spec.words.length} palabras · tablero ${spec.size}×${spec.size}`);
  sub.style.color = t.palette.bg;
  box.append(sub);
  const list = el('div', 'mode-list');
  let close: () => void = () => {};
  const last = getState().settings.lastMode;
  MODES.forEach(m => {
    const b = button('', `mode-btn${m.id === last ? ' last' : ''}`, () => {
      sfx('tap');
      close();
      navigate('game', { spec, mode: m.id, next }, replace);
    });
    const text = el('span', 'mode-text');
    text.append(el('strong', '', m.name), el('small', '', m.desc));
    b.append(pixelIcon(m.icon, '#7c4dff'), text);
    list.append(b);
  });
  box.append(list);
  close = modal(box, { cls: 'sheet-modal' });
}
