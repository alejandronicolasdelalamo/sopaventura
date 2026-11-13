import { getContent } from '../data/content';
import { backend } from '../net';
import { sfx } from '../ui/audio';
import { confetti, confettiRain } from '../ui/confetti';
import { button, el, reducedMotion } from '../ui/dom';
import { buzz } from '../ui/haptics';
import { back } from '../ui/router';

/** Final del juego: sobre -> carta larga -> foto -> vale gordo -> sorpresa. El contenido lo escribe Nico en su panel. */
export function renderFinal(root: HTMLElement, params: { preview?: boolean } = {}): () => void {
  const f = getContent().finale;
  const screen = el('div', 'screen final');
  const stage = el('div', 'final-stage');
  screen.append(stage);
  root.append(screen);
  let step = 0, timer = 0, alive = true;

  const steps: (() => void)[] = [
    () => { // sobre
      stage.replaceChildren();
      const env = el('button', 'envelope big-env');
      env.setAttribute('aria-label', 'Abrir el sobre');
      env.append(el('div', 'env-flap'), el('div', 'env-body'), el('span', 'env-hint', 'Toca para abrir'));
      env.addEventListener('click', () => { env.classList.add('open'); sfx('letter'); buzz([20, 40, 20]); confetti(innerWidth / 2, innerHeight / 2, 40, ['#ff7eb6', '#fff8e8', '#ffd86b']); setTimeout(next, reducedMotion() ? 100 : 900); });
      stage.append(env);
    },
    () => { // carta (maquina de escribir)
      stage.replaceChildren();
      const paper = el('div', 'paper long');
      const text = el('p', 'paper-text');
      paper.append(text);
      stage.append(paper, button('Seguir', 'btn', next));
      const full = f.letter;
      if (reducedMotion()) { text.textContent = full; return; }
      let i = 0;
      const tick = () => { if (!alive) return; text.textContent = full.slice(0, (i += 2)); paper.scrollTop = paper.scrollHeight; if (i < full.length) timer = window.setTimeout(tick, 28); };
      tick();
      paper.addEventListener('click', () => { clearTimeout(timer); text.textContent = full; });
    },
    () => { // foto
      stage.replaceChildren();
      const frame = el('div', 'photo-frame');
      if (f.photoUrl) {
        const img = el('img'); img.alt = 'Foto especial';
        void backend.photoUrl(f.photoUrl).then(u => { img.src = u; }).catch(() => { frame.append(el('p', 'note', 'No se pudo cargar la foto.')); });
        frame.append(img);
      } else frame.append(el('p', 'note', '[La foto especial se elige en el panel de Nico]'));
      stage.append(frame, button('Seguir', 'btn', next));
    },
    () => { // vale gordo
      stage.replaceChildren();
      const card = el('div', 'big-voucher');
      card.append(el('h2', '', 'Vale gordo'), el('p', '', f.bigVoucher));
      stage.append(card, button('Seguir', 'btn', next));
      sfx('unlock'); confetti(innerWidth / 2, innerHeight / 3, 60);
    },
    () => { // sorpresa
      stage.replaceChildren();
      const card = el('div', 'big-voucher surprise');
      card.append(el('h2', '', '¡Sorpresa!'), el('p', '', f.surprise));
      stage.append(card, button('Volver al inicio', 'btn big', () => back()));
      sfx('win'); buzz([40, 60, 40, 60, 100]); confettiRain(4000);
    },
  ];
  function next(): void { if (step < steps.length) steps[step++](); }
  next();
  void params;
  return () => { alive = false; clearTimeout(timer); };
}
