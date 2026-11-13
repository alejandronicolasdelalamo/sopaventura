/**
 * Cola de cambios pendientes: se guarda en el movil y se envia al recuperar la conexion.
 * Mantiene el orden, reintenta con espera creciente y descarta lo que falla "para siempre".
 */
export interface QItem { id: string; kind: string; payload: unknown; tries: number; next: number }

export interface QueueOpts {
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  now?: () => number;
  /** Unifica un elemento nuevo con uno pendiente del mismo tipo (p. ej. monedas, instantaneas). */
  coalesce?: (kind: string, existing: unknown, incoming: unknown) => unknown | undefined;
}

export class OfflineQueue {
  private items: QItem[] = [];
  private flushing = false;
  private readonly now: () => number;
  private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>;

  constructor(private key: string, private handler: (item: QItem) => Promise<void>, private opts: QueueOpts = {}) {
    this.now = opts.now ?? Date.now;
    this.storage = opts.storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    try { this.items = JSON.parse(this.storage?.getItem(key) ?? '[]') as QItem[]; } catch { this.items = []; }
  }

  get size(): number { return this.items.length; }
  get pending(): readonly QItem[] { return this.items; }

  private save(): void { try { this.storage?.setItem(this.key, JSON.stringify(this.items)); } catch { /* sin espacio: seguimos en memoria */ } }

  enqueue(kind: string, payload: unknown, replaceKey?: string): void {
    if (this.opts.coalesce) {
      const last = [...this.items].reverse().find(i => i.kind === kind);
      if (last && !this.flushing) {
        const merged = this.opts.coalesce(kind, last.payload, payload);
        if (merged !== undefined) { last.payload = merged; this.save(); return; }
      }
    }
    if (replaceKey) this.items = this.items.filter(i => !(i.kind === kind && (i.payload as { _k?: string })?._k === replaceKey));
    const body = replaceKey ? { ...(payload as object), _k: replaceKey } : payload;
    this.items.push({ id: `${this.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, kind, payload: body, tries: 0, next: 0 });
    this.save();
  }

  /** Procesa la cola en orden. Se detiene en el primer fallo temporal. Devuelve cuantos elementos envio. */
  async flush(): Promise<number> {
    if (this.flushing) return 0;
    this.flushing = true;
    let sent = 0;
    try {
      while (this.items.length) {
        const it = this.items[0];
        if (it.next > this.now()) break;
        try {
          await this.handler(it);
          this.items.shift(); sent++; this.save();
        } catch (e) {
          if ((e as { permanent?: boolean })?.permanent) { this.items.shift(); this.save(); continue; }
          it.tries++; it.next = this.now() + Math.min(60_000, 1000 * 2 ** Math.min(it.tries, 6));
          this.save();
          break;
        }
      }
    } finally { this.flushing = false; }
    return sent;
  }

  /** Fuerza reintento inmediato (p. ej. al volver la conexion). */
  retryNow(): void { this.items.forEach(i => { i.next = 0; }); this.save(); }
}
