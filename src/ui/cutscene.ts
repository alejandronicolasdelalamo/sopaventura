import { biomeOf, type Island } from '../data/islands';
import { backdropAsync } from '../paint/sceneClient';
import { olafTemplate } from '../paint/olafLook';
import { thumb } from '../paint/store';
import { stickerArt, stickerName } from '../core/stickers';
import { totalStars } from '../core/progress';
import { sfx } from './audio';
import { confetti } from './confetti';
import { button, el, reducedMotion } from './dom';

const OUTRO: Partial<Record<ReturnType<typeof biomeOf>, string>> = {
  flores: 'Las flores se han quedado bailando cuando os habéis ido.',
  otono: 'Las hojas crujen bajo vuestros pasos. ¡Qué paseo más bonito!',
  bosque: 'El bosque guarda vuestro secreto entre los árboles.',
  setas: 'Las setas brillan un poquito más desde que pasasteis.',
  jardin: 'Los pájaros del jardín ya se saben vuestros nombres.',
  noche: 'Las estrellas han hecho una constelación con vuestra forma.',
  cristal: 'Los cristales reflejan mil versiones de vosotros sonriendo.',
  parque: 'Un banco del parque acaba de reservarse para vosotros.',
  ciudad: 'Las luces de la ciudad se encienden para celebrarlo.',
  playa: 'Las olas han escrito vuestros nombres en la arena.',
  nieve: 'Olaf ha hecho un muñeco de nieve con bufanda morada.',
  oceano: 'Los peces aplauden con las aletas (lo intentan).',
  espacio: 'Houston: misión cumplida. Volvemos a casa.',
  dulce: 'Todo sabe a chuche. Hasta la victoria.',
};

/** Escena al terminar una isla: el escenario de fondo, Olaf que llega andando y unos dialogos. */
export function islandCutscene(isl: Island, stickers: string[], coins: number): Promise<void> {
  return new Promise(res => {
    const ov = el('div', 'cut');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', `${isl.name} completada`);
    void backdropAsync(isl, innerWidth, innerHeight).then(u => { ov.style.backgroundImage = `url(${u})`; });
    const olafT = olafTemplate(totalStars());
    const olaf = el('img', 'cut-olaf');
    if (olafT) olaf.src = thumb(olafT, 'color', 96);
    olaf.alt = '';
    const title = el('div', 'cut-title', `${isl.name}`);
    const sub = el('div', 'cut-sub', '¡Completada!');
    const box = el('div', 'cut-box');
    const who = el('strong', 'cut-who', 'Olaf');
    const txt = el('p', 'cut-txt');
    const stick = el('div', 'cut-stickers');
    const next = button('Siguiente', 'btn big', () => step());
    box.append(who, txt, stick, next);
    ov.append(title, sub, olaf, box);
    document.body.append(ov);
    const lines = [
      `¡Lo habéis conseguido! ${isl.name} ya es vuestra.`,
      OUTRO[biomeOf(isl)] ?? 'Esta isla ya tiene vuestro nombre.',
      `Os traigo un regalo: +${coins} monedas${stickers.length ? ` y ${stickers.length === 1 ? 'una pegatina nueva' : `${stickers.length} pegatinas nuevas`}` : ''}.`,
    ];
    let i = -1, typing = 0;
    const type = (s: string) => {
      clearInterval(typing);
      if (reducedMotion()) { txt.textContent = s; return; }
      txt.textContent = '';
      let k = 0;
      typing = window.setInterval(() => { txt.textContent = s.slice(0, ++k); if (k % 3 === 0) sfx('tap'); if (k >= s.length) clearInterval(typing); }, 28);
    };
    const step = () => {
      i++;
      if (i >= lines.length) { clearInterval(typing); ov.classList.add('out'); setTimeout(() => { ov.remove(); res(); }, reducedMotion() ? 0 : 350); return; }
      type(lines[i]);
      if (i === lines.length - 1) {
        next.textContent = 'Continuar';
        sfx('unlock'); confetti(innerWidth / 2, innerHeight / 3, 80);
        stickers.forEach((id, k) => {
          const t = stickerArt(id); if (!t) return;
          const f = el('figure', 'cut-st');
          f.style.animationDelay = `${k * 120}ms`;
          const img = el('img'); img.src = thumb(t, 'color', 64); img.alt = '';
          f.append(img, el('figcaption', '', stickerName(id)));
          stick.append(f);
        });
      }
    };
    sfx('win');
    setTimeout(step, reducedMotion() ? 0 : 700);
    setTimeout(() => next.focus(), 50);
  });
}
