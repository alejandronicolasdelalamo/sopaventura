import { endlessLevel, type LevelSpec } from '../core/levels';
import { getState } from '../core/state';
import { botGame, partnerGame } from '../core/liveGame';
import { acquireLive, onLive, onPeers, sendLive, type LiveKind, type LiveMsg } from '../net/live';
import { isCloud } from '../net';
import { sendMessage } from '../net/sync';
import { allTemplates, isUnlocked } from '../paint/catalog';
import { thumb } from '../paint/store';
import { avatarImg, defaultAvatar } from '../avatar/avatar';
import { getPartner } from '../net/sync';
import { sfx } from '../ui/audio';
import { button, el, modal, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';

const NAME = { nico: 'Nico', izana: 'Izana' } as const;
type BotLevel = 'facil' | 'normal' | 'dificil';
let botLevel: BotLevel = 'normal';

function liveSpec(kind: 'duel' | 'coop', id: string): LevelSpec {
  const base = endlessLevel(200 + Math.floor(Math.random() * 3000));
  const spec: LevelSpec = { ...base, key: `live:${id}`, title: kind === 'duel' ? 'Duelo' : 'Cooperativo', islandId: undefined, index: undefined, shape: undefined, boss: false };
  if (kind === 'coop') spec.timeLimit = Math.max(150, spec.words.length * 20);
  return spec;
}
const modeOf = (kind: 'duel' | 'coop'): 'timed' | 'chill' => (kind === 'coop' ? 'timed' : 'chill');

function startGame(kind: LiveKind, spec: LevelSpec | undefined, tpl: string | undefined, partner: string | null, id: string): void {
  if (kind === 'paint') { navigate('pintar-juego', { id: tpl, together: partner ?? undefined, bot: !partner }); return; }
  const live = partner ? partnerGame(kind, partner, id) : botGame(kind, botLevel);
  navigate('game', { spec: spec ?? liveSpec(kind, id), mode: modeOf(kind), live });
}

/** Lobby de "Jugar juntos": duelo, cooperativo y pintar a la vez, con la pareja o con Olaf. */
export function renderJuntos(root: HTMLElement): () => void {
  const me = getState().role ?? 'nico', other = me === 'nico' ? 'izana' : 'nico';
  const otherName = NAME[other];
  const release = acquireLive();
  const screen = el('div', 'screen juntos');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Jugar juntos'), el('span'));
  const body = el('main', 'page-body');

  // estado de la pareja
  const status = el('section', 'card jt-status');
  const av = avatarImg(getPartner()?.avatar ?? defaultAvatar(other), 48);
  const stTxt = el('div', 'ev-txt');
  const stName = el('strong', '', otherName), stSub = el('small', '');
  stTxt.append(stName, stSub);
  const dot = el('span', 'jt-dot');
  const nudge = button('Avisar', 'btn small', () => { sendMessage('quick', `¡Ven a «Jugar juntos»! Te espero 🎮`); toast(`Aviso enviado a ${otherName}`); sfx('tap'); });
  status.append(av, stTxt, dot, nudge);
  let here = false;
  const offPeers = onPeers(p => {
    here = p.includes(other);
    dot.classList.toggle('on', here);
    stSub.textContent = here ? 'Está aquí, ¡podéis jugar!' : !isCloud ? 'Sin nube todavía: de momento juega con Olaf' : 'No está en la sala. Avísale para que entre.';
    nudge.hidden = !isCloud || here;
    screen.querySelectorAll<HTMLButtonElement>('.jt-vs').forEach(x => { x.disabled = !here; });
  });

  // invitaciones
  let waiting: { id: string; kind: LiveKind; spec?: LevelSpec; tpl?: string; close: () => void } | null = null;
  const invite = (kind: LiveKind, tpl?: string) => {
    const id = Math.random().toString(36).slice(2, 10);
    const spec = kind === 'paint' ? undefined : liveSpec(kind, id);
    sendLive({ t: 'invite', id, kind, spec, tpl });
    const box = el('div', 'pause-box');
    box.append(el('h2', '', 'Invitación enviada'), el('p', '', `Esperando a que ${otherName} acepte…`));
    const close = modal(box);
    box.append(button('Cancelar', 'btn small ghost', () => { waiting = null; close(); }));
    waiting = { id, kind, spec, tpl, close };
    sfx('tap');
  };
  const offLive = onLive((m: LiveMsg, from) => {
    if (from !== other) return;
    if (m.t === 'accept' && waiting?.id === m.id) { const w = waiting; waiting = null; w.close(); startGame(w.kind, w.spec, w.tpl, otherName, w.id); }
    if (m.t === 'decline' && waiting?.id === m.id) { waiting.close(); waiting = null; toast(`${otherName} dice que ahora no`); }
    if (m.t === 'invite') {
      sfx('letter');
      const what = m.kind === 'duel' ? 'te reta a un duelo' : m.kind === 'coop' ? 'quiere jugar en equipo' : 'quiere pintar contigo';
      const box = el('div', 'pause-box');
      box.append(el('h2', '', `${otherName} ${what}`));
      if (m.kind === 'paint' && m.tpl) { const t = allTemplates().find(x => x.id === m.tpl); if (t) { const i = el('img', 'jt-tpl'); i.src = thumb(t, 'color', 96); i.alt = t.name; box.append(i, el('p', '', t.name)); } }
      const close = modal(box);
      box.append(
        button('¡Vamos!', 'btn big', () => { close(); sendLive({ t: 'accept', id: m.id }); startGame(m.kind, m.spec, m.tpl, otherName, m.id); }),
        button('Ahora no', 'btn small ghost', () => { close(); sendLive({ t: 'decline', id: m.id }); }),
      );
    }
  });

  // modos
  const mode = (kind: LiveKind, title: string, desc: string, icon: string, extra?: HTMLElement) => {
    const c = el('section', 'card jt-mode');
    const h = el('div', 'jt-head'); h.append(pixelIcon(icon, '#a5f3fc', 'picon big'), el('h2', 'sec', title));
    c.append(h, el('p', 'note', desc));
    if (extra) c.append(extra);
    const row = el('div', 'jt-btns');
    const tplOf = () => (extra?.querySelector('select') as HTMLSelectElement | null)?.value;
    const vs = button(`Con ${otherName}`, 'btn jt-vs', () => invite(kind, tplOf()));
    vs.disabled = !here;
    row.append(vs, button(kind === 'paint' ? 'Con Olaf' : 'Contra Olaf', 'btn alt', () => { sfx('tap'); startGame(kind, undefined, tplOf(), null, `bot-${Date.now()}`); }));
    c.append(row);
    return c;
  };
  const lvl = el('div', 'seg jt-level');
  (['facil', 'normal', 'dificil'] as const).forEach(l => {
    const bt = button(l === 'facil' ? 'Olaf dormido' : l === 'normal' ? 'Olaf normal' : 'Olaf con hambre', `seg-btn${botLevel === l ? ' on' : ''}`, () => { botLevel = l; lvl.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('on', x === bt)); sfx('tap'); });
    lvl.append(bt);
  });
  const sel = el('select'); sel.className = 'jt-select'; sel.setAttribute('aria-label', 'Dibujo para pintar juntos');
  allTemplates().filter(t => isUnlocked(t) && !getState().paintDone.includes(t.id) && t.w <= 64).slice(0, 60).forEach(t => { const o = el('option', '', t.name); o.value = t.id; sel.append(o); });
  const selWrap = el('div', ''); selWrap.append(sel);
  body.append(status,
    mode('duel', 'Duelo', 'El mismo tablero para los dos. Gana quien encuentre más palabras. Si una ya la ha cogido el otro, ¡llegas tarde!', 'fire', lvl),
    mode('coop', 'En equipo', 'Una sopa contrarreloj: las palabras de los dos suman. Encontradlas todas antes de que se acabe el tiempo.', 'heart'),
    mode('paint', 'Pintar juntos', 'El mismo dibujo por números en los dos móviles. Lo que pinta uno aparece en el otro al momento.', 'brush', selWrap),
  );
  screen.append(top, body);
  root.append(screen);
  return () => { offPeers(); offLive(); release(); };
}
