import { avatarUrl, BG_COLORS, defaultAvatar, EYE_COLORS, HAIR_COLORS, HAIR_NAMES, randomAvatar, SKINS, TOP_COLORS, type AvatarCfg, type Facial, type Glasses, type HairStyle, type Top } from '../avatar/avatar';
import { getState, update } from '../core/state';
import { sfx } from '../ui/audio';
import { button, el, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back } from '../ui/router';

/** Avatar actual de quien juega: el guardado o el predeterminado de su rol. */
export const myAvatar = (): AvatarCfg => getState().avatar ?? defaultAvatar(getState().role ?? 'nico');

export function renderAvatar(root: HTMLElement): void {
  let cfg: AvatarCfg = { ...myAvatar() };
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const bb = button('', 'btn small icon-btn', () => back());
  bb.append(pixelIcon('back', '#fff')); bb.setAttribute('aria-label', 'Volver');
  top.append(bb, el('h1', 'page-title', 'Tu avatar'), el('span'));
  const body = el('main', 'page-body avatar-page');

  const prev = el('img', 'avatar-big'); prev.alt = 'Vista previa de tu avatar'; prev.width = 168; prev.height = 196;
  const draw = () => { prev.src = avatarUrl(cfg, 8); };
  const set = <K extends keyof AvatarCfg>(k: K, v: AvatarCfg[K]) => { cfg = { ...cfg, [k]: v }; draw(); sfx('tap'); refresh(); };

  const sections = el('div', 'av-sections');
  const refreshers: (() => void)[] = [];
  const refresh = () => refreshers.forEach(f => f());

  function swatches<K extends keyof AvatarCfg>(label: string, key: K, colors: string[]) {
    const wrap = el('div', 'card av-sec'); wrap.append(el('strong', '', label));
    const row = el('div', 'av-row');
    colors.forEach((c, i) => {
      const b = button('', 'av-sw', () => set(key, i as AvatarCfg[K]));
      b.style.background = c; b.setAttribute('aria-label', `${label} ${i + 1}`);
      row.append(b);
      refreshers.push(() => b.classList.toggle('on', cfg[key] === i));
    });
    wrap.append(row); sections.append(wrap);
  }
  function chips<K extends keyof AvatarCfg>(label: string, key: K, opts: [AvatarCfg[K], string][]) {
    const wrap = el('div', 'card av-sec'); wrap.append(el('strong', '', label));
    const row = el('div', 'av-row');
    opts.forEach(([v, name]) => {
      const b = button(name, 'seg-btn av-chip', () => set(key, v));
      row.append(b);
      refreshers.push(() => b.classList.toggle('on', cfg[key] === v));
    });
    wrap.append(row); sections.append(wrap);
  }

  swatches('Piel', 'skin', SKINS);
  chips<'hair'>('Pelo', 'hair', (Object.keys(HAIR_NAMES) as HairStyle[]).map(h => [h, HAIR_NAMES[h]]));
  swatches('Color de pelo', 'hairColor', HAIR_COLORS);
  swatches('Ojos', 'eyes', EYE_COLORS);
  chips<'facial'>('Vello facial', 'facial', [['nada', 'Nada'], ['bigote', 'Bigote'], ['perilla', 'Bigote y perilla'], ['barba', 'Barba']] as [Facial, string][]);
  chips<'freckles'>('Pecas', 'freckles', [[false, 'Sin pecas'], [true, 'Con pecas']]);
  chips<'glasses'>('Gafas', 'glasses', [['no', 'No'], ['gafas', 'Gafas'], ['sol', 'De sol']] as [Glasses, string][]);
  chips<'top'>('Ropa', 'top', [['camiseta', 'Camiseta'], ['sudadera', 'Sudadera'], ['tirantes', 'Tirantes']] as [Top, string][]);
  swatches('Color de la ropa', 'topColor', TOP_COLORS);
  chips<'necklace'>('Colgante', 'necklace', [[false, 'No'], [true, 'Sí']]);
  swatches('Fondo', 'bg', BG_COLORS);

  const presets = el('div', 'btn-col');
  presets.append(
    button('Como Nico', 'btn alt', () => { cfg = defaultAvatar('nico'); draw(); refresh(); sfx('unlock'); }),
    button('Como Izana', 'btn alt', () => { cfg = defaultAvatar('izana'); draw(); refresh(); sfx('unlock'); }),
    button('Sorpréndeme', 'btn small', () => { cfg = randomAvatar(Math.random); draw(); refresh(); sfx('pop'); }),
    button('Guardar', 'btn big', () => { update(s => { s.avatar = cfg; }); sfx('win'); toast('Avatar guardado'); back(); }),
  );
  body.append(prev, presets, sections);
  draw(); refresh();
  screen.append(top, body);
  root.append(screen);
}
