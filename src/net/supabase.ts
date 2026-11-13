import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Content } from '../data/content';
import type { Role } from '../core/state';
import type { PaintOp, TemplateJson } from '../paint/model';
import { PermanentError, type Backend, type Message, type PhotoRef, type PushSub, type Snapshot } from './types';

type Err = { message: string; code?: string; status?: number } | null;

/** Errores de red = temporales (se reintentan). Errores 4xx del servidor = permanentes (se descartan). */
function check(error: Err): void {
  if (!error) return;
  const st = error.status ?? 0;
  if ((st >= 400 && st < 500 && ![401, 408, 429].includes(st)) || /^(23|42|P0001|PGRST1)/.test(error.code ?? '')) throw new PermanentError(error.message);
  throw new Error(error.message);
}

export class SupabaseBackend implements Backend {
  readonly mode = 'supabase' as const;
  private sb: SupabaseClient;
  private couple: string | null = null;
  private role: Role | null = null;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  }

  private async identify(): Promise<Role | null> {
    const { data, error } = await this.sb.rpc('whoami');
    if (error || !data) return null;
    const d = data as { couple_id: string; role: Role };
    this.couple = d.couple_id; this.role = d.role;
    return d.role;
  }

  async restore(): Promise<Role | null> {
    try {
      const { data } = await this.sb.auth.getSession();
      if (!data.session) return null;
      return await this.identify();
    } catch { return null; }
  }

  async login(name: Role, code: string) {
    try {
      const { data } = await this.sb.auth.getSession();
      if (!data.session) {
        const { error } = await this.sb.auth.signInAnonymously();
        if (error) return { ok: false as const, error: 'No se pudo iniciar sesión. ¿Está activado el acceso anónimo en Supabase?' };
      }
      const { error } = await this.sb.rpc('join_couple', { p_name: name, p_code: code });
      if (error) return { ok: false as const, error: error.message.replace(/^.*?:\s*/, '') || 'Código incorrecto' };
      await this.identify();
      return { ok: true as const, role: name };
    } catch { return { ok: false as const, error: 'Sin conexión. Inténtalo cuando tengas internet.' }; }
  }

  async logout() { this.couple = null; this.role = null; await this.sb.auth.signOut(); }

  private need(): { couple: string; role: Role } {
    if (!this.couple || !this.role) throw new Error('Sin sesión');
    return { couple: this.couple, role: this.role };
  }
  private other(): Role { return this.need().role === 'nico' ? 'izana' : 'nico'; }

  async pushSnapshot(s: Snapshot) {
    const { couple, role } = this.need();
    const { error } = await this.sb.from('snapshots').upsert({ couple_id: couple, role, data: s, updated_at: new Date().toISOString() });
    check(error);
  }
  async pullPartner(): Promise<Snapshot | null> {
    const { couple } = this.need();
    const { data, error } = await this.sb.from('snapshots').select('data').eq('couple_id', couple).eq('role', this.other()).maybeSingle();
    check(error);
    return (data?.data as Snapshot) ?? null;
  }

  async addCoins(delta: number) {
    const { data, error } = await this.sb.rpc('add_coins', { delta });
    check(error);
    return data as number;
  }
  async getCoins() {
    const { couple } = this.need();
    const { data, error } = await this.sb.from('wallet').select('coins').eq('couple_id', couple).maybeSingle();
    check(error);
    return (data?.coins as number) ?? 0;
  }

  async loadContent() {
    const { couple } = this.need();
    const { data, error } = await this.sb.from('content').select('value').eq('couple_id', couple).eq('key', 'main').maybeSingle();
    check(error);
    return (data?.value as Partial<Content>) ?? {};
  }
  async saveContent(c: object) {
    const { couple } = this.need();
    const { error } = await this.sb.from('content').upsert({ couple_id: couple, key: 'main', value: c, updated_at: new Date().toISOString() });
    check(error);
  }
  async loadTemplates() {
    const { couple } = this.need();
    const { data, error } = await this.sb.from('templates').select('data').eq('couple_id', couple);
    check(error);
    return (data ?? []).map(r => r.data as TemplateJson);
  }
  async saveTemplate(t: TemplateJson) {
    const { couple } = this.need();
    const { error } = await this.sb.from('templates').upsert({ couple_id: couple, id: t.id, data: t, updated_at: new Date().toISOString() });
    check(error);
  }
  async deleteTemplate(id: string) {
    const { couple } = this.need();
    const { error } = await this.sb.from('templates').delete().eq('couple_id', couple).eq('id', id);
    check(error);
  }

  private async sign(path: string): Promise<string> {
    const { data, error } = await this.sb.storage.from('photos').createSignedUrl(path, 3600);
    check(error);
    return data!.signedUrl;
  }
  async uploadPhoto(blob: Blob, name: string): Promise<PhotoRef> {
    const { couple } = this.need();
    const path = `${couple}/${Date.now()}-${name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await this.sb.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
    check(error);
    return { path, url: await this.sign(path) };
  }
  async photoUrl(path: string) { return this.sign(path); }
  async listPhotos(): Promise<PhotoRef[]> {
    const { couple } = this.need();
    const { data, error } = await this.sb.storage.from('photos').list(couple, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    check(error);
    return Promise.all((data ?? []).map(async f => ({ path: `${couple}/${f.name}`, url: await this.sign(`${couple}/${f.name}`) })));
  }

  async sendPaintOp(imageId: string, op: PaintOp) {
    const { couple } = this.need();
    const { error } = await this.sb.from('paint_ops').upsert(
      { id: op.id, couple_id: couple, image_id: imageId, by_role: op.by, t: op.t, cells: op.c, ts: op.ts },
      { onConflict: 'id', ignoreDuplicates: true });
    check(error);
  }
  async loadPaintOps(imageId: string): Promise<PaintOp[]> {
    const { couple } = this.need();
    const out: PaintOp[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.sb.from('paint_ops').select('id,by_role,t,cells,ts').eq('couple_id', couple).eq('image_id', imageId).order('seq').range(from, from + 999);
      check(error);
      (data ?? []).forEach(r => out.push({ id: r.id, by: r.by_role, t: r.t, c: r.cells, ts: r.ts }));
      if (!data || data.length < 1000) break;
    }
    return out;
  }
  subscribePaint(imageId: string, cb: (op: PaintOp) => void) {
    const ch = this.sb.channel(`paint-${imageId}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'paint_ops', filter: `image_id=eq.${imageId}` }, payload => {
        const r = payload.new as { id: string; by_role: 1 | 2; t: 'p' | 'u'; cells: number[]; ts: number };
        cb({ id: r.id, by: r.by_role, t: r.t, c: r.cells, ts: r.ts });
      })
      .subscribe();
    return () => { void this.sb.removeChannel(ch); };
  }

  async sendMessage(m: Omit<Message, 'id' | 'createdAt' | 'readAt'>) {
    const { couple } = this.need();
    const { error } = await this.sb.from('messages').insert({
      couple_id: couple, from_role: m.from, to_role: m.to, kind: m.kind, body: m.body, deliver_at: new Date(m.deliverAt).toISOString(),
    });
    check(error);
  }
  async listMessages(): Promise<Message[]> {
    const { couple } = this.need();
    const { data, error } = await this.sb.from('messages').select('*').eq('couple_id', couple).order('deliver_at', { ascending: false }).limit(300);
    check(error);
    return (data ?? []).map(r => ({
      id: r.id, from: r.from_role, to: r.to_role, kind: r.kind, body: r.body,
      deliverAt: Date.parse(r.deliver_at), createdAt: Date.parse(r.created_at), readAt: r.read_at ? Date.parse(r.read_at) : null,
    }));
  }
  async markRead(ids: string[]) {
    if (!ids.length) return;
    const { error } = await this.sb.rpc('mark_read', { p_ids: ids });
    check(error);
  }
  subscribeMessages(cb: () => void) {
    const ch = this.sb.channel(`msg-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => cb())
      .subscribe();
    return () => { void this.sb.removeChannel(ch); };
  }

  joinLive(onMsg: (m: unknown, from: Role) => void, onPeers: (peers: Role[]) => void) {
    const { couple, role } = this.need();
    const ch = this.sb.channel(`live-${couple}`, { config: { broadcast: { self: false }, presence: { key: role } } });
    ch.on('broadcast', { event: 'm' }, ({ payload }) => { const p = payload as { m: unknown; from: Role }; onMsg(p.m, p.from); })
      .on('presence', { event: 'sync' }, () => onPeers(Object.keys(ch.presenceState()).filter(k => k !== role) as Role[]))
      .subscribe(st => { if (st === 'SUBSCRIBED') void ch.track({ at: Date.now() }); });
    return {
      send: (m: unknown) => { void ch.send({ type: 'broadcast', event: 'm', payload: { m, from: role } }); },
      leave: () => { void ch.untrack(); void this.sb.removeChannel(ch); },
    };
  }

  async savePushSub(sub: PushSub) {
    const { couple, role } = this.need();
    const { error } = await this.sb.from('push_subs').upsert({ endpoint: sub.endpoint, couple_id: couple, role, p256dh: sub.p256dh, auth: sub.auth });
    check(error);
  }
}
