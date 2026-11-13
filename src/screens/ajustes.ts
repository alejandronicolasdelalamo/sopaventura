import { getState, pinHash, update, type Settings } from '../core/state';
import { sfx } from '../ui/audio';
import { button, el, modal, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';
import { enablePush } from '../net/push';
import { logout } from '../net/session';
import { showNews } from './novedades';
import { showInfo, TOPICS } from '../ui/info';
import { exportBackup, importBackup } from '../core/extras';

function toggle(label: string, key: 'music' | 'sfx' | 'vibrate' | 'reduceMotion' | 'colorblind' | 'bigText', hint = ''): HTMLElement {
  const row = el('label', 'card setting');
  const t = el('span', 'ach-text');
  t.append(el('strong', '', label));
  if (hint) t.append(el('small', '', hint));
  const input = el('input', 'switch');
  input.type = 'checkbox';
  input.checked = getState().settings[key];
  input.addEventListener('change', () => { update(s => { s.settings[key] = input.checked; }); sfx('tap'); });
  row.append(t, input);
  return row;
}

function choice<K extends 'theme' | 'paintMode' | 'boardSize'>(label: string, key: K, opts: [Settings[K], string][], hint = ''): HTMLElement {
  const row = el('div', 'card setting col');
  row.append(el('strong', '', label));
  if (hint) row.append(el('small', '', hint));
  const seg = el('div', 'seg');
  opts.forEach(([v, name]) => {
    const b = button(name, `seg-btn${getState().settings[key] === v ? ' on' : ''}`, () => {
      update(s => { (s.settings[key] as Settings[K]) = v; });
      seg.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); sfx('tap');
    });
    seg.append(b);
  });
  row.append(seg);
  return row;
}

function slider(label: string, key: 'musicVol' | 'sfxVol', hint = ''): HTMLElement {
  const row = el('div', 'card setting col');
  row.append(el('strong', '', label));
  if (hint) row.append(el('small', '', hint));
  const input = el('input', 'vol-range');
  input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '5'; input.id = `vol-${key}`;
  input.value = String(Math.round((getState().settings[key] ?? 0.8) * 100));
  input.setAttribute('aria-label', label);
  input.addEventListener('input', () => { update(s => { s.settings[key] = Number(input.value) / 100; }); });
  input.addEventListener('change', () => sfx('found'));
  row.append(input);
  return row;
}

function pinDialog(): void {
  const box = el('div', 'pause-box');
  box.append(el('h2', '', 'PIN de 4 dígitos'), el('p', '', 'Se pedirá al abrir la app. Es un candado de comodidad en este móvil.'));
  const input = el('input', 'pin-input');
  input.type = 'password'; input.inputMode = 'numeric'; input.maxLength = 4; input.pattern = '[0-9]*';
  input.setAttribute('aria-label', 'PIN');
  const close = modal(box);
  box.append(input,
    button('Guardar', 'btn big', () => {
      if (!/^\d{4}$/.test(input.value)) { toast('Son 4 números.'); return; }
      update(s => { s.settings.pinHash = pinHash(input.value); });
      toast('PIN guardado'); close();
    }),
    button('Quitar PIN', 'btn small ghost', () => { update(s => { s.settings.pinHash = null; }); toast('PIN quitado'); close(); }),
  );
  setTimeout(() => input.focus(), 50);
}

export function renderAjustes(root: HTMLElement): void {
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Ajustes'), el('span'));
  const body = el('main', 'page-body');
  body.append(
    toggle('Música', 'music', 'Chiptune relajante'),
    slider('Volumen de la música', 'musicVol'),
    toggle('Efectos de sonido', 'sfx'),
    slider('Volumen de los efectos', 'sfxVol', 'Cada mundo suena un poco distinto'),
    toggle('Vibración', 'vibrate', 'En iPhone depende de la versión de iOS'),
    toggle('Reducir movimiento', 'reduceMotion', 'Menos animaciones'),
    toggle('Modo daltónico', 'colorblind', 'Colores seguros y tramas para distinguir las palabras'),
    toggle('Letra grande', 'bigText', 'Letras más grandes en el tablero y la lista'),
    choice('Tamaño del tablero', 'boardSize', [[0, 'Auto'], [10, '10'], [11, '11'], [12, '12'], [13, '13']], 'Máximo de casillas por lado. Si 10×10 te queda justo en el móvil, elige 10.'),
    choice('Tema', 'theme', [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']]),
    choice('Pintar por números', 'paintMode', [['classic', 'Casilla a casilla'], ['zone', 'Por zonas']], 'Modo global (también se puede cambiar en cada dibujo)'),
  );
  const pin = el('div', 'card setting');
  pin.append(el('strong', '', 'PIN al abrir'), button(getState().settings.pinHash ? 'Cambiar' : 'Activar', 'btn small', pinDialog));
  const push = el('div', 'card setting');
  push.append(el('strong', '', 'Notificaciones'), button('Activar', 'btn small', async () => {
    const r = await enablePush();
    toast(r.message);
  }));
  const tut = el('div', 'card setting');
  tut.append(el('strong', '', 'Tutorial'), button('Volver a verlo', 'btn small', () => { update(s => { s.settings.tutorialDone = false; }); toast('Saldrá en tu próxima partida'); }));
  const news = el('div', 'card setting');
  news.append(el('strong', '', 'Novedades'), button('Ver tutorial', 'btn small', () => showNews()));
  // Ayuda: cada tema se puede abrir cuando quieras (en el juego tambien sale un icono "i" donde hace falta)
  const help = el('div', 'card setting col');
  help.append(el('strong', '', 'Ayuda e información'), el('small', '', 'Todas las explicaciones del juego. También encuentras el icono «i» en las pantallas.'));
  const helpBtns = el('div', 'help-btns');
  for (const [id, t] of Object.entries(TOPICS)) { const b = button(t.label, 'btn small ghost', () => showInfo(id)); b.prepend(pixelIcon('info', 'currentColor', 'picon')); helpBtns.append(b); }
  help.append(helpBtns);
  body.append(tut, news, help);
  // Fechas especiales (para la cuenta atras y los regalos)
  const fechas = el('div', 'card setting col');
  fechas.append(el('strong', '', 'Fechas especiales'), el('small', '', 'Para la cuenta atrás y los regalos del menú.'));
  const dateFld = (label: string, key: 'nico' | 'izana' | 'roma') => {
    const f = el('label', 'fld');
    const i = el('input'); i.type = 'date'; i.id = `fecha-${key}`;
    const v = getState().specialDates?.[key];
    if (v) i.value = key === 'roma' ? v : `2000-${v}`;
    i.addEventListener('change', () => {
      update(s => { s.specialDates = { ...(s.specialDates ?? {}) }; if (!i.value) delete s.specialDates[key]; else s.specialDates[key] = key === 'roma' ? i.value : i.value.slice(5); });
      toast('Fecha guardada'); sfx('tap');
    });
    f.append(el('span', '', label), i);
    return f;
  };
  fechas.append(dateFld('Cumpleaños de Nico (vale cualquier año)', 'nico'), dateFld('Cumpleaños de Izana (vale cualquier año)', 'izana'), dateFld('Viaje a Roma', 'roma'));
  body.append(fechas);

  // Copia de seguridad del progreso de este movil
  const bk = el('div', 'card setting col');
  bk.append(el('strong', '', 'Copia de seguridad'), el('small', '', 'Guarda tu progreso, dibujos y ajustes en un archivo, o recupéralo.'));
  const row = el('div', 'seg');
  const file = el('input'); file.type = 'file'; file.accept = 'application/json,.json'; file.hidden = true; file.id = 'backup-file';
  row.append(button('Exportar', 'seg-btn', async () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const f = new File([blob], `nuestra-sopa-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
    if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: 'Copia de SopaVentura' }); return; } catch { /* cancelado */ } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; a.click(); toast('Copia descargada');
  }), button('Importar', 'seg-btn', () => file.click()));
  file.addEventListener('change', async () => {
    const f = file.files?.[0]; if (!f) return;
    const text = await f.text();
    const box = el('div', 'pause-box');
    box.append(el('h2', '', '¿Restaurar la copia?'), el('p', '', 'Se sustituirá el progreso de este móvil por el del archivo.'));
    const close = modal(box);
    box.append(button('Sí, restaurar', 'btn big', () => { const r = importBackup(text); if (!r.ok) { toast(r.error ?? 'No se pudo'); close(); return; } toast('Copia restaurada'); setTimeout(() => location.reload(), 600); }), button('Cancelar', 'btn small ghost', close));
  });
  bk.append(row, file);
  body.append(bk);

  const avc = el('div', 'card setting');
  avc.append(el('strong', '', 'Mi avatar'), button('Personalizar', 'btn small', () => navigate('avatar')));
  body.append(avc);
  const who = el('div', 'card setting');
  who.append(el('strong', '', getState().role ? `Sesión: ${getState().role === 'nico' ? 'Nico' : 'Izana'}` : 'Sin sesión'),
    button('Cerrar sesión', 'btn small ghost', async () => { await logout(); location.reload(); }));
  body.append(pin, push, who);
  if (getState().role === 'nico') {
    const adm = el('div', 'card setting');
    adm.append(el('strong', '', 'Panel secreto de Nico'), button('Abrir', 'btn small', () => navigate('admin')));
    body.append(adm);
  }
  screen.append(top, body);
  root.append(screen);
}
