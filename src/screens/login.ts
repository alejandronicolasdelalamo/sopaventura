import type { Role } from '../core/state';
import { isCloud } from '../net';
import { login } from '../net/session';
import { sfx } from '../ui/audio';
import { button, el, modal } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { mountSky } from '../ui/sky';
import { avatarImg, defaultAvatar } from '../avatar/avatar';
import { logo } from './home';

const LAST = 'nuestra-sopa:last-who';
const remembered = (): Role | null => { try { const v = localStorage.getItem(LAST); return v === 'nico' || v === 'izana' ? v : null; } catch { return null; } };

/**
 * Entrada: eliges quien eres (Nico o Izana) y escribes el codigo secreto de la pareja.
 * Sin emails ni registros: la cuenta la crea Nico una vez en Supabase.
 */
export function renderLogin(root: HTMLElement, params: { onDone: () => void }): () => void {
  const screen = el('div', 'screen login');
  const fg = el('div', 'login-fg');
  const card = el('form', 'glass login-card');
  card.noValidate = true;
  card.append(el('p', 'login-hello', 'Hola de nuevo'), el('h2', 'login-q', '¿Quién eres?'));

  let who: Role | null = remembered();
  const pick = el('div', 'who');
  pick.setAttribute('role', 'radiogroup');
  pick.setAttribute('aria-label', 'Quién eres');
  const mk = (r: Role, name: string) => {
    const b = button('', 'who-btn', () => select(r));
    b.setAttribute('role', 'radio');
    b.append(avatarImg(defaultAvatar(r), 72), el('span', '', name));
    return b;
  };
  const bN = mk('nico', 'Nico'), bI = mk('izana', 'Izana');
  pick.append(bN, bI);
  function select(r: Role, quiet = false) {
    who = r;
    [[bN, 'nico'], [bI, 'izana']].forEach(([b, k]) => { (b as HTMLElement).classList.toggle('on', r === k); (b as HTMLElement).setAttribute('aria-checked', String(r === k)); });
    if (!quiet) { sfx('tap'); code.focus(); }
    err.textContent = '';
  }

  const fld = el('label', 'code-field');
  fld.append(el('span', 'fld-label', 'Código secreto'));
  const wrap = el('div', 'code-wrap');
  const code = el('input', 'code-input');
  code.type = 'password'; code.autocomplete = 'current-password'; code.name = 'codigo'; code.spellcheck = false; code.autocapitalize = 'off';
  code.placeholder = '••••••••'; code.required = true; code.minLength = 4;
  const eye = button('', 'eye-btn', () => {
    const show = code.type === 'password';
    code.type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', String(show));
    eye.setAttribute('aria-label', show ? 'Ocultar código' : 'Mostrar código');
    code.focus();
  });
  eye.append(pixelIcon('eye', '#c4b5fd'));
  eye.setAttribute('aria-label', 'Mostrar código'); eye.setAttribute('aria-pressed', 'false');
  wrap.append(code, eye);
  const caps = el('small', 'caps', 'Bloq Mayús está activado');
  caps.hidden = true;
  fld.append(wrap, caps);
  code.addEventListener('keyup', e => { caps.hidden = !e.getModifierState?.('CapsLock'); });
  code.addEventListener('input', () => { err.textContent = ''; });

  const err = el('p', 'error');
  err.setAttribute('role', 'alert');
  const go = button('', 'btn big login-go');
  go.type = 'submit';
  const goLabel = el('span', '', 'Entrar');
  go.append(goLabel);

  const offline = el('p', 'note offline', 'Sin conexión: conéctate para entrar la primera vez.');
  const net = () => { offline.hidden = navigator.onLine || !isCloud; };
  net();
  window.addEventListener('online', net); window.addEventListener('offline', net);

  card.addEventListener('submit', async e => {
    e.preventDefault();
    if (!who) { err.textContent = 'Elige si eres Nico o Izana.'; sfx('wrong'); pick.classList.remove('shake'); void pick.offsetWidth; pick.classList.add('shake'); return; }
    const value = code.value.trim();
    if (value.length < 4) { err.textContent = 'El código tiene al menos 4 caracteres.'; sfx('wrong'); code.focus(); return; }
    if (isCloud && !navigator.onLine) { err.textContent = 'No hay conexión a internet.'; return; }
    go.disabled = true; code.disabled = true; goLabel.textContent = 'Entrando…'; go.classList.add('busy'); err.textContent = '';
    const r = await login(who, value).catch(() => ({ ok: false, error: 'No se pudo conectar. Inténtalo otra vez.' }));
    go.disabled = false; code.disabled = false; goLabel.textContent = 'Entrar'; go.classList.remove('busy');
    if (!r.ok) { err.textContent = r.error ?? 'No se pudo entrar.'; sfx('wrong'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); code.select(); return; }
    try { localStorage.setItem(LAST, who); } catch { /* opcional */ }
    sfx('unlock'); params.onDone();
  });

  const help = button('¿Olvidaste el código?', 'link-btn', () => {
    const box = el('div', 'pause-box');
    box.append(el('h2', '', 'Código secreto'),
      el('p', '', 'Es el mismo código para los dos y solo lo sabéis vosotros. Pídeselo a Nico.'),
      el('p', 'note', 'Por seguridad, tras 10 intentos fallidos hay que esperar 15 minutos.'));
    const close = modal(box);
    box.append(button('Entendido', 'btn', close));
  });

  card.append(pick, fld, err, go, help, offline);
  if (!isCloud) card.append(el('p', 'note', 'Modo local: sin nube. Para jugar juntos hay que configurar Supabase (ver README).'));
  fg.append(logo(), card);
  screen.append(fg);
  root.append(screen);
  if (who) select(who, true);
  const stopSky = mountSky(screen);
  return () => { stopSky(); window.removeEventListener('online', net); window.removeEventListener('offline', net); };
}
