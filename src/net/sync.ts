import { getState, subscribe, update, type Role } from '../core/state';
import { totalStars } from '../core/progress';
import { setContent } from '../data/content';
import { loadCachedTemplates, setCustomTemplates } from '../paint/catalog';
import type { PaintOp, TemplateJson } from '../paint/model';
import { backend, isCloud } from './index';
import { OfflineQueue, type QItem } from './queue';
import type { Message, PushSub, Snapshot } from './types';

const CONTENT_CACHE = 'nuestra-sopa:cache:content';
type Payload = Record<string, unknown>;

// ------------------------------------------------------------ cola de cambios pendientes
export const queue = new OfflineQueue('nuestra-sopa:queue:v1', async (it: QItem) => {
  const p = it.payload as Payload;
  switch (it.kind) {
    case 'coins': applyWallet(await backend.addCoins(p.amount as number)); break;
    case 'snapshot': await backend.pushSnapshot(p.snap as Snapshot); break;
    case 'paint': await backend.sendPaintOp(p.image as string, p.op as PaintOp); break;
    case 'message': await backend.sendMessage(p.m as Parameters<typeof backend.sendMessage>[0]); break;
    case 'read': await backend.markRead(p.ids as string[]); break;
    case 'content': await backend.saveContent(p.content as object); break;
    case 'template': await backend.saveTemplate(p.t as TemplateJson); break;
    case 'template-del': await backend.deleteTemplate(p.id as string); break;
    case 'push': await backend.savePushSub(p.sub as PushSub); break;
  }
}, {
  coalesce: (kind, existing, incoming) => {
    if (kind === 'coins') return { amount: (existing as { amount: number }).amount + (incoming as { amount: number }).amount };
    if (kind === 'snapshot') return incoming;
    return undefined;
  },
});

// ------------------------------------------------------------ monedas compartidas
let baseline = getState().coins;
let applying = false;

function pendingCoins(): number {
  return queue.pending.filter(i => i.kind === 'coins').reduce((a, i) => a + ((i.payload as { amount: number }).amount ?? 0), 0);
}

function applyWallet(total: number): void {
  applying = true;
  update(s => { s.coins = Math.max(0, total + pendingCoins()); });
  baseline = getState().coins;
  applying = false;
}

// ------------------------------------------------------------ instantanea para "Nosotros"
export function makeSnapshot(role: Role): Snapshot {
  const s = getState();
  return {
    role, totalStars: totalStars(s), levelsDone: s.stats.levelsDone, wordsFound: s.stats.wordsFound, achievements: s.achievements,
    streak: s.streak.count, paintDone: s.paintDone, vouchers: s.vouchers, avatar: s.avatar ?? undefined, updated: Date.now(),
    weekId: s.week?.id, weekWords: s.week?.words ?? 0,
  };
}

let partner: Snapshot | null = null;
export const getPartner = (): Snapshot | null => partner;

let snapTimer = 0;
function scheduleSnapshot(): void {
  clearTimeout(snapTimer);
  snapTimer = window.setTimeout(() => {
    const role = getState().role;
    if (role) { queue.enqueue('snapshot', { snap: makeSnapshot(role) }); void flush(); }
  }, 2500);
}

// ------------------------------------------------------------ mensajes
let messages: Message[] = [];
const msgListeners = new Set<() => void>();
export const getMessages = (): Message[] => messages;
export const onMessages = (cb: () => void) => { msgListeners.add(cb); return () => { msgListeners.delete(cb); }; };
export const unreadCount = (): number => { const me = getState().role; return messages.filter(m => m.to === me && !m.readAt && m.deliverAt <= Date.now()).length; };

export async function refreshMessages(): Promise<void> {
  try { messages = await backend.listMessages(); msgListeners.forEach(cb => cb()); } catch { /* sin conexion: dejamos lo que haya */ }
}

export function sendMessage(kind: Message['kind'], body: string, deliverAt = Date.now()): void {
  const me = getState().role;
  if (!me) return;
  const m = { from: me, to: (me === 'nico' ? 'izana' : 'nico') as Role, kind, body, deliverAt };
  queue.enqueue('message', { m });
  update(s => { s.stats.messagesSent += 1; });
  // Local: se muestra al instante en el buzon de quien envia
  messages = [{ ...m, id: `tmp-${Date.now()}`, createdAt: Date.now(), readAt: null }, ...messages];
  msgListeners.forEach(cb => cb());
  void flush().then(refreshMessages);
}

export function markRead(ids: string[]): void {
  if (!ids.length) return;
  const now = Date.now();
  messages = messages.map(m => (ids.includes(m.id) ? { ...m, readAt: now } : m));
  msgListeners.forEach(cb => cb());
  queue.enqueue('read', { ids });
  void flush();
}

// ------------------------------------------------------------ pintura compartida
export function sendPaintOp(image: string, op: PaintOp): void { queue.enqueue('paint', { image, op }); void flush(); }

// ------------------------------------------------------------ contenido (panel de Nico)
export async function saveContent(content: object): Promise<void> {
  setContent(content);
  try { localStorage.setItem(CONTENT_CACHE, JSON.stringify(content)); } catch { /* ignorar */ }
  queue.enqueue('content', { content }, 'main');
  await flush();
}
export function saveTemplateRemote(t: TemplateJson): void { queue.enqueue('template', { t }, t.id); void flush(); }
export function deleteTemplateRemote(id: string): void { queue.enqueue('template-del', { id }); void flush(); }
export function queuePushSub(sub: PushSub): void { queue.enqueue('push', { sub }, sub.endpoint); void flush(); }

function loadCachedContent(): void {
  try {
    const raw = localStorage.getItem(CONTENT_CACHE);
    if (raw) { const c = JSON.parse(raw); setContent(c); if (c.romaUnlocked) update(s => { s.romaUnlocked = true; }); }
  } catch { /* ignorar */ }
}

export async function refreshContent(): Promise<void> {
  try {
    const c = await backend.loadContent();
    setContent(c);
    try { localStorage.setItem(CONTENT_CACHE, JSON.stringify(c)); } catch { /* ignorar */ }
    if (typeof c.romaUnlocked === 'boolean') update(s => { s.romaUnlocked = !!c.romaUnlocked; });
    setCustomTemplates(await backend.loadTemplates());
  } catch { /* sin conexion: usamos la cache */ }
}

// ------------------------------------------------------------ bucle principal
export async function flush(): Promise<void> {
  if (!getState().role) return;
  try { await queue.flush(); } catch { /* la cola gestiona sus reintentos */ }
}

async function pull(): Promise<void> {
  try {
    if (isCloud) applyWallet(await backend.getCoins());
    partner = await backend.pullPartner();
  } catch { /* offline */ }
  await refreshMessages();
}

let started = false;
export async function startSync(): Promise<void> {
  loadCachedContent(); loadCachedTemplates();
  if (started || !getState().role) return;
  started = true;
  baseline = getState().coins;

  subscribe(s => {
    if (applying) return;
    scheduleSnapshot();
    if (isCloud && s.coins !== baseline) {
      const delta = s.coins - baseline;
      baseline = s.coins;
      queue.enqueue('coins', { amount: delta });
      void flush();
    }
  });

  window.addEventListener('online', () => { queue.retryNow(); void flush(); void pull(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { queue.retryNow(); void flush(); void pull(); } });
  setInterval(() => { void flush(); if (!document.hidden) void pull(); }, 30_000);
  backend.subscribeMessages(() => { void refreshMessages(); });

  await flush();
  await Promise.all([refreshContent(), pull()]);
  scheduleSnapshot();
}
