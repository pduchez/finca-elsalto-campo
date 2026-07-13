"use client";

import { db } from "./index";
import type { Area, Actividad, Trabajador, Insumo } from "@/lib/types";
import type { ProtocoloLocal, PlanDiaLocal } from "./index";

/**
 * Datos semilla para funcionar OFFLINE y en MODO DEMO (sin Supabase).
 * Los UUID son fijos para que coincidan con el seed SQL del servidor
 * (supabase/seed.sql) y la sincronización sea idempotente por uuid.
 *
 * En producción estos catálogos se descargan de Supabase y se cachean; aquí se
 * siembran localmente la primera vez que se abre la app.
 */

export const AREAS: Area[] = [
  { id: "a1000000-0000-4000-8000-000000000001", nombre: "Los Gringos", hectareas: null, activa: true },
  { id: "a1000000-0000-4000-8000-000000000002", nombre: "La Vitrina", hectareas: null, activa: true },
  { id: "a1000000-0000-4000-8000-000000000003", nombre: "El Coyol", hectareas: null, activa: true },
  { id: "a1000000-0000-4000-8000-000000000004", nombre: "Paniagua", hectareas: null, activa: true },
  { id: "a1000000-0000-4000-8000-000000000005", nombre: "El Amatón", hectareas: null, activa: true },
  { id: "a1000000-0000-4000-8000-000000000006", nombre: "El Vivero", hectareas: null, activa: true },
];

export const ACTIVIDADES: Actividad[] = [
  { id: "a2000000-0000-4000-8000-000000000001", codigo: "limpias", nombre: "Limpias", unidad_medida: "matas", requiere_insumo: false, orden: 1 },
  { id: "a2000000-0000-4000-8000-000000000002", codigo: "sombra", nombre: "Manejo de sombra", unidad_medida: "matas", requiere_insumo: false, orden: 2 },
  { id: "a2000000-0000-4000-8000-000000000003", codigo: "bocashi", nombre: "Fertilización Bocashi", unidad_medida: "matas", requiere_insumo: true, orden: 3 },
  { id: "a2000000-0000-4000-8000-000000000004", codigo: "bioles", nombre: "Fertilización Bioles (foliar)", unidad_medida: "litros", requiere_insumo: true, orden: 4 },
  { id: "a2000000-0000-4000-8000-000000000005", codigo: "fitosanitario", nombre: "Ronda de control fitosanitario", unidad_medida: "matas", requiere_insumo: false, orden: 5 },
  { id: "a2000000-0000-4000-8000-000000000006", codigo: "corte", nombre: "Corte de cardamomo", unidad_medida: "quintales", requiere_insumo: false, orden: 6 },
  { id: "a2000000-0000-4000-8000-000000000007", codigo: "jornales", nombre: "Control de jornales", unidad_medida: "jornales", requiere_insumo: false, orden: 7 },
  { id: "a2000000-0000-4000-8000-000000000008", codigo: "vivero", nombre: "Operación de vivero", unidad_medida: "plantas", requiere_insumo: false, orden: 8 },
];

/** Trabajadores de ejemplo (para demostrar asistencia y destajo). */
export const TRABAJADORES: Trabajador[] = [
  { id: "a3000000-0000-4000-8000-000000000001", nombre: "Santos Pérez", tipo: "planilla", activo: true },
  { id: "a3000000-0000-4000-8000-000000000002", nombre: "Julio Ramírez", tipo: "planilla", activo: true },
  { id: "a3000000-0000-4000-8000-000000000003", nombre: "María Chávez", tipo: "planilla", activo: true },
  { id: "a3000000-0000-4000-8000-000000000004", nombre: "Rigoberto López", tipo: "tarea", activo: true },
  { id: "a3000000-0000-4000-8000-000000000005", nombre: "Tránsito Hernández", tipo: "mixto", activo: true },
  { id: "a3000000-0000-4000-8000-000000000006", nombre: "Óscar Menjívar", tipo: "tarea", activo: true },
];

/** Insumos: solo Bocashi. Los bioles se cargan desde el panel (catálogo vacío). */
export const INSUMOS: Insumo[] = [
  { id: "a4000000-0000-4000-8000-000000000001", nombre: "Bocashi", tipo: "bocashi", unidad: "quintal", subtipo: null, descripcion_uso: null, activo: true },
];

/**
 * Protocolos. El CONTENIDO técnico definitivo lo carga el dueño desde el panel;
 * aquí van placeholders con los DISPARADORES reales para demostrar la
 * capacitación contextual sin inventar recomendaciones agronómicas.
 */
export const PROTOCOLOS: ProtocoloLocal[] = [
  {
    id: "a5000000-0000-4000-8000-000000000001",
    titulo: "Control fitosanitario: qué observar",
    actividad_codigo: "fitosanitario",
    disparador_keywords: ["cochinilla", "trips", "mancha", "hongo", "plaga", "enfermo"],
    orden: 1,
    contenido_md:
      "## Ronda de control fitosanitario\n\n" +
      "_Contenido pendiente de cargar por el dueño._\n\n" +
      "- Revisá hoja por hoja las matas marcadas en el plan del día.\n" +
      "- Si ves algo raro (mancha, insecto, hoja seca), **tomá foto** y **describilo en el audio**.\n" +
      "- No apliques nada sin confirmar con el técnico.\n",
  },
  {
    id: "a5000000-0000-4000-8000-000000000002",
    titulo: "Aplicación de Bocashi (dosis y registro)",
    actividad_codigo: "bocashi",
    disparador_keywords: ["bocashi", "abono", "fertiliz"],
    orden: 2,
    contenido_md:
      "## Fertilización con Bocashi\n\n" +
      "_Contenido pendiente de cargar por el dueño._\n\n" +
      "- Anotá **cuántas matas** fertilizaste y **cuánto bocashi** usaste (quintales).\n" +
      "- Si se te acaba el bocashi, decilo en el audio: la app avisa al dueño.\n" +
      "- La foto y el GPS quedan como prueba para la certificación orgánica.\n",
  },
  {
    id: "a5000000-0000-4000-8000-000000000003",
    titulo: "Aplicación foliar de Bioles",
    actividad_codigo: "bioles",
    disparador_keywords: ["biol", "foliar", "aspersi"],
    orden: 3,
    contenido_md:
      "## Fertilización foliar (Bioles)\n\n" +
      "_Contenido pendiente de cargar por el dueño._\n\n" +
      "- Decí **qué biol** aplicaste y **cuántos litros**.\n" +
      "- Registrá el área y tomá foto de la aplicación.\n",
  },
];

/** Plan del día de ejemplo (en producción se descarga la noche anterior). */
function planDemo(fecha: string): PlanDiaLocal[] {
  return [
    {
      id: "a6000000-0000-4000-8000-000000000001",
      fecha,
      area_id: AREAS[0].id,
      area_nombre: AREAS[0].nombre,
      actividad_id: ACTIVIDADES[0].id,
      actividad_nombre: ACTIVIDADES[0].nombre,
      nota: "Terminar la limpia del bloque de arriba.",
      completado: false,
    },
    {
      id: "a6000000-0000-4000-8000-000000000002",
      fecha,
      area_id: AREAS[2].id,
      area_nombre: AREAS[2].nombre,
      actividad_id: ACTIVIDADES[4].id,
      actividad_nombre: ACTIVIDADES[4].nombre,
      nota: "Revisar las matas que se vieron con mancha la semana pasada.",
      completado: false,
    },
    {
      id: "a6000000-0000-4000-8000-000000000003",
      fecha,
      area_id: AREAS[1].id,
      area_nombre: AREAS[1].nombre,
      actividad_id: ACTIVIDADES[2].id,
      actividad_nombre: ACTIVIDADES[2].nombre,
      nota: "Fertilizar con bocashi la parte baja.",
      completado: false,
    },
  ];
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

let sembrando: Promise<void> | null = null;

/** Siembra los catálogos y datos demo la primera vez. Idempotente. */
export async function sembrarSiVacio(): Promise<void> {
  if (sembrando) return sembrando;
  sembrando = (async () => {
    const base = db();
    const yaHay = await base.areas.count();
    if (yaHay === 0) {
      await base.transaction(
        "rw",
        base.areas,
        base.actividades,
        base.trabajadores,
        base.insumos,
        base.protocolos,
        async () => {
          await base.areas.bulkPut(AREAS);
          await base.actividades.bulkPut(ACTIVIDADES);
          await base.trabajadores.bulkPut(TRABAJADORES);
          await base.insumos.bulkPut(INSUMOS);
          await base.protocolos.bulkPut(PROTOCOLOS);
        },
      );
    }
    // Plan del día demo (solo si no hay plan para hoy).
    const fecha = hoyISO();
    const hayPlan = await base.plan_dia.where("fecha").equals(fecha).count();
    if (hayPlan === 0) {
      await base.plan_dia.bulkPut(planDemo(fecha));
    }
  })();
  return sembrando;
}
