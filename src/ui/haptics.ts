import { getState } from '../core/state';

let sw: HTMLLabelElement | null = null;

/**
 * Vibracion "mejor esfuerzo": navigator.vibrate no existe en Safari iOS, asi que alli se usa el truco
 * del interruptor nativo (<input switch>), que da un toque haptico en iOS 17.4+. Puede no funcionar.
 */
export function buzz(pattern: number | number[] = 12): void {
  if (!getState().settings.vibrate) return;
  try {
    if ('vibrate' in navigator) { navigator.vibrate(pattern); return; }
    if (!sw) {
      sw = document.createElement('label');
      sw.setAttribute('aria-hidden', 'true');
      sw.style.cssText = 'position:fixed;left:-99px;top:-99px;opacity:0;pointer-events:none';
      const i = document.createElement('input');
      i.type = 'checkbox';
      i.setAttribute('switch', '');
      sw.append(i);
      document.body.append(sw);
    }
    sw.click();
  } catch { /* sin haptica */ }
}
