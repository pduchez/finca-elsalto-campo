# CLAUDE.md — Finca El Salto (Sistema de Campo)

Convenciones y contexto para trabajar en este repositorio. Léelo antes de tocar
código.

## Qué es esto

PWA **offline-first** para la gestión de campo de una finca de cardamomo
orgánico en El Salvador. No pasa por App Store ni Google Play: se instala como
PWA en el Android de gama baja del usuario de campo.

## El usuario de campo manda sobre el diseño

El usuario principal es **Emerson Molina** (ingeniero agrónomo, técnico medio,
diligente pero desorganizado). Trabaja en lotes **sin señal** con un **Android
de gama baja** y las **manos sucias**. El consumidor de la información es el
**dueño** (panel `/panel`), no Emerson.

Reglas no negociables de UX:

1. La app **estructura por él**; no le pide que sea organizado.
2. **No hay formularios de texto.** Se registra con **voz y foto**.
3. **Todo funciona sin conexión.** Sincroniza sola cuando aparece señal.
4. **Máximo 4 toques + 1 audio** por registro. Si un flujo pide más, está mal.
5. **Botones grandes, alto contraste, legible bajo sol, usable con manos
   sucias.**
6. **Emerson nunca ve un error de red.** Solo un indicador discreto de
   pendientes.

## Stack

- **Next.js 14 (App Router) + TypeScript**, desplegado en **Vercel**.
- **PWA** con `@ducanh2912/next-pwa` (manifest + service worker). SW deshabilitado
  en `next dev`.
- **Offline-first**: IndexedDB con **Dexie** + cola de sincronización.
- **Supabase** (Postgres + Storage + Auth).
- **Anthropic** (`@anthropic-ai/sdk`): `claude-sonnet-4-6` para extracción
  estructurada del audio, `claude-haiku-4-5` para clasificaciones simples.
- **Tailwind CSS**.
- **Idioma:** español de El Salvador/Guatemala en TODA la interfaz. **Sin inglés
  visible.** El código (identificadores, comentarios técnicos) puede ir en
  español; los nombres de dominio (área, actividad, jornal, destajo, bocashi,
  biol) van en español siempre.

## Arquitectura offline (lo más importante)

- **Captura offline:** todo registro (audio, foto, conteos) se guarda en
  IndexedDB con estado `pendiente`.
- **GPS sin señal:** `navigator.geolocation` es satelital y funciona sin datos.
  Se captura en cada registro. Es la **prueba de trazabilidad** para la
  certificación orgánica — nunca lo omitas.
- **Cola de sincronización:** al volver la conexión, sube en orden con backoff,
  marca `sincronizado`, y **NUNCA borra nada local hasta el 200 del servidor**.
- **Idempotencia:** cada registro lleva un `uuid` generado en el cliente. El
  servidor hace **upsert por ese uuid**. Sincronizar dos veces no duplica.
- **Audio:** `MediaRecorder` en `audio/webm` (o `audio/mp4` si webm falla en el
  Android). Se guarda como Blob. Se transcribe/procesa **en el servidor** al
  sincronizar, nunca en el cliente.
- **Fotos:** comprimir en el cliente antes de guardar (máx **1200px** de ancho,
  calidad **0.7**). El teléfono es de gama baja: no lo satures.
- **Plan del día:** se cachea la noche anterior; disponible offline todo el día.
- **Protocolos:** precargados en cache; consultables sin señal.

## Procesamiento con Claude (server-side)

Al sincronizar, un endpoint procesa cada registro pendiente:

1. Transcribe el audio.
2. Envía la transcripción a `claude-sonnet-4-6` para extraer, de habla natural
   salvadoreña/guatemalteca de campo, un JSON estricto: `cantidad`, `unidad`,
   `jornales_usados`, `insumos_usados[]`, `observaciones`, `problema_detectado`,
   `descripcion_problema`, `insumo_agotado`, `confianza` (0–1).
3. **Structured output forzado** (tool use). Nunca parsear texto libre con regex.
4. Si `confianza < 0.7` → `requiere_revision = true` y alerta al dueño.
5. Si `problema_detectado` o `insumo_agotado` → alerta para el briefing.

**Regla dura:** Claude **estructura lo que Emerson dijo**. No completa, no supone,
no rellena. Si un dato no se dijo, va `null`.

## Estructura de carpetas

```
src/
  app/
    layout.tsx            # root: metadata PWA, viewport, idioma es-SV
    page.tsx              # redirige a /campo
    globals.css           # sistema de diseño (toque-grande, botones, tarjetas)
    campo/                # App de Emerson (offline-first)
      layout.tsx          # shell + IndicadorSync
      page.tsx            # home: plan del día + REGISTRAR + pendientes
      registrar/          # flujo área → actividad → captura (Paso 4)
      asistencia/         # planilla (Paso 6)
      destajo/            # tarea por destajo (Paso 6)
      protocolos/         # biblioteca offline (Paso 8)
    panel/                # Panel del dueño, protegido (Paso 7/8)
    api/                  # endpoints (sync + Claude en Paso 5)
  components/             # BotonGrande, IndicadorSync, ...
  lib/
    types.ts              # tipos del dominio (alineados con Supabase)
    db/                   # Dexie / IndexedDB (Paso 3)
    sync/                 # cola de sincronización (Paso 3)
    supabase/             # clientes navegador y servicio
    anthropic/            # extracción estructurada (Paso 5)
scripts/
  gen-icons.mjs           # genera los iconos PWA (placeholder de marca)
public/
  manifest.webmanifest
  icons/
```

## Sistema de diseño (Tailwind)

- Colores en `tailwind.config.ts`: `finca-*` (verde cardamomo), `crema`,
  `tierra`, y estados `alerta` / `pendiente` / `listo`.
- Clases de componente en `globals.css`: `.toque-grande`, `.boton-primario`,
  `.boton-secundario`, `.boton-listo`, `.boton-alerta`, `.rejilla-botones`,
  `.tarjeta`.
- Touch targets mínimos ~4.5rem de alto. Tipografía grande por defecto.
- El `body` desactiva la selección de texto; usa `.seleccionable` donde de
  verdad haga falta (transcripciones, notas).

## Convenciones de código

- TypeScript estricto. Alias de import `@/*` → `src/*`.
- Componentes de servidor por defecto; `"use client"` solo donde haya estado o
  APIs del navegador (MediaRecorder, geolocation, Dexie).
- `src/lib/supabase/server.ts` usa `server-only` y el **service role**: nunca se
  importa desde el cliente.
- Nombres de dominio en español. Sin texto en inglés visible al usuario.
- Cada archivo aún no implementado deja un `TODO (Paso N)` que apunta al paso del
  plan que lo completa.

## Variables de entorno

Ver `.env.example`. En resumen:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (solo servidor), `ANTHROPIC_API_KEY`.

## Fuera de alcance de la v1

No construir (se conectan después, sobre una base que ya funcione): secado de
cardamomo, biofábrica, transformación primaria, operaciones satélite, chat
conversacional abierto con IA, notificaciones push, app nativa.

## Plan de trabajo (pausar al final de cada paso para revisión)

1. **Scaffolding** Next.js + Tailwind + PWA + estructura + este `CLAUDE.md`. ← **hecho**
2. Esquema SQL completo + migraciones + datos semilla (Supabase).
3. Capa offline: Dexie + cola de sincronización + service worker. Probar sin red.
4. App de campo: flujo de captura (área → actividad → audio/foto/jornales → listo).
5. Endpoint de sincronización + procesamiento con Claude (structured output).
6. Asistencia y destajo.
7. Panel del dueño: briefing, trazabilidad, costos.
8. Protocolos y capacitación contextual.
9. Deploy a Vercel + guía de instalación de la PWA en el Android de Emerson.

**No avanzar al siguiente paso sin confirmación del dueño.**

## Criterio de éxito

Emerson pasa un día entero sin señal, registra 8 actividades hablando y tomando
fotos, llega a la casa, la app sincroniza sola, y a la mañana siguiente el dueño
recibe un briefing completo y correcto sin haberle pedido nada a nadie.
