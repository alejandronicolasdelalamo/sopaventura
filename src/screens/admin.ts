import { getContent, type Content } from '../data/content';
import { THEMES, type ThemeId } from '../data/themes';
import { getState, update } from '../core/state';
import { backend } from '../net';
import { deleteTemplateRemote, saveContent, saveTemplateRemote } from '../net/sync';
import type { PhotoRef } from '../net/types';
import { allTemplates, setCustomTemplates } from '../paint/catalog';
import { privateJson } from '../paint/private';
import { ISLANDS } from '../data/islands';
import { photoToTemplate } from '../paint/convert';
import { hexToRgb, toJson, TRANSPARENT, type Template } from '../paint/model';
import { button, el, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';

/** Comprime una foto: lado largo maximo 1600 px, JPEG 82 %. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('No se pudo comprimir'))), 'image/jpeg', quality));
}

const PERSONAL: ThemeId[] = ['nosotros', 'olaf', 'rivas', 'metro', 'granada', 'cercedilla', 'gente', 'roma', 'dvalentino', 'luchork', 'amaia', 'mvrk', 'lhaine', 'pantera'];

function section(title: string, open = false): { wrap: HTMLElement; body: HTMLElement } {
  const wrap = el('details', 'card adm-sec');
  if (open) wrap.open = true;
  wrap.append(el('summary', '', title));
  const body = el('div', 'adm-body');
  wrap.append(body);
  return { wrap, body };
}

const field = (label: string, input: HTMLElement) => { const l = el('label', 'fld'); l.append(el('span', '', label), input); return l; };
const slider = (min: number, max: number, val: number, step = 1) => { const i = el('input'); i.type = 'range'; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(val); return i; };

export function renderAdmin(root: HTMLElement): void {
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const bb = button('', 'btn small icon-btn', () => back());
  bb.append(pixelIcon('back', '#fff')); bb.setAttribute('aria-label', 'Volver');
  top.append(bb, el('h1', 'page-title', 'Panel de Nico'), el('span'));
  const body = el('main', 'page-body');
  if (getState().role !== 'nico') { body.append(el('p', 'empty', 'Este panel es solo para Nico.')); screen.append(top, body); root.append(screen); return; }

  let photos: PhotoRef[] = [];
  const content: Content = structuredClone(getContent());
  const save = async () => { await saveContent({ ...content }); toast('Guardado ✔'); };

  // ---------------------------------------------------- Fotos
  const ph = section('Fotos');
  const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.multiple = true;
  const gal = el('div', 'photo-grid');
  const drawPhotos = () => {
    gal.replaceChildren();
    photos.forEach(p => { const i = el('img'); i.src = p.url; i.alt = 'Foto'; i.loading = 'lazy'; gal.append(i); });
  };
  file.addEventListener('change', async () => {
    for (const f of Array.from(file.files ?? [])) {
      try { const blob = await compressImage(f); const ref = await backend.uploadPhoto(blob, f.name.replace(/\.\w+$/, '') + '.jpg'); photos.push(ref); toast(`Subida: ${Math.round(blob.size / 1024)} KB`); }
      catch (e) { toast(`No se pudo subir: ${(e as Error).message}`); }
    }
    drawPhotos();
  });
  ph.body.append(el('p', 'note', 'Se comprimen solas (máx. 1600 px). Solo se ven con el código de pareja.'), file, gal);
  void backend.listPhotos().then(l => { photos = l; drawPhotos(); }).catch(() => {});

  // ---------------------------------------------------- Conversor foto -> plantilla
  const cv = section('Foto → dibujo para pintar', true);
  const src = el('input'); src.type = 'file'; src.accept = 'image/*';
  const name = el('input'); name.type = 'text'; name.placeholder = 'Nombre del dibujo'; name.maxLength = 40;
  const grid = el('select'); [[16, '16×16'], [24, '24×24'], [32, '32×32'], [48, '48×48'], [64, '64×64'], [96, '96×96'], [128, '128×128']].forEach(([v, l]) => grid.append(new Option(String(l), String(v))));
  grid.value = '48';
  const cols = el('select'); [[8, '8 colores'], [16, '16 colores'], [30, '30 colores']].forEach(([v, l]) => cols.append(new Option(String(l), String(v))));
  cols.value = '16';
  const zoom = slider(1, 4, 1, 0.05), cx = slider(0, 100, 50), cy = slider(0, 100, 50), bri = slider(-60, 60, 0), con = slider(-60, 60, 0);
  const price = el('input'); price.type = 'number'; price.min = '0'; price.value = '0';
  const unlock = el('select'); unlock.append(new Option('(solo a la venta / libre)', '')); ISLANDS.filter(i => !i.locked).forEach(i => unlock.append(new Option(`Regalo al completar ${i.name}`, i.id)));
  const keep = el('input'); keep.type = 'checkbox'; keep.checked = true;
  const keepL = el('label', 'sched'); keepL.append(keep, document.createTextNode(' Guardar la foto como recuerdo (se ve al terminar el dibujo)'));
  const prevCv = el('canvas', 'conv-preview');
  const srcCv = el('canvas', 'conv-source');
  const pal = el('div', 'palette-mini');
  const info = el('p', 'note', 'Elige una foto para empezar.');
  let img: ImageBitmap | null = null, result: Template | null = null, timer = 0;

  const crop = () => {
    if (!img) return { x: 0, y: 0, w: 1, h: 1 };
    const z = Number(zoom.value), n = Number(grid.value);
    // recorte cuadrado (la cuadricula es cuadrada) que cabe en la foto
    const side = Math.min(img.width, img.height) / z;
    const w = side / img.width, h = side / img.height;
    return { x: (1 - w) * (Number(cx.value) / 100), y: (1 - h) * (Number(cy.value) / 100), w: Math.min(1, w), h: Math.min(1, h), n } as { x: number; y: number; w: number; h: number };
  };
  const run = () => {
    if (!img) return;
    const c = crop(), n = Number(grid.value);
    // origen con el recorte marcado
    srcCv.width = 220; srcCv.height = 220;
    const sg = srcCv.getContext('2d')!; sg.drawImage(img, img.width * c.x, img.height * c.y, img.width * c.w, img.height * c.h, 0, 0, 220, 220);
    result = photoToTemplate(img as unknown as CanvasImageSource & { width: number; height: number },
      { gridW: n, gridH: n, colors: Number(cols.value), crop: c, adjust: { brightness: Number(bri.value), contrast: Number(con.value) }, name: name.value || 'Nuestra foto', id: 'x', seed: 1 });
    prevCv.width = n; prevCv.height = n;
    const pg = prevCv.getContext('2d')!, id = pg.createImageData(n, n), d = new Uint32Array(id.data.buffer);
    const rgb = result.palette.map(hexToRgb);
    result.cells.forEach((ci, i) => { if (ci !== TRANSPARENT) { const [r, g, b] = rgb[ci]; d[i] = (255 << 24) | (b << 16) | (g << 8) | r; } });
    pg.putImageData(id, 0, 0);
    pal.replaceChildren();
    result.palette.forEach((h, i) => { const s = el('span', 'mini-sw', String(i + 1)); s.style.background = h; pal.append(s); });
    info.textContent = `${n}×${n} · ${result.palette.length} colores · ${n * n} casillas`;
  };
  const later = () => { clearTimeout(timer); timer = window.setTimeout(run, 140); };
  [grid, cols, zoom, cx, cy, bri, con].forEach(i => i.addEventListener('input', later));
  src.addEventListener('change', async () => { const f = src.files?.[0]; if (!f) return; img = await createImageBitmap(f); if (!name.value) name.value = f.name.replace(/\.\w+$/, ''); run(); });

  cv.body.append(field('Foto', src), el('div', 'conv-row'), field('Nombre', name), field('Tamaño de cuadrícula', grid), field('Colores', cols),
    field('Zoom', zoom), field('Recorte horizontal', cx), field('Recorte vertical', cy), field('Brillo', bri), field('Contraste', con), field('Precio en monedas (0 = gratis)', price), field('Recompensa', unlock), keepL);
  const row = cv.body.querySelector('.conv-row')!; row.append(srcCv, prevCv);
  cv.body.append(pal, info,
    button('Guardar como dibujo', 'btn big', async () => {
      if (!result || !img) { toast('Elige una foto primero'); return; }
      let photo: string | undefined;
      if (keep.checked) {
        try {
          const c = crop(), cv2 = document.createElement('canvas'), sw = img.width * c.w, sh = img.height * c.h, sc = Math.min(1, 900 / Math.max(sw, sh));
          cv2.width = Math.round(sw * sc); cv2.height = Math.round(sh * sc);
          cv2.getContext('2d')!.drawImage(img, img.width * c.x, img.height * c.y, sw, sh, 0, 0, cv2.width, cv2.height);
          const blob = await new Promise<Blob>(r => cv2.toBlob(b => r(b!), 'image/jpeg', 0.85));
          photo = (await backend.uploadPhoto(blob, `${name.value || 'recuerdo'}.jpg`)).path;
        } catch (e) { toast(`No se pudo guardar la foto: ${(e as Error).message}`); }
      }
      const t: Template = { ...result, id: `foto-${Date.now().toString(36)}`, name: name.value.trim() || 'Nuestra foto', price: Number(price.value) || 0, unlockIsland: unlock.value || undefined, photo };
      const json = toJson(t);
      saveTemplateRemote(json);
      const cur = allTemplates().filter(x => x.source === 'custom').map(toJson);
      setCustomTemplates([...cur, json]);
      toast('Dibujo guardado. Ya sale en el catálogo.');
    }));

  const cust = section('Dibujos subidos');
  const priv = privateJson();
  if (priv.length) {
    cust.body.append(el('p', 'note', `Hay ${priv.length} dibujos personales en la carpeta private/ (solo en este ordenador). Súbelos a la nube para verlos en los móviles.`),
      button('Subir mis dibujos y fotos a la nube', 'btn', async () => {
        for (const j of priv) {
          let photo = j.photo;
          if (photo?.startsWith('data:')) { const blob = await (await fetch(photo)).blob(); photo = (await backend.uploadPhoto(blob, `${j.id}.jpg`)).path; }
          saveTemplateRemote({ ...j, photo });
        }
        toast('Subidos. Aparecerán en los dos móviles.');
      }));
  }
  const drawCust = () => {
    cust.body.replaceChildren();
    const list = allTemplates().filter(t => t.source === 'custom');
    if (!list.length) cust.body.append(el('p', 'note', 'Aún no hay dibujos de fotos.'));
    list.forEach(t => {
      const r = el('div', 'vs-row'); r.append(el('span', '', `${t.name} (${t.w}×${t.h})`),
        button('Borrar', 'btn small ghost', () => { if (!confirm(`¿Borrar «${t.name}»?`)) return; deleteTemplateRemote(t.id); setCustomTemplates(allTemplates().filter(x => x.source === 'custom' && x.id !== t.id).map(toJson)); drawCust(); }));
      cust.body.append(r);
    });
  };
  drawCust();
  cust.wrap.addEventListener('toggle', drawCust);

  // ---------------------------------------------------- Vales
  const vs = section('Vales y regalos');
  const drawV = () => {
    vs.body.replaceChildren();
    content.vouchers.forEach((v, i) => {
      const t = el('input'); t.value = v.title; t.placeholder = 'Título'; t.addEventListener('input', () => { v.title = t.value; });
      const d = el('input'); d.value = v.desc; d.placeholder = 'Descripción'; d.addEventListener('input', () => { v.desc = d.value; });
      const p = el('input'); p.type = 'number'; p.value = String(v.price); p.addEventListener('input', () => { v.price = Number(p.value) || 0; });
      const box = el('div', 'item-edit'); box.append(t, d, field('Monedas', p), button('Quitar', 'btn small ghost', () => { content.vouchers.splice(i, 1); drawV(); }));
      vs.body.append(box);
    });
    vs.body.append(button('Añadir vale', 'btn small', () => { content.vouchers.push({ id: `v-${Date.now().toString(36)}`, title: '', desc: '', price: 100 }); drawV(); }), button('Guardar', 'btn', save));
  };
  drawV();

  // ---------------------------------------------------- Final
  const fin = section('Final del juego');
  const letter = el('textarea', 'letter-input'); letter.rows = 9; letter.value = content.finale.letter;
  const photo = el('select'); photo.append(new Option('(sin foto)', ''));
  const refreshSel = () => { photo.replaceChildren(new Option('(sin foto)', '')); photos.forEach(p => photo.append(new Option(p.path.split('/').pop() ?? p.path, p.path))); photo.value = content.finale.photoUrl; };
  const big = el('textarea', 'letter-input'); big.rows = 3; big.value = content.finale.bigVoucher;
  const sur = el('textarea', 'letter-input'); sur.rows = 3; sur.value = content.finale.surprise;
  fin.wrap.addEventListener('toggle', refreshSel);
  fin.body.append(field('Carta larga', letter), field('Foto especial', photo), field('Vale gordo', big), field('Sorpresa final', sur),
    button('Guardar', 'btn', async () => { content.finale = { letter: letter.value, photoUrl: photo.value, bigVoucher: big.value, surprise: sur.value }; await save(); }),
    button('Previsualizar el final', 'btn alt', async () => { content.finale = { letter: letter.value, photoUrl: photo.value, bigVoucher: big.value, surprise: sur.value }; await save(); navigate('final', { preview: true }); }));

  // ---------------------------------------------------- Palabras
  const wd = section('Palabras de temas');
  const theme = el('select'); PERSONAL.forEach(t => theme.append(new Option(THEMES[t].name, t)));
  const words = el('textarea', 'letter-input'); words.rows = 9; words.placeholder = 'palabra\npalabra|pista para el modo Acertijos';
  const load = () => { words.value = (content.extraWords[theme.value] ?? []).join('\n'); };
  theme.addEventListener('change', load); load();
  wd.body.append(el('p', 'note', 'Se añaden a las del tema (una por línea; la pista es opcional tras "|"). Sin tildes no hace falta: se normalizan solas.'), field('Tema', theme), words,
    button('Guardar', 'btn', async () => { content.extraWords[theme.value] = words.value.split('\n').map(l => l.trim()).filter(Boolean); await save(); }));

  // ---------------------------------------------------- Huevos de pascua
  const eg = section('Huevos de pascua');
  const drawE = () => {
    eg.body.replaceChildren();
    content.eggs.forEach((e, i) => {
      const t = el('input'); t.value = e.trigger; t.placeholder = 'Cómo se encuentra'; t.addEventListener('input', () => { e.trigger = t.value; });
      const m = el('input'); m.value = e.message; m.placeholder = 'Mensaje'; m.addEventListener('input', () => { e.message = m.value; });
      const w = el('input'); w.value = e.word ?? ''; w.placeholder = 'Palabra secreta (opcional)'; w.addEventListener('input', () => { e.word = w.value || undefined; });
      const c = el('input'); c.type = 'number'; c.value = String(e.coins); c.addEventListener('input', () => { e.coins = Number(c.value) || 0; });
      const box = el('div', 'item-edit'); box.append(t, m, w, field('Monedas', c), button('Quitar', 'btn small ghost', () => { content.eggs.splice(i, 1); drawE(); }));
      eg.body.append(box);
    });
    eg.body.append(button('Añadir huevo', 'btn small', () => { content.eggs.push({ id: `egg-${Date.now().toString(36)}`, trigger: '', message: '', coins: 10 }); drawE(); }), button('Guardar', 'btn', save));
  };
  drawE();

  // ---------------------------------------------------- Frases y Roma
  const fr = section('Frases cariñosas');
  const kinds: [keyof Content['phrases'], string][] = [['loading', 'Cargas'], ['win', 'Victorias'], ['shop', 'Tienda'], ['pause', 'Pausa'], ['found', 'Palabra encontrada'], ['paintDone', 'Dibujo terminado'], ['fail', 'Al fallar']];
  const areas = kinds.map(([k, label]) => { const a = el('textarea', 'letter-input'); a.rows = 4; a.value = content.phrases[k].join('\n'); fr.body.append(field(label, a)); return [k, a] as const; });
  fr.body.append(button('Guardar', 'btn', async () => { areas.forEach(([k, a]) => { const l = a.value.split('\n').map(x => x.trim()).filter(Boolean); if (l.length) content.phrases[k] = l; }); await save(); }));

  const ro = section('Roma');
  const romaChk = el('input'); romaChk.type = 'checkbox'; romaChk.checked = !!content.romaUnlocked;
  const rl = el('label', 'sched'); rl.append(romaChk, document.createTextNode(' Desbloquear la Isla Roma (después del viaje)'));
  ro.body.append(rl, button('Guardar', 'btn', async () => { content.romaUnlocked = romaChk.checked; update(s => { s.romaUnlocked = romaChk.checked; }); await save(); }));

  body.append(cv.wrap, cust.wrap, ph.wrap, vs.wrap, fin.wrap, wd.wrap, eg.wrap, fr.wrap, ro.wrap);
  screen.append(top, body);
  root.append(screen);
}
