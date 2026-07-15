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
  if (tabla === "asistencia") {
    // La foto de asistencia es Blob local: se envía el conteo, no el archivo.
    const { foto, ...resto } = item;
    return { ...resto, tiene_foto: !!foto };
  }
  if (tabla === "area_detalle") {
    // La ficha del área se identifica por area_id; el servidor upserta por ahí.
    // Las fotos van como Blob local: se envía solo el conteo (se suben aparte).
    const { fotos, ...resto } = item;
    return { ...resto, id: item.area_id, num_fotos: Array.isArray(fotos) ? fotos.length : 0 };
  }
  return item;
}

/**
 * Sube a Storage el audio/fotos de las filas YA sincronizadas (los datos van
 * primero; los archivos después). Es idempotente en el servidor. Marca
 * `archivosSubidos` local solo tras confirmación, y nunca borra los Blob.
 */
async function subirUno(
  tabla: "registros" | "asistencia" | "area_detalle",
  id: string,
  opts: { audio?: Blob | null; fotos: Blob[]; meta?: Record<string, string | null | undefined> },
): Promise<{ ok: boolean; derivados?: Record<string, unknown> | null }> {
  const fd = new FormData();
  fd.set("tabla", tabla === "area_detalle" ? "areas_detalle" : tabla);
  fd.set("id", id);
  if (opts.audio) fd.set("audio", opts.audio, "audio");
  for (const f of opts.fotos) fd.append("foto", f, "foto");
  if (opts.meta) {
    for (const [k, v] of Object.entries(opts.meta)) if (v) fd.set(k, v);
  }
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) return { ok: false };
    const data = await res.json().catch(() => ({}));
    return { ok: true, derivados: data?.derivados ?? null };
  } catch {
    return { ok: false };
  }
}

export async function subirArchivos(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const base = db();
  let subidos = 0;

  const regs = await base.registros.where("estadoSync").equals("sincronizado").toArray();
  for (const r of regs) {
    if (r.archivosSubidos) continue;
    const fotos = Array.isArray(r.fotos) ? r.fotos : [];
    if (!r.audioBlob && fotos.length === 0) {
      await base.registros.update(r.id, { archivosSubidos: true });
      continue;
    }
    const resReg = await subirUno("registros", r.id, {
      audio: r.audioBlob,
      fotos,
      meta: { area_nombre: r.area_nombre, actividad_nombre: r.actividad_nombre },
    });
    if (resReg.ok) {
      // Guardamos la transcripción y los datos extraídos en la base local para
      // que se vean en el historial del área (el teléfono lee de local).
      await base.registros.update(r.id, {
        archivosSubidos: true,
        ...(resReg.derivados ?? {}),
      });
      subidos++;
    }
  }

  const asis = await base.asistencia.where("estadoSync").equals("sincronizado").toArray();
  for (const a of asis) {
    if (a.archivosSubidos) continue;
    if (!a.foto) {
      await base.asistencia.update(a.id, { archivosSubidos: true });
      continue;
    }
    if ((await subirUno("asistencia", a.id, { fotos: [a.foto] })).ok) {
      await base.asistencia.update(a.id, { archivosSubidos: true });
      subidos++;
    }
  }

  const areas = await base.area_detalle.where("estadoSync").equals("sincronizado").toArray();
  for (const d of areas) {
    if (d.archivosSubidos) continue;
    const fotos = Array.isArray(d.fotos) ? d.fotos : [];
    if (fotos.length === 0) {
      await base.area_detalle.update(d.area_id, { archivosSubidos: true });
      continue;
    }
    if ((await subirUno("area_detalle", d.area_id, { fotos })).ok) {
      await base.area_detalle.update(d.area_id, { archivosSubidos: true });
      subidos++;
    }
  }
  return subidos;
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
      // La clave primaria varía por tabla (registros usa `id`, area_detalle `area_id`).
      const pk = String(base.table(tabla).schema.primKey.keyPath);
      for (const item of pendientes) {
        const clave = (item as Record<string, unknown>)[pk] as string;
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
          await base.table(tabla).update(clave, {
            estadoSync: "sincronizado",
            sincronizado_en: Date.now(),
          });
          enviados++;
        } catch {
          // Nunca se propaga al usuario: se reintenta luego.
          await base.table(tabla).update(clave, {
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
    // Con los datos arriba, subimos audio/fotos a Storage (idempotente).
    await subirArchivos();
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
