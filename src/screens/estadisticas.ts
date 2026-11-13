import { islandById } from '../data/islands';
import { getState } from '../core/state';
import { totalStars } from '../core/progress';
import { todayStr } from '../core/levels';
import { MODES } from './levelSheet';
import { button, el } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back } from '../ui/router';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Estadisticas: palabras por dia (14 dias), mejores tiempos por isla, modos y ultimas partidas. */
export function renderEstadisticas(root: HTMLElement): void {
  const s = getState();
  const h = s.history ?? [];
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  top.append(b, el('h1', 'page-title', 'Estadísticas'), el('span'));
  const body = el('main', 'page-body');

  const wins = h.filter(x => x.win);
  const totals = el('div', 'stat-grid');
  const tile = (v: string | number, l: string) => { const t = el('div', 'card st-tile'); t.append(el('strong', '', String(v)), el('small', '', l)); return t; };
  totals.append(
    tile(h.length, 'Partidas'), tile(wins.length, 'Ganadas'),
    tile(wins.length ? `${Math.round((wins.filter(x => x.stars === 3).length / wins.length) * 100)}%` : '—', 'Con 3 estrellas'),
    tile(s.stats.bestCombo ? `x${s.stats.bestCombo}` : '—', 'Mejor combo'),
    tile(s.stats.wordsFound, 'Palabras'), tile(s.streak.count, 'Días de racha'),
  );
  body.append(totals);

  // palabras por dia, ultimos 14 dias (barras)
  const days: { label: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = todayStr(d);
    const n = h.filter(x => todayStr(new Date(x.t)) === key).reduce((a, x) => a + x.words, 0);
    days.push({ label: i === 0 ? 'hoy' : String(d.getDate()), n });
  }
  const max = Math.max(1, ...days.map(d => d.n));
  const chart = el('div', 'card st-chart');
  chart.append(el('h2', 'sec', 'Palabras por día'));
  const bars = el('div', 'st-bars');
  bars.setAttribute('role', 'img');
  bars.setAttribute('aria-label', `Palabras de los últimos 14 días: ${days.map(d => d.n).join(', ')}`);
  days.forEach(d => {
    const col = el('div', 'st-col');
    const bar = el('i'); bar.style.height = `${Math.round((d.n / max) * 100)}%`;
    col.append(el('span', 'st-n', d.n ? String(d.n) : ''), bar, el('small', '', d.label));
    bars.append(col);
  });
  chart.append(bars);
  body.append(chart);

  // mejores tiempos por isla
  const best = new Map<string, number>();
  wins.forEach(x => { const id = x.key.replace(/^.*\|/, '').split(':')[0]; if (!best.has(id) || x.secs < best.get(id)!) best.set(id, x.secs); });
  const islCard = el('div', 'card');
  islCard.append(el('h2', 'sec', 'Mejor tiempo por isla'));
  const rows = [...best.entries()].map(([id, secs]) => [islandById(id)?.name ?? (id === 'daily' ? 'Reto diario' : id === 'custom' ? 'Sopas regaladas' : id), secs] as const).sort((a, z) => a[1] - z[1]);
  if (!rows.length) islCard.append(el('p', 'note', 'Gana alguna partida y aparecerán aquí.'));
  rows.forEach(([n, secs]) => { const r = el('div', 'vs-row'); r.append(el('span', 'st-name', n), el('strong', '', fmt(secs))); islCard.append(r); });
  body.append(islCard);

  // cada modo tiene su progreso: estrellas, victorias, mejor tiempo y extras
  const modeCard = el('div', 'card');
  modeCard.append(el('h2', 'sec', 'Por modo'));
  const grid = el('div', 'mode-stats');
  MODES.forEach(m => {
    const mine = h.filter(x => x.mode === m.id), w = mine.filter(x => x.win);
    const bestT = w.length ? Math.min(...w.map(x => x.secs)) : 0;
    const mb = s.modeBest?.[m.id];
    const c = el('div', 'mode-stat');
    const head = el('div', 'ms-head'); head.append(pixelIcon(m.icon, '#a78bfa'), el('strong', '', m.name));
    const row = (l: string, v: string) => { const r = el('div', 'vs-row'); r.append(el('span', '', l), el('b', '', v)); return r; };
    c.append(head, row('Estrellas', String(totalStars(s, m.id))), row('Ganadas', `${w.length}/${mine.length}`), row('Mejor tiempo', bestT ? fmt(bestT) : '—'), row('Extras (récord)', mb?.extras ? String(mb.extras) : '—'));
    grid.append(c);
  });
  modeCard.append(grid);
  if (!h.length) modeCard.append(el('p', 'note', 'Todavía no hay partidas.'));
  body.append(modeCard);

  // ultimas partidas
  const last = el('div', 'card');
  last.append(el('h2', 'sec', 'Últimas partidas'));
  [...h].reverse().slice(0, 10).forEach(x => {
    const r = el('div', 'vs-row');
    const kk = x.key.replace(/^.*\|/, '');
    const isl = islandById(kk.split(':')[0]);
    const lvl = isl ? `${isl.name} · ${Number(kk.split(':')[1]) + 1}` : x.key.startsWith('daily') ? 'Reto diario' : 'Sopa regalada';
    r.append(el('span', 'st-name', `${new Date(x.t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${lvl}`), el('strong', '', x.win ? '★'.repeat(x.stars) : 'perdida'), el('small', '', fmt(x.secs)));
    last.append(r);
  });
  if (!h.length) last.append(el('p', 'note', 'Juega una sopa y la verás aquí.'));
  body.append(last);
  screen.append(top, body);
  root.append(screen);
}
