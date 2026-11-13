import { queuePushSub } from './sync';

function urlB64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** Pide permiso y registra la suscripcion push. Debe llamarse desde un toque del usuario. */
export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, message: 'Este navegador no admite notificaciones. En iPhone, instala la app desde Safari (Compartir > Añadir a pantalla de inicio).' };
  }
  if (/iPhone|iPad/.test(navigator.userAgent) && !isStandalone()) {
    return { ok: false, message: 'En iPhone hay que abrir la app desde el icono de la pantalla de inicio.' };
  }
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key) return { ok: false, message: 'Faltan las claves de notificaciones (ver docs/SUPABASE.md).' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, message: 'Permiso denegado. Puedes cambiarlo en Ajustes del iPhone > Notificaciones.' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) }));
    const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    queuePushSub({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
    return { ok: true, message: 'Notificaciones activadas' };
  } catch (e) {
    return { ok: false, message: `No se pudo activar: ${(e as Error).message}` };
  }
}
