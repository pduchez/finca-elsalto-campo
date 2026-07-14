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
/** Todos los colaboradores (activos e inactivos) para gestionar la base. */
export function useTodosTrabajadores() {
  return useLiveQuery(() => db().trabajadores.orderBy("nombre").toArray(), [], []);
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

/** Ficha de un área (linderos, tamaño, topografía, siembra). */
export function useAreaDetalle(areaId: string) {
  return useLiveQuery(() => db().area_detalle.get(areaId), [areaId], undefined);
}

export interface ConsolidadoArea {
  totalRegistros: number;
  ultimaActividad: { nombre: string; fecha: string } | null;
  diasSinActividad: number | null;
  jornalesAcumulados: number;
  quintalesCortados: number;
  ultimasAplicaciones: { actividad: string; cantidad: number | null; unidad: string | null; fecha: string }[];
  problemasAbiertos: { descripcion: string; fecha: string }[];
}

/** Consolida lo que Emerson reportó a diario para un área. */
export function useConsolidadoArea(areaId: string): ConsolidadoArea | undefined {
  return useLiveQuery(
    async () => {
      const regs = await db().registros.where("area_id").equals(areaId).toArray();
      regs.sort((a, b) => b.creado_en - a.creado_en);
      const ultimo = regs[0];
      const dias = ultimo
        ? Math.floor((Date.now() - ultimo.creado_en) / 86400000)
        : null;
      const jornales = regs.reduce((s, r) => s + (r.jornales_usados ?? 0), 0);
      const quintales = regs
        .filter((r) => r.actividad_codigo === "corte")
        .reduce((s, r) => s + (r.cantidad ?? 0), 0);
      const aplic = regs
        .filter((r) => ["bocashi", "bioles"].includes(r.actividad_codigo ?? ""))
        .slice(0, 5)
        .map((r) => ({
          actividad: r.actividad_nombre ?? "",
          cantidad: r.cantidad ?? null,
          unidad: r.unidad ?? null,
          fecha: r.fecha,
        }));
      const problemas = regs
        .filter((r) => r.problema_detectado)
        .slice(0, 5)
        .map((r) => ({
          descripcion: r.descripcion_problema ?? r.observaciones ?? "Problema reportado",
          fecha: r.fecha,
        }));
      return {
        totalRegistros: regs.length,
        ultimaActividad: ultimo
          ? { nombre: ultimo.actividad_nombre ?? "", fecha: ultimo.fecha }
          : null,
        diasSinActividad: dias,
        jornalesAcumulados: jornales,
        quintalesCortados: quintales,
        ultimasAplicaciones: aplic,
        problemasAbiertos: problemas,
      };
    },
    [areaId],
    undefined,
  );
}

/** Tareas a destajo (más recientes primero). */
export function useTareasDestajo() {
  return useLiveQuery(
    async () => (await db().tareas_destajo.toArray()).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [],
    [],
  );
}

/** Historial completo de registros de un área (más reciente primero). */
export function useRegistrosArea(areaId: string) {
  return useLiveQuery(
    async () => {
      const regs = await db().registros.where("area_id").equals(areaId).toArray();
      return regs.sort((a, b) => b.creado_en - a.creado_en);
    },
    [areaId],
    [],
  );
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
