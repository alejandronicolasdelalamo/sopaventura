import { generatePuzzle, matchSelection, placementCells, shapeMask, snapSelection, type Cell, type Puzzle } from '../core/generator';
import { islandLevel, VARIANT_INFO, type LevelSpec, type Mode } from '../core/levels';
import { bucketOfKey, completeLevel, islandComplete } from '../core/progress';
import { extraWord } from '../core/dictionary';
import { giveStickers, islandStickers, randomMissing, seasonSticker, stickerName } from '../core/stickers';
import { islandCutscene } from '../ui/cutscene';
import type { LiveGame } from '../core/liveGame';
import { islandById } from '../data/islands';
import { checkAchievements } from '../core/achievements';
import { triggerEgg } from '../core/eggs';
import { addCoins, getState, subscribe, update } from '../core/state';
import { getContent, phrase } from '../data/content';
import { norm } from '../core/text';
import { THEMES } from '../data/themes';
import { backdropAsync, backdropCached } from '../paint/sceneClient';
import { setMusicMood, setSfxFlavor, sfx } from '../ui/audio';
import { biomeOf } from '../data/islands';
import { getTemplate } from '../paint/catalog';
import { thumb } from '../paint/store';
import { cleanWords } from '../core/generator';
import { addWeekWords, encodeChallenge, missionEvent, recordPlay } from '../core/extras';
import { sendMessage } from '../net/sync';
import { themeBackground } from '../ui/bg';
import { button, el, modal, reducedMotion, toast, flyCoins } from '../ui/dom';
import { burst, firework, sparkle } from '../ui/fx';
import { buzz } from '../ui/haptics';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';
import { MODES } from './levelSheet';
import { pixelStar } from './map';

export interface GameParams { spec: LevelSpec; mode: Mode; next?: () => void; onDone?: (stars: number) => void; gift?: { message: string; from: string }; live?: LiveGame; challenge?: { secs: number; from: string } }

/** Colores de las capsulas de palabra encontrada (morados, azules y acentos calidos para contrastar). */
const WORD_COLORS = ['#7c4dff', '#22b8e6', '#f2a93b', '#e0457b', '#2fbf8f', '#5b6ef0', '#c04de0', '#ff7a45'];
/** Paleta segura para daltonismo (Okabe-Ito) que ademas lleva una trama distinta por palabra. */
const CB_COLORS = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#7a5cff'];
/** Palabras secretas escondidas en algunos niveles (no salen en la lista). */
const SECRETS: [string, string][] = [
  ['TQM', 'Te quiero mucho, Cuchi.'], ['CUCHI', 'Has encontrado la palabra secreta. Y a la persona secreta: tú.'], ['OLAF', 'Olaf te manda un ronroneo y un cabezazo.'],
  ['MIMOS', 'Vale por una sesión de mimos.'], ['IZANIS', 'Izanis, eres lo mejor que me ha pasado.'], ['BESO', 'Este nivel venía con un beso escondido.'],
  ['ABRAZO', 'Abrazo pendiente. Cóbralo cuando quieras.'], ['OKMAÑANA', 'ok mañana 💜'],
];
const CHEERS = ['¡Bien!', '¡Genial!', '¡Esa!', '¡Crack!', '¡Toma!', '¡Bravo!', '¡Olé!', '¡Así sí!'];
const HINT_COST = 15, REVEAL_COST = 40, EXTRA_TIME_COST = 30, COMBO_WINDOW = 7000;

export function renderGame(root: HTMLElement, params: GameParams): () => void {
  const { spec, mode } = params;
  const settings = getState().settings;
  const tutorial = !settings.tutorialDone && mode !== 'riddle' && mode !== 'blind';
  // En ~1 de cada 4 niveles de isla se esconde una palabra secreta con un mensaje
  const secretOptions = SECRETS.filter(([w]) => w.length <= spec.size && !spec.words.includes(w) && cleanWords([...spec.words, w], spec.size).length === spec.words.length + 1);
  const secretPick = !tutorial && !params.live && spec.islandId && secretOptions.length && Math.random() < 0.28 ? secretOptions[Math.floor(Math.random() * secretOptions.length)] : undefined;
  // Palabras EXTRA escondidas a proposito (no estan en la lista); tampoco se cuentan en el modo a dos (el tablero se comparte)
  const extraWords = params.live ? [] : (spec.extras ?? []);
  const puzzle: Puzzle = generatePuzzle([...spec.words, ...(secretPick ? [secretPick[0]] : []), ...extraWords], { size: spec.size, seed: spec.seed, dirCount: spec.dirCount, dirs: spec.dirs, bias: spec.bias, mask: spec.shape ? shapeMask(spec.shape, spec.size) : undefined });
  const secretIdx = secretPick ? puzzle.placements.findIndex(p => p.word === secretPick[0]) : -1;
  const extraIdx = new Set(puzzle.placements.map((p, i) => (extraWords.includes(p.word) && i !== secretIdx ? i : -1)).filter(i => i >= 0));
  /** Palabras que no van en la lista (secreta y extras): no cuentan para completar el nivel. */
  const isHidden = (i: number) => i === secretIdx || extraIdx.has(i);
  const extrasFound = new Set<string>();
  let extraCoins = 0, extraStreak = 0;
  let secretFound = false;
  const COLORS = settings.colorblind ? CB_COLORS : WORD_COLORS;
  const theme = THEMES[spec.theme];
  const motion = !reducedMotion();
  // Recordar las palabras que han salido para que los siguientes niveles no las repitan
  const used = puzzle.placements.filter((_, i) => !isHidden(i)).map(p => p.word);
  update(s => { s.settings.lastMode = mode; s.recentWords = [...(s.recentWords ?? []).filter(w => !used.includes(w)), ...used].slice(-1200); });
  /** Repetir = otro tablero distinto del mismo nivel (mismas estrellas en juego). */
  const again = (): GameParams => (!params.challenge && spec.islandId && spec.index !== undefined && islandById(spec.islandId) ? { ...params, spec: { ...islandLevel(islandById(spec.islandId)!, spec.index), key: spec.key } } : params);

  // ---- estado ----
  const found = new Set<number>();
  if (location.search.includes('e2e')) (window as unknown as { __ns: unknown }).__ns = { puzzle, found };
  let wrong = 0, hintsUsed = 0, score = 0, shownScore = 0, combo = 0, lastFound = 0, bestCombo = 0, extraUsed = false;
  let timeLeft = spec.timeLimit, paused = false, ended = false, last = performance.now(), lastProgress = performance.now();
  const t0 = performance.now();
  const timed = mode === 'timed' || mode === 'points';
  const total = puzzle.placements.filter((_, i) => !isHidden(i)).length;
  const duo = params.live;
  let theirs = 0;
  const liveCount = () => (duo!.kind === 'coop' ? `${found.size}/${total} · ${duo!.partner} ${theirs}` : `Tú ${found.size - theirs} · ${duo!.partner} ${theirs}`);
  let cs = 40;

  // ---- DOM ----
  const screen = el('div', `screen game game2 skin-${getState().skin}`);
  const isl = spec.islandId ? islandById(spec.islandId) : undefined;
  const bgW = Math.min(innerWidth, 900), bgH = innerHeight;
  screen.style.setProperty('--bgimg', `url(${(isl && backdropCached(isl, bgW, bgH)) || themeBackground(spec.theme)})`);
  if (isl && !backdropCached(isl, bgW, bgH)) void backdropAsync(isl, bgW, bgH).then(u => screen.style.setProperty('--bgimg', `url(${u})`));
  if (isl) screen.classList.add('scene-bg');
  screen.style.setProperty('--t-accent', theme.palette.accent);
  const vignette = el('div', 'g-vignette');

  // HUD superior
  const top = el('header', 'g-top');
  const bBack = button('', 'g-icon', () => { sfx('tap'); confirmExit(); });
  bBack.append(pixelIcon('back', '#fff')); bBack.setAttribute('aria-label', 'Salir al mapa');
  const mid = el('div', 'g-title');
  const lvl = spec.index !== undefined ? `Nivel ${spec.index + 1}${spec.boss ? ' · Jefe' : ''}` : spec.title;
  mid.append(el('strong', '', lvl), el('small', '', `${MODES.find(m => m.id === mode)?.name ?? ''} · ${spec.variant && spec.variant !== 'classic' && spec.variant !== 'boss' ? VARIANT_INFO[spec.variant].name : theme.name}`));
  const coinBox = el('div', 'g-coins coin-box');
  const coinNum = el('span', '', String(getState().coins));
  coinBox.append(pixelIcon('coin', '#ffd86b'), coinNum);
  const bPause = button('', 'g-icon', () => { sfx('tap'); pause(); });
  bPause.append(pixelIcon('pause', '#fff')); bPause.setAttribute('aria-label', 'Pausa');
  top.append(bBack, mid, coinBox, bPause);

  // barra de progreso por palabras + reloj / puntos
  const hud = el('div', 'g-hud');
  const prog = el('div', 'g-prog');
  const segs = Array.from({ length: total }, () => { const s = el('i'); prog.append(s); return s; });
  const count = el('span', 'g-count hud-meta', `0/${total}`);
  const right = el('div', 'g-right');
  const timeBar = el('div', 'g-time');
  const timeFill = el('div', 'g-time-fill');
  const timeTxt = el('span', 'g-time-txt');
  timeBar.append(timeFill, timeTxt);
  const scoreEl = el('span', 'g-score', '0');
  if (timed) right.append(timeBar);
  if (mode === 'points') right.append(scoreEl);
  hud.append(prog, count);
  if (timed) hud.append(right);

  // palabras
  const words = el('div', mode === 'riddle' ? 'g-words riddle' : mode === 'blind' ? 'g-words blind' : 'g-words');
  words.setAttribute('role', 'list');
  if (total > 9) words.classList.add('dense');
  const wordEls = puzzle.placements.map((pl, i) => {
    const w = el('div', 'g-word');
    w.setAttribute('role', 'listitem');
    w.dataset.i = String(i);
    w.style.setProperty('--d', `${i * 40}ms`);
    if (isHidden(i)) { w.hidden = true; return w; }
    if (mode === 'blind') { w.append(el('span', 'g-word-t', '?')); words.append(w); return w; }
    if (mode === 'riddle') {
      w.append(el('span', 'g-word-t', spec.clues[pl.word] ?? `Palabra de «${theme.name}»`), el('span', 'g-word-p', `${pl.word[0]}… · ${pl.word.length} letras`));
    } else w.append(el('span', 'g-word-t', pl.word));
    words.append(w);
    return w;
  });

  // tablero
  const wrap = el('div', 'board-wrap g-wrap');
  const frame = el('div', 'g-frame');
  const preview = el('div', 'g-preview');
  preview.setAttribute('aria-hidden', 'true');
  const toastEl = el('div', 'g-cheer');
  toastEl.setAttribute('aria-hidden', 'true');
  const board = el('div', 'board g-board');
  const grid = el('div', 'grid');
  const caps = el('div', 'g-caps');
  board.append(grid, caps);
  frame.append(board, preview, toastEl);
  wrap.append(frame);
  const cells: HTMLElement[][] = [];
  for (let r = 0; r < puzzle.size; r++) {
    cells.push([]);
    for (let c = 0; c < puzzle.size; c++) {
      const d = el('div', `cell g-cell${puzzle.grid[r][c] ? '' : ' void'}`);
      d.append(el('span', '', puzzle.grid[r][c]));
      if (motion) d.style.setProperty('--w', `${(r + c) * 22}ms`);
      cells[r].push(d);
      grid.append(d);
    }
  }

  // acciones
  const actions = el('footer', 'g-actions');
  const bHint = button('', 'g-act', () => useHint());
  const bReveal = button('', 'g-act alt', () => useReveal());
  const comboEl = el('div', 'g-combo');
  comboEl.setAttribute('aria-live', 'polite');
  const powers = el('div', 'g-powers');
  const pwBtn = (key: 'freeze' | 'clean' | 'bolt' | 'radar', icon: string, label: string) => {
    const b = button('', 'g-pw', () => usePower(key));
    b.dataset.k = key; b.setAttribute('aria-label', label); b.title = label;
    b.append(pixelIcon(icon, '#fff'), el('span', 'g-pw-n'));
    powers.append(b);
    return b;
  };
  const pwFreeze = pwBtn('freeze', 'snow', 'Congelar el tiempo 10 s');
  const pwClean = pwBtn('clean', 'broom', 'Apagar letras que sobran');
  const pwBolt = pwBtn('bolt', 'bolt', 'Rayo: ilumina una fila');
  const pwRadar = pwBtn('radar', 'radar', 'Radar: marca la zona de una palabra extra');
  const mid2 = el('div', 'g-mid');
  mid2.append(comboEl, powers);
  actions.append(bHint, mid2, bReveal);

  const live = el('div', 'sr-only');
  live.setAttribute('aria-live', 'polite');
  screen.append(vignette, top, hud, words, wrap, actions, live);
  root.append(screen);

  const variantInfo = spec.variant && spec.variant !== 'classic' && spec.variant !== 'boss' ? VARIANT_INFO[spec.variant] : spec.variant === 'boss' ? VARIANT_INFO.boss : undefined;
  // intro: cartel del nivel que entra y sale (no bloquea el tablero)
  if (motion) {
    const intro = el('div', 'g-intro');
    intro.append(el('small', '', isl ? isl.name : theme.name), el('strong', '', spec.boss ? '¡JEFE!' : spec.index !== undefined ? `NIVEL ${spec.index + 1}` : spec.title.toUpperCase()), el('span', '', mode === 'blind' ? `A ciegas: ${total} palabras de «${theme.name}»` : `Encuentra ${total} palabras`));
    if (variantInfo) intro.append(el('em', 'g-variant', `${variantInfo.name}: ${variantInfo.tip}`));
    screen.append(intro);
    sfx('whoosh');
    setTimeout(() => intro.remove(), variantInfo ? 2300 : 1700);
    screen.classList.add('intro');
    setTimeout(() => screen.classList.remove('intro'), 900);
  }

  setMusicMood(isl ? biomeOf(isl) : 'menu');
  if (mode === 'blind') words.prepend(el('div', 'g-blind-head', `Tema: ${theme.name} · ${total} palabras escondidas`));
  const extraChip = el('div', 'g-extra-chip');
  const drawExtraChip = () => { extraChip.textContent = extrasFound.size ? `✦ Extras: ${extrasFound.size} · +${extraCoins} monedas` : `✦ ${extraIdx.size || 'Hay'} palabras extra escondidas · dan monedas`; extraChip.classList.toggle('got', extrasFound.size > 0); };
  if (!params.live && mode !== 'riddle') { drawExtraChip(); words.append(extraChip); }
  if (secretPick) words.append(el('div', 'g-secret-hint', 'Aquí hay una palabra secreta escondida…'));

  // ---- tutorial de la primera partida (no bloquea el tablero) ----
  let tutStep = 0;
  const tutBox = el('div', 'g-tut');
  const hand = el('div', 'g-hand');
  hand.setAttribute('aria-hidden', 'true');
  let handAnim: Animation | null = null;
  function tutSay(text: string, btn: string, onBtn: () => void, where: 'bottom' | 'top' = 'bottom'): void {
    tutBox.replaceChildren();
    const olafT = getTemplate('olaf');
    if (olafT) { const im = el('img', 'g-tut-olaf'); im.src = thumb(olafT, 'color', 64); im.alt = ''; tutBox.append(im); }
    const col = el('div', 'g-tut-col');
    col.append(el('p', '', text));
    const b = button(btn, 'btn small', () => { sfx('tap'); onBtn(); });
    col.append(b);
    tutBox.append(col);
    tutBox.className = `g-tut over ${where}`;
    tutBox.setAttribute('role', 'status');
    if (!tutBox.isConnected) frame.append(tutBox);   // encima del tablero, sin tapar letras
  }
  function tutHand(): void {
    const pl = puzzle.placements[0];
    const pcs = placementCells(pl), a = pcs[0], z = pcs[pcs.length - 1];
    board.append(hand);
    handAnim?.cancel();
    if (!motion) { hand.style.transform = `translate(${(a.c + 0.5) * cs}px, ${(a.r + 0.5) * cs}px)`; return; }
    handAnim = hand.animate([
      { transform: `translate(${(a.c + 0.5) * cs}px, ${(a.r + 0.5) * cs}px) scale(1.15)`, opacity: 0 },
      { transform: `translate(${(a.c + 0.5) * cs}px, ${(a.r + 0.5) * cs}px) scale(1)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${(z.c + 0.5) * cs}px, ${(z.r + 0.5) * cs}px) scale(1)`, opacity: 1, offset: 0.75 },
      { transform: `translate(${(z.c + 0.5) * cs}px, ${(z.r + 0.5) * cs}px) scale(1)`, opacity: 0 },
    ], { duration: 2200, iterations: Infinity, easing: 'ease-in-out' });
  }
  function tutEnd(): void {
    tutStep = 99; handAnim?.cancel(); hand.remove(); tutBox.remove(); actions.classList.remove('tut-glow');
    update(s => { s.settings.tutorialDone = true; });
  }
  function tutNext(): void {
    tutStep++;
    if (tutStep === 1) {
      tutSay(`¡Hola! Soy Olaf. Desliza el dedo sobre las letras de «${puzzle.placements[0].word}», como te enseño.`, 'Saltar', tutEnd);
      tutHand();
    } else if (tutStep === 2) {
      handAnim?.cancel(); hand.remove();
      tutSay('¡Así se hace! Palabras seguidas en menos de 7 segundos = combo y más premio.', 'Siguiente', tutNext);
    } else if (tutStep === 3) {
      actions.classList.add('tut-glow');
      tutSay('¿Atascado? Pista marca la primera letra y Revelar te da una palabra entera.', '¡A jugar!', tutEnd, 'top');
    } else tutEnd();
  }
  if (tutorial) setTimeout(() => { if (!ended && tutStep === 0) tutNext(); }, motion ? 1500 : 200);

  function refreshButtons(): void {
    const s = getState();
    const pw = s.powerups ?? { freeze: 0, clean: 0, bolt: 0, radar: 0 };
    ([[pwFreeze, pw.freeze], [pwClean, pw.clean], [pwBolt, pw.bolt], [pwRadar, pw.radar ?? 0]] as const).forEach(([b, n]) => { b.querySelector('.g-pw-n')!.textContent = String(n); b.disabled = !n || (b === pwFreeze && !timed) || (b === pwRadar && (!!params.live || mode === 'riddle')); });
    bHint.replaceChildren(pixelIcon('bulb', '#ffd86b'), el('span', 'g-act-t', 'Pista'), el('span', 'g-act-n', s.hints > 0 ? `x${s.hints}` : String(HINT_COST)));
    if (!(s.hints > 0)) bHint.querySelector('.g-act-n')!.prepend(pixelIcon('coin', '#ffd86b'));
    bReveal.replaceChildren(pixelIcon('eye', '#fff'), el('span', 'g-act-t', 'Revelar'), el('span', 'g-act-n', s.reveals > 0 ? `x${s.reveals}` : String(REVEAL_COST)));
    if (!(s.reveals > 0)) bReveal.querySelector('.g-act-n')!.prepend(pixelIcon('coin', '#ffd86b'));
    coinNum.textContent = String(s.coins);
    pwFreeze.hidden = !timed;   // Congelar solo sirve con reloj
  }
  const unsub = subscribe(refreshButtons);
  refreshButtons();

  // ---- tamaño: el tablero ocupa todo el hueco disponible ----
  function layout(): void {
    // En PC ancho las ayudas van en una columna a la derecha del tablero (no restan alto)
    const side = getComputedStyle(screen).display === 'grid';
    const used = top.offsetHeight + hud.offsetHeight + words.offsetHeight + (side ? 0 : actions.offsetHeight);
    const availH = root.clientHeight - used - (root.clientHeight < 720 ? 22 : side ? 56 : 34);
    const availW = side ? Math.min(root.clientWidth - 460, 780) : Math.min(root.clientWidth - 30, 600);
    cs = Math.max(20, Math.min(92, Math.floor(Math.min(availW, availH) / puzzle.size)));
    const px = cs * puzzle.size;
    board.style.width = board.style.height = `${px}px`;
    grid.style.gridTemplateColumns = `repeat(${puzzle.size}, ${cs}px)`;
    grid.style.gridAutoRows = `${cs}px`;
    board.style.setProperty('--cs', `${cs}px`);
    board.style.fontSize = `${Math.round(cs * (cs < 30 ? 0.52 : 0.44) * (settings.bigText ? 1.16 : 1))}px`;
    board.classList.toggle('tiny', cs < 30);
    caps.querySelectorAll<HTMLElement>('.cap').forEach(b => placeCap(b, JSON.parse(b.dataset.a!) as Cell, JSON.parse(b.dataset.b!) as Cell));
  }
  const ro = new ResizeObserver(layout);
  ro.observe(root);
  requestAnimationFrame(layout);

  // capsulas (resaltado tipo "rotulador" sobre las letras)
  function placeCap(b: HTMLElement, a: Cell, z: Cell): void {
    const x1 = (a.c + 0.5) * cs, y1 = (a.r + 0.5) * cs, x2 = (z.c + 0.5) * cs, y2 = (z.r + 0.5) * cs;
    const len = Math.hypot(x2 - x1, y2 - y1), pad = cs * 0.43;
    b.style.width = `${len + pad * 2}px`; b.style.height = `${pad * 2}px`;
    b.style.transformOrigin = `${pad}px ${pad}px`;
    b.style.transform = `translate(${x1 - pad}px, ${y1 - pad}px) rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
  }
  function makeCap(a: Cell, z: Cell, cls: string, color?: string): HTMLElement {
    const b = el('div', `cap ${cls}`);
    b.dataset.a = JSON.stringify(a); b.dataset.b = JSON.stringify(z);
    if (color) b.style.setProperty('--cap', color);
    placeCap(b, a, z);
    caps.append(b);
    return b;
  }
  const cellCenter = (c: Cell) => { const r = board.getBoundingClientRect(); return [r.left + (c.c + 0.5) * cs, r.top + (c.r + 0.5) * cs] as const; };

  // ---- seleccion con el dedo ----
  let start: Cell | null = null, liveCap: HTMLElement | null = null, selCells: HTMLElement[] = [];
  let endCell: Cell | null = null;
  const fpos = (e: PointerEvent) => { const rect = board.getBoundingClientRect(); return { fr: (e.clientY - rect.top) / cs - 0.5, fc: (e.clientX - rect.left) / cs - 0.5 }; };
  const clearSel = () => { selCells.forEach(c => c.classList.remove('sel')); selCells = []; liveCap?.remove(); liveCap = null; };

  board.addEventListener('pointerdown', e => {
    if (paused || ended) return;
    e.preventDefault();
    board.setPointerCapture(e.pointerId);
    const { fr, fc } = fpos(e);
    const r = Math.round(fr), c = Math.round(fc);
    if (r < 0 || c < 0 || r >= puzzle.size || c >= puzzle.size || !puzzle.grid[r][c]) return;
    start = { r, c }; endCell = start;
    sfx('select', 0); buzz(6);
    drawSel();
  });
  board.addEventListener('pointermove', e => {
    if (!start) return;
    e.preventDefault();
    const { fr, fc } = fpos(e);
    const { end } = snapSelection(start, fr, fc, puzzle.size);
    if (!endCell || end.r !== endCell.r || end.c !== endCell.c) {
      endCell = end; drawSel();
      sfx('select', Math.max(Math.abs(end.r - start.r), Math.abs(end.c - start.c))); buzz(3);
    }
  });
  const finishSel = () => {
    if (!start || !endCell) return;
    const a = start, z = endCell;
    start = null;
    const isLine = a.r !== z.r || a.c !== z.c;
    const idx = isLine ? matchSelection(puzzle, a, z) : -1;
    if (idx >= 0 && idx === secretIdx) { clearSel(); if (!secretFound) onSecret(); else hidePreview(); endCell = null; return; }
    if (idx >= 0 && extraIdx.has(idx)) { clearSel(); onExtra(puzzle.placements[idx].word, a, z); endCell = null; return; }
    const sel = selCells.slice();
    const letters = sel.map(c => c.textContent ?? '').join('');
    clearSel();
    if (idx >= 0 && !found.has(idx)) onFound(idx);
    else if (isLine) {
      // una palabra real que no es de la lista tambien cuenta como extra (si es nueva)
      const ew = params.live || mode === 'riddle' ? null : extraWord(letters);
      if (ew && !puzzle.placements.some(pl => pl.word === ew)) onExtra(ew, a, z);
      else onWrong(sel);
    } else hidePreview();
    endCell = null;
  };
  board.addEventListener('pointerup', finishSel);
  board.addEventListener('pointercancel', () => { start = null; endCell = null; clearSel(); hidePreview(); });
  board.addEventListener('contextmenu', e => e.preventDefault());

  function drawSel(): void {
    if (!start || !endCell) return;
    selCells.forEach(c => c.classList.remove('sel'));
    const dr = Math.sign(endCell.r - start.r), dc = Math.sign(endCell.c - start.c);
    const n = Math.max(Math.abs(endCell.r - start.r), Math.abs(endCell.c - start.c));
    selCells = Array.from({ length: n + 1 }, (_, i) => cells[start!.r + dr * i][start!.c + dc * i]);
    selCells.forEach(c => c.classList.add('sel'));
    liveCap?.remove();
    liveCap = makeCap(start, endCell, 'live');
    preview.textContent = selCells.map(c => c.textContent).join('');
    preview.className = 'g-preview show';
  }
  function hidePreview(cls = ''): void {
    preview.className = `g-preview${cls ? ` show ${cls}` : ''}`;
    if (cls) setTimeout(() => { if (!start) preview.className = 'g-preview'; }, 520);
  }

  // ---- eventos de juego ----
  /** Palabra secreta: mensaje bonito y monedas, sin interrumpir la partida. */
  function onSecret(): void {
    if (!secretPick) return;
    secretFound = true;
    const pcs = placementCells(puzzle.placements[secretIdx]);
    const cap = makeCap(pcs[0], pcs[pcs.length - 1], 'found secret', '#ffb400');
    if (motion) cap.classList.add('draw');
    pcs.forEach((c, i) => setTimeout(() => { const [x, y] = cellCenter(c); burst(x, y, ['#ffd86b', '#ffffff', '#ff9ad5'], 9, 0.9); }, i * 50));
    addCoins(25);
    const stk = giveStickers([randomMissing() ?? '']);
    if (stk.length) setTimeout(() => toast(`Pegatina nueva: ${stickerName(stk[0])}`), 1600);
    sfx('unlock'); setTimeout(() => sfx('letter'), 250); buzz([20, 40, 20, 40, 60]);
    const card = el('div', 'g-secret');
    card.append(el('small', '', '¡Palabra secreta!'), el('strong', '', secretPick[0]), el('p', '', secretPick[1]), el('span', 'g-secret-c', '+25 monedas'));
    screen.append(card);
    setTimeout(() => card.classList.add('out'), 4200);
    setTimeout(() => card.remove(), 4600);
    hidePreview('ok');
    preview.textContent = secretPick[0];
  }

  /** Palabra extra (de las escondidas o cualquiera real): monedas, sin interrumpir la partida ni contar como fallo. */
  function onExtra(word: string, a: Cell, z: Cell): void {
    if (extrasFound.has(word)) { hidePreview(); return; }
    extrasFound.add(word);
    extraStreak++;
    const streakBonus = extraStreak > 0 && extraStreak % 5 === 0;   // la 5ª extra seguida (sin fallar) da premio doble
    const gain = Math.min(12, 3 + word.length) * (streakBonus ? 2 : 1);
    extraCoins += gain; addCoins(gain);
    missionEvent('extras'); if (streakBonus) missionEvent('extrastreak');
    lastProgress = performance.now();
    const cap = makeCap(a, z, 'found extra', '#ffd86b');
    if (motion) cap.classList.add('draw');
    const n = Math.max(Math.abs(z.r - a.r), Math.abs(z.c - a.c)), dr = Math.sign(z.r - a.r), dc = Math.sign(z.c - a.c);
    if (motion) for (let i = 0; i <= n; i++) setTimeout(() => { const [x, y] = cellCenter({ r: a.r + dr * i, c: a.c + dc * i }); burst(x, y, ['#ffd86b', '#fff3b0', '#ffffff'], 6, 0.8); }, i * 40);
    sfx('coin'); setTimeout(() => sfx('unlock'), 120); buzz([12, 30, 12]);
    hidePreview('ok'); preview.textContent = streakBonus ? `¡RACHA x5! ${word} +${gain}` : `¡EXTRA! ${word} +${gain}`;
    if (streakBonus) { toast('¡5 extras seguidas! Premio doble'); setTimeout(() => sfx('win'), 200); }
    if (motion) flyCoins(board, coinBox, 5);
    drawExtraChip();
    live.textContent = `Palabra extra ${word}, más ${gain} monedas`;
  }

  function onFound(idx: number, auto = false): void {
    found.add(idx);
    lastProgress = performance.now();
    const pl = puzzle.placements[idx];
    const pcs = placementCells(pl);
    const color = COLORS[(found.size - 1) % COLORS.length];
    const pat = settings.colorblind ? ` pat${(found.size - 1) % 4}` : '';
    const cap = makeCap(pcs[0], pcs[pcs.length - 1], `found${pat}`, color);
    if (motion) cap.classList.add('draw');
    pcs.forEach((c, i) => {
      const d = cells[c.r][c.c];
      d.classList.add('foundcell');
      if (motion) { d.style.setProperty('--b', `${i * 40}ms`); d.classList.remove('bounce'); void d.offsetWidth; d.classList.add('bounce'); }
    });
    // chispas a lo largo de la palabra
    if (motion) pcs.forEach((c, i) => setTimeout(() => { const [x, y] = cellCenter(c); burst(x, y, [color, '#ffffff', '#ffe08a'], 7, 0.8); }, i * 40));
    hidePreview('ok');
    preview.textContent = pl.word;

    // combo
    const now = performance.now();
    combo = !auto && now - lastFound < COMBO_WINDOW ? Math.min(5, combo + 1) : 1;
    bestCombo = Math.max(bestCombo, combo);
    lastFound = now;
    let gainText = '';
    if (mode === 'points' && !auto) {
      const gain = pl.word.length * 50 * combo;
      score += gain;
      gainText = `+${gain}`;
    }
    showCombo(auto);
    if (!auto) popText(gainText || CHEERS[Math.floor(Math.random() * CHEERS.length)], combo > 1 ? `Combo x${combo}` : '', color);
    markWord(pl.word, wordEls[idx], color);
    if (pat) wordEls[idx].classList.add(pat.trim());
    if (tutorial && tutStep === 1) tutNext();
    addWeekWords(1); missionEvent('words');
    segs[found.size - 1]?.classList.add('on');
    segs[found.size - 1]?.style.setProperty('--sc', color);
    count.textContent = `${found.size}/${total}`;
    live.textContent = `Encontrada: ${pl.word}. Quedan ${total - found.size}.`;
    sfx('found', Math.min(found.size, 8)); buzz([10, 30, 10]);
    if (combo > 1) setTimeout(() => sfx('combo', combo), 160);
    if (combo >= 3 && !powerGiven) {
      powerGiven = true;
      const keys = ['freeze', 'clean', 'bolt'] as const;
      const k = keys[Math.floor(Math.random() * 3)];
      update(s => { s.powerups = s.powerups ?? { freeze: 0, clean: 0, bolt: 0 }; s.powerups[k] += 1; });
      toast(`¡Combo x3! Ganas un potenciador: ${k === 'freeze' ? 'Congelar' : k === 'clean' ? 'Limpiar' : 'Rayo'}`);
    }
    board.classList.remove('punch'); void board.offsetWidth; board.classList.add('punch');

    if (pl.word === 'RAGEBITE') triggerEgg('ragebite');
    if (pl.word === 'OKMAÑANA') triggerEgg('okmanana');
    getContent().eggs.filter(e => e.word && norm(e.word) === pl.word).forEach(e => triggerEgg(e.id));
    if (duo) { duo.send(idx); count.textContent = liveCount(); }
    const left = total - found.size;
    wordEls.forEach((w, i) => w.classList.toggle('last', left === 1 && !found.has(i)));
    if (!left) win();
  }

  /** Palabra encontrada por la pareja (o por Olaf) en una partida a dos. */
  function onRemoteFound(idx: number): void {
    if (!duo) return;
    found.add(idx); theirs++;
    lastProgress = performance.now();
    const pl = puzzle.placements[idx];
    const pcs = placementCells(pl);
    const color = '#22d3ee';
    const cap = makeCap(pcs[0], pcs[pcs.length - 1], 'found theirs', color);
    if (motion) { cap.classList.add('draw'); pcs.forEach((c, i) => setTimeout(() => { const [x, y] = cellCenter(c); burst(x, y, [color, '#ffffff'], 5, 0.7); }, i * 40)); }
    pcs.forEach(c => cells[c.r][c.c].classList.add('foundcell'));
    markWord(pl.word, wordEls[idx], color);
    wordEls[idx].classList.add('theirs');
    segs[found.size - 1]?.classList.add('on');
    segs[found.size - 1]?.style.setProperty('--sc', color);
    count.textContent = liveCount();
    live.textContent = `${duo.partner} ha encontrado ${pl.word}.`;
    popText(`${duo.partner}: ${pl.word}`, duo.kind === 'coop' ? '¡Equipo!' : '', color);
    sfx('pop', 4); buzz(8);
    const left = total - found.size;
    wordEls.forEach((w, i) => w.classList.toggle('last', left === 1 && !found.has(i)));
    if (!left) win();
  }

  function markWord(word: string, target: HTMLElement, color: string): void {
    target.classList.add('done');
    target.style.setProperty('--wc', color);
    if (mode === 'riddle' || mode === 'blind') { target.querySelector('.g-word-t')!.textContent = word; target.querySelector('.g-word-p')?.remove(); }
    if (!target.querySelector('.g-check')) target.append(pixelIcon('check', '#fff', 'picon g-check'));
    if (!motion) return;
    target.classList.remove('land'); void target.offsetWidth; target.classList.add('land');
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const tr = target.getBoundingClientRect();
    burst(tr.left + tr.width / 2, tr.top + tr.height / 2, [color, '#ffffff'], 8, 0.6);
  }

  /** Etiqueta solida y legible en un sitio fijo, encima del tablero. */
  function popText(text: string, sub: string, color: string): void {
    if (!motion) return;
    toastEl.replaceChildren(el('strong', '', text));
    if (sub) toastEl.append(el('span', '', sub));
    toastEl.style.setProperty('--pc', color);
    toastEl.classList.remove('show'); void toastEl.offsetWidth; toastEl.classList.add('show');
  }

  function showCombo(auto: boolean): void {
    if (combo < 2 || auto) { comboEl.classList.remove('on'); return; }
    comboEl.replaceChildren(pixelIcon('fire', '#ffb84a'), el('strong', '', `x${combo}`), el('small', '', 'COMBO'));
    comboEl.classList.remove('on', `lv${combo - 1}`); void comboEl.offsetWidth; comboEl.classList.add('on', `lv${combo}`);
    clearTimeout(comboT);
    comboT = window.setTimeout(() => comboEl.classList.remove('on'), COMBO_WINDOW);
  }
  let comboT = 0;

  function onWrong(sel: HTMLElement[]): void {
    wrong++; combo = 0; extraStreak = 0; comboEl.classList.remove('on');
    sfx('wrong'); buzz([30, 40, 30]);
    hidePreview('bad');
    sel.forEach(c => { c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope'); });
    if (motion) { frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake'); }
  }

  // ---- marcador ----
  const fmt = (t: number) => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0')}`;
  let lastSec = -1;
  function updateTime(): void {
    if (!timed) return;
    const r = Math.max(0, timeLeft / (extraUsed ? 30 : spec.timeLimit));
    timeFill.style.transform = `scaleX(${Math.min(1, r)})`;
    timeTxt.textContent = fmt(timeLeft);
    const low = timeLeft <= 10 && found.size < total;
    timeBar.classList.toggle('warn', timeLeft <= 30 && !low);
    timeBar.classList.toggle('low', low);
    screen.classList.toggle('danger', low && !paused);
    const sec = Math.ceil(timeLeft);
    if (low && sec !== lastSec && sec > 0) { lastSec = sec; sfx('tick'); buzz(4); }
  }
  updateTime();

  // ---- bucle: reloj, puntuacion que cuenta y empujon si llevas rato sin encontrar ----
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = (now - last) / 1000; last = now;
    if (paused || ended) return;
    if (timed && now < frozenUntil) { timeBar.classList.add('frozen'); }
    else if (timed) {
      timeBar.classList.remove('frozen');
      timeLeft -= dt;
      updateTime();
      if (timeLeft <= 0) { timeLeft = 0; lose(); return; }
    }
    if (shownScore !== score) { shownScore += Math.ceil((score - shownScore) * 0.18); if (Math.abs(score - shownScore) < 2) shownScore = score; scoreEl.textContent = `${shownScore.toLocaleString('es')} pts`; }
    bHint.classList.toggle('nudge', now - lastProgress > 22000 && found.size < total);
  };
  raf = requestAnimationFrame(loop);

  // ---- potenciadores ----
  let frozenUntil = 0, powerGiven = false;
  function usePower(k: 'freeze' | 'clean' | 'bolt' | 'radar'): void {
    if (paused || ended || !pending().length) return;
    const pw = getState().powerups;
    if (!pw?.[k]) return;
    if (k === 'freeze' && !timed) return;
    // Radar: solo si queda alguna palabra extra escondida sin encontrar (no se gasta si no hay)
    const hiddenLeft = [...extraIdx].filter(i => !extrasFound.has(puzzle.placements[i].word));
    if (k === 'radar' && !hiddenLeft.length) { toast('Ya no quedan palabras extra escondidas aquí'); sfx('wrong'); return; }
    update(s => { s.powerups[k] = (s.powerups[k] ?? 0) - 1; });
    lastProgress = performance.now();
    buzz(15);
    if (k === 'freeze') { frozenUntil = performance.now() + 10000; sfx('unlock'); toast('Tiempo congelado 10 s'); }
    if (k === 'clean') {
      const keep = new Set(pending().flatMap(i => placementCells(puzzle.placements[i]).map(c => `${c.r},${c.c}`)));
      cells.forEach((row, r) => row.forEach((d, c) => { if (!keep.has(`${r},${c}`) && puzzle.grid[r][c]) d.classList.add('dim'); }));
      sfx('whoosh');
      setTimeout(() => cells.flat().forEach(d => d.classList.remove('dim')), 12000);
    }
    if (k === 'radar') {
      // marca un cuadro de 3x3 que contiene alguna letra de la palabra extra (no la palabra entera)
      const pl = puzzle.placements[hiddenLeft[Math.floor(Math.random() * hiddenLeft.length)]];
      const pcs = placementCells(pl), mid = pcs[Math.floor(pcs.length / 2)];
      const ox = Math.max(0, Math.min(puzzle.size - 3, mid.c - 1 + (Math.random() < 0.5 ? 0 : 1))), oy = Math.max(0, Math.min(puzzle.size - 3, mid.r - 1 + (Math.random() < 0.5 ? 0 : 1)));
      const marked: HTMLElement[] = [];
      for (let r = oy; r < oy + 3; r++) for (let c = ox; c < ox + 3; c++) { cells[r][c].classList.add('radar'); marked.push(cells[r][c]); }
      const [x, y] = cellCenter({ r: oy + 1, c: ox + 1 });
      burst(x, y, ['#7dd3fc', '#ffffff', '#c4b5fd'], 14, 1.1); sfx('unlock');
      toast('Radar: hay una palabra extra cerca de esa zona');
      setTimeout(() => marked.forEach(d => d.classList.remove('radar')), 7000);
    }
    if (k === 'bolt') {
      const p = pending();
      const pl = puzzle.placements[p[Math.floor(Math.random() * p.length)]];
      cells[pl.r].forEach(d => d.classList.add('bolt'));
      const [x, y] = cellCenter({ r: pl.r, c: Math.floor(puzzle.size / 2) });
      burst(x, y, ['#ffe08a', '#ffffff', '#a5f3fc'], 16, 1.2); sfx('stamp');
      setTimeout(() => cells[pl.r].forEach(d => d.classList.remove('bolt')), 5000);
    }
  }

  // ---- niebla en los jefes: una nube de 3x3 que cambia de sitio ----
  let fogT = 0;
  if ((spec.boss || spec.fog) && motion) {
    const moveFog = () => {
      cells.flat().forEach(d => d.classList.remove('fog'));
      if (ended) return;
      const r0 = Math.floor(Math.random() * (puzzle.size - 2)), c0 = Math.floor(Math.random() * (puzzle.size - 2));
      for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 3; c++) cells[r][c].classList.add('fog');
    };
    setTimeout(moveFog, 2500);
    fogT = window.setInterval(moveFog, 7000);
  }

  // ---- ayudas ----
  function pay(item: 'hints' | 'reveals', cost: number): boolean {
    const s = getState();
    if (s[item] > 0) { update(x => { x[item] -= 1; }); return true; }
    if (s.coins >= cost) { addCoins(-cost); return true; }
    toast('No te quedan monedas. ¡Juega un poco más, Cuchi!');
    sfx('wrong');
    return false;
  }
  const pending = () => puzzle.placements.map((_, i) => i).filter(i => !found.has(i) && !isHidden(i));
  const stopLive = duo ? duo.listen(idx => { if (ended || (paused && duo.bot)) return false; if (!found.has(idx)) onRemoteFound(idx); return true; }, pending) : () => {};
  if (duo) { duo.onLeft = () => { if (!ended) toast(`${duo.partner} ha salido de la partida`); }; count.textContent = liveCount(); }

  function useHint(): void {
    if (paused || ended || !pending().length) return;
    if (!pay('hints', HINT_COST)) return;
    hintsUsed++; lastProgress = performance.now();
    const p = pending();
    const i = p[Math.floor(Math.random() * p.length)];
    const pcs = placementCells(puzzle.placements[i]);
    const d = cells[pcs[0].r][pcs[0].c];
    d.classList.add('hint'); sfx('unlock'); buzz(15);
    const [x, y] = cellCenter(pcs[0]);
    sparkle(x, y, '#ffe08a', 8);
    wordEls[i].classList.add('hinted');
    setTimeout(() => { d.classList.remove('hint'); wordEls[i].classList.remove('hinted'); }, 4000);
  }
  function useReveal(): void {
    if (paused || ended || !pending().length) return;
    if (!pay('reveals', REVEAL_COST)) return;
    hintsUsed += 2;
    const i = pending()[0];
    const pcs = placementCells(puzzle.placements[i]);
    // se "escribe" sola letra a letra y luego cuenta como encontrada
    pcs.forEach((c, k) => setTimeout(() => { cells[c.r][c.c].classList.add('sel'); sfx('select', k); }, k * 70));
    setTimeout(() => { pcs.forEach(c => cells[c.r][c.c].classList.remove('sel')); if (!found.has(i) && !ended) onFound(i, true); }, pcs.length * 70 + 120);
  }

  // ---- pausa ----
  // ---- teclado (PC): flechas para moverse, Enter/Espacio para marcar inicio y final ----
  setSfxFlavor(isl ? biomeOf(isl) : null);
  let kb: Cell | null = null, kbStart: Cell | null = null;
  const kbShow = () => {
    board.querySelectorAll('.kb, .kbstart').forEach(d => d.classList.remove('kb', 'kbstart'));
    if (kb) cells[kb.r][kb.c].classList.add('kb');
    if (kbStart) cells[kbStart.r][kbStart.c].classList.add('kbstart');
  };
  function onKey(e: KeyboardEvent): void {
    if (ended || (e.target as HTMLElement).closest('input, textarea, select, .modal')) return;
    const k = e.key;
    if (k === 'p' || k === 'P' || (k === 'Escape' && !kbStart)) { if (!paused) { e.preventDefault(); pause(); } return; }
    if (paused) return;
    if (k === 'h' || k === 'H') { e.preventDefault(); bHint.click(); return; }
    const mv: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (mv[k]) {
      e.preventDefault();
      if (!kb) kb = { r: Math.floor(puzzle.size / 2), c: Math.floor(puzzle.size / 2) };
      else kb = { r: Math.max(0, Math.min(puzzle.size - 1, kb.r + mv[k][0])), c: Math.max(0, Math.min(puzzle.size - 1, kb.c + mv[k][1])) };
      if (kbStart) { start = kbStart; endCell = snapSelection(kbStart, kb.r, kb.c, puzzle.size).end; drawSel(); }
      kbShow(); sfx('tap'); return;
    }
    if ((k === 'Enter' || k === ' ') && kb) {
      e.preventDefault();
      if (!kbStart) { if (puzzle.grid[kb.r][kb.c]) { kbStart = kb; kbShow(); sfx('select'); } return; }
      const a = kbStart, z = snapSelection(kbStart, kb.r, kb.c, puzzle.size).end;
      kbStart = null;
      start = a; endCell = z; drawSel(); finishSel(); kbShow();
      return;
    }
    if (k === 'Escape' && kbStart) { kbStart = null; clearSel(); hidePreview(); kbShow(); }
  }
  document.addEventListener('keydown', onKey);

  function pause(): void {
    if (paused || ended) return;
    paused = true; screen.classList.remove('danger');
    const box = el('div', 'pause-box g-pause');
    box.append(el('h2', '', 'Pausa'), el('p', '', phrase('pause')));
    const stats = el('div', 'g-pstats');
    stats.append(el('span', '', `${found.size}/${total} palabras`), el('span', '', timed ? `${fmt(timeLeft)} restantes` : fmt((performance.now() - t0) / 1000)));
    box.append(stats);
    const toggles = el('div', 'g-ptoggles');
    for (const [k, label] of [['music', 'Música'], ['sfx', 'Sonidos'], ['vibrate', 'Vibración']] as const) {
      const b = button(label, `seg-btn${getState().settings[k] ? ' on' : ''}`, () => { update(s => { s.settings[k] = !s.settings[k]; }); b.classList.toggle('on', getState().settings[k]); sfx('tap'); });
      toggles.append(b);
    }
    box.append(toggles);
    const close = modal(box, { dismissable: false });
    box.append(
      button('Seguir', 'btn big', () => { sfx('tap'); paused = false; last = performance.now(); close(); }),
      ...(duo && !duo.bot ? [] : [button('Reiniciar nivel', 'btn small', () => { close(); navigate('game', again(), true); })]),
      button(duo ? 'Salir de la partida' : 'Salir al mapa', 'btn small ghost', () => { close(); exit(); }),
    );
  }
  const onVis = () => { if (document.hidden && !(duo && !duo.bot)) pause(); };
  document.addEventListener('visibilitychange', onVis);

  function confirmExit(): void {
    if (ended || found.size === 0) { exit(); return; }
    paused = true;
    const box = el('div', 'pause-box');
    box.append(el('h2', '', '¿Salir?'), el('p', '', 'Perderás el progreso de este nivel.'));
    const close = modal(box, { dismissable: false });
    box.append(
      button('Seguir jugando', 'btn big', () => { paused = false; last = performance.now(); close(); }),
      button('Salir', 'btn small ghost', () => { close(); exit(); }),
    );
  }
  function exit(): void { ended = true; back(); }

  // ---- final ----
  function stars(): number {
    const penalty = Math.min(2, hintsUsed + Math.floor(wrong / 6));
    if (mode === 'timed') {
      const r = timeLeft / spec.timeLimit;
      return Math.max(1, (r >= 0.4 ? 3 : r >= 0.15 ? 2 : 1) - (hintsUsed ? 1 : 0) - (extraUsed ? 1 : 0));
    }
    if (mode === 'points') {
      const base = puzzle.placements.reduce((a, p, i) => a + (isHidden(i) ? 0 : p.word.length * 50), 0);
      return score >= base * 2.2 ? 3 : score >= base * 1.4 ? 2 : 1;
    }
    return Math.max(1, 3 - penalty);
  }

  /** Cartel grande que "golpea" la pantalla (COMPLETADO / ¡TIEMPO!). */
  function slam(text: string, cls: string): Promise<void> {
    return new Promise(res => {
      if (!motion) { res(); return; }
      const s = el('div', `g-slam ${cls}`, text);
      screen.append(s);
      sfx('slam');
      setTimeout(() => { s.classList.add('out'); }, 950);
      setTimeout(() => { s.remove(); res(); }, 1250);
    });
  }

  function win(): void {
    ended = true;
    if (duo) { liveWin(); return; }
    screen.classList.remove('danger');
    if (mode === 'points') score += Math.round(timeLeft * 5);
    const st = stars();
    const prevStars = getState().stars[spec.key] ?? 0;
    const first = prevStars === 0;
    let coins = 8 + st * 4 + (spec.boss ? 20 : 0) + (mode === 'points' ? Math.floor(score / 500) : 0) + (spec.key.startsWith('daily:') ? 25 : 0);
    if (mode === 'blind') coins = Math.round(coins * 1.5);
    if (!first) coins = Math.ceil(coins * 0.4);
    const perfect = wrong === 0 && hintsUsed === 0;
    if (bestCombo) update(s => { s.stats.bestCombo = Math.max(s.stats.bestCombo, bestCombo); });
    const isl = spec.islandId ? islandById(spec.islandId) : undefined;
    const wasDone = isl ? islandComplete(getState(), isl, bucketOfKey(spec.key)) : true;
    completeLevel(spec.key, st, coins, total, hintsUsed);
    const secsDone = Math.round((performance.now() - t0) / 1000);
    recordPlay({ key: spec.key, mode, stars: st, secs: secsDone, words: total, win: true });
    update(s => { const b = s.modeBest[mode] ?? { secs: 0, extras: 0 }; s.modeBest[mode] = { secs: b.secs ? Math.min(b.secs, secsDone) : secsDone, extras: Math.max(b.extras, extrasFound.size) }; });
    missionEvent('levels'); missionEvent(`levels:${mode}`); if (perfect) missionEvent('perfect');
    // pegatinas: isla completada, jefe con 3 estrellas y primera victoria de la temporada
    const islandDone = !!isl && !wasDone && islandComplete(getState(), isl, bucketOfKey(spec.key));
    const ISLAND_PRIZE = 100;
    if (islandDone) addCoins(ISLAND_PRIZE);
    const newStickers = [
      ...(islandDone && isl ? giveStickers(islandStickers(isl)) : []),
      ...(spec.boss && st === 3 && !islandDone ? giveStickers([randomMissing(isl) ?? '']) : []),
      ...seasonSticker(),
    ];
    const newAch = checkAchievements();
    params.onDone?.(st);
    sfx('win'); buzz([40, 60, 40, 60, 80]);
    // ola de luz por todo el tablero + fuegos artificiales
    board.classList.add('victory');
    if (motion) {
      const br = board.getBoundingClientRect();
      [[0.25, 0.3, 0], [0.75, 0.25, 260], [0.5, 0.55, 520]].forEach(([fx, fy, d]) => setTimeout(() => firework(br.left + br.width * fx, br.top + br.height * fy, [...WORD_COLORS.slice(0, 4), '#ffffff']), d));
    }
    void slam(spec.boss ? '¡JEFE DERROTADO!' : perfect ? '¡PERFECTO!' : '¡COMPLETADO!', 'win')
      .then(() => (islandDone && isl ? islandCutscene(isl, newStickers, ISLAND_PRIZE) : undefined))
      .then(() => showResult(st, coins, first, prevStars, perfect, [...newAch.map(a => `${a.name} (+${a.coins})`), ...(islandDone ? [] : newStickers.map(id => `pegatina «${stickerName(id)}»`))]));
  }

  function liveWin(): void {
    const d = duo!;
    const mine = found.size - theirs;
    screen.classList.remove('danger');
    board.classList.add('victory');
    let title: string, coinsWon: number;
    if (d.kind === 'coop') { title = '¡Lo habéis conseguido!'; coinsWon = 30; }
    else if (mine > theirs) { title = '¡Has ganado!'; coinsWon = 40; }
    else if (mine < theirs) { title = `Gana ${d.partner}`; coinsWon = 15; }
    else { title = '¡Empate!'; coinsWon = 25; }
    addCoins(coinsWon);
    recordPlay({ key: spec.key, mode, stars: 0, secs: Math.round((performance.now() - t0) / 1000), words: mine, win: d.kind === 'coop' || mine >= theirs });
    sfx(d.kind === 'duel' && mine < theirs ? 'wrong' : 'win');
    void slam(title.toUpperCase(), 'win').then(() => {
      const box = el('div', 'result g-result');
      box.append(el('div', 'g-ribbon', d.kind === 'coop' ? 'En equipo' : 'Duelo'));
      const vs = el('div', 'g-vs');
      const side = (n: number, who: string, cls: string) => { const s = el('div', cls); s.append(el('strong', '', String(n)), el('small', '', who)); return s; };
      vs.append(side(mine, 'Tú', 'me'), el('span', 'g-vs-x', d.kind === 'coop' ? '+' : 'vs'), side(theirs, d.partner, 'them'));
      box.append(vs, el('p', 'phrase', title));
      const coinLine = el('div', 'coin-line'); coinLine.append(pixelIcon('coin', '#ffd86b'), el('span', '', `+${coinsWon}`));
      box.append(coinLine);
      const btns = el('div', 'btn-col');
      if (d.bot) btns.append(button('Revancha', 'btn big', () => { close(); navigate('game', { ...params, live: { ...d, game: `bot-${Date.now()}` } }, true); }));
      btns.append(button('Volver', d.bot ? 'btn small ghost' : 'btn big', () => { close(); exit(); }));
      box.append(btns);
      const close = modal(box, { dismissable: false, cls: 'result-modal g-result-modal' });
    });
  }

  function showResult(st: number, coins: number, first: boolean, prevStars: number, perfect: boolean, ach: string[]): void {
    const box = el('div', 'result g-result');
    box.append(el('div', 'g-ribbon', params.gift ? 'Sopa completada' : spec.boss ? 'Jefe derrotado' : 'Nivel completado'));
    if (params.gift) {
      const g = el('div', 'g-gift');
      g.append(el('small', '', `Mensaje escondido de ${params.gift.from}`), el('p', '', params.gift.message));
      box.append(g);
      setTimeout(() => sfx('letter'), 600);
    }
    const row = el('div', 'result-stars g-stars');
    for (let i = 0; i < 3; i++) {
      const s = pixelStar(i < st);
      s.classList.add('big-star', 'g-star');
      s.style.animationDelay = `${250 + i * 330}ms`;
      row.append(s);
      if (i < st) setTimeout(() => {
        sfx('stamp', i * 3); buzz(12);
        const r = s.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, ['#ffd86b', '#fff6c0', '#ffffff'], 16, 1.1);
      }, 250 + i * 330 + 180);
    }
    box.append(row);
    if (st > prevStars && !first) box.append(el('div', 'g-badge', '¡Nuevo récord de estrellas!'));
    if (perfect) box.append(el('div', 'g-badge gold', 'Sin fallos ni pistas'));
    const myTime = Math.round((performance.now() - t0) / 1000);
    if (params.challenge) {
      const beat = myTime < params.challenge.secs;
      box.append(el('div', `g-badge${beat ? ' gold' : ''}`, beat ? `¡Has superado el reto de ${params.challenge.from}! (${fmt(myTime)} < ${fmt(params.challenge.secs)})` : `Reto de ${params.challenge.from}: ${fmt(params.challenge.secs)}. Tú: ${fmt(myTime)}. ¡Otra vez!`));
      if (beat && first) { addCoins(40); toast('+40 monedas por superar el reto'); }
      if (beat) sendMessage('system', `He superado tu reto: ${fmt(myTime)} contra tus ${fmt(params.challenge.secs)} 💜`);
    }
    const elapsed = (performance.now() - t0) / 1000;
    const statsG = el('div', 'g-rstats');
    const stat = (label: string, value: string) => { const d = el('div', ''); d.append(el('strong', '', value), el('small', '', label)); statsG.append(d); };
    stat('Tiempo', fmt(elapsed));
    stat('Palabras', `${total}`);
    stat('Mejor combo', bestCombo > 1 ? `x${bestCombo}` : '—');
    stat(mode === 'points' ? 'Puntos' : 'Pistas', mode === 'points' ? score.toLocaleString('es') : String(hintsUsed));
    box.append(statsG);
    const coinLine = el('div', 'coin-line');
    const coinTxt = el('span', '', '+0');
    coinLine.append(pixelIcon('coin', '#ffd86b'), coinTxt);
    box.append(coinLine, el('p', 'phrase', phrase('win')));
    ach.slice(0, 2).forEach(a => box.append(el('p', 'ach g-ach', `Logro: ${a}`)));
    if (ach.length > 2) box.append(el('p', 'ach g-ach', `+${ach.length - 2} logros más`));
    const btns = el('div', 'btn-col');
    if (params.next) btns.append(button('Siguiente', 'btn big', () => { close(); params.next!(); }));
    if (!params.gift && !params.challenge && !duo && spec.words.length) {
      const reto = button('Retar a ' + (getState().role === 'nico' ? 'Izana' : 'Nico'), 'btn small', () => {
        sendMessage('system', encodeChallenge({ spec: { ...spec, key: `reto:${Date.now().toString(36)}`, extras: spec.extras ?? [] }, mode, secs: myTime }));
        reto.disabled = true; reto.textContent = 'Reto enviado 💌'; sfx('unlock'); toast('Reto enviado: tiene que superar tu tiempo');
      });
      btns.append(reto);
    }
    btns.append(
      button('Repetir', 'btn small', () => { close(); navigate('game', again(), true); }),
      button(params.gift ? 'Volver' : 'Volver al mapa', 'btn small ghost', () => { close(); exit(); }),
    );
    box.append(btns);
    const close = modal(box, { dismissable: false, cls: 'result-modal g-result-modal' });
    // contador de monedas y vuelo al marcador
    const startC = performance.now() + 1300;
    const countUp = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - startC) / 700));
      coinTxt.textContent = `+${Math.round(coins * k)}`;
      if (k < 1) requestAnimationFrame(countUp); else { sfx('coin'); flyCoins(coinLine, coinBox, Math.min(12, coins)); }
    };
    requestAnimationFrame(countUp);
    void first;
  }

  function lose(): void {
    ended = true;
    recordPlay({ key: spec.key, mode, stars: 0, secs: Math.round((performance.now() - t0) / 1000), words: found.size, win: false });
    screen.classList.remove('danger');
    sfx('wrong'); buzz([80, 40, 80]);
    void slam('¡TIEMPO!', 'lose').then(() => {
      const box = el('div', 'result g-result');
      box.append(el('div', 'g-ribbon lose', 'Se acabó el tiempo'), el('p', 'phrase', phrase('fail')),
        el('p', '', `Has encontrado ${found.size} de ${total}.`));
      const btns = el('div', 'btn-col');
      if (!extraUsed) {
        const more = button('', 'btn big', () => {
          if (getState().coins < EXTRA_TIME_COST) { toast('Te faltan monedas'); sfx('wrong'); return; }
          addCoins(-EXTRA_TIME_COST); extraUsed = true; timeLeft = 30; ended = false; last = performance.now(); lastSec = -1;
          close(); sfx('unlock'); updateTime();
        });
        more.append(el('span', '', '+30 segundos'), pixelIcon('coin', '#ffd86b'), el('span', '', String(EXTRA_TIME_COST)));
        more.classList.add('row-btn');
        btns.append(more);
      }
      btns.append(
        ...(duo && !duo.bot ? [] : [button('Reintentar', extraUsed ? 'btn big' : 'btn small', () => { close(); navigate('game', again(), true); })]),
        button('Volver al mapa', 'btn small ghost', () => { close(); exit(); }),
      );
      box.append(btns);
      const close = modal(box, { dismissable: false, cls: 'result-modal g-result-modal' });
    });
  }

  function cleanup(): void {
    cancelAnimationFrame(raf); clearTimeout(comboT); clearInterval(fogT); ro.disconnect(); unsub();
    setSfxFlavor(null); document.removeEventListener('keydown', onKey);
    stopLive(); duo?.leave();
    document.removeEventListener('visibilitychange', onVis);
  }
  return cleanup;
}
