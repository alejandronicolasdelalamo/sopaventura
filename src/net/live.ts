import { backend } from './index';
import type { Role } from '../core/state';
import type { LevelSpec } from '../core/levels';

/**
 * Sala en directo de la pareja (Supabase Realtime: broadcast + presencia; en local, entre pestañas).
 * Se mantiene abierta mientras alguna pantalla la usa (lobby o partida), con un pequeño margen
 * para que al pasar del lobby a la partida no se corte.
 */
export type LiveKind = 'duel' | 'coop' | 'paint';
export type LiveMsg =
  | { t: 'invite'; id: string; kind: LiveKind; spec?: LevelSpec; tpl?: string }
  | { t: 'accept'; id: string }
  | { t: 'decline'; id: string }
  | { t: 'found'; game: string; idx: number }
  | { t: 'left'; game: string };

export interface LiveConn { send(m: LiveMsg): void; leave(): void }

type Listener = (m: LiveMsg, from: Role) => void;
const listeners = new Set<Listener>();
const peerListeners = new Set<(p: Role[]) => void>();
let conn: LiveConn | null = null, refs = 0, leaveT = 0;
let peers: Role[] = [];

export function acquireLive(): () => void {
  refs++;
  clearTimeout(leaveT);
  if (!conn) {
    try {
      conn = backend.joinLive((m, from) => listeners.forEach(l => l(m as LiveMsg, from)), p => { peers = p; peerListeners.forEach(l => l(p)); });
    } catch { conn = null; }
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    refs--;
    if (refs <= 0) leaveT = window.setTimeout(() => { if (refs <= 0) { conn?.leave(); conn = null; peers = []; peerListeners.forEach(l => l([])); } }, 2500);
  };
}
export const onLive = (l: Listener): (() => void) => { listeners.add(l); return () => listeners.delete(l); };
export const onPeers = (l: (p: Role[]) => void): (() => void) => { peerListeners.add(l); l(peers); return () => peerListeners.delete(l); };
export const livePeers = (): Role[] => peers;
export const sendLive = (m: LiveMsg): void => conn?.send(m);
