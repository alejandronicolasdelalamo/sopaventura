import '@fontsource/press-start-2p/400.css';
import '@fontsource/vt323/400.css';
import './style.css';
import './styles/redesign.css';
import './styles/game.css';
import { registerSW } from 'virtual:pwa-register';
import { getState } from './core/state';
import { backend } from './net';
import { restoreSession } from './net/session';
import { startSync, refreshContent } from './net/sync';
import { renderAdmin } from './screens/admin';
import { renderAjustes } from './screens/ajustes';
import { renderFinal } from './screens/final';
import { renderGame } from './screens/game';
import { renderHome } from './screens/home';
import { renderLogin } from './screens/login';
import { renderLogros } from './screens/logros';
import { renderMap } from './screens/map';
import { renderBuzon, renderNosotros } from './screens/nosotros';
import { renderPintar } from './screens/pintar';
import { renderPintarJuego } from './screens/pintarJuego';
import { renderTienda } from './screens/tienda';
import { renderAvatar } from './screens/avatar';
import { renderAventura, renderJugar, renderPintarMenu } from './screens/jugar';
import { renderPerfil } from './screens/perfil';
import { renderColorear, renderColorLienzo } from './screens/colorear';
import { renderCrearSopa } from './screens/sopaPropia';
import { renderEstadisticas } from './screens/estadisticas';
import { renderPegatinas } from './screens/pegatinas';
import { renderJuntos } from './screens/juntos';
import { initAudio } from './ui/audio';
import { initKeyNav } from './ui/keynav';
import { el } from './ui/dom';
import { lockIfNeeded, relockOnReturn } from './ui/pin';
import { initRouter, navigate, register } from './ui/router';
import { initTheme } from './ui/theme';
import { phrase } from './data/content';
import { dailyLevel, todayStr } from './core/levels';
import { openLevelSheet } from './screens/levelSheet';
import { getTemplate, loadCachedTemplates, warmTemplates } from './paint/catalog';
import { thumb } from './paint/store';

registerSW({ immediate: true });

/**
 * Auto-reparacion: si por una cache antigua (service worker) faltan hojas de estilo,
 * se borran las caches y se recarga UNA vez para bajar la version nueva completa.
 */
function ensureFreshAssets(): void {
  const cs = getComputedStyle(document.documentElement);
  const ok = ['--css-base', '--css-redesign', '--css-game'].every(k => cs.getPropertyValue(k).trim() === '1');
  if (ok) { try { sessionStorage.removeItem('ns-fresh'); } catch { /* ignorar */ } return; }
  try { if (sessionStorage.getItem('ns-fresh')) return; sessionStorage.setItem('ns-fresh', '1'); } catch { return; }
  void (async () => {
    try {
      for (const r of (await navigator.serviceWorker?.getRegistrations()) ?? []) await r.unregister();
      for (const k of await caches.keys()) await caches.delete(k);
    } catch { /* seguimos igualmente */ }
    location.reload();
  })();
}
ensureFreshAssets();

const root = document.getElementById('app')!;
initRouter(root);
initTheme();
initAudio();
initKeyNav();
relockOnReturn();
loadCachedTemplates();

register('home', renderHome);
register('mapa', renderMap);
register('game', renderGame);
register('logros', renderLogros);
register('ajustes', renderAjustes);
register('tienda', renderTienda);
register('nosotros', renderNosotros);
register('buzon', renderBuzon);
register('pintar', renderPintar);
register('pintar-juego', renderPintarJuego);
register('admin', renderAdmin);
register('final', renderFinal);
register('login', renderLogin);
register('avatar', renderAvatar);
register('jugar', renderJugar);
register('aventura', renderAventura);
register('pintar-menu', renderPintarMenu);
register('perfil', renderPerfil);
register('colorear', renderColorear);
register('colorear-lienzo', renderColorLienzo);
register('crear-sopa', renderCrearSopa);
register('estadisticas', renderEstadisticas);
register('pegatinas', renderPegatinas);
register('juntos', renderJuntos);

/** Pantalla de carga con frase cariñosa mientras se recupera la sesion. */
function loading(): void {
  root.innerHTML = '';
  const s = el('div', 'screen loading');
  const olafT = getTemplate('olaf');
  if (olafT) { const im = el('img', 'loading-olaf'); im.src = thumb(olafT, 'color', 96); im.alt = ''; im.width = 96; im.height = 96; s.append(im); }
  s.append(el('div', 'spinner'), el('p', 'sub', phrase('loading')));
  root.append(s);
}

/** Enlaces directos (notificaciones y desarrollo): #mapa, #buzon, #diario, #admin... */
function deepLink(): void {
  const h = location.hash.replace('#', '');
  if (h === 'diario') openLevelSheet(dailyLevel(todayStr()));
  else if (['jugar', 'aventura', 'mapa', 'buzon', 'tienda', 'pintar', 'pintar-menu', 'colorear', 'perfil', 'logros', 'ajustes', 'nosotros', 'admin', 'final', 'avatar', 'crear-sopa', 'estadisticas', 'pegatinas', 'juntos'].includes(h)) navigate(h);
}

async function boot(): Promise<void> {
  loading();
  await lockIfNeeded();
  const role = await restoreSession();
  if (!role) {
    navigate('login', { onDone: () => { navigate('home', {}, true); void startSync(); void refreshContent(); setTimeout(warmTemplates, 500); } }, true);
    return;
  }
  navigate('home', {}, true);
  void refreshContent();
  deepLink();
  setTimeout(warmTemplates, 500);
}

window.addEventListener('hashchange', () => { if (getState().role) deepLink(); });
void boot();
void getState; void backend;
