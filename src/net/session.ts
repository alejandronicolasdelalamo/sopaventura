import { getState, update, type Role } from '../core/state';
import { backend } from './index';
import { startSync } from './sync';

/** Recupera la sesion guardada (si la hay) y arranca la sincronizacion. */
export async function restoreSession(): Promise<Role | null> {
  const role = await backend.restore().catch(() => null);
  if (role) { update(s => { s.role = role; }); void startSync(); return role; }
  // sin red pero con rol guardado: seguimos jugando en local y se sincroniza al volver
  const saved = getState().role;
  if (saved && !navigator.onLine) { void startSync(); return saved; }
  return null;
}

export async function login(name: Role, code: string): Promise<{ ok: boolean; error?: string }> {
  const r = await backend.login(name, code);
  if (!r.ok) return r;
  update(s => { s.role = r.role; });
  void startSync();
  return { ok: true };
}

export async function logout(): Promise<void> {
  await backend.logout();
  update(s => { s.role = null; });
}
