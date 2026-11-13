import type { PaintOp } from '../paint/model';
import { missionEvent } from '../core/extras';
import { shareGif } from '../paint/gif';
import { claimWeekly } from '../paint/weekly';
import { checkAchievements } from '../core/achievements';
import { addCoins, getState, update } from '../core/state';
import { phrase } from '../data/content';
import { backend } from '../net';
import { sendPaintOp } from '../net/sync';
import { getTemplate } from '../paint/catalog';
import { PaintEngine, type PaintMode } from '../paint/engine';
import { hexToRgb, luminance, type Template } from '../paint/model';
import { loadPaint, savePaint, shareablePng } from '../paint/store';
import { makeCard } from '../paint/card';
import { polaroid } from '../ui/photo';
import { sfx } from '../ui/audio';
import { confetti, confettiRain } from '../ui/confetti';
import { button, el, modal, reducedMotion, toast } from '../ui/dom';
import { buzz } from '../ui/haptics';
import { pixelIcon } from '../ui/icons';
import { infoButton } from '../ui/info';
import { back } from '../ui/router';

const HINT_COST = 10;
/** Notas (semitonos) que suben y bajan mientras corre la ola: suena como una melodia, no como un tic-tac. */
const WAVE_NOTES = [0, 2, 4, 7, 9, 7, 4, 2];
const MILESTONES: [number, string][] = [[0.25, '¡Un cuarto!'], [0.5, '¡Mitad hecha!'], [0.75, '¡Ya casi!']];

export function renderPintarJuego(root: HTMLElement, params: { id: string; replay?: boolean; together?: string; bot?: boolean }): () => void {
  const found = getTemplate(params.id);
  if (!found) { root.append(el('p', 'empty', 'Dibujo no encontrado.')); return () => {}; }
  const tpl: Template = found;
  const role: 1 | 2 = getState().role === 'izana' ? 2 : 1;
  const partnerName = params.bot ? 'Olaf' : role === 1 ? 'Izana' : 'Nico';
  const modeKey = `nuestra-sopa:paintmode:${tpl.id}`;
  // Casilla a casilla por defecto. "Por color" (todo de golpe) ya no se ofrece: lo guardado como 'auto' pasa a casilla a casilla.
  const startMode = ((): PaintMode => {
    let m: string | null = null;
    try { m = localStorage.getItem(modeKey); } catch { /* ignorar */ }
    return (m || getState().settings.paintMode) === 'zone' ? 'zone' : 'classic';
  })();

  const screen = el('div', 'screen paint-screen');
  const top = el('header', 'topbar');
  const bBack = button('', 'btn small icon-btn', () => { sfx('tap'); back(); });
  bBack.append(pixelIcon('back', '#fff')); bBack.setAttribute('aria-label', 'Volver');
  const mid = el('div', 'hud-mid'); const title = el('div', 'hud-title', tpl.name); const meta = el('div', 'hud-meta');
  mid.append(title, meta);
  const bMode = button('', 'btn small icon-btn', () => toggleMode());
  const coinBox = el('div', 'coin-box'); const coinNum = el('span', '', String(getState().coins)); coinBox.append(pixelIcon('coin', '#ffb400'), coinNum);
  top.append(bBack, mid, coinBox, bMode);

  const stage = el('div', 'paint-stage');
  const canvas = el('canvas', 'paint-canvas');
  canvas.setAttribute('aria-label', `Lienzo de ${tpl.name}`);
  const chip = el('div', 'partner-chip', `${partnerName} está pintando…`);
  chip.hidden = true;
  stage.append(canvas, chip);

  const tools = el('div', 'paint-tools');
  const bHint = button('', 'btn small tool', () => useHint());
  const bUndo = button('', 'btn small tool alt', () => { if (engine.undo()) { sfx('pop'); buzz(8); } else toast('Nada que deshacer'); });
  const bFit = button('', 'btn small tool alt', () => engine.fit());
  bHint.append(pixelIcon('bulb', '#ffd86b'), el('span', '', `Pista ${HINT_COST}`)); bHint.setAttribute('aria-label', 'Pista');
  bUndo.append(pixelIcon('undo', '#fff'), el('span', '', 'Deshacer')); bUndo.setAttribute('aria-label', 'Deshacer');
  bFit.append(pixelIcon('map', '#fff'), el('span', '', 'Ver todo')); bFit.setAttribute('aria-label', 'Ver todo el dibujo');
  tools.append(bHint, bUndo, bFit, infoButton('pintar'));   // la "i" explica como se pinta

  const perColor = tpl.palette.map(() => 0);
  for (const c of tpl.cells) if (c !== 255) perColor[c]++;
  const palette = el('div', 'palette');
  palette.setAttribute('role', 'listbox'); palette.setAttribute('aria-label', 'Colores');
  const swatches = tpl.palette.map((hex, i) => {
    const b = button('', 'swatch');
    b.style.background = hex;
    b.style.color = luminance(hex) > 0.55 ? '#241a3d' : '#fff';
    b.append(el('span', 'sw-n', String(i + 1)), el('span', 'sw-left', ''));
    const chk = pixelIcon('check', 'currentColor', 'picon sw-check'); b.append(chk);
    b.setAttribute('role', 'option'); b.setAttribute('aria-label', `Color ${i + 1}`);
    b.addEventListener('click', () => { sfx('tap'); buzz(5); engine.select(i, true); });
    palette.append(b);
    return b;
  });

  screen.append(top, stage, tools, palette);
  root.append(screen);

  const refreshHud = () => {
    meta.textContent = `${Math.round((engine.paintedCount / engine.totalCells) * 100)}% · ${tpl.w}×${tpl.h}`;
    coinNum.textContent = String(getState().coins);
    const rem = engine.remaining;
    swatches.forEach((s, i) => {
      s.classList.toggle('done', rem[i] === 0);
      (s.querySelector('.sw-left') as HTMLElement).textContent = rem[i] ? String(rem[i]) : '';
      s.setAttribute('aria-selected', String(engine.selected === i));
      s.classList.toggle('on', engine.selected === i);
      s.style.setProperty('--p', String(perColor[i] ? Math.round(((perColor[i] - rem[i]) / perColor[i]) * 100) : 100));
    });
    bUndo.disabled = !engine.canUndo;
  };

  let saveT = 0;
  const persist = () => { clearTimeout(saveT); saveT = window.setTimeout(() => savePaint(tpl.id, engine.exportState()), 400); };
  let tick = 0;
  let chipT = 0;
  let mileDone = 0, ready = false;
  /** Cartel que salta al llegar al 25 / 50 / 75 %: una razon mas para seguir pintando. */
  function milestone(): void {
    const frac = engine.paintedCount / engine.totalCells;
    const k = MILESTONES.filter(([m]) => frac >= m).length;
    if (k <= mileDone) return;
    mileDone = k;
    if (!ready || engine.isComplete) return;
    const [, text] = MILESTONES[k - 1];
    const b = el('div', 'mile', text);
    stage.append(b); setTimeout(() => b.remove(), 1700);
    sfx('combo'); buzz([10, 30, 10]); engine.burst(...engine.center, 36);
  }

  const engine: PaintEngine = new PaintEngine(canvas, tpl, {
    onSelect: () => refreshHud(),
    onWrongTap: () => { sfx('pop'); buzz(6); },
    onOp: op => { sendPaintOp(tpl.id, op); persist(); refreshHud(); },
    onProgress: () => { refreshHud(); persist(); milestone(); },
    onPaintTick: () => { if (++tick % 4 === 0) sfx('paint', WAVE_NOTES[(tick >> 2) % WAVE_NOTES.length]); },
    onColorComplete: c => {
      // Color completo: aviso suave y NADA automatico. No hay barrido de brillo ni sacudida del lienzo, y el color NO cambia solo:
      // lo eliges tu cuando quieras (antes saltaba al siguiente y la pantalla se "rayaba").
      sfx('done'); buzz([15, 40, 15]);
      const sw = swatches[c]; sw.classList.add('celebrate');
      const r = sw.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top, 14, [tpl.palette[c], '#fff8e8', '#ffd86b']);
      refreshHud();
      if (!engine.isComplete) toast('¡Color completo! Elige el siguiente');
    },
    onComplete: () => finish(true),
  });
  if (location.search.includes('e2e')) (window as unknown as { __paint: PaintEngine }).__paint = engine;   // gancho para pruebas
  engine.role = role;
  engine.setMode(startMode);

  const MODE_INFO: Record<PaintMode, { icon: string; name: string; toast: string }> = {
    auto: { icon: 'star', name: 'Casilla a casilla', toast: 'Casilla a casilla: toca o arrastra para pintar' },
    zone: { icon: 'heart', name: 'Por zonas', toast: 'Por zonas: un toque (o arrastrar) pinta la zona entera' },
    classic: { icon: 'star', name: 'Casilla a casilla', toast: 'Casilla a casilla: toca o arrastra para pintar' },
  };
  const NEXT: Record<PaintMode, PaintMode> = { auto: 'zone', zone: 'classic', classic: 'zone' };
  function drawModeBtn(): void {
    const m = MODE_INFO[engine.mode];
    bMode.replaceChildren(pixelIcon(m.icon, '#fff'));
    bMode.setAttribute('aria-label', `Modo ${m.name}. Cambiar a ${MODE_INFO[NEXT[engine.mode]].name}`);
    bMode.title = m.name;
  }
  function toggleMode(): void {
    engine.setMode(NEXT[engine.mode]);
    try { localStorage.setItem(modeKey, engine.mode); } catch { /* ignorar */ }
    drawModeBtn(); sfx('tap');
    toast(MODE_INFO[engine.mode].toast);
  }
  drawModeBtn();

  function useHint(): void {
    if (engine.isComplete) return;
    const s = getState();
    if (s.hints > 0) update(x => { x.hints -= 1; });
    else if (s.coins >= HINT_COST) addCoins(-HINT_COST);
    else { toast('No te quedan monedas'); sfx('wrong'); return; }
    if (engine.hint() < 0) toast('Elige un color con casillas por pintar');
    else { sfx('unlock'); buzz(12); }
    refreshHud();
  }

  // ---- cargar progreso: local primero (instantaneo), nube despues ----
  const saved = loadPaint(tpl.id);
  if (saved) engine.importState(saved);
  mileDone = MILESTONES.filter(([m]) => engine.paintedCount / engine.totalCells >= m).length; ready = true;   // lo ya pasado no vuelve a saltar
  const first = engine.nextIncomplete(-1);
  if (first >= 0 && !engine.isComplete) engine.select(first);
  refreshHud();

  void backend.loadPaintOps(tpl.id).then(ops => {
    if (!ops.length) return;
    engine.loadOps(ops);
    persist(); refreshHud();
    if (engine.isComplete && !finished) finish(false, params.replay);
    if (engine.selected < 0 || engine.remaining[engine.selected] === 0) { const n = engine.nextIncomplete(-1); if (n >= 0) engine.select(n); }
  }).catch(() => { /* sin conexion: seguimos con lo local */ });

  const onOp = (op: PaintOp) => {
    const mine = op.by === role;
    engine.applyRemote(op, !mine);
    if (!mine) {
      chip.hidden = false; clearTimeout(chipT);
      chipT = window.setTimeout(() => { chip.hidden = true; }, 4000);
    }
    refreshHud(); persist();
    if (engine.isComplete && !finished) finish(false, params.replay);
  };
  const unsub = backend.subscribePaint(tpl.id, onOp);
  // Olaf ayuda a pintar: rellena unas casillas del mismo color cada poco
  let botT = 0;
  if (params.bot) {
    let k = 0, color = -1;
    botT = window.setInterval(() => {
      if (finished || document.hidden) return;
      const done = new Set(engine.exportState().order);
      const free: number[] = [];
      tpl.cells.forEach((c, i) => { if (c !== 255 && !done.has(i)) free.push(i); });
      if (!free.length) { clearInterval(botT); return; }
      let pool = free.filter(i => tpl.cells[i] === color);
      if (!pool.length) { color = tpl.cells[free[Math.floor(Math.random() * free.length)]]; pool = free.filter(i => tpl.cells[i] === color); }
      const start = pool[0];
      const pick = pool.slice(0, 1 + Math.floor(Math.random() * 3));
      onOp({ id: `olaf-${Date.now()}-${k++}`, t: 'p', c: pick.length ? pick : [start], by: role === 1 ? 2 : 1, ts: Date.now() });
    }, 1400);
  }
  if (params.together) toast(`Pintando con ${params.together}: lo que pinte aparecerá aquí`);

  if (engine.isComplete) setTimeout(() => finish(false, params.replay), 300);

  // ---- final ----
  let finished = false;
  let weeklyCoins = 0;
  function finish(firstTime: boolean, replay = false): void {
    if (finished) return;
    finished = true;
    savePaint(tpl.id, engine.exportState());
    let coins = 0;
    const already = getState().paintDone.includes(tpl.id);
    if (!already) {
      coins = 30 + Math.min(220, Math.round(engine.totalCells / 20));   // tope: un mural de 14.000 casillas no debe romper la economia
      update(s => { s.paintDone.push(tpl.id); s.stats.paintDone += 1; s.coins += coins; });
      missionEvent('paint');
    }
    weeklyCoins = claimWeekly(tpl.id);
    const ach = firstTime ? checkAchievements() : [];
    tools.hidden = true; palette.hidden = true;
    // Secuencia ligera: brillo sobre el dibujo -> confeti breve -> ventana de resultado (nunca todo a la vez)
    showFinal(firstTime ? 1300 : 700);
    if (firstTime) { sfx('win'); buzz([40, 60, 40, 60, 90]); setTimeout(() => confettiRain(1200), 500); }
    if (replay) { setTimeout(runTimelapse, 900); return; }
    setTimeout(() => overlay(coins, ach.map(a => a.name)), firstTime ? 1900 : 800);
  }

  function overlay(coins: number, ach: string[]): void {
    const box = el('div', 'result');
    box.append(el('h2', '', phrase('paintDone')));
    if (coins) { const l = el('div', 'coin-line'); l.append(pixelIcon('coin', '#ffb400'), el('span', '', `+${coins}`)); box.append(l); }
    if (weeklyCoins) box.append(el('p', 'ach', `Dibujo de la semana: +${weeklyCoins} monedas`));
    if (ach.length) box.append(el('p', 'ach', `Logro: ${ach[0]}${ach.length > 1 ? ` (+${ach.length - 1} más)` : ''}`));
    if (tpl.photo) box.append(polaroid(tpl.photo));
    const btns = el('div', 'btn-col paint-btns');
    let close: () => void = () => {};
    const authors = engine.authors;
    btns.append(
      button('Ver el time-lapse', 'btn big', () => { close(); runTimelapse(); }),
      button('Tarjeta', 'btn small', () => { void openCard(); }),
      button('GIF', 'btn alt small', async () => { toast('Creando el GIF…'); await new Promise(r => setTimeout(r, 30)); await shareGif(tpl); }),
    );
    // si habeis pintado los dos, se puede ver quien pinto cada zona
    if (authors.length > 1) {
      const bq = button('¿Quién?', 'btn alt small', () => { authorsOn = !authorsOn; engine.setAuthorView(authorsOn); legend(authorsOn); bq.textContent = authorsOn ? 'Ocultar' : '¿Quién?'; sfx('tap'); });
      btns.append(bq);
    }
    btns.append(button('Volver', 'btn small ghost', () => { close(); back(); }));
    box.append(btns);
    const closeModal = modal(box, { cls: 'result-modal paint-result', dismissable: true });
    // el dibujo terminado se recoloca por encima de la hoja, para seguir viendo sus destellos
    requestAnimationFrame(() => { engine.setBottomInset(box.getBoundingClientRect().height + 24); setTimeout(placeFinaleFx, 600); });
    close = () => { closeModal(); engine.setBottomInset(0); setTimeout(placeFinaleFx, 600); };
  }

  // ---- brillo y destellos: capas CSS (el navegador las anima en la GPU; antes se redibujaba el lienzo entero en cada fotograma) ----
  let finalBox: HTMLElement | null = null;
  const place = (box: HTMLElement, r: { x: number; y: number; w: number; h: number }) => {
    box.style.left = `${r.x}px`; box.style.top = `${r.y}px`; box.style.width = `${r.w}px`; box.style.height = `${r.h}px`;
  };
  /** Un barrido de brillo sobre la obra (al completar un color). */
  function fxShine(): void {
    if (reducedMotion()) return;
    const box = el('div', 'fx-final'); box.setAttribute('aria-hidden', 'true');
    place(box, engine.artRect());
    const sh = el('div', 'fx-shine once'); box.append(sh);
    stage.append(box);
    setTimeout(() => box.remove(), 1400);
  }
  /** Obra terminada: un barrido y destellos suaves en bucle. */
  function startFinaleFx(): void {
    stopFinaleFx();
    if (reducedMotion()) return;
    const box = el('div', 'fx-final'); box.setAttribute('aria-hidden', 'true');
    box.append(el('div', 'fx-shine loop'));
    engine.brightSpots(12).forEach((sp, i) => {
      const st = el('i', `fx-star${sp.big ? ' big' : ''}`);
      st.style.left = `${(sp.x * 100).toFixed(2)}%`; st.style.top = `${(sp.y * 100).toFixed(2)}%`;
      st.style.animationDelay = `-${((i * 0.37) % 2.6).toFixed(2)}s`;
      box.append(st);
    });
    place(box, engine.finalRect());
    finalBox = box; stage.append(box);
  }
  function placeFinaleFx(): void { if (finalBox) place(finalBox, engine.finalRect()); }
  function stopFinaleFx(): void { finalBox?.remove(); finalBox = null; }
  function showFinal(ms: number): void { engine.revealFinal(ms); setTimeout(startFinaleFx, 650); }

  // ---- quien pinto que ----
  let authorsOn = false;
  const NAMES: Record<number, { name: string; color: string }> = { 1: { name: 'Nico', color: '#4096ff' }, 2: { name: 'Izana', color: '#ff5caa' } };
  function authorShare(): { name: string; cells: number; color: string }[] {
    const n = new Map<number, number>();
    for (const i of engine.order) { const by = engine.by[i]; if (by) n.set(by, (n.get(by) ?? 0) + 1); }
    return [...n.entries()].sort((a, b) => a[0] - b[0]).map(([by, cells]) => ({ ...NAMES[by], cells }));
  }
  function legend(on: boolean): void {
    stage.querySelector('.author-legend')?.remove();
    if (!on) return;
    const sh = authorShare(), tot = sh.reduce((a, b) => a + b.cells, 0) || 1;
    const box = el('div', 'author-legend');
    sh.forEach(a => { const c = el('span', 'al'); const dot = el('i'); dot.style.background = a.color; c.append(dot, document.createTextNode(` ${a.name} ${Math.round((a.cells / tot) * 100)}%`)); box.append(c); });
    stage.append(box);
  }

  // ---- tarjeta de victoria para compartir ----
  async function openCard(): Promise<void> {
    toast('Preparando la tarjeta…');
    const d = new Date();
    const blob = await makeCard(tpl, {
      title: tpl.name, authors: authorShare(),
      stats: [`${Math.round((engine.paintedCount / engine.totalCells) * 100)}%`, `${tpl.palette.length} colores`, `${tpl.w}×${tpl.h}`],
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
    });
    const url = URL.createObjectURL(blob);
    const card = el('div', 'card-view');
    const img = el('img'); img.src = url; img.alt = `Tarjeta de ${tpl.name}`;
    const row = el('div', 'btn-col');
    let closeCard: () => void = () => {};
    const file = new File([blob], `${tpl.id}-tarjeta.png`, { type: 'image/png' });
    row.append(
      button('Compartir', 'btn big', async () => {
        if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: tpl.name }); } catch { /* cancelado */ } }
        else { const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); }
      }),
      button('Solo el dibujo', 'btn alt small', async () => {
        const raw = await shareablePng(tpl); const a = document.createElement('a'); a.href = URL.createObjectURL(raw); a.download = `${tpl.id}.png`; a.click();
      }),
      button('Cerrar', 'btn small ghost', () => { closeCard(); URL.revokeObjectURL(url); }),
    );
    card.append(img, row);
    closeCard = modal(card, { cls: 'card-modal', dismissable: true });
  }

  /** Ver la obra pintarse sola: sin hoja de resultado encima; al acabar (o al cerrar) se muestra terminada. */
  function runTimelapse(): void {
    stage.querySelector('.tl-bar')?.remove();
    legend(false); authorsOn = false;
    engine.setAuthorView(false);
    stopFinaleFx();
    engine.playTimelapse(7000, () => { stage.querySelector('.tl-bar')?.remove(); showFinal(900); setTimeout(() => overlay(0, []), 1100); });
    const bar = el('div', 'tl-bar');
    bar.append(el('span', '', 'Pintándose…'), button('Saltar', 'btn small', () => { bar.remove(); showFinal(700); setTimeout(() => overlay(0, []), 800); }));
    stage.append(bar);
  }

  return () => { clearInterval(botT); clearTimeout(saveT); clearTimeout(chipT); savePaint(tpl.id, engine.exportState()); unsub(); engine.destroy(); };
}

void hexToRgb;
