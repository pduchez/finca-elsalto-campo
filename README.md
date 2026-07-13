# Finca El Salto — Sistema de Campo

PWA **offline-first** para la gestión de campo de una finca de cardamomo
orgánico en El Salvador. Se instala como PWA (no App Store / Play Store) en un
Android de gama baja y funciona **sin señal**: registra con **voz y foto**, y
sincroniza sola cuando aparece conexión.

El usuario de campo (Emerson) es la fuente de datos; el dueño es quien consume la
información en el panel. Ver [`CLAUDE.md`](./CLAUDE.md) para el contexto completo
y las convenciones.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · PWA (`@ducanh2912/next-pwa`) ·
Dexie/IndexedDB · Supabase · Anthropic (`@anthropic-ai/sdk`).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar variables
npm run dev                  # http://localhost:3000  (el SW se apaga en dev)
```

Otros scripts:

```bash
npm run build       # build de producción (genera el service worker)
npm run start       # sirve el build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
node scripts/gen-icons.mjs   # regenera los iconos PWA
```

## Rutas

- `/campo` — app de campo de Emerson (offline-first).
- `/panel` — panel del dueño (protegido; briefing, trazabilidad, costos, admin).

## Funciona sin backend (modo demo)

Sin variables de Supabase/Anthropic, la app corre 100% local (IndexedDB) con
datos semilla, para probar el flujo completo. Ver `docs/DEMO.md` (recorrido con
capturas) y `docs/DEPLOY.md` (conectar Supabase + Anthropic + Vercel e instalar
la PWA en el Android de Emerson).

## Estado

Producto completo de la v1 (ver el plan en `CLAUDE.md`):

- **Campo:** captura offline (área → actividad → audio/foto/jornales → listo) con
  GPS, asistencia, destajo, protocolos + capacitación contextual, cola de
  sincronización e indicador de pendientes.
- **Servidor:** endpoint de sincronización idempotente (upsert por uuid) +
  extracción estructurada con Claude (tool use forzado).
- **Panel del dueño:** briefing, trazabilidad orgánica (CSV), costos, avance y
  administración (carga de bioles).
- **Datos:** `supabase/schema.sql` + `supabase/seed.sql`.

Pendiente para producción: proveedor de _speech-to-text_ para transcribir el
audio antes de la extracción, y proteger `/panel` con Supabase Auth.
