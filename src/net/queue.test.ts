import { describe, expect, it } from 'vitest';
import { OfflineQueue, type QItem } from './queue';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('cola de cambios pendientes (offline)', () => {
  it('envia en orden al recuperar la conexion', async () => {
    const sent: string[] = [];
    let online = false;
    const q = new OfflineQueue('q', async (it: QItem) => { if (!online) throw new Error('offline'); sent.push((it.payload as { n: string }).n); }, { storage: mem() });
    q.enqueue('paint', { n: 'a' }); q.enqueue('paint', { n: 'b' }); q.enqueue('paint', { n: 'c' });
    expect(await q.flush()).toBe(0);
    expect(q.size).toBe(3);
    online = true; q.retryNow();
    expect(await q.flush()).toBe(3);
    expect(sent).toEqual(['a', 'b', 'c']);
    expect(q.size).toBe(0);
  });

  it('un fallo temporal detiene la cola y reintenta con espera creciente', async () => {
    let t = 0, fails = 2;
    const sent: number[] = [];
    const q = new OfflineQueue('q', async () => { if (fails-- > 0) throw new Error('red'); sent.push(1); }, { storage: mem(), now: () => t });
    q.enqueue('x', {});
    await q.flush();
    expect(q.pending[0].tries).toBe(1);
    expect(await q.flush()).toBe(0);              // aun en espera
    t += 3000; await q.flush(); t += 10_000;
    expect(await q.flush()).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it('descarta los errores permanentes sin bloquear lo siguiente', async () => {
    const sent: string[] = [];
    const q = new OfflineQueue('q', async (it: QItem) => {
      if ((it.payload as { bad?: boolean }).bad) throw Object.assign(new Error('403'), { permanent: true });
      sent.push(it.kind);
    }, { storage: mem() });
    q.enqueue('malo', { bad: true }); q.enqueue('bueno', {});
    await q.flush();
    expect(sent).toEqual(['bueno']);
    expect(q.size).toBe(0);
  });

  it('sobrevive a cerrar la app (persistencia) y unifica monedas', async () => {
    const storage = mem();
    const coalesce = (k: string, a: unknown, b: unknown) => (k === 'coins' ? { amount: (a as { amount: number }).amount + (b as { amount: number }).amount } : undefined);
    const q1 = new OfflineQueue('q', async () => { throw new Error('offline'); }, { storage, coalesce });
    q1.enqueue('coins', { amount: 10 }); q1.enqueue('coins', { amount: -4 }); q1.enqueue('msg', { t: 'hola' });
    expect(q1.size).toBe(2);
    const got: unknown[] = [];
    const q2 = new OfflineQueue('q', async it => { got.push(it.payload); }, { storage, coalesce });
    await q2.flush();
    expect(got).toEqual([{ amount: 6 }, { t: 'hola' }]);
  });

  it('replaceKey deja solo la ultima instantanea', () => {
    const q = new OfflineQueue('q', async () => {}, { storage: mem() });
    q.enqueue('snapshot', { v: 1 }, 'me'); q.enqueue('snapshot', { v: 2 }, 'me');
    expect(q.size).toBe(1);
    expect((q.pending[0].payload as { v: number }).v).toBe(2);
  });
});
