import { ACHIEVEMENTS } from '../core/achievements';
import { gameFinished, totalStars } from '../core/progress';
import { getState } from '../core/state';
import { getPartner } from '../net/sync';
import { logout } from '../net/session';
import { isCloud } from '../net';
import { avatarImg, defaultAvatar } from '../avatar/avatar';
import { sfx } from '../ui/audio';
import { button, el, modal, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { mountSky } from '../ui/sky';
import { back, navigate } from '../ui/router';
import { myAvatar } from './avatar';
import { claimMission, ensureMissions, MISSION_POOL, claimWeek, myWeekWords, upcomingEvents, weekId, WEEK_GOAL, WEEK_REWARD } from '../core/extras';

const NAME = { nico: 'Nico', izana: 'Izana' } as const;

export function renderPerfil(root: HTMLElement): () => void {
  const s = getState();
  const me = s.role ?? 'nico';
  const other = me === 'nico' ? 'izana' : 'nico';
  const partner = getPartner();
  const screen = el('div', 'screen jugar');
  const fg = el('div', 'jugar-fg');
  const top = el('header', 'glass-top');
  const b = button('', 'btn small icon-btn', () => { sfx('tap'); back(); });
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Perfil'), el('span'));

  const body = el('main', 'page-body glass-body');
  const head = el('section', 'glass profile-head');
  const av = button('', 'avatar-edit', () => { sfx('tap'); navigate('avatar'); });
  av.append(avatarImg(myAvatar(), 112), el('span', 'av-pencil', 'Editar'));
  av.setAttribute('aria-label', 'Editar avatar');
  const who = el('div', 'profile-who');
  who.append(el('h2', '', NAME[me]), el('p', '', isCloud ? 'Sesión en la nube · sincronizado' : 'Modo local (sin nube)'));
  head.append(av, who);

  const grid = el('section', 'stat-grid');
  const tile = (icon: string, color: string, value: string | number, label: string) => {
    const t = el('div', 'glass stat-tile');
    t.append(pixelIcon(icon, color, 'picon big'), el('strong', '', String(value)), el('small', '', label));
    return t;
  };
  grid.append(
    tile('star', '#ffd86b', totalStars(s), 'Estrellas'),
    tile('coin', '#ffd86b', s.coins, 'Monedas'),
    tile('fire', '#ff9a5a', s.streak.count, 'Días de racha'),
    tile('trophy', '#8aa4ff', `${s.achievements.length}/${ACHIEVEMENTS.length}`, 'Logros'),
    tile('check', '#5eead4', s.stats.levelsDone, 'Niveles'),
    tile('eye', '#c4b5fd', s.stats.wordsFound, 'Palabras'),
    tile('brush', '#a78bfa', s.paintDone.length, 'Obras'),
    tile('cal', '#7dd3fc', s.stats.dailyDone, 'Retos diarios'),
  );

  const duo = el('section', 'glass duo');
  duo.append(el('h3', 'sec', NAME[other]));
  const row = el('div', 'duo-row');
  row.append(avatarImg(partner?.avatar ?? defaultAvatar(other), 64));
  const info = el('div', 'ach-text');
  if (partner) info.append(el('strong', '', `${partner.totalStars} estrellas · racha ${partner.streak}`), el('small', '', `${partner.levelsDone} niveles · ${partner.paintDone.length} obras`));
  else info.append(el('strong', '', 'Sin datos todavía'), el('small', '', 'Aparecerá cuando os sincronicéis'));
  row.append(info);
  duo.append(row);

  // Reto semanal de pareja: palabras de los dos esta semana
  const mine = myWeekWords(), theirs = partner?.weekId === weekId() ? partner.weekWords ?? 0 : 0, sum = mine + theirs;
  const wk = el('section', 'glass week');
  wk.append(el('h3', 'sec', 'Reto semanal de pareja'), el('p', 'note', `Entre los dos, ${WEEK_GOAL} palabras esta semana. Premio: ${WEEK_REWARD} monedas.`));
  const barW = el('div', 'week-bar');
  const f1 = el('i', 'me'); f1.style.width = `${Math.min(100, (mine / WEEK_GOAL) * 100)}%`;
  const f2 = el('i', 'them'); f2.style.width = `${Math.min(100 - Math.min(100, (mine / WEEK_GOAL) * 100), (theirs / WEEK_GOAL) * 100)}%`;
  barW.append(f1, f2);
  wk.append(barW, el('p', 'week-txt', `${Math.min(sum, WEEK_GOAL)}/${WEEK_GOAL} · tú ${mine} · ${NAME[other]} ${theirs}`));
  if (sum >= WEEK_GOAL && !s.week?.claimed) wk.append(button(`Cobrar ${WEEK_REWARD} monedas`, 'btn', () => { if (claimWeek()) { toast(`+${WEEK_REWARD} monedas`); navigate('perfil', {}, true); } }));
  else if (s.week?.claimed && s.week.id === weekId()) wk.append(el('p', 'note', 'Reto cobrado. ¡El lunes empieza otro!'));

  // Misiones de la semana
  ensureMissions();
  const ms = el('section', 'glass week');
  ms.append(el('h3', 'sec', 'Misiones de la semana'));
  getState().missions.items.forEach(it => {
    const d = MISSION_POOL.find(m => m.id === it.id); if (!d) return;
    const r = el('div', 'mission');
    const t = el('div', 'mission-t');
    t.append(el('strong', '', d.text), el('small', '', `${it.n}/${d.goal} · ${d.reward} monedas`));
    const bar = el('div', 'week-bar'); const fi = el('i', 'me'); fi.style.width = `${(it.n / d.goal) * 100}%`; bar.append(fi); t.append(bar);
    r.append(t);
    if (it.claimed) r.append(el('span', 'mission-done', '✔'));
    else if (it.n >= d.goal) r.append(button('Cobrar', 'btn small', () => { const c = claimMission(d.id); if (c) { sfx('coin'); toast(`+${c} monedas`); navigate('perfil', {}, true); } }));
    ms.append(r);
  });

  // Proximas fechas especiales
  const evs = upcomingEvents().slice(0, 3);
  const evc = el('section', 'glass week');
  evc.append(el('h3', 'sec', 'Próximas fechas'));
  evs.forEach(e => { const r = el('div', 'vs-row'); r.append(el('span', '', e.name), el('strong', '', e.today ? '¡Hoy!' : e.days === 1 ? 'Mañana' : `${e.days} días`)); evc.append(r); });
  evc.append(el('p', 'note', 'Cumpleaños y viaje a Roma: ponlos en Ajustes.'));

  const actions = el('section', 'btn-col');
  const stats = button('', 'btn row-btn', () => navigate('estadisticas'));
  stats.append(pixelIcon('trophy', '#fff'), el('span', '', 'Estadísticas'));
  actions.append(stats);
  const finished = gameFinished();
  const fin = button('', 'btn alt row-btn', () => { if (finished) navigate('final'); else toast('Completa todas las islas para ver el final, Cuchi.'); });
  fin.append(pixelIcon(finished ? 'heart' : 'lock', '#fff'), el('span', '', 'Nuestro final'));
  const edit = button('', 'btn row-btn', () => navigate('avatar'));
  edit.append(pixelIcon('brush', '#fff'), el('span', '', 'Personalizar avatar'));
  actions.append(edit, fin);
  if (s.role === 'nico') {
    const adm = button('', 'btn row-btn', () => navigate('admin'));
    adm.append(pixelIcon('key', '#fff'), el('span', '', 'Panel secreto de Nico'));
    actions.append(adm);
  }
  const out = button('Cerrar sesión', 'btn small ghost', () => {
    const box = el('div', 'pause-box');
    box.append(el('h2', '', '¿Cerrar sesión?'), el('p', '', 'Tu progreso queda guardado. Para volver a entrar necesitarás el código secreto.'));
    const close = modal(box);
    box.append(button('Sí, salir', 'btn big', async () => { close(); await logout(); location.reload(); }), button('Cancelar', 'btn small ghost', close));
  });
  actions.append(out);

  body.append(head, grid, duo, wk, ms, evc, actions);
  fg.append(top, body);
  screen.append(fg);
  root.append(screen);
  return mountSky(screen);
}
