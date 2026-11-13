import { allStickers, hasSticker, stickerArt, stickerName, SEASON_STICKER } from '../core/stickers';
import { thumb } from '../paint/store';
import { button, el } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back } from '../ui/router';
import { SEASON_NAME, type Season } from '../ui/daytime';

/** Album de pegatinas: las que tienes a color y las que faltan como silueta. */
export function renderPegatinas(root: HTMLElement): void {
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  const ids = allStickers();
  const got = ids.filter(hasSticker).length;
  top.append(b, el('h1', 'page-title', 'Pegatinas'), el('span', 'coin-box', `${got}/${ids.length}`));
  const body = el('main', 'page-body');
  body.append(el('p', 'note', 'Se consiguen al completar islas, al ganar a un jefe con 3 estrellas, con la palabra secreta y con la primera victoria de cada temporada.'));
  const seasonOf = new Map(Object.entries(SEASON_STICKER).map(([s, id]) => [id, s as Season]));
  const grid = el('div', 'stk-grid');
  [...ids].sort((a, z) => Number(hasSticker(z)) - Number(hasSticker(a))).forEach(id => {
    const t = stickerArt(id); if (!t) return;
    const own = hasSticker(id);
    const f = el('figure', `stk${own ? '' : ' off'}`);
    const img = el('img'); img.src = thumb(t, 'color', 64); img.alt = ''; img.width = 64; img.height = 64;
    const s = seasonOf.get(id);
    f.append(img, el('figcaption', '', own ? stickerName(id) : s ? `${SEASON_NAME[s]}` : '???'));
    f.setAttribute('aria-label', own ? stickerName(id) : 'Pegatina sin conseguir');
    grid.append(f);
  });
  body.append(grid);
  screen.append(top, body);
  root.append(screen);
}
