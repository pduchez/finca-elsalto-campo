/**
 * Extracción estructurada con Claude. ESTRUCTURA — se implementa en el Paso 5.
 *
 * Server-side, al sincronizar cada registro pendiente:
 *  1. Transcribe el audio.
 *  2. Pasa la transcripción a `claude-sonnet-4-6` y fuerza el esquema con
 *     tool use / structured output (nunca regex sobre texto libre).
 *  3. Devuelve `ExtraccionClaude` (ver src/lib/types.ts).
 *  4. Si `confianza < 0.7` → `requiere_revision = true` y alerta al dueño.
 *  5. `claude-haiku-4-5` queda para clasificaciones simples.
 *
 * Regla dura: Claude estructura lo que Emerson dijo. No completa, no supone,
 * no rellena. Si no se dice, el campo va `null`.
 *
 * TODO (Paso 5): implementar el endpoint y la llamada al SDK de Anthropic.
 */

export {};
