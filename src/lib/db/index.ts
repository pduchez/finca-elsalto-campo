/**
 * Capa offline (IndexedDB vía Dexie). ESTRUCTURA — se implementa en el Paso 3.
 *
 * Aquí vivirá la base local:
 *  - `registros`      (audio Blob, fotos Blob, GPS, jornales, estado sync)
 *  - `asistencia`
 *  - `tareas_destajo`
 *  - `vivero`
 *  - `cola_sync`      (orden de subida + reintentos con backoff)
 *  - `plan_dia`       (cacheado la noche anterior)
 *  - `protocolos`     (precargados para consulta sin señal)
 *  - catálogos cacheados: `areas`, `actividades`, `trabajadores`, `insumos`
 *
 * Reglas:
 *  - Cada registro lleva `uuid` del cliente (idempotencia; upsert en servidor).
 *  - Nada local se borra hasta confirmar el 200 del servidor.
 *  - El audio se procesa EN EL SERVIDOR al sincronizar, nunca en el cliente.
 *
 * TODO (Paso 3): definir `new Dexie(...)`, versionar el esquema y exponer los
 * helpers de lectura/escritura + la cola de sincronización.
 */

export {};
