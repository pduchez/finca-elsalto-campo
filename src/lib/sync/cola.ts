/**
 * Cola de sincronización. ESTRUCTURA — se implementa en el Paso 3.
 *
 * Al detectar conexión (`navigator.onLine` + reintentos con backoff):
 *  1. Sube los registros pendientes EN ORDEN.
 *  2. Sube audio/fotos a Supabase Storage.
 *  3. Hace upsert por `uuid` (idempotente) contra el endpoint de sync.
 *  4. Marca `sincronizado` solo tras un 200 confirmado del servidor.
 *  5. NUNCA borra el registro local antes de esa confirmación.
 *
 * Emerson nunca ve un error de red: los fallos se reintentan en silencio.
 *
 * TODO (Paso 3): implementar el drenado de la cola, el backoff exponencial y la
 * suscripción a los eventos `online`/`offline`.
 */

export {};
