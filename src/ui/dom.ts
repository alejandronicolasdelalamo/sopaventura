export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function button(label: string, cls = 'btn', onClick?: (e: MouseEvent) => void): HTMLButtonElement {
  const b = el('button', cls, label);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';
}

/** Aviso corto flotante (logros, errores, mensajes). */
export function toast(text: string, ms = 2400): void {
  let host = document.getElementById('toasts');
  if (!host) { host = el('div', ''); host.id = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.append(host); }
  const t = el('div', 'toast', text);
  host.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

/** Hoja modal con contenido propio. Devuelve funcion para cerrar. */
export function modal(content: HTMLElement, opts: { dismissable?: boolean; cls?: string } = {}): () => void {
  const back = el('div', 'modal-back');
  const box = el('div', `modal ${opts.cls ?? ''}`);
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.append(content);
  back.append(box);
  const close = () => { back.classList.add('out'); setTimeout(() => back.remove(), 200); };
  if (opts.dismissable !== false) back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
  document.body.append(back);
  return close;
}

/** Monedas que vuelan de un punto al contador. Solo transform y opacity. */
export function flyCoins(from: HTMLElement, to: HTMLElement, n = 8): void {
  if (reducedMotion()) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = el('div', 'fly-coin');
    c.style.left = `${a.left + a.width / 2}px`;
    c.style.top = `${a.top + a.height / 2}px`;
    document.body.append(c);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = c.animate(
      [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
       { transform: `translate(${dx * 0.3 + (Math.random() - 0.5) * 80}px, ${dy * 0.3 - 40}px) scale(1.2)`, opacity: 1, offset: 0.4 },
       { transform: `translate(${dx}px, ${dy}px) scale(.5)`, opacity: 0.2 }],
      { duration: 800 + i * 60, delay: i * 50, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    anim.onfinish = () => c.remove();
  }
}
