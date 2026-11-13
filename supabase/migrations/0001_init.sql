-- Nuestra Sopa: esquema + seguridad (RLS). Se ejecuta UNA vez en Supabase > SQL Editor.
-- No contiene ningun secreto. El codigo de pareja se crea a mano (ver docs/SUPABASE.md, paso 5).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- pareja y miembros
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null,                         -- crypt(codigo, salt): nunca el codigo en claro
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  role text not null check (role in ('nico', 'izana')),
  created_at timestamptz not null default now()
);

create table if not exists public.login_attempts (
  id bigserial primary key,
  at timestamptz not null default now(),
  ok boolean not null
);

alter table public.couples enable row level security;         -- sin politicas: el cliente no puede leerla
alter table public.login_attempts enable row level security;  -- idem
alter table public.members enable row level security;

-- Funciones auxiliares (security definer para no depender de RLS al consultar members)
create or replace function public.my_couple() returns uuid
language sql stable security definer set search_path = public as $$
  select couple_id from public.members where user_id = auth.uid()
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where user_id = auth.uid()
$$;

create or replace function public.whoami() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('couple_id', couple_id, 'role', role) from public.members where user_id = auth.uid()
$$;

create policy members_select on public.members for select using (couple_id = public.my_couple());

-- Entrar con el codigo secreto compartido. Limita intentos fallidos (anti fuerza bruta).
create or replace function public.join_couple(p_name text, p_code text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_couple uuid;
  v_fails int;
begin
  if auth.uid() is null then raise exception 'No hay sesion'; end if;
  if p_name not in ('nico', 'izana') then raise exception 'Nombre no valido'; end if;

  select count(*) into v_fails from public.login_attempts where at > now() - interval '15 minutes' and not ok;
  if v_fails >= 10 then raise exception 'Demasiados intentos. Espera unos minutos.'; end if;

  select id into v_couple from public.couples where code_hash = crypt(p_code, code_hash) limit 1;
  if v_couple is null then
    insert into public.login_attempts(ok) values (false);
    raise exception 'Codigo incorrecto';
  end if;
  insert into public.login_attempts(ok) values (true);

  if (select count(*) from public.members where couple_id = v_couple) >= 8 then
    raise exception 'Demasiados dispositivos vinculados';
  end if;

  insert into public.members(user_id, couple_id, role) values (auth.uid(), v_couple, p_name)
  on conflict (user_id) do update set couple_id = excluded.couple_id, role = excluded.role;
  return p_name;
end $$;

revoke all on function public.join_couple(text, text) from public, anon;
grant execute on function public.join_couple(text, text) to authenticated;
grant execute on function public.whoami() to authenticated;

-- ---------------------------------------------------------------- instantaneas de progreso (una por persona)
create table if not exists public.snapshots (
  couple_id uuid not null references public.couples(id) on delete cascade,
  role text not null check (role in ('nico', 'izana')),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (couple_id, role)
);
alter table public.snapshots enable row level security;
create policy snap_select on public.snapshots for select using (couple_id = public.my_couple());
create policy snap_write on public.snapshots for insert with check (couple_id = public.my_couple() and role = public.my_role());
create policy snap_update on public.snapshots for update using (couple_id = public.my_couple() and role = public.my_role());

-- ---------------------------------------------------------------- monedas compartidas
create table if not exists public.wallet (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  coins int not null default 0 check (coins >= 0)
);
alter table public.wallet enable row level security;
create policy wallet_select on public.wallet for select using (couple_id = public.my_couple());

create or replace function public.add_coins(delta int) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if public.my_couple() is null then raise exception 'Sin pareja'; end if;
  if abs(delta) > 5000 then raise exception 'Cantidad no valida'; end if;
  update public.wallet set coins = greatest(0, coins + delta) where couple_id = public.my_couple() returning coins into v;
  return v;
end $$;
grant execute on function public.add_coins(int) to authenticated;

-- ---------------------------------------------------------------- contenido editable (solo escribe Nico)
create table if not exists public.content (
  couple_id uuid not null references public.couples(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (couple_id, key)
);
alter table public.content enable row level security;
create policy content_select on public.content for select using (couple_id = public.my_couple());
create policy content_insert on public.content for insert with check (couple_id = public.my_couple() and public.my_role() = 'nico');
create policy content_update on public.content for update using (couple_id = public.my_couple() and public.my_role() = 'nico');
create policy content_delete on public.content for delete using (couple_id = public.my_couple() and public.my_role() = 'nico');

create table if not exists public.templates (
  couple_id uuid not null references public.couples(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (couple_id, id)
);
alter table public.templates enable row level security;
create policy tpl_select on public.templates for select using (couple_id = public.my_couple());
create policy tpl_insert on public.templates for insert with check (couple_id = public.my_couple() and public.my_role() = 'nico');
create policy tpl_update on public.templates for update using (couple_id = public.my_couple() and public.my_role() = 'nico');
create policy tpl_delete on public.templates for delete using (couple_id = public.my_couple() and public.my_role() = 'nico');

-- ---------------------------------------------------------------- pintar por numeros: operaciones compartidas
create table if not exists public.paint_ops (
  id text primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  image_id text not null,
  by_role int not null check (by_role in (1, 2)),
  t text not null check (t in ('p', 'u')),
  cells int[] not null,
  ts bigint not null,
  seq bigserial
);
create index if not exists paint_ops_idx on public.paint_ops (couple_id, image_id, seq);
alter table public.paint_ops enable row level security;
create policy paint_select on public.paint_ops for select using (couple_id = public.my_couple());
create policy paint_insert on public.paint_ops for insert with check (couple_id = public.my_couple() and cardinality(cells) <= 20000);

-- ---------------------------------------------------------------- mensajes y cartas
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_role text not null check (from_role in ('nico', 'izana')),
  to_role text not null check (to_role in ('nico', 'izana')),
  kind text not null check (kind in ('quick', 'letter', 'voucher', 'system')),
  body text not null check (length(body) <= 6000),
  deliver_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  notified boolean not null default false
);
create index if not exists messages_idx on public.messages (couple_id, deliver_at);
alter table public.messages enable row level security;
-- Quien envia ve todo lo suyo; quien recibe solo lo que ya ha "llegado" (cartas programadas incluidas).
create policy msg_select on public.messages for select using (
  couple_id = public.my_couple() and (from_role = public.my_role() or (to_role = public.my_role() and deliver_at <= now()))
);
create policy msg_insert on public.messages for insert with check (
  couple_id = public.my_couple() and from_role = public.my_role() and to_role <> from_role
);

create or replace function public.mark_read(p_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update public.messages set read_at = now()
  where id = any(p_ids) and couple_id = public.my_couple() and to_role = public.my_role() and deliver_at <= now() and read_at is null
$$;
grant execute on function public.mark_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------- suscripciones push
create table if not exists public.push_subs (
  endpoint text primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  role text not null check (role in ('nico', 'izana')),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
create policy push_select on public.push_subs for select using (couple_id = public.my_couple() and role = public.my_role());
create policy push_insert on public.push_subs for insert with check (couple_id = public.my_couple() and role = public.my_role());
create policy push_update on public.push_subs for update using (couple_id = public.my_couple() and role = public.my_role());
create policy push_delete on public.push_subs for delete using (couple_id = public.my_couple() and role = public.my_role());

-- ---------------------------------------------------------------- fotos (Storage privado)
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
create policy photos_select on storage.objects for select using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple()::text);
create policy photos_insert on storage.objects for insert with check (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple()::text and public.my_role() = 'nico');
create policy photos_delete on storage.objects for delete using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple()::text and public.my_role() = 'nico');

-- ---------------------------------------------------------------- tiempo real
alter publication supabase_realtime add table public.paint_ops;
alter publication supabase_realtime add table public.messages;
