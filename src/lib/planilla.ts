import type { AsistenciaLocal } from "@/lib/db";

/**
 * Planilla catorcenal.
 *
 * Reglas (confirmadas por el dueño):
 * - La catorcena son 12 días trabajados: lunes a sábado de ambas semanas.
 *   Los domingos NO se trabajan (descanso, no se pagan).
 * - Ambos sábados se trabajan (6–11 am) y se pagan como día completo.
 * - La catorcena completa (los 12 días) se paga $175. Cada día vale 175 ÷ 12
 *   (≈ $14.58); los días parciales se prorratean a esa tarifa.
 *
 * Un "día trabajado" = un check-in con foto (asistencia presente) ese día.
 */

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const DIAS_LABORABLES = 12; // L–S de ambas semanas
export const CATORCENA_COMPLETA_DEFECTO = 175;

export interface DiaCatorcena {
  fecha: string; // YYYY-MM-DD
  dow: string;
  laborable: boolean; // false los domingos (descanso)
}

export interface FilaPlanilla {
  trabajador_id: string;
  nombre: string;
  diasTrabajados: number; // 0–12
  completo: boolean; // trabajó los 12
  totalPago: number;
  presentes: Set<string>;
}

export interface Planilla {
  inicio: string;
  fin: string; // segundo sábado (último día laborable)
  dias: DiaCatorcena[];
  completa: number; // pago de la catorcena completa
  jornalDia: number; // completa / 12
  filas: FilaPlanilla[];
  totalDias: number;
  totalPago: number;
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Los 14 días calendario (2 semanas) desde el lunes de inicio; domingos = descanso. */
export function diasCatorcena(inicioISO: string): DiaCatorcena[] {
  const base = parse(inicioISO);
  const dias: DiaCatorcena[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dias.push({ fecha: fmt(d), dow: DIAS_SEMANA[d.getDay()], laborable: d.getDay() !== 0 });
  }
  return dias;
}

/** Inicio sugerido: lunes que arranca la catorcena más reciente ya terminada. */
export function inicioSugerido(hoyISO: string): string {
  const d = parse(hoyISO);
  const alSabado = (d.getDay() + 1) % 7; // días desde el último sábado
  d.setDate(d.getDate() - alSabado - 12); // último sábado − 12 = lunes de inicio
  return fmt(d);
}

export function calcularPlanilla(
  inicioISO: string,
  catorcenaCompleta: number,
  asistencia: AsistenciaLocal[],
): Planilla {
  const dias = diasCatorcena(inicioISO);
  const laborables = dias.filter((d) => d.laborable).map((d) => d.fecha); // 12
  const setLab = new Set(laborables);
  const jornalDia = catorcenaCompleta / DIAS_LABORABLES;

  const porTrab = new Map<string, { nombre: string; presentes: Set<string> }>();
  for (const a of asistencia) {
    if (!a.presente || !setLab.has(a.fecha)) continue;
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
    const completo = diasTrabajados === laborables.length;
    // Si trabajó los 12, se paga exactamente la catorcena completa.
    const totalPago = completo ? catorcenaCompleta : redondear(diasTrabajados * jornalDia);
    filas.push({ trabajador_id: id, nombre: v.nombre, diasTrabajados, completo, totalPago, presentes: v.presentes });
  }
  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return {
    inicio: dias[0].fecha,
    fin: laborables[laborables.length - 1], // segundo sábado
    dias,
    completa: catorcenaCompleta,
    jornalDia,
    filas,
    totalDias: filas.reduce((s, f) => s + f.diasTrabajados, 0),
    totalPago: redondear(filas.reduce((s, f) => s + f.totalPago, 0)),
  };
}
