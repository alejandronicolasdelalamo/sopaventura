import { dailyLevel, todayStr, type Mode } from '../core/levels';
import { totalStars } from '../core/progress';
import { getState } from '../core/state';
import { getTemplate } from '../paint/catalog';
import { thumb } from '../paint/store';
import { setMusicMood, sfx } from '../ui/audio';
import { button, el } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { showInfo } from '../ui/info';
import { mountSky } from '../ui/sky';
import { back, navigate } from '../ui/router';
import { openLevelSheet } from './levelSheet';
import { statBar } from './home';

interface Slide { id: string; title: string; kicker: string; desc: string; icon: string; hue: string; art?: string; meta: () => string; go: () => void }

/**
 * Pone la imagen en `im`: recorta los margenes transparentes y la escala para que TODOS los dibujos (arbol, leopardo, paloma, galaxia...)
 * ocupen la misma superficie (`target` px de lado equivalente), tengan mas o menos aire alrededor o sean mas anchos que altos.
 */
function trimInto(im: HTMLImageElement, url: string, target = 170): void {
  im.src = url;
  const src = new Image();
  src.onload = () => {
    try {
      const w = src.naturalWidth, h = src.naturalHeight;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d', { willReadFrequently: true })!; g.drawImage(src, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      if (cw < w || ch < h) {
        const out = document.createElement('canvas'); out.width = cw; out.height = ch;
        out.getContext('2d')!.drawImage(cv, x0, y0, cw, ch, 0, 0, cw, ch);
        im.src = out.toDataURL();
      }
      // misma superficie para todos; sin pasarse de largo en dibujos muy anchos o muy altos
      const k = Math.sqrt((target * target) / (cw * ch));
      let ww = cw * k, hh = ch * k;
      const m = Math.max(ww, hh), cap = target * 1.25;
      if (m > cap) { ww *= cap / m; hh *= cap / m; }
      im.style.setProperty('--rw', (ww / 190).toFixed(3)); im.style.setProperty('--rh', (hh / 190).toFixed(3));   // fraccion del tamano base (ver CSS)
    } catch { /* se queda la imagen entera */ }
  };
  src.src = url;
}

/** Ultima tarjeta vista en cada pantalla (para volver a donde estabas). */
const lastIndexes: Record<string, number> = {};

const map = (mode: Mode) => () => navigate('mapa', { mode });

/** Pantalla "Jugar": Aventura (que es una carpeta con todos los modos), reto diario, infinito, a dos y relax. */
function jugarSlides(): Slide[] {
  const s = getState();
  const today = todayStr();
  return [
    { id: 'aventura', title: 'Aventura', kicker: 'Modos', desc: 'Las islas de vuestra historia.', icon: 'map', hue: '#7c4dff', art: 'cerezo', meta: () => `${totalStars(s)} estrellas en total`, go: () => navigate('aventura') },
    { id: 'daily', title: 'Reto diario', kicker: 'Cada día', desc: 'Tablero nuevo cada día, con premio.', icon: 'cal', hue: '#8b5cf6', art: 'galaxia', meta: () => (s.daily[today] !== undefined ? 'Hecho hoy' : '¡Pendiente!'), go: () => openLevelSheet(dailyLevel(today)) },
    { id: 'endless', title: 'Infinito', kicker: 'Sin fin', desc: 'Islas al azar que nunca se acaban.', icon: 'star', hue: '#2563eb', art: 'aurora', meta: () => `${totalStars(s, 'infinito')} estrellas`, go: () => navigate('mapa', { mode: 'chill', bucket: 'infinito' }) },
    { id: 'juntos', title: 'A dos', kicker: 'Jugar juntos', desc: 'Duelo, equipo o pintar a la vez.', icon: 'heart', hue: '#db2777', art: 'olaf', meta: () => 'En directo', go: () => navigate('juntos') },
    { id: 'paint', title: 'Relax', kicker: 'Sin prisa', desc: 'Pintar por números o colorear.', icon: 'brush', hue: '#9333ea', art: 'gato', meta: () => `${s.paintDone.length} obras terminadas`, go: () => navigate('pintar-menu') },
  ];
}

/** Dentro de "Aventura": los modos de juego, cada uno con su mapa y su progreso. */
function aventuraSlides(): Slide[] {
  const s = getState();
  return [
    { id: 'chill', title: 'Chill', kicker: 'Aventura', desc: 'Sin reloj, sin presión, a tu ritmo.', icon: 'heart', hue: '#7c4dff', art: 'cerezo', meta: () => `${totalStars(s, 'chill')} estrellas`, go: map('chill') },
    { id: 'timed', title: 'Contrarreloj', kicker: 'Aventura', desc: 'Vence al reloj. Encuéntralas todas.', icon: 'fire', hue: '#3b6cf6', art: 'leopardo', meta: () => `${totalStars(s, 'timed')} estrellas`, go: map('timed') },
    { id: 'points', title: 'Con puntos', kicker: 'Aventura', desc: 'Combos y bonus. Bate tu mejor marca.', icon: 'star', hue: '#5b3df0', art: 'paloma', meta: () => `${totalStars(s, 'points')} estrellas`, go: map('points') },
    { id: 'riddle', title: 'Acertijos', kicker: 'Aventura', desc: 'Solo pistas: adivina la palabra.', icon: 'bulb', hue: '#1f9ad6', art: 'buho', meta: () => `${totalStars(s, 'riddle')} estrellas`, go: map('riddle') },
    { id: 'blind', title: 'A ciegas', kicker: 'Aventura', desc: 'Sin ver palabras. Más monedas.', icon: 'eye', hue: '#4338ca', art: 'galaxia', meta: () => `${totalStars(s, 'blind')} estrellas · x1,5 monedas`, go: map('blind') },
  ];
}

export const renderJugar = (root: HTMLElement): (() => void) => renderCarousel(root, 'Jugar', jugarSlides(), 'jugar', 'Volver al menú');
export const renderAventura = (root: HTMLElement): (() => void) => renderCarousel(root, 'Aventura', aventuraSlides(), 'aventura', 'Volver a Jugar');

/** Tarjetas que se deslizan de izquierda a derecha (la usan Jugar y Aventura). */
function renderCarousel(root: HTMLElement, title: string, list: Slide[], key: string, backLabel: string): () => void {
  setMusicMood('menu');
  const screen = el('div', 'screen jugar');
  const fg = el('div', 'jugar-fg');
  const top = el('header', 'glass-top');
  const b = button('', 'btn small icon-btn', () => { sfx('tap'); back(); });
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', backLabel);
  top.append(b, el('h1', 'page-title', title), statBar());

  const track = el('div', 'carousel');
  track.setAttribute('role', 'listbox');
  track.setAttribute('aria-label', title === 'Aventura' ? 'Modos de la aventura' : 'Modos de juego');
  const dots = el('div', 'dots');
  const cards = list.map((sl, i) => {
    const c = el('div', 'slide');   // div (no button) para poder desplazar el texto dentro de la caja
    c.setAttribute('role', 'option');
    c.style.setProperty('--hue', sl.hue);
    c.setAttribute('aria-label', `${sl.title}. ${sl.desc}`);
    const art = el('div', 'slide-art');
    const tpl = sl.art ? getTemplate(sl.art) : undefined;
    if (tpl) { const im = el('img'); trimInto(im, thumb(tpl, 'color', 192)); im.alt = ''; art.append(im); }
    else art.append(pixelIcon(sl.icon, '#fff', 'picon huge'));
    const badge = el('div', 'slide-icon'); badge.append(pixelIcon(sl.icon, '#fff', 'picon'));
    const body = el('div', 'slide-body');
    body.append(el('span', 'slide-kicker', sl.kicker), el('h2', 'slide-title', sl.title), el('p', 'slide-desc', sl.desc), el('span', 'slide-meta', sl.meta()));
    const cta = el('span', 'slide-cta'); cta.append(pixelIcon('play', '#fff', 'picon'), document.createTextNode('Entrar'));
    c.append(art, badge, body, cta);
    c.addEventListener('click', () => {
      if (i !== active) { scrollTo(i); return; }
      sfx('tap'); lastIndexes[key] = i; sl.go();
    });
    c.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); c.click(); } });
    const d = el('i');
    dots.append(d);
    track.append(c);
    return c;
  });

  const prev = button('', 'btn small icon-btn car-arrow l', () => scrollTo(Math.max(0, active - 1)));
  prev.append(pixelIcon('back', '#fff')); prev.setAttribute('aria-label', 'Modo anterior');
  const next = button('', 'btn small icon-btn car-arrow r', () => scrollTo(Math.min(list.length - 1, active + 1)));
  next.append(pixelIcon('back', '#fff')); next.setAttribute('aria-label', 'Modo siguiente');

  let active = -1;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i; lastIndexes[key] = i;
    cards.forEach((c, k) => { c.classList.toggle('active', k === i); c.setAttribute('aria-selected', String(k === i)); c.tabIndex = k === i ? 0 : -1; });
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    prev.disabled = i === 0; next.disabled = i === list.length - 1;
  };
  function scrollTo(i: number) {
    sfx('tap');
    const c = cards[i];
    track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' });
    setActive(i);
  }
  const onScroll = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bd = Infinity;
    cards.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
    setActive(best);
  };
  track.addEventListener('scroll', onScroll, { passive: true });
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollTo(Math.min(list.length - 1, active + 1)); cards[active].focus(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollTo(Math.max(0, active - 1)); cards[active].focus(); }
  });

  const stage = el('div', 'car-stage');
  stage.append(prev, track, next);
  const help = button('', 'btn small ghost info-help', () => showInfo(key === 'aventura' ? 'modos' : 'jugar'));
  help.append(pixelIcon('info', 'currentColor'), document.createTextNode('¿Cómo funciona?'));
  help.setAttribute('aria-label', 'Información sobre los modos');
  fg.append(top, stage, dots, help, el('p', 'swipe-hint', 'Desliza para ver los modos · toca para entrar'));
  screen.append(fg);
  root.append(screen);
  const stopSky = mountSky(screen);
  requestAnimationFrame(() => {
    const li = lastIndexes[key] ?? 0, c = cards[li] ?? cards[0];
    track.scrollLeft = c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2;
    setActive(li);
  });
  return stopSky;
}

/** Dentro de "Pintar": dos opciones (por numeros o colorear libre). */
export function renderPintarMenu(root: HTMLElement): () => void {
  const screen = el('div', 'screen jugar');
  const fg = el('div', 'jugar-fg');
  const top = el('header', 'glass-top');
  const b = button('', 'btn small icon-btn', () => { sfx('tap'); back(); });
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Pintar'), el('span'));
  const opts = el('div', 'paint-choice');
  const opt = (title: string, desc: string, art: string, hue: string, route: string) => {
    const c = button('', 'slide active choice', () => { sfx('tap'); navigate(route); });
    c.style.setProperty('--hue', hue);
    const a = el('div', 'slide-art');
    const t = getTemplate(art);
    if (t) { const im = el('img'); trimInto(im, thumb(t, 'color', 192), 130); im.alt = ''; a.append(im); }
    const body = el('div', 'slide-body');
    body.append(el('h2', 'slide-title', title), el('p', 'slide-desc', desc));
    const cta = el('span', 'slide-cta'); cta.append(pixelIcon('play', '#fff', 'picon'), document.createTextNode('Entrar'));
    c.append(a, body, cta);
    return c;
  };
  opts.append(
    opt('Pixel art por números', 'Dibujos detallados: perros, gatos, palomas, leopardos, árboles… Cada número es un color.', 'perro', '#5b3df0', 'pintar'),
    opt('Colorear libre', 'Como un cuaderno de colorear: elige dibujo, tus colores, pincel o cubo de pintura.', 'mariposa', '#1f9ad6', 'colorear'),
  );
  fg.append(top, opts);
  screen.append(fg);
  root.append(screen);
  return mountSky(screen);
}
