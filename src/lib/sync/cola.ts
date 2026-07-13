"use client";

import { db, TABLAS_SYNC, type TablaSync } from "@/lib/db";

/**
 * Cola de sincronización. Al haber conexión, sube en orden lo pendiente,
 * marca `sincronizado` SOLO tras un 200 confirmado, y nunca borra nada local.
 * Emerson jamás ve un error de red: los fallos se reintentan con backoff.
 */

const MAX_INTENTOS = 8;

function backoffMs(intentos: number): number {
  // 2s, 4s, 8s ... hasta 5 min
  return Math.min(2000 * 2 ** intentos, 5 * 60 * 1000);
}

/** Cuenta los registros pendientes (o con error) en todas las tablas sync. */
export async function contarPendientes(): Promise<number> {
  const base = db();
  let total = 0;
  for (const t of TABLAS_SYNC) {
    total += await base
      .table(t)
      .where("estadoSync")
      .anyOf("pendiente", "error")
      .count();
  }
  return total;
}

/** Convierte una fila local a payload de red (sin blobs; estos van aparte). */
function aPayload(tabla: TablaSync, item: any) {
  if (tabla === "registros") {
    const { audioBlob, fotos, ...resto } = item;
    return {
      ...resto,
      tiene_audio: !!audioBlob,
      num_fotos: Array.isArray(fotos) ? fotos.length : 0,
    };
  }
  return item;
}

let sincronizando = false;

/**
 * Drena la cola una vez. Devuelve cuántos se enviaron.
 * Idempotente en el servidor (upsert por uuid): correr dos veces no duplica.
 */
export async function sincronizar(): Promise<{ enviados: number; pendientes: number }> {
  if (sincronizando) return { enviados: 0, pendientes: await contarPendientes() };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { enviados: 0, pendientes: await contarPendientes() };
  }
  sincronizando = true;
  let enviados = 0;
  try {
    const base = db();
    const ahora = Date.now();
    for (const tabla of TABLAS_SYNC) {
      const pendientes = await base
        .table(tabla)
        .where("estadoSync")
        .anyOf("pendiente", "error")
        .toArray();
      for (const item of pendientes) {
        // Respeta el backoff: si falló hace poco, esperamos.
        if (
          item.estadoSync === "error" &&
          item.sincronizado_en == null &&
          item.ultimo_intento_en &&
          ahora - item.ultimo_intento_en < backoffMs(item.intentos ?? 0)
        ) {
          continue;
        }
        try {
          const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo: tabla, item: aPayload(tabla, item) }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await base.table(tabla).update(item.id, {
            estadoSync: "sincronizado",
            sincronizado_en: Date.now(),
          });
          enviados++;
        } catch {
          // Nunca se propaga al usuario: se reintenta luego.
          await base.table(tabla).update(item.id, {
            estadoSync: "error",
            intentos: (item.intentos ?? 0) + 1,
            ultimo_intento_en: Date.now(),
          });
          if ((item.intentos ?? 0) + 1 >= MAX_INTENTOS) {
            // Se queda como 'error'; el panel del dueño lo verá para revisión.
          }
        }
      }
    }
  } finally {
    sincronizando = false;
  }
  return { enviados, pendientes: await contarPendientes() };
}

/** Arranca la sincronización automática: al cargar, al volver la señal, y cada 30s. */
export function iniciarAutoSync(alCambiar?: () => void): () => void {
  const tick = async () => {
    await sincronizar();
    alCambiar?.();
  };
  const alVolverSenal = () => void tick();
  window.addEventListener("online", alVolverSenal);
  const intervalo = window.setInterval(() => void tick(), 30000);
  void tick();
  return () => {
    window.removeEventListener("online", alVolverSenal);
    window.clearInterval(intervalo);
  };
}
