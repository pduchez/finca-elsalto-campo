import "server-only";
import { crearClienteServicio } from "@/lib/supabase/server";
import { panelConfigurado } from "./datos";

/**
 * Vistas detalladas para los directores: TODO lo que se registra a diario,
 * con filtros por fecha y actividad, más el padrón de colaboradores y la
 * asistencia diaria. Lee de Supabase en el servidor (service role).
 */

async function sel(builder: any): Promise<any[]> {
  try {
    const { data, error } = await builder;
    return error ? [] : (data ?? []);
  } catch {
    return [];
  }
}

export interface ActividadOpc {
  id: string;
  codigo: string;
  nombre: string;
}

export interface RegistroDetalle {
  fecha: string;
  hora: string | null;
  area: string;
  actividad: string;
  codigo: string;
  usuario: string;
  cantidad: number | null;
  unidad: string | null;
  jornales: number | null;
  observaciones: string | null;
  problema: boolean;
  descripcionProblema: string | null;
  tieneFoto: boolean;
}

export interface FilaAsistencia {
  trabajador: string;
  area: string | null;
  presente: boolean;
  hora: string | null;
  verificado: boolean;
  similitud: number | null;
  foto: boolean;
}
export interface AsistenciaDia {
  fecha: string;
  presentes: number;
  total: number;
  verificados: number;
  filas: FilaAsistencia[];
}

export interface Colaborador {
  nombre: string;
  tipo: string | null;
  activo: boolean;
  tieneRostro: boolean;
  diasAsistidos: number;
}

/** Lista de actividades para poblar el filtro. */
export async function listarActividades(): Promise<ActividadOpc[]> {
  if (!panelConfigurado()) return [];
  const supa = crearClienteServicio();
  const acts = await sel(supa.from("actividades").select("id,codigo,nombre,orden").order("orden", { ascending: true }));
  return acts.map((a: any) => ({ id: a.id, codigo: a.codigo, nombre: a.nombre }));
}

/** Todos los registros del período (filtrable por actividad, por su código). */
export async function obtenerRegistros(
  desde: string,
  hasta: string,
  codigo?: string,
): Promise<{ configurado: boolean; registros: RegistroDetalle[] }> {
  if (!panelConfigurado()) return { configurado: false, registros: [] };
  const supa = crearClienteServicio();

  const [areas, actividades] = await Promise.all([
    sel(supa.from("areas").select("id,nombre")),
    sel(supa.from("actividades").select("id,codigo,nombre,unidad_medida")),
  ]);
  const nombreArea = new Map<string, string>(areas.map((a: any) => [a.id, a.nombre]));
  const act = new Map<string, { codigo: string; nombre: string; unidad: string | null }>(
    actividades.map((a: any) => [a.id, { codigo: a.codigo, nombre: a.nombre, unidad: a.unidad_medida }]),
  );
  const idPorCodigo = new Map<string, string>(actividades.map((a: any) => [a.codigo, a.id]));

  let q = supa
    .from("registros")
    .select(
      "fecha,creado_en,area_id,actividad_id,usuario,cantidad,unidad,jornales_usados,observaciones,problema_detectado,descripcion_problema,fotos",
    )
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(2000);
  if (codigo && idPorCodigo.has(codigo)) q = q.eq("actividad_id", idPorCodigo.get(codigo));

  const filas = await sel(q);
  const registros: RegistroDetalle[] = filas.map((r: any) => {
    const a = act.get(r.actividad_id);
    return {
      fecha: r.fecha,
      hora: r.creado_en ?? null,
      area: nombreArea.get(r.area_id) ?? "—",
      actividad: a?.nombre ?? "actividad",
      codigo: a?.codigo ?? "",
      usuario: r.usuario ?? "—",
      cantidad: r.cantidad != null ? Number(r.cantidad) : null,
      unidad: a?.unidad ?? r.unidad ?? null,
      jornales: r.jornales_usados != null ? Number(r.jornales_usados) : null,
      observaciones: r.observaciones ?? null,
      problema: !!r.problema_detectado,
      descripcionProblema: r.descripcion_problema ?? null,
      tieneFoto: Array.isArray(r.fotos) && r.fotos.length > 0,
    };
  });
  return { configurado: true, registros };
}

/** Asistencia diaria del período, agrupada por día (más reciente primero). */
export async function obtenerAsistencia(
  desde: string,
  hasta: string,
): Promise<{ configurado: boolean; dias: AsistenciaDia[] }> {
  if (!panelConfigurado()) return { configurado: false, dias: [] };
  const supa = crearClienteServicio();

  const [areas, trabajadores, filas] = await Promise.all([
    sel(supa.from("areas").select("id,nombre")),
    sel(supa.from("trabajadores").select("id,nombre")),
    sel(
      supa
        .from("asistencia")
        .select("fecha,trabajador_id,area_id,presente,hora,verificado_rostro,similitud,evidencia_foto,foto_url")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false })
        .limit(5000),
    ),
  ]);
  const nombreArea = new Map<string, string>(areas.map((a: any) => [a.id, a.nombre]));
  const nombreTrab = new Map<string, string>(trabajadores.map((t: any) => [t.id, t.nombre]));

  const porDia = new Map<string, FilaAsistencia[]>();
  for (const a of filas as any[]) {
    if (!porDia.has(a.fecha)) porDia.set(a.fecha, []);
    porDia.get(a.fecha)!.push({
      trabajador: nombreTrab.get(a.trabajador_id) ?? "—",
      area: a.area_id ? nombreArea.get(a.area_id) ?? "—" : null,
      presente: !!a.presente,
      hora: a.hora ?? null,
      verificado: !!a.verificado_rostro,
      similitud: a.similitud != null ? Number(a.similitud) : null,
      foto: !!a.evidencia_foto || !!a.foto_url,
    });
  }
  const dias: AsistenciaDia[] = [...porDia.entries()].map(([fecha, fs]) => {
    const presentes = fs.filter((f) => f.presente).length;
    return {
      fecha,
      total: fs.length,
      presentes,
      verificados: fs.filter((f) => f.presente && f.verificado).length,
      filas: fs.sort((a, b) => a.trabajador.localeCompare(b.trabajador)),
    };
  });
  dias.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { configurado: true, dias };
}

/** Padrón de colaboradores + días asistidos en el período. */
export async function obtenerColaboradores(
  desde: string,
  hasta: string,
): Promise<{ configurado: boolean; colaboradores: Colaborador[] }> {
  if (!panelConfigurado()) return { configurado: false, colaboradores: [] };
  const supa = crearClienteServicio();

  const [trabajadores, asistencia] = await Promise.all([
    sel(supa.from("trabajadores").select("id,nombre,tipo,activo,face_descriptor").order("nombre", { ascending: true })),
    sel(
      supa
        .from("asistencia")
        .select("trabajador_id,fecha,presente")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .limit(5000),
    ),
  ]);
  const dias = new Map<string, Set<string>>();
  for (const a of asistencia as any[]) {
    if (!a.presente) continue;
    if (!dias.has(a.trabajador_id)) dias.set(a.trabajador_id, new Set());
    dias.get(a.trabajador_id)!.add(a.fecha);
  }
  const colaboradores: Colaborador[] = (trabajadores as any[]).map((t) => ({
    nombre: t.nombre,
    tipo: t.tipo ?? null,
    activo: t.activo !== false,
    tieneRostro: t.face_descriptor != null,
    diasAsistidos: dias.get(t.id)?.size ?? 0,
  }));
  return { configurado: true, colaboradores };
}
