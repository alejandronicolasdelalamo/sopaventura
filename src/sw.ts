/// <reference lib="webworker" />
// Service worker: cache offline (precache de todo el juego) + notificaciones push.
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<string | { url: string; revision: string | null }> };

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.addEventListener('push', event => {
  let data: { title?: string; body?: string; url?: string } = {};
  try { data = event.data?.json() ?? {}; } catch { data = { body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(data.title ?? 'SopaVentura', {
    body: data.body ?? '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: data.url ?? '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find(c => 'focus' in c);
    if (open) { await open.focus(); if ('navigate' in open) await (open as WindowClient).navigate(url); }
    else await self.clients.openWindow(url);
  })());
});
