"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./index";
import { hoyISO } from "./seed";

/** Catálogos cacheados (reactivos). */
export function useAreas() {
  return useLiveQuery(() => db().areas.toArray(), [], []);
}
export function useActividades() {
  return useLiveQuery(
    () => db().actividades.orderBy("orden").toArray(),
    [],
    [],
  );
}
export function useTrabajadores() {
  return useLiveQuery(
    () => db().trabajadores.filter((t) => t.activo).toArray(),
    [],
    [],
  );
}
export function useProtocolos() {
  return useLiveQuery(() => db().protocolos.orderBy("orden").toArray(), [], []);
}

/** Plan del día de hoy. */
export function usePlanHoy() {
  return useLiveQuery(
    () => db().plan_dia.where("fecha").equals(hoyISO()).toArray(),
    [],
    [],
  );
}

/** Conteo de pendientes por sincronizar (reactivo). */
export function useConteoPendientes(): number {
  const n = useLiveQuery(async () => {
    const base = db();
    const tablas = ["registros", "asistencia", "tareas_destajo", "consultas_protocolo"] as const;
    let total = 0;
    for (const t of tablas) {
      total += await base
        .table(t)
        .where("estadoSync")
        .anyOf("pendiente", "error")
        .count();
    }
    return total;
  }, [], 0);
  return n ?? 0;
}

/** Registros de hoy (para confirmar al usuario lo que lleva registrado). */
export function useRegistrosHoy() {
  return useLiveQuery(
    () =>
      db()
        .registros.where("fecha")
        .equals(hoyISO())
        .reverse()
        .sortBy("creado_en"),
    [],
    [],
  );
}
