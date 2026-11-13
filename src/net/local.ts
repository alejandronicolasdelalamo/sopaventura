import type { Role } from '../core/state';
import type { PaintOp, TemplateJson } from '../paint/model';
import type { Backend, Message, PhotoRef, PushSub, Snapshot } from './types';

/**
 * Backend local: guarda todo en este navegador. Sirve para desarrollar y probar sin Supabase.
 * Sin nube no hay pareja real: los mensajes se quedan en este movil.
 */
const K = (s: string) => `nuestra-sopa:local:${s}`;
const read = <T>(k: string, d: T): T => { try { const v = localStorage.getItem(K(k)); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(K(k), JSON.stringify(v)); } catch { /* ignorar */ } };

export class LocalBackend implements Backend {
  readonly mode = 'local' as const;
  private listeners = new Set<() => void>();
  private paintSubs = new Map<string, Set<(op: PaintOp) => void>>();

  async restore(): Promise<Role | null> { return read<Role | null>('role', null); }
  async login(name: Role, code: string) {
    if (code.trim().length < 4) return { ok: false as const, error: 'El código debe tener al menos 4 caracteres.' };
    write('role', name);
    return { ok: true as const, role: name };
  }
  async logout() { write('role', null); }

  async pushSnapshot(s: Snapshot) { write(`snap:${s.role}`, s); }
  async pullPartner(): Promise<Snapshot | null> { return null; }

  async addCoins(delta: number) { const c = Math.max(0, read('coins', 0) + delta); write('coins', c); return c; }
  async getCoins() { return read('coins', 0); }

  async loadContent() { return read('content', {}); }
  async saveContent(c: object) { write('content', c); }
  async loadTemplates() { return read<TemplateJson[]>('templates', []); }
  async saveTemplate(t: TemplateJson) { write('templates', [...read<TemplateJson[]>('templates', []).filter(x => x.id !== t.id), t]); }
  async deleteTemplate(id: string) { write('templates', read<TemplateJson[]>('templates', []).filter(x => x.id !== id)); }

  async uploadPhoto(blob: Blob, name: string): Promise<PhotoRef> {
    const url = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob); });
    const list = read<PhotoRef[]>('photos', []);
    const ref = { path: `local/${Date.now()}-${name}`, url };
    write('photos', [...list, ref]);
    return ref;
  }
  async listPhotos() { return read<PhotoRef[]>('photos', []); }
  async photoUrl(path: string) { return read<PhotoRef[]>('photos', []).find(p => p.path === path)?.url ?? ''; }

  async sendPaintOp(imageId: string, op: PaintOp) {
    const ops = read<PaintOp[]>(`ops:${imageId}`, []);
    if (!ops.some(o => o.id === op.id)) write(`ops:${imageId}`, [...ops, op]);
  }
  async loadPaintOps(imageId: string) { return read<PaintOp[]>(`ops:${imageId}`, []); }
  subscribePaint(imageId: string, cb: (op: PaintOp) => void) {
    const set = this.paintSubs.get(imageId) ?? new Set();
    set.add(cb); this.paintSubs.set(imageId, set);
    return () => { set.delete(cb); };
  }

  async sendMessage(m: Omit<Message, 'id' | 'createdAt' | 'readAt'>) {
    const list = read<Message[]>('messages', []);
    list.push({ ...m, id: crypto.randomUUID(), createdAt: Date.now(), readAt: null });
    write('messages', list);
    this.listeners.forEach(l => l());
  }
  async listMessages(): Promise<Message[]> {
    const me = read<Role | null>('role', null);
    return read<Message[]>('messages', []).filter(m => m.from === me || (m.to === me && m.deliverAt <= Date.now()));
  }
  async markRead(ids: string[]) { write('messages', read<Message[]>('messages', []).map(m => (ids.includes(m.id) ? { ...m, readAt: Date.now() } : m))); }
  subscribeMessages(cb: () => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }

  async savePushSub(_sub: PushSub) { /* sin servidor no hay push */ }

  /** Sin nube: sala entre pestañas de este navegador (para probar). */
  joinLive(onMsg: (m: unknown, from: Role) => void, onPeers: (peers: Role[]) => void) {
    const role = read<Role | null>('role', null) ?? 'nico';
    const tab = Math.random().toString(36).slice(2);
    const others = new Map<string, Role>();
    let bc: BroadcastChannel | null = null;
    try { bc = new BroadcastChannel('nuestra-sopa-live'); } catch { /* sin soporte */ }
    const post = (d: object) => bc?.postMessage({ ...d, tab, role });
    if (bc) bc.onmessage = e => {
      const d = e.data as { k: string; tab: string; role: Role; m?: unknown };
      if (d.tab === tab) return;
      if (d.k === 'hi') { others.set(d.tab, d.role); post({ k: 'here' }); onPeers([...others.values()]); }
      else if (d.k === 'here') { others.set(d.tab, d.role); onPeers([...others.values()]); }
      else if (d.k === 'bye') { others.delete(d.tab); onPeers([...others.values()]); }
      else if (d.k === 'm') onMsg(d.m, d.role);
    };
    post({ k: 'hi' });
    setTimeout(() => onPeers([...others.values()]), 0);
    return { send: (m: unknown) => post({ k: 'm', m }), leave: () => { post({ k: 'bye' }); bc?.close(); } };
  }
}
