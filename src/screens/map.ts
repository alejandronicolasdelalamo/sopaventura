import { biomeOf, ISLANDS, proceduralIsland, themeForLevel, type Island } from '../data/islands';
import { THEMES } from '../data/themes';
import { islandLevel, variantFor, VARIANT_INFO, type Mode } from '../core/levels';
import { isIslandUnlocked, isLevelUnlocked, levelKey, mapIslands } from '../core/progress';
import { getState } from '../core/state';
import { hashStr } from '../core/rng';
import { tapCounter } from '../core/eggs';
import { avatarImg } from '../avatar/avatar';
import { setMusicMood, sfx } from '../ui/audio';
import { button, el, reducedMotion, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back } from '../ui/router';
import { MODES, openLevelSheet } from './levelSheet';
import { myAvatar } from './avatar';
import { cloudColors, HORIZON_CSS } from '../paint/scene';
import { renderSceneLayersAsync, type SceneLayers } from '../paint/sceneClient';
import { cloudSprite, drawSeam } from '../ui/clouds';
import { gridPx } from '../ui/grid';
import { mountAmbient } from '../ui/ambient';
import { mountCritters } from '../ui/critters';
import { modal } from '../ui/dom';
import { navigate } from '../ui/router';
import { getTemplate } from '../paint/catalog';
import { thumb } from '../paint/store';
import { olafTemplate } from '../paint/olafLook';
import { totalStars } from '../core/progress';
import { dayPart, greeting } from '../ui/daytime';
import type { Biome } from '../data/islands';

const SVG = 'http://www.w3.org/2000/svg';
const STEP = 104;        // separacion vertical entre niveles (px)
const TOP_PAD = HORIZON_CSS + 60;   // cielo y horizonte pintados arriba de cada isla
const BOTTOM_PAD = 190;  // hueco abajo para el cartel de la isla

/** Estrella pixel 7x7 dibujada con rectangulos (nada de emojis como iconos). */
const STAR_ROWS = ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
export function pixelStar(on: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 7 7');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `pstar ${on ? 'on' : 'off'}`);
  STAR_ROWS.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '#') return;
    const r = document.createElementNS(SVG, 'rect');
    r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
    r.setAttribute('width', '1'); r.setAttribute('height', '1');
    svg.append(r);
  }));
  return svg;
}

let mapMode: Mode | undefined;
/** Progreso que se ve en este mapa: el del modo (chill, timed...) o el del infinito. Cada uno va por separado. */
let mapBucket = 'chill';
function playIsland(isl: Island, i: number, replace = false): void {
  const spec = islandLevel(isl, i);
  spec.key = levelKey(isl.id, i, mapBucket);   // las estrellas se guardan en el progreso de ESTE modo
  openLevelSheet(spec, i + 1 < isl.levels ? () => playIsland(isl, i + 1, true) : undefined, replace, mapMode);
}

/** Posicion horizontal (0..1) del nivel i: camino serpenteante distinto en cada isla. */
const xOf = (isl: Island, i: number) => {
  const ph = (hashStr(isl.id) % 628) / 100;
  return 0.5 + Math.sin(i * 0.78 + ph) * 0.27 + Math.sin(i * 0.31 + ph * 2) * 0.06;
};
const sectionH = (isl: Island) => TOP_PAD + (isl.levels - 1) * STEP + BOTTOM_PAD;
const yOf = (isl: Island, i: number) => sectionH(isl) - BOTTOM_PAD - i * STEP;

/** Mapa de islas estilo Candy Crush: camino que sube, de abajo (inicio) hacia arriba, sin fin. */
export function renderMap(root: HTMLElement, params: { mode?: Mode; bucket?: string } = {}): () => void {
  const p = getState();
  mapMode = params.mode;
  mapBucket = params.bucket ?? params.mode ?? 'chill';
  const screen = el('div', 'screen map');

  const top = el('header', 'topbar');
  const bBack = button('', 'btn small icon-btn', () => { sfx('tap'); back(); });
  bBack.append(pixelIcon('back', '#fff')); bBack.setAttribute('aria-label', 'Volver');
  const coins = el('span', 'coin-box'); coins.append(pixelIcon('coin', '#ffd86b'), document.createTextNode(String(p.coins)));
  const modeChip = el('button', 'mode-chip', mapBucket === 'infinito' ? 'Infinito' : mapMode ? MODES.find(m => m.id === mapMode)!.name : 'Elige modo');
  if (mapBucket !== 'infinito') {
    // cambiar de modo sin volver al menu: cada modo conserva su propio progreso
    modeChip.append(' \u25be'); modeChip.setAttribute('aria-label', 'Cambiar de modo');
    modeChip.addEventListener('click', e => {
      e.stopPropagation(); sfx('tap');
      const box = el('div', 'pause-box');
      box.append(el('h2', '', 'Cambiar de modo'), el('p', '', 'Cada modo guarda su propio progreso.'));
      const close = modal(box);
      const list = el('div', 'btn-col');
      MODES.forEach(m => list.append(button(m.name + (m.id === mapMode ? ' \u2714' : ''), m.id === mapMode ? 'btn small' : 'btn small ghost', () => { close(); if (m.id !== mapMode) navigate('mapa', { mode: m.id }, true); })));
      box.append(list);
    });
  }

  const scroller = el('main', 'map-scroll');
  const islands = mapIslands(p, mapBucket);
  // El siguiente nivel por jugar (late y lleva tu avatar encima)
  let next: { island: string; idx: number } | null = null;
  for (const isl of islands) {
    for (let i = 0; i < isl.levels && !next; i++) if (isLevelUnlocked(p, isl.id, i, mapBucket) && !(p.stars[levelKey(isl.id, i, mapBucket)] ?? 0)) next = { island: isl.id, idx: i };
    if (next) break;
  }
  const lowest = tapCounter('olaf5', 5);
  const sections: { isl: Island; sec: HTMLElement }[] = [];
  // Se apilan de arriba (la mas lejana) a abajo (la primera)
  [...islands].reverse().forEach(isl => {
    const sec = islandSection(isl, next?.island === isl.id ? next.idx : -1);
    sections.push({ isl, sec });
    scroller.append(sec);
  });
  const end = el('div', 'map-start', 'Aquí empieza nuestra aventura');
  scroller.append(end);

  // Barra de la isla que estas viendo (antes un cartel dentro del mapa que tapaba el nivel 1)
  const bar = top;   // una sola fila: volver | isla (nombre y frase) | estrellas de la isla | modo | monedas
  bar.classList.add('isl-top');
  const barName = el('strong', ''), barSub = el('span', 'isl-bar-sub'), barStats = el('span', 'isl-bar-stats');
  const barTxt = el('div', 'isl-bar-txt'); barTxt.append(barName, barSub);
  bar.append(bBack, barTxt, barStats, modeChip, coins);
  const byId = new Map(islands.map(i => [i.id, i]));
  let curId = '';
  const updateBar = () => {
    const mid = scroller.getBoundingClientRect().top + scroller.clientHeight * 0.5;
    let found: Island | undefined;
    for (const { isl, sec } of sections) { const r = sec.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { found = isl; break; } }
    const isl = found ?? byId.get(curId) ?? islands[0];
    if (isl.id === curId) return;
    curId = isl.id;
    setMusicMood(biomeOf(isl));
    ambient.set(biomeOf(isl));
    const open = isIslandUnlocked(p, isl.id, mapBucket);
    const got = Array.from({ length: isl.levels }, (_, k) => p.stars[levelKey(isl.id, k, mapBucket)] ?? 0);
    barName.textContent = isl.name;
    barSub.textContent = open ? isl.blurb : lockText(isl);
    barStats.replaceChildren();
    if (open) {
      const st = el('span', 'isl-st'); st.append(pixelStar(true), document.createTextNode(` ${got.reduce((a, b) => a + b, 0)}/${isl.levels * 3}`));
      barStats.append(st, el('span', 'isl-lv', `${got.filter(v => v > 0).length}/${isl.levels} niveles`));
    } else barStats.append(pixelIcon('lock', '#c4b5fd', 'picon'));
    bar.classList.toggle('locked', !open);
  };
  bar.addEventListener('click', () => { if (curId === 'olaf') lowest(); });
  scroller.addEventListener('scroll', updateBar, { passive: true });
  screen.append(top, scroller);
  root.append(screen);
  const ambient = mountAmbient(screen, () => top.offsetHeight);

  // El escenario de cada isla se pinta solo cuando se acerca a la pantalla (y se repinta si cambia el ancho)
  const painted = new Map<HTMLElement, number>();
  const visible = new Set<HTMLElement>();
  const paint = (sec: HTMLElement) => {
    const w = sec.clientWidth;
    if (!w || painted.get(sec) === w) return;
    painted.set(sec, w);
    const idx = sections.findIndex(x => x.sec === sec), isl = sections[idx].isl;
    drawScene(isl, sec);
    // transiciones: una franja de nubes cierra la isla de arriba y otra abre esta; las dos con los colores de la isla de abajo
    sec.querySelectorAll('.seam').forEach(n => n.remove());
    const part = dayPart(), cols = cloudColors(isl, part);
    if (idx > 0) { const c = el('canvas', 'seam down'); drawSeam(c, w, cols, false, hashStr(isl.id)); sec.append(c); }
    if (idx < sections.length - 1) { const c = el('canvas', 'seam up'); drawSeam(c, w, cloudColors(sections[idx + 1].isl, part), true, hashStr(sections[idx + 1].isl.id)); sec.append(c); }
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    const sec = e.target as HTMLElement;
    if (e.isIntersecting) { visible.add(sec); paint(sec); } else visible.delete(sec);
  }), { root: scroller, rootMargin: '1400px 0px' });
  sections.forEach(({ sec }) => io.observe(sec));
  // parallax: el monumento y las nubes se mueven mas despacio que el suelo (solo las islas cercanas a la pantalla)
  let pr = 0;
  const parallax = () => {
    pr = 0;
    const st = scroller.scrollTop, vh = scroller.clientHeight;
    for (const { sec } of sections) {
      const top = sec.offsetTop;
      if (top > st + vh * 1.6 || top + sec.offsetHeight < st - vh * 0.6) continue;
      const d = Math.max(-320, Math.min(320, st + vh / 2 - (top + HORIZON_CSS / 2)));
      sec.style.setProperty('--py', `${(d * 0.22).toFixed(1)}px`);
      sec.style.setProperty('--py2', `${(d * 0.4).toFixed(1)}px`);
    }
  };
  if (!reducedMotion()) scroller.addEventListener('scroll', () => { if (!pr) pr = requestAnimationFrame(parallax); }, { passive: true });
  let rt = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(() => visible.forEach(paint), 150); });
  ro.observe(scroller);
  requestAnimationFrame(() => {
    const cur = scroller.querySelector<HTMLElement>('.lvl.next');
    if (cur) cur.scrollIntoView({ block: 'center' }); else scroller.scrollTop = scroller.scrollHeight;
    updateBar();
  });
  return () => { ro.disconnect(); io.disconnect(); clearTimeout(rt); cancelAnimationFrame(pr); ambient.stop(); };
}

function islandSection(isl: Island, nextIdx: number): HTMLElement {
  const p = getState();
  const open = isIslandUnlocked(p, isl.id, mapBucket);
  const H = sectionH(isl);
  const sec = el('section', `isl${open ? '' : ' locked'}`);
  sec.style.height = `${H}px`;
  sec.style.setProperty('--sky-a', isl.skyColors[0]);
  sec.style.setProperty('--sky-b', isl.skyColors[1]);
  sec.setAttribute('aria-label', isl.name);
  // la isla se va "encendiendo" (mas color y luz) segun las estrellas que llevas en ella
  const got = Array.from({ length: isl.levels }, (_, k) => p.stars[levelKey(isl.id, k, mapBucket)] ?? 0).reduce((a, b) => a + b, 0);
  sec.style.setProperty('--lit', open ? (0.74 + 0.26 * Math.min(1, got / (isl.levels * 3))).toFixed(2) : '1');
  if (open && got >= isl.levels * 3) sec.classList.add('complete');

  const art = el('canvas', 'isl-art');
  art.setAttribute('aria-hidden', 'true');
  sec.append(art);

  const inner = el('div', 'isl-inner');
  sec.append(inner);

  const me = avatarImg(myAvatar(), 40);
  for (let i = 0; i < isl.levels; i++) {
    const boss = i === isl.levels - 1;
    const stars = p.stars[levelKey(isl.id, i, mapBucket)] ?? 0;
    const playable = isLevelUnlocked(p, isl.id, i, mapBucket);
    const isNext = i === nextIdx;
    const node = el('button', `lvl${boss ? ' boss' : ''}${playable ? '' : ' off'}${isNext ? ' next' : ''}${stars ? ' done' : ''}`);
    node.disabled = !playable;
    node.style.left = `${(xOf(isl, i) * 100).toFixed(2)}%`;
    node.style.top = `${yOf(isl, i)}px`;
    node.style.setProperty('--acc', THEMES[themeForLevel(isl, i)].palette.accent);
    node.style.setProperty('--k', String(Math.min(i, 14)));
    const face = el('span', 'lvl-face');
    if (playable) face.append(el('span', 'n', String(i + 1)));
    else face.append(pixelIcon('lock', '#8f86c0'));
    node.append(face);
    if (playable && !isNext) {
      const s = el('span', 's');
      for (let k = 0; k < 3; k++) s.append(pixelStar(k < stars));
      node.append(s);
    }
    if (isNext) { const pin = el('span', 'me-pin'); pin.append(me); node.append(pin); }
    const vr = variantFor(isl, i);
    node.setAttribute('aria-label', `${isl.name}, nivel ${i + 1}${boss ? ', jefe' : vr !== 'classic' ? `, ${VARIANT_INFO[vr].name}` : ''}, ${stars} de 3 estrellas${playable ? '' : ', bloqueado'}`);
    node.addEventListener('click', () => { sfx('tap'); playIsland(isl, i); });
    inner.append(node);
  }

  if (open && !reducedMotion()) mountCritters(inner, isl, biomeOf(isl), i => yOf(isl, i), i => xOf(isl, i));
  if (open) inner.append(guide(isl, xOf(isl, 0) < 0.5 ? 0.82 : 0.18, sectionH(isl) - 70));
  sec.dataset.isl = isl.id;
  sec.dataset.biome = biomeOf(isl);
  if (!open) sec.addEventListener('click', e => { if (!(e.target as HTMLElement).closest('.lvl:not(:disabled)')) toast(lockText(isl)); });
  return sec;
}

/** Pinta el escenario pixel art de la isla con el camino pasando por los niveles. Va por capas: fondo + monumento + nubes. */
const sceneCache = new Map<string, SceneLayers>();
const copyCanvas = (src: HTMLCanvasElement): HTMLCanvasElement => {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d')!.drawImage(src, 0, 0); return c;
};
function mountLayers(sec: HTMLElement, L: SceneLayers, isl: Island, w: number, pop: boolean): void {
  const px = gridPx(w);
  const art = copyCanvas(L.cv);
  art.className = `isl-art${pop ? ' pop-in' : ''}`; art.setAttribute('aria-hidden', 'true');
  sec.querySelector('.isl-art')?.replaceWith(art);
  sec.querySelectorAll('.lm, .sky-cloud, .shim').forEach(n => n.remove());
  // destellos en el agua de los estanques (2 pixeles que parpadean a saltos)
  if (!reducedMotion()) for (const [pi, pd] of (L.ponds ?? []).entries()) for (let k = 0; k < 4; k++) {
    const seed = hashStr(`${isl.id}:shim:${pi}:${k}`), g = document.createElement('i');
    g.className = 'shim'; g.setAttribute('aria-hidden', 'true');
    g.style.left = `${(pd.x + 2 + (seed % Math.max(1, pd.w - 6))) * px}px`; g.style.top = `${(pd.y + 2 + ((seed >> 5) % Math.max(1, pd.h - 4))) * px}px`;
    g.style.width = `${2 * px}px`; g.style.height = `${px}px`;
    g.style.setProperty('--d', `${((seed >> 9) % 30) / 10}s`);
    sec.append(g);
  }
  if (L.landmark) {
    const lm = copyCanvas(L.landmark.cv);
    lm.className = 'lm'; lm.setAttribute('aria-hidden', 'true');
    lm.style.left = `${L.landmark.left * px}px`; lm.style.top = `${L.landmark.top * px}px`;
    lm.style.width = `${L.landmark.cv.width * px}px`; lm.style.height = `${L.landmark.cv.height * px}px`;
    sec.append(lm);
  }
  // nubes que cruzan el cielo muy despacio (a saltos de un pixel de arte, como en un sprite)
  const b = biomeOf(isl);
  if (L.cloud.length && b !== 'espacio' && b !== 'oceano' && !reducedMotion()) {
    for (let k = 0; k < 3; k++) {
      const seed = hashStr(`${isl.id}:cloud:${k}`), cw = 30 + (seed % 17);
      const c = cloudSprite(L.cloud, seed, cw, 11 + (seed % 4));
      c.className = 'sky-cloud'; c.setAttribute('aria-hidden', 'true');
      const dur = 90 + (seed % 70);
      c.style.width = `${c.width * px}px`; c.style.height = `${c.height * px}px`;
      c.style.top = `${Math.round(10 + ((seed >> 4) % 100) + k * 26)}px`;
      c.style.setProperty('--dur', `${dur}s`); c.style.setProperty('--delay', `-${(seed >> 8) % dur}s`);
      c.style.animationTimingFunction = `steps(${Math.max(60, Math.round((w + 200) / px))})`;
      sec.append(c);
    }
  }
}
function drawScene(isl: Island, sec: HTMLElement): void {
  const w = sec.clientWidth, H = sectionH(isl);
  const key = `${isl.id}:${w}:${dayPart()}`;
  const hit = sceneCache.get(key);
  if (hit) { mountLayers(sec, hit, isl, w, false); return; }
  const innerW = Math.min(680, w), left = (w - innerW) / 2;
  const X = (i: number) => left + xOf(isl, i) * innerW;
  const nodes = Array.from({ length: isl.levels }, (_, i) => [X(i), yOf(isl, i)] as [number, number]);
  void renderSceneLayersAsync({ isl, w, h: H, nodes, top: [X(isl.levels - 0.2), 0], bottom: [X(-0.7), H] }).then(L => {
    sceneCache.set(key, L);
    if (sceneCache.size > 40) sceneCache.delete(sceneCache.keys().next().value!);
    mountLayers(sec, L, isl, w, true);
  });
}

function lockText(isl: Island): string {
  if (isl.locked) return 'Próximamente';
  if (isl.procedural) {
    const prev = isl.procedural === 1 ? ISLANDS.filter(i => !i.locked).at(-1)! : proceduralIsland(isl.procedural - 1);
    return `Completa ${prev.name} para llegar aquí`;
  }
  return `Necesitas ${isl.starsToUnlock} estrellas`;
}

// ------------------------------------------------------------------ personajes guia
const GUIDE: Record<Biome, [string, string]> = {
  flores: ['conejo', 'Coneja Pétalo'], otono: ['zorro', 'Zorro Canela'], bosque: ['ciervo', 'Ciervo Musgo'], setas: ['buho', 'Búho Lucio'],
  jardin: ['mariposa', 'Mariposa Lila'], noche: ['buho', 'Búho Noctis'], cristal: ['medusa', 'Medusa Brillos'], parque: ['perro', 'Perrito Toby'],
  ciudad: ['paloma', 'Paloma Paca'], playa: ['tortuga', 'Tortuga Lenta'], nieve: ['pinguino', 'Pingüino Pin'], oceano: ['pulpo', 'Pulpo Ocho'],
  espacio: ['astronauta', 'Astro Nauta'], dulce: ['panda', 'Panda Bombón'],
};
const TIPS = [
  'Las palabras pueden ir al revés y en diagonal. ¡Mira bien!',
  'Si aciertas varias seguidas haces combo y ganas más.',
  'Con un combo de 3 te regalo un potenciador.',
  'En los jefes hay niebla: espera a que se mueva.',
  'A veces hay una palabra secreta escondida. Vale monedas y pegatinas.',
  'Las pegatinas están en Logros. ¡Colecciónalas todas!',
];
function guide(isl: Island, x: number, y: number): HTMLElement {
  const [tplId, name] = isl.id === 'olaf' ? ['olaf', 'Olaf'] : GUIDE[biomeOf(isl)];
  const t = tplId === 'olaf' ? olafTemplate(totalStars()) : getTemplate(tplId);
  const b = el('button', `npc${x > 0.5 ? ' right' : ' left'}`);
  b.style.left = `${(x * 100).toFixed(1)}%`; b.style.top = `${y}px`;
  b.setAttribute('aria-label', `${name}: tócalo para hablar`);
  if (t) { const img = el('img'); img.src = thumb(t, 'color', 64); img.alt = ''; img.width = 56; img.height = 56; b.append(img); }
  const say = el('span', 'npc-say');
  say.setAttribute('role', 'status');
  b.append(say);
  const p = getState();
  const done = Array.from({ length: isl.levels }, (_, k) => p.stars[levelKey(isl.id, k, mapBucket)] ?? 0).filter(v => v > 0).length;
  const lines = [
    `${greeting()} Soy ${name}. Bienvenidos a ${isl.name}.`,
    isl.blurb,
    done === isl.levels ? '¡Ya habéis completado esta isla! Sois increíbles.' : `Lleváis ${done} de ${isl.levels} niveles. ¡El jefe os espera arriba!`,
    TIPS[hashStr(isl.id) % TIPS.length],
  ];
  let i = 0, tm = 0;
  b.addEventListener('click', e => {
    e.stopPropagation(); sfx('pop', 6);
    say.textContent = `${name}: ${lines[i++ % lines.length]}`;
    b.classList.add('talk'); clearTimeout(tm); tm = window.setTimeout(() => b.classList.remove('talk'), 4500);
  });
  return b;
}
