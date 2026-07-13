import type { AsistenciaLocal } from "@/lib/db";

/**
 * Planilla catorcenal.
 *
 * Reglas (confirmadas por el dueño):
 * - La catorcena son 14 días consecutivos.
 * - Los días 1 al 13 se trabajan; cada día trabajado vale 1 (día completo,
 *   sábado incluido).
 * - El día 14 es el "sábado de pago": NO se trabaja, pero se paga (1 día) SOLO
 *   a quien trabajó los 13 días anteriores completos. Si faltó algún día,
 *   pierde el sábado 14.
 * - Jornal único para todos.
 *
 * Un "día trabajado" = un check-in con foto (asistencia presente) en esa fecha.
 */

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export interface DiaCatorcena {
  fecha: string; // YYYY-MM-DD
  dow: string; // etiqueta corta
  esPago: boolean; // día 14 (sábado de pago, no se trabaja)
}

export interface FilaPlanilla {
  trabajador_id: string;
  nombre: string;
  diasTrabajados: number; // presentes en días 1–13
  completo: boolean; // trabajó los 13
  sabadoPago: number; // 0 o 1
  totalDias: number;
  totalPago: number;
  presentes: Set<string>; // fechas trabajadas
}

export interface Planilla {
  inicio: string;
  fin: string;
  dias: DiaCatorcena[];
  jornal: number;
  filas: FilaPlanilla[];
  totalDias: number;
  totalPago: number;
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Los 14 días de la catorcena a partir de la fecha de inicio. */
export function diasCatorcena(inicioISO: string): DiaCatorcena[] {
  const base = parse(inicioISO);
  const dias: DiaCatorcena[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dias.push({ fecha: fmt(d), dow: DIAS_SEMANA[d.getDay()], esPago: i === 13 });
  }
  return dias;
}

/**
 * Inicio sugerido: alinea la catorcena para que el día 14 caiga en el sábado
 * más reciente (día de pago) y el día 1 en domingo. Emerson ajusta si su
 * catorcena arranca en otra fecha.
 */
export function inicioSugerido(hoyISO: string): string {
  const d = parse(hoyISO);
  const alSabado = (d.getDay() + 1) % 7; // días desde el último sábado (sáb=0)
  d.setDate(d.getDate() - alSabado - 13); // sábado de pago menos 13 = domingo
  return fmt(d);
}

export function calcularPlanilla(
  inicioISO: string,
  jornal: number,
  asistencia: AsistenciaLocal[],
): Planilla {
  const dias = diasCatorcena(inicioISO);
  const fechasTrabajo = dias.filter((d) => !d.esPago).map((d) => d.fecha); // días 1–13
  const setTrabajo = new Set(fechasTrabajo);

  // Presencias (con foto o no, pero presente) dentro de los días 1–13.
  const porTrab = new Map<string, { nombre: string; presentes: Set<string> }>();
  for (const a of asistencia) {
    if (!a.presente) continue;
    if (!setTrabajo.has(a.fecha)) continue;
    const cur = porTrab.get(a.trabajador_id) ?? {
      nombre: a.trabajador_nombre ?? "—",
      presentes: new Set<string>(),
    };
    cur.presentes.add(a.fecha);
    if (a.trabajador_nombre) cur.nombre = a.trabajador_nombre;
    porTrab.set(a.trabajador_id, cur);
  }

  const filas: FilaPlanilla[] = [];
  for (const [id, v] of porTrab) {
    const diasTrabajados = v.presentes.size;
    const completo = diasTrabajados === fechasTrabajo.length; // los 13
    const sabadoPago = completo ? 1 : 0;
    const totalDias = diasTrabajados + sabadoPago;
    filas.push({
      trabajador_id: id,
      nombre: v.nombre,
      diasTrabajados,
      completo,
      sabadoPago,
      totalDias,
      totalPago: totalDias * jornal,
      presentes: v.presentes,
    });
  }
  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return {
    inicio: dias[0].fecha,
    fin: dias[13].fecha,
    dias,
    jornal,
    filas,
    totalDias: filas.reduce((s, f) => s + f.totalDias, 0),
    totalPago: filas.reduce((s, f) => s + f.totalPago, 0),
  };
}
