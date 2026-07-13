# Despliegue y puesta en marcha

## 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, corré en orden:
   - `supabase/schema.sql` (tablas, índices, bucket de Storage, RLS).
   - `supabase/seed.sql` (áreas, actividades, insumos, trabajadores, protocolos).
3. En **Storage** confirmá que existe el bucket `capturas` (lo crea el schema).
4. Copiá de **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (¡solo servidor!)

## 2. Anthropic

- Sacá una API key en [console.anthropic.com](https://console.anthropic.com) →
  `ANTHROPIC_API_KEY`.
- Modelos (configurables por entorno):
  - `ANTHROPIC_MODEL_EXTRACCION` (por defecto `claude-sonnet-4-6`)
  - `ANTHROPIC_MODEL_CLASIFICACION` (por defecto `claude-haiku-4-5`)
  - Confirmá el ID exacto de Sonnet contra la referencia de la API antes de
    producción; se cambia sin tocar código.
- **Transcripción del audio:** Claude no transcribe voz. Hay que conectar un
  proveedor de _speech-to-text_ (el endpoint deja el gancho listo: cuando el
  registro llega con `audio_transcripcion`, Claude extrae los campos). Ver
  `src/app/api/sync/route.ts` y `src/lib/anthropic/extraccion.ts`.

## 3. Vercel

1. Importá el repo en [vercel.com](https://vercel.com).
2. Cargá las 4 variables de entorno (más las 2 de modelo si querés overridear).
3. Deploy. El build genera el service worker automáticamente.

## 4. Instalar la PWA en el Android de Emerson

1. Abrí la URL de Vercel en **Chrome** en el teléfono.
2. Menú **⋮ → “Agregar a la pantalla de inicio”** (o “Instalar app”).
3. Aparece el ícono de **El Salto** en el escritorio. Se abre a pantalla
   completa, sin barra del navegador.
4. La primera vez, con señal, dejá que cargue: se guardan la app, el plan del
   día y los protocolos para usarse sin señal.
5. Al abrirla pedirá permisos de **micrófono** y **ubicación**: hay que
   aceptarlos una vez. El GPS funciona sin datos.

### Prueba offline (recomendada antes de entregar el teléfono)

1. Con la app abierta, activá **modo avión**.
2. Hacé un registro completo (área → actividad → audio → foto → LISTO).
3. Verás “X pendientes” en la esquina. Nada se pierde.
4. Quitá el modo avión: en segundos el contador baja a “✓ Todo enviado”.
