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

/** Un vértice del lindero del área, capturado con GPS caminando el terreno. */
export interface Vertice {
  orden: number;
  latitud: number;
  longitud: number;
  altitud: number | null; // metros s.n.m. (referencia; el GPS de celular es impreciso en altura)
  precision_gps: number | null;
  tipo: "esquina" | "quiebre";
  capturado_en: number; // epoch ms
}

export type ClasificacionTopografia = "plano" | "ladera" | "quebrado" | "mixto";

export interface Topografia {
  clasificacion: ClasificacionTopografia | null;
  alt_min: number | null;
  alt_max: number | null;
  pendiente_pct: number | null; // pendiente estimada desde la altitud GPS (referencia)
}

/**
 * Ficha de un área: linderos GPS, tamaño calculado, topografía y datos de
 * siembra. Emerson la va llenando en campo; se sincroniza como el resto.
 */
export interface AreaDetalle {
  area_id: Uuid;
  vertices: Vertice[];
  // Calculados a partir del polígono
  area_m2: number | null;
  area_manzanas: number | null;
  area_hectareas: number | null;
  perimetro_m: number | null;
  centro_lat: number | null;
  centro_lon: number | null;
  topografia: Topografia;
  // Datos de siembra
  manzanas_sembradas: number | null;
  variedad: string | null;
  anio_siembra: number | null; // para calcular la edad
  densidad_matas_mz: number | null;
  matas_estimadas: number | null;
  meta_produccion_qq: number | null; // meta de quintales para el área
  notas: string | null;
  actualizado_en: number;
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
