"use client";

import Dexie, { type Table } from "dexie";
import type {
  Area,
  Actividad,
  Trabajador,
  Insumo,
  EstadoSync,
  Gps,
  AreaDetalle,
} from "@/lib/types";
export type { AreaDetalle };

/**
 * Base local (IndexedDB vía Dexie). Es la fuente de verdad en el campo:
 * todo se escribe aquí primero y NADA se borra hasta que el servidor confirma.
 * El audio y las fotos se guardan como Blob y se procesan en el servidor al
 * sincronizar (nunca en el cliente).
 */

/** Registro central, versión local (con blobs y estado de sync). */
export interface RegistroLocal extends Gps {
  id: string; // uuid del cliente (idempotencia)
  fecha: string; // YYYY-MM-DD
  creado_en: number; // epoch ms
  area_id: string | null;
  area_nombre?: string | null; // desnormalizado para mostrar offline
  actividad_id: string | null;
  actividad_codigo?: string | null;
  actividad_nombre?: string | null;
  usuario: string;
  audioBlob?: Blob | null;
  audioMime?: string | null;
  fotos: Blob[];
  jornales_usados: number | null;
  // Campos que llena Claude en el servidor (quedan vacíos en el cliente):
  audio_transcripcion?: string | null;
  cantidad?: number | null;
  unidad?: string | null;
  observaciones?: string | null;
  problema_detectado?: boolean;
  descripcion_problema?: string | null;
  insumo_agotado?: boolean;
  // Estado de sincronización
  estadoSync: EstadoSync;
  intentos: number;
  sincronizado_en?: number | null;
}

export interface AsistenciaLocal {
  id: string;
  fecha: string;
  trabajador_id: string;
  trabajador_nombre?: string;
  area_id: string | null;
  presente: boolean;
  registrado_por: string;
  estadoSync: EstadoSync;
  intentos: number;
  sincronizado_en?: number | null;
}

export interface TareaDestajoLocal {
  id: string;
  fecha: string;
  area_id: string | null;
  area_nombre?: string | null;
  actividad_id: string | null;
  actividad_nombre?: string | null;
  descripcion_unidad: string;
  precio_pactado: number;
  unidades_ejecutadas: number;
  trabajador_id: string | null;
  trabajador_nombre?: string | null;
  total_calculado: number; // precio * unidades (se calcula en el cliente para mostrar)
  estadoSync: EstadoSync;
  intentos: number;
  sincronizado_en?: number | null;
}

export interface PlanDiaLocal {
  id: string;
  fecha: string;
  area_id: string | null;
  area_nombre: string;
  actividad_id: string | null;
  actividad_nombre: string;
  nota?: string | null;
  completado: boolean;
}

export interface ProtocoloLocal {
  id: string;
  titulo: string;
  actividad_codigo?: string | null;
  disparador_keywords: string[];
  contenido_md: string;
  orden: number;
}

export interface ConsultaProtocoloLocal {
  id: string;
  protocolo_id: string;
  consultado_en: number;
  usuario: string;
  estadoSync: EstadoSync;
  intentos: number;
  sincronizado_en?: number | null;
}

// Ficha del área (linderos, tamaño, topografía, siembra). Ver AreaDetalle.
export interface AreaDetalleLocal extends AreaDetalle {
  estadoSync: EstadoSync;
  intentos: number;
  sincronizado_en?: number | null;
}

class FincaDB extends Dexie {
  registros!: Table<RegistroLocal, string>;
  asistencia!: Table<AsistenciaLocal, string>;
  tareas_destajo!: Table<TareaDestajoLocal, string>;
  plan_dia!: Table<PlanDiaLocal, string>;
  protocolos!: Table<ProtocoloLocal, string>;
  consultas_protocolo!: Table<ConsultaProtocoloLocal, string>;
  area_detalle!: Table<AreaDetalleLocal, string>;
  // Catálogos cacheados (para funcionar sin señal)
  areas!: Table<Area, string>;
  actividades!: Table<Actividad, string>;
  trabajadores!: Table<Trabajador, string>;
  insumos!: Table<Insumo, string>;

  constructor() {
    super("finca_el_salto");
    this.version(1).stores({
      // Índices por estadoSync y fecha para drenar la cola y armar el briefing.
      registros: "id, estadoSync, fecha, area_id, actividad_id",
      asistencia: "id, estadoSync, fecha, [fecha+trabajador_id]",
      tareas_destajo: "id, estadoSync, fecha",
      plan_dia: "id, fecha, [fecha+area_id+actividad_id]",
      protocolos: "id, actividad_codigo, orden",
      consultas_protocolo: "id, estadoSync, protocolo_id",
      areas: "id, nombre",
      actividades: "id, codigo, orden",
      trabajadores: "id, nombre",
      insumos: "id, nombre, tipo",
    });
    // v2: ficha del área (linderos GPS, tamaño, topografía, siembra).
    this.version(2).stores({
      area_detalle: "area_id, estadoSync",
    });
  }
}

// Instancia única, solo en el navegador.
let _db: FincaDB | null = null;
export function db(): FincaDB {
  if (typeof window === "undefined") {
    throw new Error("La base local solo existe en el navegador.");
  }
  if (!_db) _db = new FincaDB();
  return _db;
}

/** Tablas que participan en la cola de sincronización. */
export const TABLAS_SYNC = [
  "registros",
  "asistencia",
  "tareas_destajo",
  "consultas_protocolo",
  "area_detalle",
] as const;
export type TablaSync = (typeof TABLAS_SYNC)[number];
