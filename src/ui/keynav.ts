/**
 * Navegacion con teclado en los menus (PC): las flechas mueven el foco al boton mas cercano en esa direccion,
 * Enter/Espacio lo pulsan (comportamiento normal del navegador). No actua en la partida, al pintar ni en campos de texto.
 */
const SEL = 'button:not(:disabled), a[href], [role=button], summary, .slide, input[type=checkbox], input[type=range]';
const visible = (e: HTMLElement) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };

export function initKeyNav(): void {
  document.addEventListener('keydown', e => {
    const k = e.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k) || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement;
    if (t.closest('input:not([type=checkbox]), textarea, select')) return;
    if (t.matches('input[type=range]') && (k === 'ArrowLeft' || k === 'ArrowRight')) return;
    const modal = document.querySelector('.modal-back:not(.out) .modal');
    if (!modal && document.querySelector('.screen.game, .screen.paint-screen, .screen.map .map-scroll')) return;
    const root: ParentNode = modal ?? document;
    const items = [...root.querySelectorAll<HTMLElement>(SEL)].filter(visible);
    if (!items.length) return;
    const cur = document.activeElement as HTMLElement | null;
    if (!cur || cur === document.body || !items.includes(cur)) { e.preventDefault(); items[0].focus(); return; }
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best: HTMLElement | null = null, bs = Infinity;
    for (const it of items) {
      if (it === cur) continue;
      const r = it.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
      const along = k === 'ArrowRight' ? dx : k === 'ArrowLeft' ? -dx : k === 'ArrowDown' ? dy : -dy;
      if (along < 4) continue;
      const across = k === 'ArrowLeft' || k === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx);
      const score = along + across * 2.2;
      if (score < bs) { bs = score; best = it; }
    }
    if (best) { e.preventDefault(); best.focus({ preventScroll: false }); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  });
}
