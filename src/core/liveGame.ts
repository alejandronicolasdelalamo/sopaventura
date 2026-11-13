import { acquireLive, onLive, sendLive } from '../net/live';

/** Lo que la partida necesita saber de una sopa a dos (contra la pareja o contra Olaf). */
export interface LiveGame {
  kind: 'duel' | 'coop';
  partner: string;
  bot: boolean;
  game: string;
  /** Aviso al otro de que he encontrado la palabra idx. */
  send(idx: number): void;
  /** Escucha las palabras del otro. cb devuelve false si ahora no se puede (pausa): el bot lo reintenta. */
  listen(cb: (idx: number) => boolean, pending: () => number[]): () => void;
  /** Al salir de la partida. */
  leave(): void;
  onLeft?: () => void;
}

/** Partida contra la pareja por la sala en directo. */
export function partnerGame(kind: 'duel' | 'coop', partner: string, game: string): LiveGame {
  const release = acquireLive();
  let off: (() => void) | null = null;
  const g: LiveGame = {
    kind, partner, bot: false, game,
    send: idx => sendLive({ t: 'found', game, idx }),
    listen(cb) {
      off = onLive(m => {
        if (m.t === 'found' && m.game === game) cb(m.idx);
        if (m.t === 'left' && m.game === game) g.onLeft?.();
      });
      return () => { off?.(); off = null; };
    },
    leave() { sendLive({ t: 'left', game }); off?.(); release(); },
  };
  return g;
}

/** Olaf como rival o compañero: encuentra una palabra cada pocos segundos. */
export function botGame(kind: 'duel' | 'coop', level: 'facil' | 'normal' | 'dificil' = 'normal'): LiveGame {
  const [lo, hi] = { facil: [13, 20], normal: [9, 15], dificil: [6, 10] }[level];
  let timer = 0;
  return {
    kind, partner: 'Olaf', bot: true, game: `bot-${Date.now()}`,
    send: () => {},
    listen(cb, pending) {
      const wait = () => (lo + Math.random() * (hi - lo)) * 1000 * (kind === 'coop' ? 1.3 : 1);
      let due = performance.now() + wait() + 2500;
      timer = window.setInterval(() => {
        if (performance.now() < due) return;
        const p = pending();
        if (!p.length) { clearInterval(timer); return; }
        if (cb(p[Math.floor(Math.random() * p.length)])) due = performance.now() + wait();
      }, 500);
      return () => clearInterval(timer);
    },
    leave() { clearInterval(timer); },
  };
}
