import { checkAchievements } from '../core/achievements';
import { DEFAULT_QUICK, getState, update } from '../core/state';
import { ACHIEVEMENTS } from '../core/achievements';
import { getPartner, markRead, getMessages, onMessages, refreshMessages, sendMessage, unreadCount } from '../net/sync';
import { isCloud } from '../net';
import type { Message } from '../net/types';
import { sfx } from '../ui/audio';
import { confetti } from '../ui/confetti';
import { button, el, modal, toast } from '../ui/dom';
import { buzz } from '../ui/haptics';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';
import { pixelStar } from './map';
import { avatarImg, defaultAvatar } from '../avatar/avatar';
import { decodeChallenge, decodeSoup } from '../core/extras';
import { customLevel } from '../core/levels';
import { norm } from '../core/text';
import { myAvatar } from './avatar';

const fmtDate = (t: number) => new Date(t).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const nameOf = (r: string) => (r === 'nico' ? 'Nico' : 'Izana');

function composer(): void {
  const box = el('div', 'composer');
  box.append(el('h2', '', 'Escribir una carta'));
  const text = el('textarea', 'letter-input');
  text.placeholder = 'Querida...'; text.rows = 7; text.maxLength = 5000; text.setAttribute('aria-label', 'Texto de la carta');
  const sched = el('label', 'sched');
  const chk = el('input'); chk.type = 'checkbox';
  sched.append(chk, document.createTextNode(' Programar para un día concreto'));
  const when = el('input', 'when'); when.type = 'datetime-local'; when.hidden = true; when.setAttribute('aria-label', 'Fecha de entrega');
  chk.addEventListener('change', () => { when.hidden = !chk.checked; });
  const close = modal(box);
  box.append(text, sched, when,
    button('Enviar', 'btn big', () => {
      const body = text.value.trim();
      if (!body) { toast('Escribe algo primero 💜'); return; }
      let at = Date.now();
      if (chk.checked) {
        at = new Date(when.value).getTime();
        if (!when.value || Number.isNaN(at) || at <= Date.now()) { toast('Elige una fecha y hora futuras.'); return; }
      }
      sendMessage('letter', body, at);
      sfx('letter'); buzz(15); confetti(innerWidth / 2, innerHeight / 3, 30, ['#ff7eb6', '#fff8e8', '#ffd86b']);
      toast(chk.checked ? `Carta programada para el ${fmtDate(at)}` : 'Carta enviada 💌');
      checkAchievements().forEach(a => toast(`Logro: ${a.name}`));
      close();
    }),
    button('Cancelar', 'btn small ghost', close));
}

function editQuick(): void {
  const box = el('div', 'composer');
  box.append(el('h2', '', 'Mensajes rápidos'), el('p', '', 'Uno por línea. Se envían con un toque.'));
  const t = el('textarea', 'letter-input'); t.rows = 8; t.value = getState().quick.join('\n'); t.setAttribute('aria-label', 'Mensajes rápidos');
  const close = modal(box);
  box.append(t,
    button('Guardar', 'btn big', () => {
      const lines = t.value.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 12);
      update(s => { s.quick = lines.length ? lines : [...DEFAULT_QUICK]; });
      close(); navigate('nosotros', {}, true);
    }),
    button('Cancelar', 'btn small ghost', close));
}

export function renderNosotros(root: HTMLElement): () => void {
  const me = getState().role ?? 'nico', other = me === 'nico' ? 'izana' : 'nico';
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Nosotros'), el('span'));
  const body = el('main', 'page-body');

  const s = getState(), p = getPartner();
  const stat = (label: string, mine: string | number, theirs: string | number) => {
    const r = el('div', 'vs-row');
    r.append(el('span', 'vs-l', String(mine)), el('span', 'vs-c', label), el('span', 'vs-r', String(theirs)));
    return r;
  };
  const card = el('div', 'card vs');
  const head = el('div', 'vs-row vs-head');
  const who = (r: string, cfg: Parameters<typeof avatarImg>[0]) => { const w = el('div', 'vs-who'); w.append(avatarImg(cfg, 64), el('strong', '', nameOf(r))); return w; };
  head.append(who(me, myAvatar()), el('span'), who(other, p?.avatar ?? defaultAvatar(other)));
  card.append(head,
    stat('Estrellas', Object.values(s.stars).reduce((a, v) => a + v, 0), p ? p.totalStars : '—'),
    stat('Niveles', s.stats.levelsDone, p ? p.levelsDone : '—'),
    stat('Palabras', s.stats.wordsFound, p ? p.wordsFound : '—'),
    stat('Racha (días)', s.streak.count, p ? p.streak : '—'),
    stat('Logros', `${s.achievements.length}/${ACHIEVEMENTS.length}`, p ? `${p.achievements.length}/${ACHIEVEMENTS.length}` : '—'),
    stat('Dibujos', s.paintDone.length, p ? p.paintDone.length : '—'),
  );
  if (!p) card.append(el('p', 'note', isCloud ? `Cuando ${nameOf(other)} abra el juego, aparecerán aquí sus datos.` : 'Modo local: aquí verás los datos de la otra persona cuando haya nube.'));
  else card.append(el('p', 'note', `Última vez de ${nameOf(other)}: ${fmtDate(p.updated)}`));
  void pixelStar;

  body.append(card, el('h2', 'sec', 'Mensajes rápidos'));
  const quick = el('div', 'quick');
  getState().quick.forEach(q => quick.append(button(q, 'btn quick-btn', () => {
    sendMessage('quick', q); sfx('found'); buzz(10); toast(`Enviado a ${nameOf(other)}`);
    checkAchievements().forEach(a => toast(`Logro: ${a.name}`));
  })));
  quick.append(button('Editar', 'btn quick-btn ghost', editQuick));
  body.append(quick);

  const inbox = unreadCount();
  const actions = el('div', 'btn-col');
  actions.append(button('Escribir una carta', 'btn big', composer), button(`Crear una sopa para ${nameOf(other)}`, 'btn alt', () => navigate('crear-sopa')),
    button(inbox ? `Buzón (${inbox} nuevas)` : 'Buzón', 'btn', () => navigate('buzon')), button('Nuestras palabras', 'btn small', editMyWords));
  body.append(actions);
  screen.append(top, body);
  root.append(screen);
  void refreshMessages();
  return () => {};
}

/** Palabras propias (sitios, bromas, apodos) que entran en los niveles de Nosotros y Citas de este movil. */
function editMyWords(): void {
  const box = el('div', 'composer');
  box.append(el('h2', '', 'Nuestras palabras'), el('p', 'note', 'Una por línea. Puedes añadir una pista tras una barra: «La Ramona | Nuestro bar». Saldrán en los niveles de Nosotros y Citas.'));
  const text = el('textarea', 'letter-input');
  text.id = 'mis-palabras'; text.rows = 9; text.setAttribute('aria-label', 'Palabras propias');
  text.value = (getState().myWords ?? []).map(([w, c]) => (c ? `${w} | ${c}` : w)).join('\n');
  const close = modal(box);
  box.append(text, button('Guardar', 'btn big', () => {
    const list = text.value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(([w]) => w && /^[A-ZÑ]{2,12}$/.test(norm(w))).map(([w, c]) => [w, c ?? ''] as [string, string]);
    update(s => { s.myWords = list.slice(0, 200); });
    toast(`${list.length} palabras guardadas`); sfx('unlock'); close();
  }), button('Cancelar', 'btn small ghost', close));
}

// ------------------------------------------------------------------ buzon
function openLetter(m: Message): void {
  const me = getState().role;
  const box = el('div', 'letter-view');
  const env = el('div', 'envelope');
  env.append(el('div', 'env-flap'), el('div', 'env-body'));
  box.append(env);
  const paper = el('div', 'paper');
  paper.append(el('small', '', `${nameOf(m.from)} · ${fmtDate(m.deliverAt)}`), el('p', 'paper-text', m.body));
  box.append(paper);
  const close = modal(box, { cls: 'letter-modal' });
  box.append(button('Cerrar', 'btn small', close));
  sfx('letter'); confetti(innerWidth / 2, innerHeight * 0.3, 18, ['#ff7eb6', '#fff8e8']);
  if (m.to === me && !m.readAt) markRead([m.id]);
}

/** Un vale canjeado por el otro: se puede marcar como cumplido (le llega el aviso). */
function voucherDone(m: Message): void {
  const me = getState().role ?? 'nico';
  const box = el('div', 'pause-box');
  const what = m.body.replace(/^Vale canjeado: /, '');
  box.append(el('h2', '', 'Vale'), el('p', '', `${nameOf(m.from)} quiere usar: «${what}»`));
  const close = modal(box);
  box.append(button('¡Cumplido!', 'btn big', () => {
    sendMessage('quick', `✓ ${nameOf(me)} ha cumplido el vale: ${what}`);
    if (!m.readAt) markRead([m.id]);
    sfx('unlock'); confetti(innerWidth / 2, innerHeight / 3, 30); close();
  }), button('Más tarde', 'btn small ghost', () => { if (!m.readAt) markRead([m.id]); close(); }));
}

export function renderBuzon(root: HTMLElement): () => void {
  const me = getState().role;
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Buzón'), el('span'));
  const tabs = el('div', 'seg tabs');
  const body = el('main', 'page-body');
  let tab: 'in' | 'out' = 'in';

  const draw = () => {
    tabs.querySelectorAll('.seg-btn').forEach((x, i) => x.classList.toggle('on', (i === 0) === (tab === 'in')));
    body.replaceChildren();
    const now = Date.now();
    const list = getMessages().filter(m => (tab === 'in' ? m.to === me && m.deliverAt <= now : m.from === me)).sort((a, z) => z.deliverAt - a.deliverAt);
    if (!list.length) { body.append(el('p', 'empty', tab === 'in' ? 'Todavía no hay cartas. Escribe tú la primera 💌' : 'No has enviado nada aún.')); return; }
    list.forEach(m => {
      const r = el('button', `card mail-row${m.to === me && !m.readAt ? ' unread' : ''}`);
      r.append(pixelIcon(m.kind === 'letter' ? 'mail' : m.kind === 'voucher' ? 'heart' : 'note', m.to === me && !m.readAt ? '#ff7eb6' : '#9a90b0', 'picon big'));
      const t = el('div', 'ach-text');
      const scheduled = m.deliverAt > now;
      t.append(el('strong', '', m.kind === 'letter' ? `Carta de ${nameOf(m.from)}` : m.kind === 'voucher' ? 'Vale' : `${nameOf(m.from)}`),
        el('small', '', scheduled ? `Programada para ${fmtDate(m.deliverAt)}` : m.body.length > 60 ? `${m.body.slice(0, 60)}…` : m.body));
      r.append(t, el('small', 'when-s', fmtDate(m.deliverAt)));
      const soup = decodeSoup(m.body);
      if (soup) {
        r.querySelector('.ach-text strong')!.textContent = m.from === me ? `Sopa enviada: «${soup.title}»` : `Sopa de ${nameOf(m.from)}: «${soup.title}»`;
        r.querySelector('.ach-text small')!.textContent = m.from === me ? `${soup.words.length} palabras` : `${soup.words.length} palabras · tócala para jugar`;
        r.classList.add('soup-row');
      }
      const reto = decodeChallenge(m.body);
      if (reto) {
        const tt = `${Math.floor(reto.secs / 60)}:${String(reto.secs % 60).padStart(2, '0')}`;
        r.querySelector('.ach-text strong')!.textContent = m.from === me ? `Reto enviado (${tt})` : `Reto de ${nameOf(m.from)}: supera ${tt}`;
        r.querySelector('.ach-text small')!.textContent = m.from === me ? 'Mismo tablero para los dos' : 'Mismo tablero, tú tienes que ir más rápido · tócalo para jugar';
        r.classList.add('soup-row');
      }
      r.addEventListener('click', () => {
        sfx('tap');
        if (reto) {
          if (m.to === me && !m.readAt) markRead([m.id]);
          if (m.from !== me) navigate('game', { spec: { ...reto.spec, key: `reto:${m.id}` }, mode: reto.mode, challenge: { secs: reto.secs, from: nameOf(m.from) } });
          return;
        }
        if (soup) {
          if (m.to === me && !m.readAt) markRead([m.id]);
          navigate('game', { spec: customLevel(`custom:${m.id}`, soup.title, soup.words), mode: 'chill', gift: { message: soup.message, from: nameOf(m.from) } });
          return;
        }
        if (m.kind === 'voucher' && m.to === me) { voucherDone(m); return; }
        if (m.kind === 'letter' || m.body.length > 60) openLetter(m); else if (m.to === me && !m.readAt) markRead([m.id]);
      });
      body.append(r);
    });
  };
  tabs.append(button('Recibidas', 'seg-btn', () => { tab = 'in'; draw(); }), button('Enviadas', 'seg-btn', () => { tab = 'out'; draw(); }));
  draw();
  screen.append(top, tabs, body);
  root.append(screen);
  void refreshMessages();
  return onMessages(draw);
}
