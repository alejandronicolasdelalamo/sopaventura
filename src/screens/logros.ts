import { allStickers } from '../core/stickers';
import { navigate } from '../ui/router';
import { ACHIEVEMENTS } from '../core/achievements';
import { getState } from '../core/state';
import { button, el } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back } from '../ui/router';

export function renderLogros(root: HTMLElement): void {
  const s = getState();
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Logros'), el('span', 'stars-total', `${s.achievements.length}/${ACHIEVEMENTS.length}`));
  const body = el('main', 'page-body');
  const streak = el('div', 'card streak');
  streak.append(pixelIcon('fire', '#ff7a45', 'picon big'), el('div', '', `Racha: ${s.streak.count} ${s.streak.count === 1 ? 'día' : 'días'} seguidos`));
  body.append(streak);
  const stk = button('', 'btn row-btn', () => navigate('pegatinas'));
  stk.append(pixelIcon('star', '#ffd86b'), el('span', 'row-label', 'Álbum de pegatinas'), el('span', 'row-count', `${(s.stickers ?? []).length}/${allStickers().length}`));
  body.append(stk);
  ACHIEVEMENTS.forEach(a => {
    const got = s.achievements.includes(a.id);
    const row = el('div', `card ach-row${got ? ' got' : ''}`);
    row.append(pixelIcon(got ? 'trophy' : 'lock', got ? '#ffb400' : '#9a90b0', 'picon big'));
    const t = el('div', 'ach-text');
    t.append(el('strong', '', a.name), el('small', '', `${a.desc} · +${a.coins}`));
    row.append(t);
    body.append(row);
  });
  screen.append(top, body);
  root.append(screen);
}
