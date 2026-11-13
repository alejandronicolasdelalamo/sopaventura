import { getState, subscribe } from '../core/state';

/** Modo oscuro (auto/claro/oscuro) y "reducir movimiento" manual. */
export function applyTheme(): void {
  const { theme, reduceMotion } = getState().settings;
  const r = document.documentElement;
  if (theme === 'auto') delete r.dataset.theme; else r.dataset.theme = theme;
  if (reduceMotion) r.dataset.motion = 'reduce'; else delete r.dataset.motion;
  const st = getState().settings;
  if (st.colorblind) r.dataset.cb = '1'; else delete r.dataset.cb;
  if (st.bigText) r.dataset.bigtext = '1'; else delete r.dataset.bigtext;
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0d0a24' : '#eeeaff');
}

export function initTheme(): void {
  applyTheme();
  subscribe(applyTheme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}
