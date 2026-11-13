-- EJEMPLO. No pegues secretos reales en este archivo ni lo subas con ellos.
-- Copia esto en Supabase > SQL Editor, cambia los tres valores entre <> y ejecutalo UNA vez.
-- Requiere las extensiones pg_cron y pg_net (Database > Extensions > activarlas).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Cada minuto: avisa de mensajes y cartas que ya "han llegado" (incluye las programadas)
select cron.schedule('nuestra-sopa-deliver', '* * * * *', $$
  select net.http_post(
    url := 'https://<TU-PROYECTO>.supabase.co/functions/v1/push?mode=deliver',
    headers := jsonb_build_object('x-cron-secret', '<TU-CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);

-- Cada dia a las 17:00 UTC (18:00 o 19:00 en España segun la hora): aviso del reto diario
select cron.schedule('nuestra-sopa-daily', '0 17 * * *', $$
  select net.http_post(
    url := 'https://<TU-PROYECTO>.supabase.co/functions/v1/push?mode=daily',
    headers := jsonb_build_object('x-cron-secret', '<TU-CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);

-- Para quitarlos:  select cron.unschedule('nuestra-sopa-deliver');  select cron.unschedule('nuestra-sopa-daily');
