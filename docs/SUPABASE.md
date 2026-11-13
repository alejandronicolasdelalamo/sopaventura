# Nube y notificaciones paso a paso (Supabase, gratis)

Lo que tienes que hacer tú está marcado **🛑**. Tiempo estimado: 30–40 minutos. Ve despacio y no pegues claves en ningún sitio que no se indique.

## Cómo funciona la seguridad (para que te quedes tranquilo)

- No hay emails. Cada móvil inicia una sesión anónima y luego **canjea el código secreto de pareja** en el servidor. El código se guarda **cifrado (hash)**, nunca en claro.
- Todas las tablas tienen **reglas de acceso (RLS)** en la base de datos: solo los miembros de la pareja leen y escriben. Las cartas programadas **no llegan al otro móvil hasta su fecha** (lo impide el servidor, no la interfaz).
- Solo "Nico" puede escribir contenido (fotos, vales, final...). Izana solo lo lee.
- Tras 10 códigos erróneos en 15 minutos, el servidor bloquea los intentos.
- La clave `anon` que usa la app es **pública por diseño** (la protegen las reglas). La clave `service_role` **no** se usa en la app y nunca debe salir de Supabase.

## 1. Crear el proyecto 🛑

1. Entra en <https://supabase.com> → *Start your project* → regístrate (con GitHub es lo más fácil).
2. *New project*. Nombre: `nuestra-sopa`. Pon una contraseña de base de datos fuerte y **guárdala en tu gestor de contraseñas** (no la necesitaremos en la app). Región: **West EU (Ireland)** o la más cercana. Plan **Free**.

## 2. Activar el acceso anónimo 🛑

*Authentication → Sign In / Providers → Anonymous Sign-Ins → activar*.

## 3. Crear las tablas y las reglas 🛑

1. *SQL Editor → New query*.
2. Abre el archivo `supabase/migrations/0001_init.sql` de este proyecto, copia **todo** y pégalo. Pulsa **Run**. Debe decir *Success*.

## 4. Crear vuestro código de pareja 🛑

En el *SQL Editor*, pega esto **cambiando `TU-CODIGO-SECRETO`** por el código que queráis (algo largo que solo sepáis vosotros). Ejecútalo **una vez** y no lo guardes en archivos del proyecto:

```sql
with c as (
  insert into couples(code_hash) values (crypt('TU-CODIGO-SECRETO', gen_salt('bf'))) returning id
)
insert into wallet(couple_id, coins) select id, 50 from c;
```

Para cambiar el código más adelante: `update couples set code_hash = crypt('NUEVO-CODIGO', gen_salt('bf'));`

## 5. Copiar la URL y la clave pública 🛑

*Project Settings → API*. Copia:
- **Project URL** → será `VITE_SUPABASE_URL`
- **anon public key** (la clave `anon`, **no** la `service_role`) → será `VITE_SUPABASE_ANON_KEY`

## 6. Notificaciones push (VAPID)

Las notificaciones web usan un par de claves (VAPID). Se generan una sola vez:

```bash
npx web-push generate-vapid-keys
```

Te da una **Public Key** y una **Private Key**.
- La **pública** va en la app: `VITE_VAPID_PUBLIC_KEY`.
- La **privada** solo se guarda como secreto en Supabase (paso 7). **Nunca** en el código.

## 7. Desplegar la función que envía las notificaciones 🛑

1. Genera un secreto aleatorio para el cron (cualquier texto largo), por ejemplo con `npx web-push generate-vapid-keys` y usando otra cadena, o 40 caracteres que inventes. Lo llamaremos `CRON_SECRET`.
2. En una terminal, dentro del proyecto:

```bash
npx supabase login
npx supabase link --project-ref TU-REFERENCIA      # la ves en la URL del panel: supabase.com/dashboard/project/<REFERENCIA>
npx supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:tu-correo@ejemplo.com" CRON_SECRET="..."
npx supabase functions deploy push --no-verify-jwt
```

(`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los inyecta Supabase en las funciones.)

3. Programa los avisos: en *Database → Extensions* activa **pg_cron** y **pg_net**. Abre `supabase/cron.example.sql`, copia el contenido en el *SQL Editor*, **cambia `<TU-PROYECTO>` y `<TU-CRON_SECRET>`** y ejecútalo. Cada minuto se comprueban mensajes y cartas que ya han llegado a su fecha; cada día se avisa del reto diario.

## 8. Que no se pause por inactividad

El plan gratis pausa el proyecto tras ~1 semana sin uso. Si jugáis a menudo no pasará. Para estar tranquilos, el archivo `.github/workflows/keepalive.yml` hace una petición ligera cada 3 días:

1. En tu repositorio de GitHub: *Settings → Secrets and variables → Actions → New repository secret*.
2. Crea `SUPABASE_URL` y `SUPABASE_ANON_KEY` con los mismos valores del paso 5.

Si alguna vez se pausa: *Dashboard → Restore project* (no se pierde nada).

## 9. Poner las variables en Cloudflare 🛑

En Cloudflare Pages → tu proyecto → *Settings → Environment variables* (producción): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`. Vuelve a desplegar. Para probar en tu PC, copia `.env.example` a `.env` y rellénalo (ese archivo no se sube a git).

## 10. Probar que todo funciona

1. Abre la app en tu móvil, entra como **Nico** con el código. En *Nosotros* debe decir "Cuando Izana abra el juego...".
2. Entra desde el móvil de Izana como **Izana** con el mismo código.
3. Activad las notificaciones en *Ajustes* (con la app instalada).
4. Enviad un mensaje rápido: al otro le debe llegar la notificación en menos de 1 minuto.
5. Pintad el mismo dibujo a la vez: debe aparecer "…está pintando…".

## Límites del plan gratuito (revísalos en supabase.com/pricing, pueden cambiar)

Orientativo: 500 MB de base de datos, 1 GB de archivos, ~5 GB de transferencia al mes, 50.000 usuarios activos. Para dos personas sobra: una foto comprimida pesa ~150 KB.

## Problemas típicos

| Síntoma | Causa probable |
|---|---|
| "No se pudo iniciar sesión" | Falta activar *Anonymous Sign-Ins* (paso 2) |
| "Código incorrecto" | El código del paso 4 no coincide, o llevas 10 fallos (espera 15 min) |
| No llegan notificaciones | App no instalada desde el icono; falta `VITE_VAPID_PUBLIC_KEY`; función sin desplegar; cron sin crear |
| Sale "Modo local" | Faltan `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` al compilar |
