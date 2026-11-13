import { LocalBackend } from './local';
import { SupabaseBackend } from './supabase';
import type { Backend } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Con las variables de Supabase configuradas usa la nube; si no, modo local (solo este movil). */
export const backend: Backend = url && key ? new SupabaseBackend(url, key) : new LocalBackend();
export const isCloud = backend.mode === 'supabase';
