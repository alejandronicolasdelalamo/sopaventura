import { addCoins, getState, update } from '../core/state';
import { getPartner } from '../net/sync';
import { addMyTemplate, allTemplates, ensureMurals, DIFF_NAME, difficulty, getTemplate, isMine, isUnlocked, removeMyTemplate, unlockHint } from '../paint/catalog';
import { photoToTemplate } from '../paint/convert';
import { paintedCount, shareablePng, thumb, totalCells } from '../paint/store';
import type { Template } from '../paint/model';
import { sfx } from '../ui/audio';
import { button, el, modal, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';
import { THEMES } from '../data/themes';
import { photoSrc } from '../ui/photo';
import { shareGif } from '../paint/gif';
import { weeklyDaysLeft, weeklyDrawing, WEEKLY_BONUS } from '../paint/weekly';
import { weekId } from '../core/extras';

type Tab = 'curso' | 'catalogo' | 'galeria';
let lastTab: Tab = 'curso';

const isDone = (id: string) => getState().paintDone.includes(id) || !!getPartner()?.paintDone.includes(id);

function card(t: Template, tab: Tab, refresh: () => void): HTMLElement {
  const unlocked = isUnlocked(t), done = isDone(t.id), prog = paintedCount(t.id), total = totalCells(t);
  const c = button('', `art-card${unlocked ? '' : ' locked'}`);
  const img = el('img', 'art-thumb');
  img.src = thumb(t, done || tab === 'galeria' ? 'color' : prog ? 'progress' : unlocked ? 'gray' : 'gray', 140);
  img.alt = t.name; img.width = 140; img.height = 140;
  img.style.imageRendering = 'pixelated';
  const info = el('div', 'art-info');
  const dl = difficulty(t);
  info.append(el('span', `diff d${dl}`, DIFF_NAME[dl]), el('strong', '', t.name), el('small', '', `${t.w}×${t.h} · ${t.palette.length} colores${t.theme ? ` · ${THEMES[t.theme].name}` : isMine(t.id) ? ' · importado' : t.source === 'custom' ? ' · foto nuestra' : ''}`));
  if (tab !== 'galeria') {
    if (!unlocked) {
      if (t.price > 0) { const p = el('div', 'price'); p.append(pixelIcon('coin', '#ffb400'), el('span', '', String(t.price))); info.append(p); }
      const hint = unlockHint(t);
      if (hint) { const h = el('div', 'price'); h.append(pixelIcon('lock', '#9a90b0'), el('small', '', hint)); info.append(h); }
    } else if (done) info.append(el('span', 'badge ok', 'Terminado'));
    else if (prog) {
      const bar = el('div', 'bar-mini'); const fill = el('div', 'bar-fill'); fill.style.width = `${Math.round((prog / total) * 100)}%`;
      bar.append(fill); info.append(bar);
    }
  }
  c.append(img, info);
  c.addEventListener('click', () => {
    sfx('tap');
    if (tab === 'galeria') { viewWork(t); return; }
    if (unlocked && isMine(t.id) && !prog) { mineDialog(t, refresh); return; }
    if (unlocked) { navigate('pintar-juego', { id: t.id }); return; }
    if (t.price === 0) { toast(unlockHint(t) || 'Todavía no disponible'); sfx('wrong'); return; }
    const box = el('div', 'pause-box');
    box.append(el('h2', '', t.name), el('p', '', `Cuesta ${t.price} monedas${unlockHint(t) ? ` o se regala: ${unlockHint(t).toLowerCase()}` : ''}. Tienes ${getState().coins}.`));
    const close = modal(box);
    box.append(
      button(`Desbloquear (${t.price})`, 'btn big', () => {
        if (getState().coins < t.price) { toast('Te faltan monedas, Cuchi.'); sfx('wrong'); return; }
        addCoins(-t.price); update(s => { s.owned.push(`img:${t.id}`); });
        sfx('unlock'); close(); refresh();
      }),
      button('Ahora no', 'btn small ghost', close),
    );
  });
  return c;
}

function viewWork(t: Template): void {
  const box = el('div', 'work');
  const img = el('img', 'work-img');
  img.src = thumb(t, 'color', 360); img.alt = t.name; img.style.imageRendering = 'auto';
  box.append(el('h2', '', t.name), img);
  const close = modal(box, { cls: 'work-modal' });
  if (t.photo) {
    let showPhoto = false;
    const tog = button('Ver la foto del recuerdo', 'btn alt', async () => {
      showPhoto = !showPhoto;
      img.src = showPhoto ? await photoSrc(t.photo!) : thumb(t, 'color', 360);
      img.style.imageRendering = showPhoto ? 'auto' : 'pixelated';
      tog.textContent = showPhoto ? 'Ver el dibujo' : 'Ver la foto del recuerdo';
    });
    box.append(tog);
  }
  box.append(
    button('Verla pintarse', 'btn', () => { close(); navigate('pintar-juego', { id: t.id, replay: true }); }),
    button('Guardar GIF del time-lapse', 'btn alt', async () => { toast('Creando el GIF…'); await new Promise(r => setTimeout(r, 30)); await shareGif(t); }),
    button('Compartir', 'btn alt', async () => {
      const blob = await shareablePng(t);
      const file = new File([blob], `${t.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: t.name }); } catch { /* cancelado */ } }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${t.id}.png`; a.click(); }
    }),
    button('Cerrar', 'btn small ghost', close),
  );
}

function mineDialog(t: Template, refresh: () => void): void {
  const box = el('div', 'pause-box');
  box.append(el('h2', '', t.name), el('p', '', 'Dibujo importado por ti.'));
  const close = modal(box);
  box.append(button('Pintar', 'btn big', () => { close(); navigate('pintar-juego', { id: t.id }); }),
    button('Eliminar', 'btn small ghost', () => { removeMyTemplate(t.id); close(); refresh(); toast('Dibujo eliminado'); }),
    button('Cerrar', 'btn small ghost', close));
}

/** Convierte cualquier imagen (pixel art descargado, foto, dibujo) en un dibujo por numeros. */
function importDialog(refresh: () => void): void {
  const box = el('div', 'pause-box imp-box');
  box.append(el('h2', '', 'De foto a pixel art'), el('p', 'note', 'Elige una foto o un pixel art. Encuadra con el zoom, ajusta el brillo y mira cómo queda antes de crearlo (se guarda solo en este móvil).'));
  const file = el('input'); file.type = 'file'; file.accept = 'image/*';
  const name = el('input'); name.type = 'text'; name.placeholder = 'Nombre del dibujo'; name.maxLength = 28;
  const prev = el('canvas'); prev.className = 'work-img'; prev.hidden = true;
  const sizeSel = el('select'); [['32', 'Pequeño 32×32 (fácil)'], ['48', 'Mediano 48×48'], ['64', 'Grande 64×64 (difícil)'], ['80', 'Enorme 80×80 (experto)']].forEach(([v, l]) => { const o = el('option', '', l); o.value = v; sizeSel.append(o); });
  sizeSel.value = '48';
  const colSel = el('select'); [['12', '12 colores'], ['20', '20 colores'], ['30', '30 colores']].forEach(([v, l]) => { const o = el('option', '', l); o.value = v; colSel.append(o); });
  colSel.value = '20';
  // ajustes del asistente: zoom, posicion del recorte, brillo y contraste
  const slider = (label: string, min: number, max: number, val: number) => {
    const f = el('label', 'fld slider'); const i = el('input'); i.type = 'range'; i.min = String(min); i.max = String(max); i.value = String(val);
    const v = el('small', '', String(val)); i.addEventListener('input', () => { v.textContent = i.value; schedule(); });
    f.append(el('span', '', label), i, v); return { f, i };
  };
  const zoom = slider('Zoom', 100, 300, 100), px = slider('Mover ←→', 0, 100, 50), py = slider('Mover ↑↓', 0, 100, 50);
  const bri = slider('Brillo', -40, 40, 0), con = slider('Contraste', -20, 60, 8);
  const tools = el('div', 'imp-tools'); tools.hidden = true;
  tools.append(zoom.f, px.f, py.f, bri.f, con.f);
  const orig = el('canvas'); orig.className = 'imp-orig'; orig.width = orig.height = 160;
  const pair = el('div', 'imp-pair'); pair.hidden = true;
  let st = 0;
  const schedule = () => { clearTimeout(st); st = window.setTimeout(build, 60); };
  let img: HTMLImageElement | null = null;
  let made: Template | null = null;
  const build = () => {
    if (!img) return;
    const n = Number(sizeSel.value), side = Math.min(img.width, img.height) / (Number(zoom.i.value) / 100);
    const x0 = (img.width - side) * (Number(px.i.value) / 100), y0 = (img.height - side) * (Number(py.i.value) / 100);
    const crop = { x: x0 / img.width, y: y0 / img.height, w: side / img.width, h: side / img.height };
    const og = orig.getContext('2d')!; og.clearRect(0, 0, 160, 160); og.drawImage(img, x0, y0, side, side, 0, 0, 160, 160);
    pair.hidden = false; tools.hidden = false;
    const t = photoToTemplate(img, { gridW: n, gridH: n, colors: Number(colSel.value), crop, adjust: { brightness: Number(bri.i.value), contrast: Number(con.i.value) }, name: name.value.trim() || 'Mi dibujo', id: `mio-${Date.now().toString(36)}`, despeckle: n <= 48 });
    made = t;
    prev.width = prev.height = n; prev.hidden = false;
    const g = prev.getContext('2d')!, id = g.createImageData(n, n);
    t.cells.forEach((c, i) => { if (c === 255) return; const h = t.palette[c]; id.data.set([parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255], i * 4); });
    g.putImageData(id, 0, 0); prev.style.imageRendering = 'pixelated';
  };
  file.addEventListener('change', () => {
    const f = file.files?.[0]; if (!f) return;
    const im = new Image();
    im.onload = () => { img = im; if (!name.value) name.value = f.name.replace(/\.[^.]+$/, '').slice(0, 28); build(); };
    im.onerror = () => toast('No se pudo leer esa imagen');
    im.src = URL.createObjectURL(f);
  });
  sizeSel.addEventListener('change', build); colSel.addEventListener('change', build);
  const close = modal(box);
  pair.append(orig, prev);
  box.append(file, pair, tools, name, sizeSel, colSel,
    button('Crear dibujo', 'btn big', () => {
      if (!made) { toast('Primero elige una imagen'); return; }
      made.name = name.value.trim() || 'Mi dibujo';
      if (!addMyTemplate(made)) { toast('No queda espacio en el móvil'); return; }
      sfx('unlock'); close(); refresh(); navigate('pintar-juego', { id: made.id });
    }),
    button('Cancelar', 'btn small ghost', close));
}

export function renderPintar(root: HTMLElement): void {
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Pintar por números'), el('span'));
  const tabs = el('div', 'seg tabs');
  const body = el('main', 'page-body grid2');

  const draw = () => {
    body.replaceChildren();
    tabs.querySelectorAll('.seg-btn').forEach((x, i) => x.classList.toggle('on', ['curso', 'catalogo', 'galeria'][i] === lastTab));
    const all = allTemplates();
    let list: Template[];
    if (lastTab === 'curso') list = all.filter(t => isUnlocked(t) && !isDone(t.id) && paintedCount(t.id) > 0);
    else if (lastTab === 'galeria') list = all.filter(t => isDone(t.id));
    else list = all.filter(t => !isDone(t.id) || t.source === 'builtin');
    if (!list.length && lastTab !== 'catalogo') {
      body.className = 'page-body';
      body.append(el('p', 'empty', lastTab === 'curso' ? 'Aún no has empezado ningún dibujo. Elige uno en el catálogo.' : lastTab === 'galeria' ? 'Todavía no hay obras terminadas. ¡Pinta la primera!' : 'No hay dibujos.'));
      body.append(button(lastTab === 'curso' ? 'Elegir un dibujo' : 'Ir al catálogo', 'btn alt', () => { lastTab = 'catalogo'; sfx('tap'); draw(); }));
      return;
    }
    body.className = 'page-body grid2';
    if (lastTab === 'catalogo') {
      const imp = button('', 'art-card import-card', () => { sfx('tap'); importDialog(draw); });
      imp.append(pixelIcon('photo', 'currentColor'), el('strong', '', 'Importar imagen'), el('small', '', 'Pixel art o foto'));
      body.append(imp);
    }
    list.forEach(t => body.append(card(t, lastTab, draw)));
  };
  [['curso', 'En curso'], ['catalogo', 'Catálogo'], ['galeria', 'Galería']].forEach(([id, name]) =>
    tabs.append(button(name, 'seg-btn', () => { lastTab = id as Tab; sfx('tap'); draw(); })));
  draw();
  // los murales (dibujos grandes de las islas) llegan del worker poco a poco: se repinta la lista sin perder el scroll
  ensureMurals(() => { if (!body.isConnected) return; const y = body.scrollTop; draw(); body.scrollTop = y; });
  // Dibujo de la semana
  const wk = weeklyDrawing();
  const weekBox = el('div', 'week-art');
  if (wk) {
    const claimed = getState().eventsClaimed.includes(`dibujo:${weekId()}`);
    const img = el('img'); img.src = thumb(wk, paintedCount(wk.id) ? 'progress' : 'color', 96); img.alt = ''; img.width = 72; img.height = 72;
    const txt = el('div', 'ev-txt');
    txt.append(el('strong', '', 'Dibujo de la semana'), el('span', 'wk-name', wk.name),
      el('small', '', claimed ? '¡Premio cobrado! El lunes hay otro.' : `Gratis esta semana · +${WEEKLY_BONUS} monedas extra · quedan ${weeklyDaysLeft()} días`));
    weekBox.append(img, txt, button(paintedCount(wk.id) ? 'Seguir' : 'Pintar', 'btn small', () => { sfx('tap'); navigate('pintar-juego', { id: wk.id }); }));
  } else weekBox.hidden = true;
  screen.append(top, weekBox, tabs, body);
  root.append(screen);
  void getTemplate;
}
