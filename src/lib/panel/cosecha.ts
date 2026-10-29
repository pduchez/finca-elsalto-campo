import "server-only";
import { crearClienteServicio } from "@/lib/supabase/server";
import { panelConfigurado } from "./datos";

/**
 * Datos de cosecha (Fase 1+2) para el panel del dueño: acumulados en verde y
 * pergamino, rendimiento, por área, y los lotes de secado con sus recursos.
 * Lee de Supabase en el servidor. Resiliente: si falta una tabla (migración
 * pendiente), devuelve vacío sin romper el panel.
 */

async function sel(builder: any): Promise<any[]> {
  try {
    const { data, error } = await builder;
    return error ? [] : (data ?? []);
  } catch {
    return [];
  }
}

export interface LotePanel {
  id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  verdeLb: number;
  pergaminoLb: number;
  rendimientoPct: number | null;
  horas_secado: number | null;
  propano_cantidad: number | null;
  propano_unidad: string | null;
  combustible_cantidad: number | null;
  combustible_unidad: string | null;
  horas_hombre: number | null;
}

export interface CosechaPanel {
  configurado: boolean;
  verdeTotalLb: number;
  pergaminoTotalLb: number;
  rendimientoPct: number | null;
  cortes: number;
  porArea: { area: string; verdeLb: number }[];
  lotes: LotePanel[];
  propanoTotal: number;
  combustibleTotal: number;
  horasHombreTotal: number;
  revisiones: number;
}

function vacio(): CosechaPanel {
  return {
    configurado: false,
    verdeTotalLb: 0,
    pergaminoTotalLb: 0,
    rendimientoPct: null,
    cortes: 0,
    porArea: [],
    lotes: [],
    propanoTotal: 0,
    combustibleTotal: 0,
    horasHombreTotal: 0,
    revisiones: 0,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function obtenerCosecha(desde: string, hasta: string): Promise<CosechaPanel> {
  if (!panelConfigurado()) return vacio();
  try {
    const supa = crearClienteServicio();
    const [areas, cortes, lotes, pesajes] = await Promise.all([
      sel(supa.from("areas").select("id,nombre")),
      sel(supa.from("cosecha_cortes").select("id,fecha,area_id,lote_id").gte("fecha", desde).lte("fecha", hasta).limit(5000)),
      sel(supa.from("cosecha_lotes").select("*").gte("fecha_inicio", desde).lte("fecha_inicio", hasta).limit(2000)),
      sel(supa.from("cosecha_pesajes").select("destino,corte_id,lote_id,neto_lb,requiere_revision").limit(20000)),
    ]);

    const nombreArea = new Map<string, string>(areas.map((a: any) => [a.id, a.nombre]));
    const corteIds = new Set<string>(cortes.map((c: any) => c.id));
    const loteIds = new Set<string>(lotes.map((l: any) => l.id));

    // Verde por corte (de los pesajes verde).
    const verdePorCorte = new Map<string, number>();
    let revisiones = 0;
    for (const p of pesajes as any[]) {
      if (p.requiere_revision) revisiones++;
      if (p.destino === "verde" && p.corte_id && corteIds.has(p.corte_id)) {
        verdePorCorte.set(p.corte_id, (verdePorCorte.get(p.corte_id) ?? 0) + Number(p.neto_lb ?? 0));
      }
    }
    // Pergamino por lote (de los pesajes pergamino).
    const pergaminoPorLote = new Map<string, number>();
    for (const p of pesajes as any[]) {
      if (p.destino === "pergamino" && p.lote_id && loteIds.has(p.lote_id)) {
        pergaminoPorLote.set(p.lote_id, (pergaminoPorLote.get(p.lote_id) ?? 0) + Number(p.neto_lb ?? 0));
      }
    }

    // Verde total y por área (del período).
    const verdePorArea = new Map<string, number>();
    let verdeTotalLb = 0;
    for (const c of cortes as any[]) {
      const v = verdePorCorte.get(c.id) ?? 0;
      verdeTotalLb += v;
      const an = nombreArea.get(c.area_id) ?? "—";
      verdePorArea.set(an, (verdePorArea.get(an) ?? 0) + v);
    }

    // Verde que entró a cada lote = suma del verde de sus cortes (sin importar período del corte).
    const verdeDeLote = new Map<string, number>();
    const cortesDeLote = await sel(supa.from("cosecha_cortes").select("id,lote_id").not("lote_id", "is", null).limit(5000));
    for (const c of cortesDeLote as any[]) {
      if (!c.lote_id) continue;
      const v = verdePorCorte.get(c.id) ?? 0;
      verdeDeLote.set(c.lote_id, (verdeDeLote.get(c.lote_id) ?? 0) + v);
    }

    let pergaminoTotalLb = 0;
    let propanoTotal = 0, combustibleTotal = 0, horasHombreTotal = 0;
    const lotesPanel: LotePanel[] = (lotes as any[])
      .map((l) => {
        const verdeLb = r2(verdeDeLote.get(l.id) ?? 0);
        const pergaminoLb = r2(pergaminoPorLote.get(l.id) ?? 0);
        pergaminoTotalLb += pergaminoLb;
        propanoTotal += Number(l.propano_cantidad ?? 0);
        combustibleTotal += Number(l.combustible_cantidad ?? 0);
        horasHombreTotal += Number(l.horas_hombre ?? 0);
        return {
          id: l.id,
          fecha_inicio: l.fecha_inicio,
          fecha_fin: l.fecha_fin ?? null,
          verdeLb,
          pergaminoLb,
          rendimientoPct: verdeLb > 0 ? Math.round((pergaminoLb / verdeLb) * 1000) / 10 : null,
          horas_secado: l.horas_secado ?? null,
          propano_cantidad: l.propano_cantidad ?? null,
          propano_unidad: l.propano_unidad ?? null,
          combustible_cantidad: l.combustible_cantidad ?? null,
          combustible_unidad: l.combustible_unidad ?? null,
          horas_hombre: l.horas_hombre ?? null,
        };
      })
      .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));

    const porArea = [...verdePorArea.entries()]
      .map(([area, verdeLb]) => ({ area, verdeLb: r2(verdeLb) }))
      .filter((x) => x.verdeLb > 0)
      .sort((a, b) => b.verdeLb - a.verdeLb);

    return {
      configurado: true,
      verdeTotalLb: r2(verdeTotalLb),
      pergaminoTotalLb: r2(pergaminoTotalLb),
      rendimientoPct: verdeTotalLb > 0 ? Math.round((pergaminoTotalLb / verdeTotalLb) * 1000) / 10 : null,
      cortes: cortes.length,
      porArea,
      lotes: lotesPanel,
      propanoTotal: r2(propanoTotal),
      combustibleTotal: r2(combustibleTotal),
      horasHombreTotal: r2(horasHombreTotal),
      revisiones,
    };
  } catch {
    return { ...vacio(), configurado: true };
  }
}
