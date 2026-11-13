# SopaVentura

Sopa de letras en español, estilo pixel art, hecha como regalo privado. Es una **PWA**: se instala desde Safari en el iPhone ("Añadir a pantalla de inicio") y se puede jugar **sin internet**. No necesita Mac ni cuenta de Apple Developer.

- Mapa de **islas** estilo Candy Crush; cada isla mezcla varios temas.
- **4 modos:** Chill, Contrarreloj, Con puntos y Acertijos. Reto diario y modo Infinito (99.999 niveles).
- **Pintar por números** con hasta 30 colores y dibujos de hasta 128×128.
- Pareja: código secreto compartido, monedas compartidas, mensajes, cartas (también programadas), buzón y notificaciones.
- **Avatares pixel art** (chico y chica) personalizables; los predeterminados se parecen a Nico y a Izana.
- **Retratos y recuerdos:** vuestras fotos se convierten en dibujos para pintar y, al terminarlos, desbloquean el recuerdo (la foto) como recompensa.
- Islas con temas de series, música, Rivas, **Metro de Madrid y zonas famosas de Madrid**.
- Panel secreto solo para Nico: fotos, cartas, vales, palabras, huevos de pascua y conversor foto → dibujo.

## Estado actual y lo más importante

| | |
|---|---|
| **Hecho y probado** | Juego completo en modo local: mapa de 11 islas, 4 modos, reto diario, modo Infinito, tienda, logros, pintar por números (hasta 128×128), avatares, retratos con recuerdo, panel de Nico, PIN, modo oscuro, funciona sin internet. 35 tests + pruebas en navegador móvil emulado. |
| **Escrito pero sin probar contra un proyecto real** | Todo lo que usa Supabase: entrada con código de pareja, sincronización, pintado en directo, mensajes y cartas programadas, notificaciones push. |
| **Siguiente paso (tuyo)** | Crear el proyecto de Supabase siguiendo `docs/SUPABASE.md` (bloques: crear proyecto → acceso anónimo → pegar el SQL → código de pareja → copiar URL y clave pública). |
| **Después** | Rellenar `.env`, probar la nube en local, subir a un repositorio **privado**, publicar en Cloudflare Pages, instalar en los iPhone y activar notificaciones. |

**Reglas que no hay que saltarse**

- **Nunca** claves ni contraseñas en el código ni en el repositorio. Las variables `VITE_*` van en `.env` (ignorado por git) y en el panel de Cloudflare. La clave `service_role` y la privada VAPID **solo** viven en Supabase.
- Las **fotos y retratos** están en `private/` (ignorada por git). No se suben al repositorio.
- El repositorio debe ser **privado**.
- Lo dudoso (títulos, nombres, datos) está en `docs/A_VERIFICAR.md`.

**Comandos**

| | |
|---|---|
| `npm install` | Instalar (solo la primera vez) |
| `npm run dev` | Probar en `http://localhost:5173` (y en el móvil por la dirección *Network* si estáis en la misma wifi) |
| `npm test` | Pruebas automáticas |
| `npm run build` | Compilar para publicar |
| `node e2e/overview.mjs` | Genera `private/vistazo.png` con las pantallas principales |

**Dónde se edita cada cosa**

| Qué | Dónde |
|---|---|
| Palabras y pistas | `src/data/words.ts` o panel de Nico |
| Islas y temas | `src/data/islands.ts`, `src/data/themes.ts` |
| Frases, vales, huevos | `src/data/content.ts` o panel de Nico |
| Avatares | `src/avatar/avatar.ts` |
| Dibujos para pintar | `src/paint/images.ts` o conversor de fotos |
| Animaciones | `docs/ANIMACIONES.md` |

> Los pasos manuales (crear cuentas, copiar claves) están marcados con **🛑 TÚ**. Todo lo demás ya está hecho.

---

## 1. Probarlo en tu PC (Windows)

1. Instala **Node.js** (versión LTS) desde <https://nodejs.org>. Acepta todo por defecto.
2. Abre una terminal en esta carpeta y ejecuta:

```bash
npm install
npm run dev
```

3. Abre la dirección que aparece (normalmente <http://localhost:5173>). En el ordenador, pulsa **F12** y el icono del móvil para verlo como en un teléfono.

Sin configurar nada, la app funciona en **modo local**: todo se guarda solo en ese navegador (útil para probar). Entra con "Nico" o "Izana" y cualquier código de 4 o más caracteres. En este modo no hay pareja real, ni fotos en la nube, ni notificaciones.

### Comandos útiles

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para publicar (carpeta `dist`) |
| `npm run preview` | Sirve la versión compilada (para probar el modo sin internet) |
| `npm test` | Pruebas automáticas (generador de niveles, detección de palabras, conversor de fotos, motor de pintado, cola offline) |
| `node e2e/smoke.mjs` | Prueba completa en un Chrome de móvil emulado (necesita `npm run preview --port 4174` en marcha) |
| `node e2e/perf.mjs` | Mide los fotogramas al pintar 128×128 |

---

## 2. Publicarlo gratis (Cloudflare Pages)

Hay que publicarlo en una dirección **https** para poder instalarlo en el iPhone.

1. 🛑 **TÚ:** sube este proyecto a un repositorio **privado** de GitHub. Hazlo privado: así nadie puede leer el contenido base.
2. 🛑 **TÚ:** crea una cuenta gratis en <https://pages.cloudflare.com> → *Create a project* → conecta el repositorio.
3. Configuración de compilación:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. En *Settings → Environment variables* añade (ver `docs/SUPABASE.md` para obtener los valores):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
5. *Deploy*. Cada vez que subas cambios a GitHub se publica solo.

> Alternativas igual de gratuitas: Netlify o Vercel (mismos pasos). GitHub Pages solo sirve si el repositorio es público, y no lo recomiendo.

**Nunca** pongas claves en el código. Las variables van **solo** en el panel de Cloudflare (y en un archivo `.env` local, que ya está ignorado por git; hay un ejemplo en `.env.example`).

---

## 3. Instalarlo en el iPhone

1. Abre la dirección de Cloudflare en **Safari** (tiene que ser Safari).
2. Botón **Compartir** → **Añadir a pantalla de inicio** → *Añadir*.
3. Abre la app **desde el icono**. Así se ve a pantalla completa, funciona sin internet y permite notificaciones.
4. Entrad cada uno con vuestro nombre y el código secreto de pareja.
5. *Ajustes → Notificaciones → Activar* (solo funciona con la app instalada, iOS 16.4 o superior).

---

## 4. Cómo está organizado

```
src/core        Reglas: generador de niveles, selección, progreso, logros, estado
src/data        Contenido editable: palabras (words.ts), islas, temas, frases (content.ts)
src/paint       Pintar por números: motor, conversor de fotos, dibujos incluidos
src/net         Nube: Supabase, modo local, cola offline, sincronización, notificaciones
src/screens     Pantallas
src/ui          Audio, confeti, iconos pixel, rutas, PIN, tema
supabase/       Base de datos (SQL), función de notificaciones, ejemplo de cron
docs/           Guías y listas
e2e/            Pruebas en navegador
```

### Editar el contenido sin tocar código del juego

- **Desde la propia app (Nico):** *Ajustes → Panel secreto de Nico*. Subir fotos, convertir fotos en dibujos, vales, final del juego, palabras, huevos de pascua y frases.
- **En archivos:** `src/data/words.ts` (palabras y pistas por tema; formato `'Palabra'` o `['Palabra', 'pista']`), `src/data/islands.ts` (islas y qué temas mezclan) y `src/data/content.ts` (frases cariñosas, vales y huevos de ejemplo).
- Lo **personal** (cartas, fotos, vales reales, final) escríbelo en el panel: se guarda en Supabase, no en el repositorio.

### Fotos vuestras (privadas)

Los retratos y recuerdos se generan con vuestras fotos y **no se suben al repositorio** (la carpeta `private/` está en `.gitignore`):

```bash
node scripts/import-photos.mjs --nosotros "ruta/los-dos.png" --nico "ruta/nico.png" --izana "ruta/izana.png"
```

Se usan solo recortes de la cara. Para que salgan en los móviles: *Ajustes → Panel secreto de Nico → Dibujos subidos → Subir mis dibujos y fotos a la nube* (van al almacenamiento privado de Supabase). También puedes añadir fotos nuevas desde el panel con el conversor.

Recompensas por defecto: *Nosotros* al completar la Isla Cuchi, *Nico* al completar la Isla Olaf e *Izana* al completar la Isla Maleta.

### Música y sonido

Todo el sonido (efectos y música chiptune relajante) se **genera dentro del juego** con Web Audio: es original, sin archivos y sin problemas de licencia, y funciona sin internet. Si prefieres pistas propias, estas fuentes tienen licencias claras: OpenGameArt (filtra por CC0), Kevin MacLeod en incompetech.com (CC BY: hay que citarle) o Pixabay Music (licencia Pixabay). Guarda el archivo en `public/` y cambia `startMusic` en `src/ui/audio.ts`.

---

## 5. Cosas que debes saber (límites honestos)

- **Vibración en iPhone:** Safari no admite la vibración web estándar. Se usa un truco háptico que funciona en iOS 17.4+ pero **puede no notarse**; el juego se apoya también en animación y sonido.
- **No lo he probado en un iPhone real.** Lo he probado en Chrome con un móvil emulado (toques, sin internet, rendimiento). Pruébalo en vuestros móviles y dime qué ves.
- **Dibujos y fondos pixel art:** los genera el propio juego (son originales, sin material con copyright). Son sencillos; si quieres arte más elaborado, se pueden sustituir por tus propios dibujos con el conversor de fotos.
- **Pintado en tiempo real:** si los dos pintáis el mismo dibujo, os veis en directo. Sin conexión, los cambios se guardan y se envían al volver (cola de pendientes).
- **Supabase gratis** pausa un proyecto tras ~1 semana sin actividad. Mira `docs/SUPABASE.md` (paso 8) para evitarlo.
- Lo dudoso (títulos de canciones, datos) está en `docs/A_VERIFICAR.md`.

Documentos: `docs/SUPABASE.md` (nube y notificaciones paso a paso) · `docs/A_VERIFICAR.md` · `docs/ANIMACIONES.md`.
