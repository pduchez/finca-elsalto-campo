import "server-only";
import { crearClienteServicio } from "@/lib/supabase/server";

/**
 * Capa de datos del panel del dueño. Lee de Supabase EN EL SERVIDOR (con el
 * service role, autorizado por la sesión de director) y arma los reportes.
 * Si Supabase no está configurado, devuelve un resumen vacío (sin romper).
 */

export function panelConfigurado(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const BUCKET = "capturas";
// Actividades que son "campaña" de manejo (el corte va aparte, en Cosecha).
const CODIGOS_CAMPANA = ["limpias", "sombra", "bocashi", "bioles", "fitosanitario"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function haceDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}
function semanaDe(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const jueves = new Date(dt);
  jueves.setDate(dt.getDate() - ((dt.getDay() + 6) % 7) + 3);
  const primero = new Date(jueves.getFullYear(), 0, 1);
  const semana = 1 + Math.round(((jueves.getTime() - primero.getTime()) / 86400000 - 3 + ((primero.getDay() + 6) % 7)) / 7);
  return `${jueves.getFullYear()}-S${pad(semana)}`;
}

export interface AreaCosecha {
  area: string;
  qq: number;
  meta: number | null;
  pct: number | null;
  ultimo: string | null;
}
export interface Campana {
  codigo: string;
  nombre: string;
  mzHechas: number;
  mzTotal: number;
  pct: number;
  areasHechas: string[];
  areasFaltan: string[];
}
export interface FotoPanel {
  url: string;
  area: string;
  actividad: string;
  fecha: string;
  nota: string | null;
  problema: boolean;
}
export interface ResumenPanel {
  configurado: boolean;
  rango: { desde: string; hasta: string };
  hoy: {
    fecha: string;
    registros: number;
    presentes: number;
    verificados: number;
    areas: { nombre: string; actividades: string[] }[];
  };
  campanas: Campana[];
  cosecha: {
    totalQq: number;
    metaTotalQq: number;
    pctTotal: number;
    ultimo: { area: string; fecha: string; qq: number } | null;
    porArea: AreaCosecha[];
    porSemana: { semana: string; qq: number }[];
  };
  alertas: {
    problemas: { area: string; descripcion: string; fecha: string }[];
    areasSinActividad: { area: string; dias: number | null }[];
  };
  fotos: FotoPanel[];
  // Últimos registros del campo (lo que Emerson y todos van cargando), para que
  // el dueño vea la actividad aunque no sea de hoy.
  recientes: {
    fecha: string;
    area: string;
    actividad: string;
    usuario: string;
    cantidad: number | null;
    unidad: string | null;
    problema: boolean;
  }[];
}

/** Resuelve el rango pedido (o el de por defecto: últimos 30 días). */
export function resolverRango(sp?: { desde?: string; hasta?: string }): { desde: string; hasta: string } {
  const hasta = sp?.hasta && /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta) ? sp.hasta : iso(new Date());
  const desde = sp?.desde && /^\d{4}-\d{2}-\d{2}$/.test(sp.desde) ? sp.desde : haceDias(30);
  return desde <= hasta ? { desde, hasta } : { desde: hasta, hasta: desde };
}

function vacio(desde: string, hasta: string): ResumenPanel {
  return {
    configurado: false,
    rango: { desde, hasta },
    hoy: { fecha: iso(new Date()), registros: 0, presentes: 0, verificados: 0, areas: [] },
    campanas: [],
    cosecha: { totalQq: 0, metaTotalQq: 0, pctTotal: 0, ultimo: null, porArea: [], porSemana: [] },
    alertas: { problemas: [], areasSinActividad: [] },
    fotos: [],
    recientes: [],
  };
}

export async function obtenerResumen(desde: string, hasta: string): Promise<ResumenPanel> {
  if (!panelConfigurado()) return vacio(desde, hasta);
  const hoy = iso(new Date());
  try {
    const supa = crearClienteServicio();

    // Cada consulta es independiente: si una falla (p. ej. falta una columna
    // por una migración pendiente), el resto del panel igual se muestra.
    const sel = async (builder: any): Promise<any[]> => {
      try {
        const { data, error } = await builder;
        return error ? [] : (data ?? []);
      } catch {
        return [];
      }
    };
    const CAMPOS = "id,fecha,creado_en,area_id,actividad_id,usuario,cantidad,unidad,jornales_usados,problema_detectado,descripcion_problema,observaciones,fotos";

    // `registros` = los del período elegido (reportes). `regHoy` = siempre hoy.
    const [areas, detalles, actividades, registros, regHoy, asistencia] = await Promise.all([
      sel(supa.from("areas").select("id,nombre,activa")),
      sel(supa.from("areas_detalle").select("area_id,manzanas_sembradas,meta_produccion_qq")),
      sel(supa.from("actividades").select("id,codigo,nombre,unidad_medida")),
      sel(
        supa
          .from("registros")
          .select(CAMPOS)
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("creado_en", { ascending: false })
          .limit(5000),
      ),
      sel(supa.from("registros").select(CAMPOS).eq("fecha", hoy)),
      sel(supa.from("asistencia").select("trabajador_id,presente,verificado_rostro").eq("fecha", hoy)),
    ]);

    const nombreArea = new Map<string, string>(areas.map((a: any) => [a.id, a.nombre]));
    const act = new Map<string, { codigo: string; nombre: string; unidad: string | null }>(
      actividades.map((a: any) => [a.id, { codigo: a.codigo, nombre: a.nombre, unidad: a.unidad_medida }]),
    );
    const mzSembrada = new Map<string, number>();
    const metaArea = new Map<string, number>();
    for (const d of detalles as any[]) {
      if (d.manzanas_sembradas) mzSembrada.set(d.area_id, Number(d.manzanas_sembradas));
      if (d.meta_produccion_qq) metaArea.set(d.area_id, Number(d.meta_produccion_qq));
    }
    const mzTotal = [...mzSembrada.values()].reduce((s, x) => s + x, 0);

    // ---- HOY (independiente del rango) ----
    const areasHoy = new Map<string, Set<string>>();
    for (const r of regHoy as any[]) {
      const an = nombreArea.get(r.area_id) ?? "—";
      const ac = act.get(r.actividad_id)?.nombre ?? "actividad";
      if (!areasHoy.has(an)) areasHoy.set(an, new Set());
      areasHoy.get(an)!.add(ac);
    }
    const presentes = asistencia.filter((a: any) => a.presente).length;
    const verificados = asistencia.filter((a: any) => a.presente && a.verificado_rostro).length;

    // ---- CAMPAÑAS (dentro del período elegido) ----
    const campanas: Campana[] = [];
    for (const codigo of CODIGOS_CAMPANA) {
      const regs = registros.filter((r: any) => act.get(r.actividad_id)?.codigo === codigo);
      if (regs.length === 0) continue;
      const areasHechasIds = new Set<string>(regs.map((r: any) => r.area_id).filter(Boolean));
      let mzHechas = 0;
      const nombresHechas: string[] = [];
      for (const id of areasHechasIds) {
        mzHechas += mzSembrada.get(id) ?? 0;
        nombresHechas.push(nombreArea.get(id) ?? "—");
      }
      const areasFaltan = [...mzSembrada.keys()]
        .filter((id) => !areasHechasIds.has(id))
        .map((id) => nombreArea.get(id) ?? "—");
      campanas.push({
        codigo,
        nombre: actividades.find((a: any) => a.codigo === codigo)?.nombre ?? codigo,
        mzHechas: Math.round(mzHechas * 100) / 100,
        mzTotal: Math.round(mzTotal * 100) / 100,
        pct: mzTotal > 0 ? Math.round((mzHechas / mzTotal) * 100) : 0,
        areasHechas: nombresHechas,
        areasFaltan,
      });
    }

    // ---- COSECHA (corte) ----
    const cortes = registros.filter((r: any) => act.get(r.actividad_id)?.codigo === "corte");
    const porAreaMap = new Map<string, { qq: number; ultimo: string | null }>();
    let totalQq = 0;
    for (const r of cortes as any[]) {
      const qq = Number(r.cantidad ?? 0);
      totalQq += qq;
      const cur = porAreaMap.get(r.area_id) ?? { qq: 0, ultimo: null };
      cur.qq += qq;
      if (!cur.ultimo || r.fecha > cur.ultimo) cur.ultimo = r.fecha;
      porAreaMap.set(r.area_id, cur);
    }
    const porArea: AreaCosecha[] = [...porAreaMap.entries()].map(([id, v]) => {
      const meta = metaArea.get(id) ?? null;
      return {
        area: nombreArea.get(id) ?? "—",
        qq: Math.round(v.qq * 100) / 100,
        meta,
        pct: meta ? Math.round((v.qq / meta) * 100) : null,
        ultimo: v.ultimo,
      };
    });
    porArea.sort((a, b) => b.qq - a.qq);
    const metaTotalQq = [...metaArea.values()].reduce((s, x) => s + x, 0);
    const semanas = new Map<string, number>();
    for (const r of cortes as any[]) {
      const s = semanaDe(r.fecha);
      semanas.set(s, (semanas.get(s) ?? 0) + Number(r.cantidad ?? 0));
    }
    const porSemana = [...semanas.entries()]
      .map(([semana, qq]) => ({ semana, qq: Math.round(qq * 100) / 100 }))
      .sort((a, b) => a.semana.localeCompare(b.semana))
      .slice(-8);
    const ultimoCorte = cortes[0] as any;

    // ---- ALERTAS ----
    const problemas = (registros.filter((r: any) => r.problema_detectado) as any[])
      .slice(0, 10)
      .map((r) => ({
        area: nombreArea.get(r.area_id) ?? "—",
        descripcion: r.descripcion_problema ?? r.observaciones ?? "Problema reportado",
        fecha: r.fecha,
      }));
    const ultimoPorArea = new Map<string, string>();
    for (const r of registros as any[]) {
      const cur = ultimoPorArea.get(r.area_id);
      if (!cur || r.fecha > cur) ultimoPorArea.set(r.area_id, r.fecha);
    }
    const areasSinActividad = [...mzSembrada.keys()]
      .map((id) => {
        const ult = ultimoPorArea.get(id);
        const dias = ult ? Math.round((Date.now() - new Date(ult).getTime()) / 86400000) : null;
        return { area: nombreArea.get(id) ?? "—", dias };
      })
      .filter((x) => x.dias === null || x.dias >= 10)
      .sort((a, b) => (b.dias ?? 999) - (a.dias ?? 999));

    // ---- ACTIVIDAD RECIENTE (lo que el campo va cargando) ----
    // `registros` viene ordenado por creado_en desc; mostramos lo último.
    const recientes = (registros as any[]).slice(0, 20).map((r) => ({
      fecha: r.fecha,
      area: nombreArea.get(r.area_id) ?? "—",
      actividad: act.get(r.actividad_id)?.nombre ?? "actividad",
      usuario: r.usuario ?? "—",
      cantidad: r.cantidad != null ? Number(r.cantidad) : null,
      unidad: act.get(r.actividad_id)?.unidad ?? r.unidad ?? null,
      problema: !!r.problema_detectado,
    }));

    // ---- FOTOS (estado de planta) ----
    // Si el firmado de URLs falla, NO debe tumbar todo el panel: lo aislamos.
    const conFoto = (registros as any[]).filter((r) => Array.isArray(r.fotos) && r.fotos.length > 0).slice(0, 12);
    const rutas = conFoto.map((r) => r.fotos[0] as string);
    let fotos: FotoPanel[] = [];
    if (rutas.length > 0) {
      try {
        const { data: firmadas } = await supa.storage.from(BUCKET).createSignedUrls(rutas, 3600);
        fotos = conFoto.map((r, i) => ({
          url: firmadas?.[i]?.signedUrl ?? "",
          area: nombreArea.get(r.area_id) ?? "—",
          actividad: act.get(r.actividad_id)?.nombre ?? "—",
          fecha: r.fecha,
          nota: r.descripcion_problema ?? r.observaciones ?? null,
          problema: !!r.problema_detectado,
        })).filter((f) => f.url);
      } catch {
        fotos = [];
      }
    }

    return {
      configurado: true,
      rango: { desde, hasta },
      hoy: {
        fecha: hoy,
        registros: regHoy.length,
        presentes,
        verificados,
        areas: [...areasHoy.entries()].map(([nombre, acts]) => ({ nombre, actividades: [...acts] })),
      },
      campanas,
      cosecha: {
        totalQq: Math.round(totalQq * 100) / 100,
        metaTotalQq: Math.round(metaTotalQq * 100) / 100,
        pctTotal: metaTotalQq > 0 ? Math.round((totalQq / metaTotalQq) * 100) : 0,
        ultimo: ultimoCorte
          ? { area: nombreArea.get(ultimoCorte.area_id) ?? "—", fecha: ultimoCorte.fecha, qq: Number(ultimoCorte.cantidad ?? 0) }
          : null,
        porArea,
        porSemana,
      },
      alertas: { problemas, areasSinActividad },
      fotos,
      recientes,
    };
  } catch {
    return { ...vacio(desde, hasta), configurado: true };
  }
}
