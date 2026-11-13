import { getContent } from '../data/content';
import { checkAchievements } from './achievements';
import { getState, update } from './state';
import { confetti } from '../ui/confetti';
import { sfx } from '../ui/audio';
import { toast } from '../ui/dom';

/** Huevo de pascua: se concede una sola vez, con premio y mensaje. */
export function triggerEgg(id: string): boolean {
  if (getState().eggs.includes(id)) return false;
  const egg = getContent().eggs.find(e => e.id === id);
  if (!egg) return false;
  update(s => { s.eggs.push(id); s.coins += egg.coins; });
  sfx('unlock');
  confetti(innerWidth / 2, innerHeight / 2, 50);
  toast(`🥚 ${egg.message} (+${egg.coins})`, 3500);
  checkAchievements().forEach(a => toast(`Logro: ${a.name}`, 3000));
  return true;
}

/** Cuenta toques y dispara el huevo al llegar a n. */
export function tapCounter(id: string, n: number, windowMs = 4000): () => void {
  let count = 0, t = 0;
  return () => {
    const now = performance.now();
    count = now - t > windowMs ? 1 : count + 1;
    t = now;
    if (count >= n) { count = 0; triggerEgg(id); }
  };
}
