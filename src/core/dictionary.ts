import { COMMON_WORDS } from '../data/common';
import { COMMON_WORDS2 } from '../data/common2';
import { FALLBACK_WORDS, WORDS, type WordEntry } from '../data/words';
import { norm } from './text';

let known: Set<string> | null = null;
const wordOf = (e: WordEntry) => (typeof e === 'string' ? e : e[0]);

/** Todas las palabras que el juego "conoce" (temas + comunes), normalizadas. Valen para las palabras extra. */
export function knownWords(): Set<string> {
  if (known) return known;
  known = new Set<string>();
  for (const l of Object.values(WORDS)) for (const e of l) { const n = norm(wordOf(e)); if (n.length >= 4) known.add(n); }
  for (const e of FALLBACK_WORDS) { const n = norm(e); if (n.length >= 4) known.add(n); }
  for (const w of COMMON_WORDS) known.add(norm(w));
  for (const w of COMMON_WORDS2) known.add(norm(w));
  return known;
}

/** Es una palabra extra valida? (4+ letras, leida de ida o de vuelta). Devuelve la palabra bien escrita. */
export function extraWord(letters: string): string | null {
  const k = knownWords(), a = norm(letters), r = [...a].reverse().join('');
  if (a.length < 4) return null;
  return k.has(a) ? a : k.has(r) ? r : null;
}
