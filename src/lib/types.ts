/**
 * Tipos del dominio, alineados con el esquema de Supabase/Postgres.
 * (El esquema SQL completo se define en el Paso 2.)
 */

export type Uuid = string;

export type EstadoSync = "pendiente" | "sincronizando" | "sincronizado" | "error";

export type UnidadMedida =
  | "matas"
  | "manzanas"
  | "quintales"
  | "jornales"
  | "litros"
  | "plantas";

export type CodigoActividad =
  | "limpias"
  | "sombra"
  | "bocashi"
  | "bioles"
  | "fitosanitario"
  | "corte"
  | "jornales"
  | "vivero";

export interface Area {
  id: Uuid;
  nombre: string;
  hectareas?: number | null;
  activa: boolean;
}

export interface Actividad {
  id: Uuid;
  codigo: CodigoActividad;
  nombre: string;
  unidad_medida?: UnidadMedida | null;
  requiere_insumo: boolean;
  orden?: number | null;
}

export interface Insumo {
  id: Uuid;
  nombre: string;
  tipo?: "bocashi" | "biol" | "otro" | null;
  unidad?: string | null;
  subtipo?: string | null;
  descripcion_uso?: string | null;
  activo: boolean;
}

export interface Trabajador {
  id: Uuid;
  nombre: string;
  tipo: "planilla" | "tarea" | "mixto";
  activo: boolean;
}

export interface Gps {
  latitud: number | null;
  longitud: number | null;
  precision_gps: number | null;
}

export interface InsumoUsado {
  nombre: string;
  cantidad: number | null;
  unidad: string | null;
}

/**
 * Extracción estructurada que produce Claude a partir del audio.
 * Regla dura: si un dato no se dijo, va `null`. Nunca se inventa.
 */
export interface ExtraccionClaude {
  cantidad: number | null;
  unidad: string | null;
  jornales_usados: number | null;
  insumos_usados: InsumoUsado[];
  observaciones: string | null;
  problema_detectado: boolean;
  descripcion_problema: string | null;
  insumo_agotado: boolean;
  confianza: number; // 0-1
}

/** Registro central de un evento de campo (tabla `registros`). */
export interface Registro extends Gps {
  id: Uuid; // uuid del cliente (idempotencia)
  fecha: string; // ISO date
  area_id: Uuid | null;
  actividad_id: Uuid | null;
  usuario: string;
  audio_url?: string | null;
  audio_transcripcion?: string | null;
  fotos: string[];
  cantidad?: number | null;
  unidad?: string | null;
  jornales_usados?: number | null;
  observaciones?: string | null;
  problema_detectado?: boolean;
  descripcion_problema?: string | null;
  insumo_agotado?: boolean;
  extraccion_confianza?: number | null;
  requiere_revision?: boolean;
  procesado?: boolean;
}
