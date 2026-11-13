import { getState, pinHash } from '../core/state';
import { sfx } from './audio';
import { button, el } from './dom';
import { buzz } from './haptics';

let locked = false;

/** Pantalla de PIN de 4 digitos. Es un candado de comodidad en este movil (no sustituye a la seguridad del servidor). */
export function lockIfNeeded(): Promise<void> {
  const h = getState().settings.pinHash;
  if (h === null || locked) return Promise.resolve();
  locked = true;
  return new Promise(resolve => {
    const back = el('div', 'pin-lock');
    back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', 'PIN');
    const title = el('h2', '', 'SopaVentura');
    const dots = el('div', 'pin-dots');
    const err = el('p', 'error'); err.setAttribute('role', 'alert');
    const pad = el('div', 'pin-pad');
    let entered = '';
    const drawDots = () => { dots.replaceChildren(...Array.from({ length: 4 }, (_, i) => el('i', i < entered.length ? 'on' : ''))); };
    const press = (d: string) => {
      if (entered.length >= 4) return;
      entered += d; sfx('tap'); buzz(6); drawDots();
      if (entered.length === 4) {
        if (pinHash(entered) === h) { back.classList.add('out'); setTimeout(() => back.remove(), 200); locked = false; resolve(); }
        else { err.textContent = 'PIN incorrecto'; sfx('wrong'); buzz([30, 40, 30]); entered = ''; setTimeout(drawDots, 250); }
      }
    };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].forEach(k => {
      if (!k) { pad.append(el('span')); return; }
      pad.append(button(k, 'btn pin-key', () => { if (k === '⌫') { entered = entered.slice(0, -1); drawDots(); } else press(k); }));
    });
    drawDots();
    back.append(title, el('p', '', 'Introduce tu PIN'), dots, err, pad);
    document.body.append(back);
  });
}

/** Vuelve a pedir el PIN si la app estuvo en segundo plano mas de 2 minutos. */
export function relockOnReturn(): void {
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 120_000) void lockIfNeeded();
  });
}
