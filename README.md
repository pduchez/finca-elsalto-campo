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

## Estado

En construcción por pasos (ver el plan de trabajo en `CLAUDE.md`).
**Paso 1 — Scaffolding:** completo. Los siguientes pasos se implementan con
revisión del dueño entre cada uno.
