import { customLevel } from '../core/levels';
import { cleanWords } from '../core/generator';
import { norm } from '../core/text';
import { getState } from '../core/state';
import { encodeSoup, type GiftSoup } from '../core/extras';
import { sendMessage } from '../net/sync';
import { sfx } from '../ui/audio';
import { button, el, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';

const nameOf = (r: string) => (r === 'nico' ? 'Nico' : 'Izana');
const DRAFT = 'nuestra-sopa:borrador-sopa';

/** Editor: hasta 12 palabras + un mensaje que se revela al terminar. Se envia al buzon del otro. */
export function renderCrearSopa(root: HTMLElement): void {
  const me = getState().role ?? 'nico', other = me === 'nico' ? 'izana' : 'nico';
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', `Sopa para ${nameOf(other)}`), el('span'));
  const body = el('main', 'page-body');

  let draft: GiftSoup = { title: '', words: [], message: '' };
  try { draft = { ...draft, ...JSON.parse(localStorage.getItem(DRAFT) ?? '{}') }; } catch { /* sin borrador */ }

  const fld = (label: string, input: HTMLElement, hint = '') => { const f = el('label', 'fld'); f.append(el('span', '', label), input); if (hint) f.append(el('small', 'note', hint)); return f; };
  const title = el('input'); title.type = 'text'; title.id = 'sopa-titulo'; title.maxLength = 40; title.placeholder = 'Nuestra semana'; title.value = draft.title;
  const words = el('textarea', 'letter-input'); words.id = 'sopa-palabras'; words.rows = 6; words.placeholder = 'Una palabra por línea\nOLAF\nGRANADA\nCUCHI'; words.value = draft.words.join('\n');
  const msg = el('textarea', 'letter-input'); msg.id = 'sopa-mensaje'; msg.rows = 4; msg.maxLength = 600; msg.placeholder = 'Lo que verá al terminarla…'; msg.value = draft.message;
  const status = el('p', 'note');
  const chips = el('div', 'quick');

  const parse = (): { list: string[]; bad: string[] } => {
    const raw = words.value.split('\n').map(l => l.trim()).filter(Boolean);
    const bad = raw.filter(w => norm(w).length < 2 || norm(w).length > 12 || !/^[A-ZÑ]+$/.test(norm(w)));
    const ok = raw.filter(w => !bad.includes(w));
    return { list: cleanWords(ok, 12).slice(0, 12), bad };
  };
  const refresh = () => {
    const { list, bad } = parse();
    chips.replaceChildren(...list.map(w => el('span', 'chip', w)));
    status.textContent = `${list.length}/12 palabras${bad.length ? ` · no valen: ${bad.join(', ')} (solo letras, de 2 a 12)` : ''}${list.length < 3 ? ' · pon al menos 3' : ''}`;
    draft = { title: title.value.trim(), words: list, message: msg.value.trim() };
    try { localStorage.setItem(DRAFT, JSON.stringify({ ...draft, words: words.value.split('\n') })); } catch { /* opcional */ }
  };
  [title, words, msg].forEach(i => i.addEventListener('input', refresh));
  refresh();

  const ready = () => { refresh(); if (draft.words.length < 3) { toast('Pon al menos 3 palabras'); sfx('wrong'); return false; } if (!draft.message) { toast('Escribe el mensaje escondido'); sfx('wrong'); return false; } return true; };
  const play = button('Probarla yo', 'btn', () => {
    if (!ready()) return;
    navigate('game', { spec: customLevel(`custom:prueba`, draft.title || 'Sopa de prueba', draft.words), mode: 'chill', gift: { message: draft.message, from: nameOf(me) } });
  });
  const send = button(`Enviar a ${nameOf(other)}`, 'btn big', () => {
    if (!ready()) return;
    sendMessage('system', encodeSoup({ ...draft, title: draft.title || 'Una sopa para ti' }));
    sfx('unlock'); toast(`Sopa enviada a ${nameOf(other)} 💌`);
    try { localStorage.removeItem(DRAFT); } catch { /* opcional */ }
    back();
  });
  const actions = el('div', 'btn-col');
  actions.append(send, play);
  body.append(
    el('p', 'note', `${nameOf(other)} la recibirá en su buzón. Al encontrar todas las palabras verá tu mensaje.`),
    fld('Título', title), fld('Palabras', words, 'Solo letras (sin números ni símbolos). Las tildes se quitan solas.'), chips, status,
    fld('Mensaje escondido', msg), actions,
  );
  screen.append(top, body);
  root.append(screen);
}
