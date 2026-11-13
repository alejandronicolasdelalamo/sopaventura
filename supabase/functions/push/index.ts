// Edge Function "push": envia notificaciones push (Web Push + VAPID). La llama pg_cron cada minuto.
//   ?mode=deliver  -> mensajes y cartas que ya han llegado a su fecha y aun no se notificaron
//   ?mode=daily    -> aviso del reto diario a los dos
// Seguridad: exige la cabecera x-cron-secret (secreto CRON_SECRET). Los secretos NUNCA van en el repo.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const need = (k: string): string => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Falta el secreto ${k}`);
  return v;
};

interface Sub { endpoint: string; p256dh: string; auth: string }

Deno.serve(async req => {
  try {
    if (req.headers.get('x-cron-secret') !== need('CRON_SECRET')) return new Response('forbidden', { status: 403 });
    webpush.setVapidDetails(need('VAPID_SUBJECT'), need('VAPID_PUBLIC_KEY'), need('VAPID_PRIVATE_KEY'));
    const sb = createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'));
    const mode = new URL(req.url).searchParams.get('mode') ?? 'deliver';
    let sent = 0;

    const send = async (sub: Sub, payload: object) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await sb.from('push_subs').delete().eq('endpoint', sub.endpoint); // suscripcion caducada
      }
    };

    if (mode === 'daily') {
      const { data: subs } = await sb.from('push_subs').select('endpoint,p256dh,auth');
      for (const s of subs ?? []) await send(s, { title: 'Reto diario', body: 'Ya está la sopa de hoy, Cuchi 💜', url: '/#diario' });
    } else {
      const { data: msgs } = await sb.from('messages').select('*').eq('notified', false).lte('deliver_at', new Date().toISOString()).limit(50);
      for (const m of msgs ?? []) {
        const { data: subs } = await sb.from('push_subs').select('endpoint,p256dh,auth').eq('couple_id', m.couple_id).eq('role', m.to_role);
        const from = m.from_role === 'nico' ? 'Nico' : 'Izana';
        const payload = m.kind === 'letter'
          ? { title: `${from} te ha escrito una carta 💌`, body: 'Ábrela en el buzón.', url: '/#buzon' }
          : m.kind === 'voucher'
            ? { title: 'Vale canjeado', body: String(m.body).slice(0, 120), url: '/#buzon' }
            : { title: from, body: String(m.body).slice(0, 120), url: '/#buzon' };
        for (const s of subs ?? []) await send(s, payload);
        await sb.from('messages').update({ notified: true }).eq('id', m.id);
      }
    }
    return Response.json({ ok: true, sent });
  } catch (e) {
    return new Response(String((e as Error).message), { status: 500 });
  }
});
