import { totalStars } from '../core/progress';
import { tapCounter } from '../core/eggs';
import { getState } from '../core/state';
import { getTemplate } from '../paint/catalog';
import { thumb } from '../paint/store';
import { unreadCount, onMessages } from '../net/sync';
import { setMusicMood, sfx } from '../ui/audio';
import { button, el, reducedMotion } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { mountSky } from '../ui/sky';
import { avatarImg } from '../avatar/avatar';
import { myAvatar } from './avatar';
import { navigate } from '../ui/router';
import { pixelStar } from './map';
import { claimEvent, eventClaimed, upcomingEvents } from '../core/extras';
import { confetti } from '../ui/confetti';
import { toast } from '../ui/dom';
import { OLAF_STAGES, olafStage, olafTemplate } from '../paint/olafLook';
import { showNews } from './novedades';
import { dayPart, greeting, season } from '../ui/daytime';

/** Logo "SOPA VENTURA" con fichas de letras (toque 7 veces: huevo de pascua). */
export function logo(): HTMLElement {
  const grid = el('div', 'title-grid');
  grid.setAttribute('role', 'heading'); grid.setAttribute('aria-level', '1'); grid.setAttribute('aria-label', 'SopaVentura');
  let k = 0;
  ['SOPA', 'VENTURA'].forEach((word, r) => {
    const row = el('div', 'title-row');
    [...word].forEach(ch => {
      const t = el('div', `tile${r === 0 ? ' hit' : ''}`, ch);
      t.style.setProperty('--i', String(k++)); t.setAttribute('aria-hidden', 'true');
      row.append(t);
    });
    grid.append(row);
  });
  const tap7 = tapCounter('titulo7', 7);
  grid.addEventListener('click', () => { sfx('pop'); tap7(); });
  return grid;
}

/** Monedas, estrellas y racha arriba a la derecha. */
export function statBar(): HTMLElement {
  const s = getState();
  const stats = el('div', 'home-stats');
  const stars = el('span', 'stat'); stars.append(pixelStar(true), document.createTextNode(String(totalStars(s))));
  const coins = el('span', 'stat'); coins.append(pixelIcon('coin', '#ffd86b', 'picon'), document.createTextNode(String(s.coins)));
  const streak = el('span', 'stat'); streak.append(pixelIcon('fire', '#ff9a5a', 'picon'), document.createTextNode(String(s.streak.count)));
  stars.setAttribute('aria-label', `${totalStars(s)} estrellas`); coins.setAttribute('aria-label', `${s.coins} monedas`);
  streak.setAttribute('aria-label', `Racha de ${s.streak.count} días`);
  stats.append(stars, coins, streak);
  const tapCoins = tapCounter('monedas10', 10);
  coins.addEventListener('click', () => { sfx('coin'); tapCoins(); });
  return stats;
}

/** Menu principal: losas escalonadas a la izquierda sobre el cielo pixel art. */
export function renderHome(root: HTMLElement): () => void {
  setMusicMood('menu');
  const screen = el('div', 'screen home');
  const fg = el('div', 'home-fg');

  const top = el('div', 'home-top');
  const av = button('', 'avatar-btn', () => { sfx('tap'); navigate('perfil'); });
  av.append(avatarImg(myAvatar(), 48)); av.setAttribute('aria-label', 'Tu perfil');
  top.append(av, statBar());

  const nav = el('nav', 'slabs');
  nav.setAttribute('aria-label', 'Menú principal');
  const slab = (label: string, icon: string, route: string, cls = '', badge = '') => {
    const b = button('', `slab ${cls}`, () => { sfx('tap'); navigate(route); });
    b.style.setProperty('--i', String(nav.children.length));
    b.append(pixelIcon(icon, 'currentColor', 'picon'), el('span', 'slab-label', label));
    if (badge) b.append(el('span', 'badge-dot', badge));
    nav.append(b);
    return b;
  };
  slab('Jugar', 'play', 'jugar', 'main');
  slab('Logros', 'trophy', 'logros');
  slab('Perfil', 'heart', 'perfil');
  slab('Tienda', 'bag', 'tienda');
  const mail = slab('Nosotros', 'mail', 'nosotros', '', unreadCount() ? String(unreadCount()) : '');
  slab('Ajustes', 'gear', 'ajustes', 'last');
  const unsub = onMessages(() => {
    const n = unreadCount();
    mail.querySelector('.badge-dot')?.remove();
    if (n) mail.append(el('span', 'badge-dot', String(n)));
  });

  // Olaf sentado en las montañas: huevo de pascua (5 toques)
  const stars = totalStars();
  const olafTpl = olafTemplate(stars) ?? getTemplate('olaf');
  const olaf = el('button', 'olaf');
  olaf.setAttribute('aria-label', `${OLAF_STAGES[olafStage(stars)].name}: tócalo para hablar`);
  if (olafTpl) { const img = el('img'); img.src = thumb(olafTpl, 'color', 64); img.alt = ''; img.width = 64; img.height = 64; olaf.append(img); }
  const tapOlaf = tapCounter('olaf5', 5);
  const bubble = el('div', 'olaf-say');
  bubble.setAttribute('role', 'status');
  const lines = olafLines(stars);
  let li = 0, bt = 0;
  /** Al tocar a Olaf suelta corazones que suben flotando (de distintos tamaños y tonos de rosa). */
  const hearts = () => {
    if (reducedMotion()) return;
    const cols = ['#ff5c9a', '#ff8ac0', '#ff3d6e', '#ffb3d9', '#ff6fa8'];
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const h = el('span', 'olaf-heart');
      h.append(pixelIcon('heart', cols[i % cols.length], 'picon'));
      const size = 14 + Math.floor(Math.random() * 3) * 8;     // 14 / 22 / 30 px (multiplos del pixel)
      h.style.setProperty('--s', `${size}px`);
      h.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 120)}px`);
      h.style.setProperty('--rise', `${90 + Math.round(Math.random() * 90)}px`);
      h.style.setProperty('--dur', `${1.1 + Math.random() * 0.7}s`);
      h.style.animationDelay = `${i * 70}ms`;
      olaf.append(h);
      setTimeout(() => h.remove(), 2200 + i * 70);
    }
  };
  olaf.addEventListener('click', () => {
    hearts();
    sfx('pop', 8); olaf.classList.remove('hop'); void olaf.offsetWidth; olaf.classList.add('hop'); tapOlaf();
    // primero los corazones; el globo de texto sale un momento despues para no taparlos
    const line = lines[li++ % lines.length];
    bubble.classList.remove('on'); clearTimeout(bt);
    bt = window.setTimeout(() => { bubble.textContent = line; bubble.classList.add('on'); bt = window.setTimeout(() => bubble.classList.remove('on'), 4200); }, reducedMotion() ? 0 : 850);
  });

  // Fecha especial: hoy toca regalo; si no, cuenta atras a la proxima (si falta menos de 2 meses)
  const ev = upcomingEvents()[0];
  let banner: HTMLElement | null = null;
  if (ev && (ev.today || ev.days <= 60)) {
    banner = el('div', `ev-banner${ev.today ? ' today' : ''}`);
    banner.append(pixelIcon(ev.today ? 'heart' : 'cal', ev.today ? '#ff9ad5' : '#a5f3fc', 'picon'));
    const t = el('div', 'ev-txt');
    t.append(el('strong', '', ev.today ? `¡Hoy: ${ev.name}!` : ev.name), el('small', '', ev.today ? (eventClaimed(ev) ? 'Regalo abierto 💜' : 'Hay un regalo esperando') : ev.days === 1 ? 'Mañana' : `Faltan ${ev.days} días`));
    banner.append(t);
    if (ev.today && !eventClaimed(ev)) {
      const g = button(`Abrir regalo +${ev.gift}`, 'btn small', () => {
        if (claimEvent(ev)) { sfx('unlock'); confetti(innerWidth / 2, innerHeight / 3, 90); toast(`${ev.name}: +${ev.gift} monedas 💜`); g.remove(); t.lastElementChild!.textContent = 'Regalo abierto 💜'; }
      });
      banner.append(g);
    }
  }
  fg.append(top, logo());
  if (banner) fg.append(banner);
  fg.append(nav);
  screen.append(fg, olaf, bubble);
  root.append(screen);
  const stopSky = mountSky(screen);
  // primera vez tras la actualizacion: tutorial corto de novedades (no en las pruebas automaticas)
  if (!getState().settings.newsSeen && getState().settings.tutorialDone && !location.search.includes('e2e')) setTimeout(() => showNews(), 900);
  return () => { unsub(); stopSky(); };
}

/** Lo que dice Olaf: saludo segun la hora, su evolucion, la temporada y alguna tonteria. */
function olafLines(stars: number): string[] {
  const k = olafStage(stars), nxt = OLAF_STAGES[k + 1];
  const s = getState();
  const out = [
    `${greeting()} Soy ${OLAF_STAGES[k].name}.`,
    nxt ? `Con ${nxt.stars} estrellas me pongo ${nxt.acc === 'medalla' ? 'una' : nxt.acc === 'corona' ? 'una' : nxt.acc === 'gafas de sol' ? 'unas' : 'un'} ${nxt.acc}. Llevamos ${stars}.` : 'Ya soy el rey de todas las islas. Miau.',
    dayPart() === 'night' ? '¿Una sopita antes de dormir? Yo ya bostezo.' : dayPart() === 'dawn' ? 'Tengo hambre. Como siempre a esta hora.' : 'Me he echado una siesta de 4 horas. Estoy agotado.',
    { invierno: 'Hace frío. Me quedo en la manta.', primavera: 'Hay una mosca en el balcón. Es mi enemiga.', verano: 'Hace calor. Me tumbo en el suelo fresquito.', otono: 'Las hojas hacen crujir. Las persigo.' }[season()],
    s.streak.count > 1 ? `¡${s.streak.count} días seguidos jugando! Qué constancia.` : 'Si jugáis cada día os hago una racha.',
    'Toca 5 veces mi isla en el mapa… es un secreto.',
  ];
  return out;
}
