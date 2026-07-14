# Puesta en producción (GitHub → Supabase → Vercel)

Guía verificada con los paneles actuales de Supabase y Vercel (2026). Los menús
cambian; si algo se ve distinto, los nombres clave están en **negrita**.

## Qué queda funcionando en vivo con esta guía

- Emerson instala la PWA, trabaja **offline**, y registra todo (áreas,
  colaboradores con foto+GPS, destajo, planilla). Los **datos (filas)** suben
  solos a Supabase cuando hay señal, de forma **idempotente**.
- La **planilla catorcenal** se arma y exporta a **Excel** desde el teléfono.

### Pendiente (siguiente milestone, no bloquea el arranque)

- **Fotos y audio**: hoy quedan en el teléfono; suben las filas pero **no los
  archivos** a Supabase Storage. (El bucket `capturas` ya se crea.)
- **Panel del dueño**: hoy lee los datos locales del dispositivo; falta que lea
  de Supabase para ver todo desde otra máquina.
- **Audio → IA (Claude)**: falta un proveedor de _speech-to-text_ que transcriba
  el audio antes de la extracción.
- **Login**: `/campo` y `/panel` están abiertos (sin autenticación).

---

## Paso 1 — Supabase (base de datos)

1. Entrá a **app.supabase.com** → **New project**. Elegí organización, nombre
   (ej. `finca-el-salto`), una **Database Password** (guardala) y la región más
   cercana. Esperá ~2 min a que se aprovisione.
2. Menú izquierdo → **SQL Editor** → **New query**. Pegá TODO el contenido de
   `supabase/schema.sql` del repo y **Run**. Repetí con `supabase/seed.sql`.
3. Menú izquierdo → **Storage**: verificá que exista el bucket **`capturas`**
   (lo crea el schema). Si no está, crealo (privado).
4. Copiá las credenciales (botón **Connect** arriba, o **Settings**):
   - **Project URL** — en **Settings → API → Project URL**
     (formato `https://<ref>.supabase.co`).
   - **Clave pública (anon)** — en **Settings → API Keys**. Usá la
     **Publishable key** (o, en la pestaña **Legacy API Keys**, la **anon**).
   - **Clave secreta (service_role)** — misma pantalla: la **Secret key**
     (o, en **Legacy API Keys**, la **service_role**). **Nunca la compartas.**

> Nota: Supabase migró a claves *publishable/secret*; las *anon/service_role*
> legacy siguen funcionando. Cualquiera de las dos sirve con este código: poné
> la pública en `NEXT_PUBLIC_SUPABASE_ANON_KEY` y la secreta en
> `SUPABASE_SERVICE_ROLE_KEY`.

## Paso 2 — GitHub (código en `main`)

El código vive en `pduchez/finca-elsalto-campo`, rama de trabajo
`claude/keen-bardeen-jwq57b` (PR abierto). Vercel despliega **`main`**, así que
hay que llevar el código ahí: **mergear el PR a `main`**.

## Paso 3 — Vercel (hosting)

1. En **vercel.com** → **Add New… → Project** → **Import Git Repository** →
   autorizá GitHub si hace falta → elegí **`pduchez/finca-elsalto-campo`**.
2. Vercel detecta **Next.js** solo (no cambies Build/Output). **Production
   Branch** = `main`.
3. Abrí **Environment Variables** y agregá (Environment: **Production** y
   **Preview**):

   | Name | Value | ¿Obligatoria? |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase | Sí |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret / service_role | Sí |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon | Recomendada |
   | `ANTHROPIC_API_KEY` | de console.anthropic.com | Opcional (IA de audio) |

4. **Deploy**. En ~2 min tenés `https://<proyecto>.vercel.app`.
5. A partir de ahí, cada push a `main` redepliega solo; cada PR genera una
   **Preview** con su URL para probar antes de mergear.

## Paso 4 — Instalar la PWA en el Android de Emerson

1. Abrí la URL de Vercel en **Chrome** en el teléfono.
2. Menú **⋮ → “Instalar app”** (o “Agregar a la pantalla de inicio”).
3. La primera vez, con señal, dejá que cargue: se guardan la app, el plan y los
   protocolos para usarse sin señal.
4. Aceptá los permisos de **cámara/micrófono** y **ubicación** una vez. El GPS
   funciona sin datos.

## Paso 5 — Probar que quedó vivo

1. Registrá una asistencia con foto y una tarea a destajo.
2. En Supabase → **Table Editor** → tabla `asistencia` / `tareas_destajo`:
   deben aparecer las filas.
3. Prueba offline: activá **modo avión**, hacé un registro (verás “X
   pendientes”), quitá el modo avión → baja a “✓ Todo enviado”.
