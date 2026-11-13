import { PAGES, renderLines, type MandalaOpts, type Page } from '../paint/pages';
import { sfx } from '../ui/audio';
import { button, el, modal, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';

/**
 * Colorear libre: como un cuaderno de colorear, pero personalizable.
 * Cubo de pintura (respeta las lineas), pincel, goma, cuentagotas, paletas y colores propios.
 * Cada dibujo se guarda solo en este movil.
 */
const SIZE = 768;
const KEY = (id: string) => `nuestra-sopa:colorear:${id}`;
const CUSTOM = 'nuestra-sopa:colorear:mis-colores';
const MANDALA = 'nuestra-sopa:colorear:mandala';

const PACKS: Record<string, string[]> = {
  Noche: ['#1b1150', '#3a2a8a', '#5b3df0', '#7c4dff', '#a78bfa', '#c4b5fd', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#22d3ee', '#a5f3fc'],
  Arcoíris: ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#111827'],
  Pastel: ['#fecaca', '#fed7aa', '#fef08a', '#d9f99d', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#c7d2fe', '#ddd6fe', '#f5d0fe', '#fbcfe8', '#ffffff'],
  Naturaleza: ['#14532d', '#166534', '#22c55e', '#86efac', '#713f12', '#a16207', '#ca8a04', '#fde68a', '#0c4a6e', '#38bdf8', '#e0f2fe', '#78716c'],
  Pelaje: ['#1c1917', '#44403c', '#78716c', '#d6d3d1', '#fafaf9', '#7c2d12', '#c2410c', '#fb923c', '#fdba74', '#a16207', '#facc15', '#fecdd3'],
};

const readJson = <T>(k: string, def: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : def; } catch { return def; } };
const writeJson = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('No queda espacio para guardar'); } };

function mandalaOpts(): MandalaOpts { return readJson<MandalaOpts>(MANDALA, { petals: 10, rings: 4, seed: 1 }); }

// ---------- seleccion de dibujo ----------
export function renderColorear(root: HTMLElement): void {
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Colorear libre'), el('span'));
  const body = el('main', 'page-body grid2');
  PAGES.forEach(p => {
    const c = button('', 'art-card cpage-card', () => { sfx('tap'); if (p.id === 'mandala') mandalaDialog(); else navigate('colorear-lienzo', { id: p.id }); });
    const img = el('img', 'art-thumb'); img.alt = ''; img.width = 140; img.height = 140;
    void thumbOf(p).then(src => { img.src = src; });
    const info = el('div', 'art-info');
    info.append(el('strong', '', p.name), el('small', '', p.id === 'mandala' ? 'Elige pétalos y anillos' : p.id === 'blanco' ? 'Dibuja lo que quieras' : localStorage.getItem(KEY(p.id)) ? 'Continuar' : 'Para colorear'));
    c.append(img, info);
    body.append(c);
  });
  screen.append(top, body);
  root.append(screen);
}

async function thumbOf(p: Page): Promise<string> {
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, 160, 160);
  const saved = localStorage.getItem(KEY(p.id));
  if (saved) await new Promise<void>(res => { const im = new Image(); im.onload = () => { g.drawImage(im, 0, 0, 160, 160); res(); }; im.onerror = () => res(); im.src = saved; });
  if (p.id !== 'blanco') g.drawImage(renderLines(p, 320, mandalaOpts()), 0, 0, 160, 160);
  return c.toDataURL();
}

function mandalaDialog(): void {
  const o = mandalaOpts();
  const box = el('div', 'pause-box mandala-opts');
  box.append(el('h2', '', 'Tu mandala'));
  const prev = el('img', 'work-img'); prev.alt = 'Vista previa del mandala';
  const refresh = () => { prev.src = renderLines(PAGES[0], 360, o).toDataURL(); };
  const slider = (label: string, key: 'petals' | 'rings', min: number, max: number) => {
    const f = el('label', 'fld');
    const t = el('span', '', `${label}: ${o[key]}`);
    const r = el('input'); r.type = 'range'; r.min = String(min); r.max = String(max); r.value = String(o[key]);
    r.addEventListener('input', () => { o[key] = Number(r.value); t.textContent = `${label}: ${o[key]}`; refresh(); });
    f.append(t, r);
    return f;
  };
  const close = modal(box);
  box.append(prev, slider('Pétalos', 'petals', 4, 20), slider('Anillos', 'rings', 2, 7),
    button('Otro diseño', 'btn alt', () => { o.seed = (o.seed % 9999) + 1 + Math.floor(Math.random() * 50); refresh(); }),
    button('Colorear', 'btn big', () => {
      const changed = JSON.stringify(o) !== JSON.stringify(mandalaOpts());
      if (changed) { try { localStorage.removeItem(KEY('mandala')); } catch { /* nada */ } }
      writeJson(MANDALA, o); close(); navigate('colorear-lienzo', { id: 'mandala' });
    }),
    button('Cancelar', 'btn small ghost', close));
  refresh();
}

// ---------- lienzo ----------
type Tool = 'fill' | 'brush' | 'eraser' | 'picker';

export function renderColorLienzo(root: HTMLElement, params: { id: string }): () => void {
  const page = PAGES.find(p => p.id === params.id) ?? PAGES[2];
  const screen = el('div', 'screen color-screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => { save(); back(); });
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  const share = button('', 'btn small icon-btn alt', () => void exportPng());
  share.append(pixelIcon('photo', '#fff')); share.setAttribute('aria-label', 'Guardar imagen');
  top.append(b, el('h1', 'page-title', page.name), share);

  const stage = el('div', 'color-stage');
  const paper = el('div', 'color-paper');
  const fillC = el('canvas'); fillC.width = fillC.height = SIZE;
  const lineC = page.id === 'blanco' ? null : renderLines(page, SIZE, mandalaOpts());
  if (lineC) lineC.className = 'lines';
  const fg = fillC.getContext('2d', { willReadFrequently: true })!;
  fg.fillStyle = '#fff'; fg.fillRect(0, 0, SIZE, SIZE);
  paper.append(fillC); if (lineC) paper.append(lineC);
  paper.setAttribute('role', 'img'); paper.setAttribute('aria-label', `Dibujo para colorear: ${page.name}`);
  stage.append(paper);

  // barreras: pixeles de linea casi opacos
  const barrier = new Uint8Array(SIZE * SIZE);
  if (lineC) { const d = lineC.getContext('2d')!.getImageData(0, 0, SIZE, SIZE).data; for (let i = 0; i < barrier.length; i++) barrier[i] = d[i * 4 + 3] > 110 ? 1 : 0; }

  const saved = localStorage.getItem(KEY(page.id));
  if (saved) { const im = new Image(); im.onload = () => fg.drawImage(im, 0, 0, SIZE, SIZE); im.src = saved; }

  // estado
  let tool: Tool = 'fill';
  let color = '#7c4dff';
  let size = 14;
  const undo: ImageData[] = [];
  const snap = () => { undo.push(fg.getImageData(0, 0, SIZE, SIZE)); if (undo.length > 15) undo.shift(); undoBtn.disabled = false; };
  let saveTimer = 0;
  const save = () => { clearTimeout(saveTimer); try { localStorage.setItem(KEY(page.id), fillC.toDataURL('image/png')); } catch { /* sin espacio */ } };
  const queueSave = () => { clearTimeout(saveTimer); saveTimer = window.setTimeout(save, 800); };

  const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  function flood(sx: number, sy: number) {
    const i0 = sy * SIZE + sx;
    if (barrier[i0]) return false;
    const im = fg.getImageData(0, 0, SIZE, SIZE), d = new Uint32Array(im.data.buffer);
    const [r, g, bb] = hexRgb(color), target = d[i0], paint = (255 << 24) | (bb << 16) | (g << 8) | r;
    if (target === paint) return false;
    const seen = new Uint8Array(SIZE * SIZE);
    const stack = [i0];
    const ok = (i: number) => !seen[i] && !barrier[i] && d[i] === target;
    while (stack.length) {
      const i = stack.pop()!;
      if (!ok(i)) continue;
      let x = i % SIZE; const y = (i - x) / SIZE;
      let l = i; while (x > 0 && ok(l - 1)) { l--; x--; }
      let up = false, dn = false;
      for (let j = l; j < y * SIZE + SIZE && ok(j); j++) {
        seen[j] = 1; d[j] = paint;
        if (y > 0) { const u = j - SIZE; if (ok(u)) { if (!up) { stack.push(u); up = true; } } else up = false; }
        if (y < SIZE - 1) { const v = j + SIZE; if (ok(v)) { if (!dn) { stack.push(v); dn = true; } } else dn = false; }
      }
    }
    // expandir 2px bajo las lineas para que no queden huecos blancos
    for (let pass = 0; pass < 2; pass++) {
      const add: number[] = [];
      for (let i = 0; i < seen.length; i++) if (seen[i]) for (const k of [i - 1, i + 1, i - SIZE, i + SIZE]) if (k >= 0 && k < seen.length && !seen[k] && barrier[k]) add.push(k);
      add.forEach(k => { seen[k] = 1; d[k] = paint; });
    }
    fg.putImageData(im, 0, 0);
    return true;
  }

  const toCanvas = (e: PointerEvent) => { const r = paper.getBoundingClientRect(); return [Math.floor(((e.clientX - r.left) / r.width) * SIZE), Math.floor(((e.clientY - r.top) / r.height) * SIZE)] as const; };
  let drawing = false, lx = 0, ly = 0;
  paper.addEventListener('pointerdown', e => {
    const [x, y] = toCanvas(e);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    if (tool === 'picker') {
      const p = fg.getImageData(x, y, 1, 1).data;
      setColor(`#${[p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('')}`);
      setTool('fill'); sfx('tap'); return;
    }
    if (tool === 'fill') { snap(); if (flood(x, y)) { sfx('pop'); queueSave(); } else undo.pop(); return; }
    snap(); drawing = true; lx = x; ly = y; paper.setPointerCapture(e.pointerId);
    stroke(x, y);
  });
  paper.addEventListener('pointermove', e => {
    if (!drawing) return;
    const evs = e.getCoalescedEvents?.() ?? [e];
    for (const ev of evs) { const [x, y] = toCanvas(ev); stroke(x, y); }
  });
  const end = () => { if (drawing) { drawing = false; queueSave(); } };
  paper.addEventListener('pointerup', end); paper.addEventListener('pointercancel', end);
  function stroke(x: number, y: number) {
    fg.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    fg.lineWidth = size * (SIZE / 512); fg.lineCap = 'round'; fg.lineJoin = 'round';
    fg.beginPath(); fg.moveTo(lx, ly); fg.lineTo(x + 0.01, y); fg.stroke();
    lx = x; ly = y;
  }

  // ---------- barra de herramientas ----------
  const bar = el('div', 'color-bar');
  const tools = el('div', 'tool-row');
  const toolBtns = new Map<Tool, HTMLButtonElement>();
  const mkTool = (t: Tool, icon: string, label: string) => {
    const bt = button('', 'ctool', () => { setTool(t); sfx('tap'); });
    bt.append(pixelIcon(icon, 'currentColor')); bt.setAttribute('aria-label', label); bt.title = label;
    toolBtns.set(t, bt); tools.append(bt);
  };
  mkTool('fill', 'bag', 'Cubo de pintura'); mkTool('brush', 'brush', 'Pincel'); mkTool('eraser', 'undo', 'Goma'); mkTool('picker', 'eye', 'Cuentagotas');
  function setTool(t: Tool) { tool = t; toolBtns.forEach((bt, k) => { bt.classList.toggle('on', k === t); bt.setAttribute('aria-pressed', String(k === t)); }); }
  const sizes = [6, 14, 30];
  const sizeBtns = sizes.map(sz => {
    const bt = button('', 'ctool', () => { size = sz; sizeBtns.forEach((x, k) => x.classList.toggle('on', sizes[k] === sz)); if (tool === 'fill' || tool === 'picker') setTool('brush'); sfx('tap'); });
    const dot = el('i', 'size-dot'); dot.style.width = dot.style.height = `${4 + sz / 2.5}px`;
    bt.append(dot); bt.setAttribute('aria-label', `Grosor ${sz}`);
    tools.append(bt);
    return bt;
  });
  sizeBtns[1].classList.add('on');
  const undoBtn = button('', 'ctool', () => { const im = undo.pop(); if (im) { fg.putImageData(im, 0, 0); queueSave(); sfx('tap'); } undoBtn.disabled = !undo.length; });
  undoBtn.append(pixelIcon('undo', 'currentColor')); undoBtn.setAttribute('aria-label', 'Deshacer'); undoBtn.disabled = true;
  const clear = button('Borrar', 'ctool', () => {
    const box = el('div', 'pause-box');
    box.append(el('h2', '', '¿Empezar de cero?'));
    const close = modal(box);
    box.append(button('Sí, borrar todo', 'btn big', () => { snap(); fg.fillStyle = '#fff'; fg.fillRect(0, 0, SIZE, SIZE); save(); close(); }), button('No', 'btn small ghost', close));
  });
  tools.append(undoBtn, clear);

  const packs = el('div', 'pack-row');
  const swatches = el('div', 'tool-row');
  let pack = readJson<string>('nuestra-sopa:colorear:pack', 'Noche');
  const custom = readJson<string[]>(CUSTOM, []);
  function setColor(c: string) {
    color = c;
    swatches.querySelectorAll('.cswatch').forEach(s => s.classList.toggle('on', (s as HTMLElement).dataset.c === c));
    if (tool === 'eraser' || tool === 'picker') setTool('brush');
  }
  function drawSwatches() {
    swatches.replaceChildren();
    const add = el('label', 'cswatch add');
    add.title = 'Añadir un color propio';
    const pick = el('input'); pick.type = 'color'; pick.value = color; pick.setAttribute('aria-label', 'Elegir un color propio');
    pick.addEventListener('change', () => {
      const c = pick.value;
      if (!custom.includes(c)) { custom.unshift(c); custom.splice(12); writeJson(CUSTOM, custom); }
      pack = 'Mis colores'; drawPacks(); drawSwatches(); setColor(c);
    });
    add.append(pick);
    swatches.append(add);
    const list = pack === 'Mis colores' ? custom : PACKS[pack] ?? PACKS.Noche;
    list.forEach(c => {
      const s = button('', 'cswatch', () => { setColor(c); sfx('tap'); });
      s.style.background = c; s.dataset.c = c; s.setAttribute('aria-label', `Color ${c}`);
      swatches.append(s);
    });
    setColor(color);
  }
  function drawPacks() {
    packs.replaceChildren();
    [...Object.keys(PACKS), 'Mis colores'].forEach(name => {
      const bt = button(name, `pack-btn${name === pack ? ' on' : ''}`, () => { pack = name; writeJson('nuestra-sopa:colorear:pack', name); drawPacks(); drawSwatches(); sfx('tap'); });
      packs.append(bt);
    });
  }
  drawPacks(); drawSwatches(); setTool(page.id === 'blanco' ? 'brush' : 'fill');

  bar.append(tools, packs, swatches);
  screen.append(top, stage, bar);
  root.append(screen);

  async function exportPng() {
    const out = document.createElement('canvas'); out.width = out.height = SIZE;
    const g = out.getContext('2d')!;
    g.drawImage(fillC, 0, 0); if (lineC) g.drawImage(lineC, 0, 0);
    const blob = await new Promise<Blob | null>(r => out.toBlob(r, 'image/png'));
    if (!blob) return;
    const file = new File([blob], `${page.id}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: page.name }); } catch { /* cancelado */ } }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${page.id}.png`; a.click(); toast('Imagen descargada'); }
  }
  return () => { save(); };
}
