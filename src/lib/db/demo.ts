"use client";

import { db, type RegistroLocal, type AsistenciaLocal, type TareaDestajoLocal } from "./index";
import { AREAS, ACTIVIDADES, TRABAJADORES, hoyISO } from "./seed";

/**
 * Datos de EJEMPLO para previsualizar el panel del dueño sin tener que capturar
 * a mano. Representan cómo se verían los registros YA procesados por Claude
 * (con campos estructurados). No son datos reales de la finca.
 * Idempotente (IDs fijos con prefijo "demo").
 */

function areaId(n: string) {
  return AREAS.find((a) => a.nombre === n)!;
}
function actByCodigo(c: string) {
  return ACTIVIDADES.find((a) => a.codigo === c)!;
}

// Coordenadas de ejemplo dentro de la finca (aprox. oriente de El Salvador).
const GPS_BASE = { lat: 13.79, lon: -88.55 };

export async function cargarDatosEjemplo(): Promise<void> {
  const base = db();
  const fecha = hoyISO();
  const yaHay = await base.registros.where("id").startsWith("demo-").count();
  if (yaHay > 0) return;

  const bocashi = actByCodigo("bocashi");
  const bioles = actByCodigo("bioles");
  const fito = actByCodigo("fitosanitario");
  const limpias = actByCodigo("limpias");

  const registros: RegistroLocal[] = [
    {
      id: "demo-reg-0001",
      fecha,
      creado_en: Date.now() - 5 * 3600_000,
      area_id: areaId("La Vitrina").id,
      area_nombre: "La Vitrina",
      actividad_id: bocashi.id,
      actividad_codigo: "bocashi",
      actividad_nombre: bocashi.nombre,
      usuario: "emerson",
      audioBlob: null,
      audioMime: null,
      fotos: [],
      jornales_usados: 3,
      latitud: GPS_BASE.lat + 0.002,
      longitud: GPS_BASE.lon - 0.001,
      precision_gps: 6,
      audio_transcripcion:
        "Aplicamos bocashi en la parte baja de La Vitrina, como 400 matas, usamos 5 quintales, andábamos tres.",
      cantidad: 400,
      unidad: "matas",
      observaciones: "Fertilización de bocashi en la parte baja.",
      problema_detectado: false,
      descripcion_problema: null,
      insumo_agotado: false,
      estadoSync: "sincronizado",
      intentos: 0,
      sincronizado_en: Date.now() - 4 * 3600_000,
    },
    {
      id: "demo-reg-0002",
      fecha,
      creado_en: Date.now() - 4 * 3600_000,
      area_id: areaId("El Coyol").id,
      area_nombre: "El Coyol",
      actividad_id: fito.id,
      actividad_codigo: "fitosanitario",
      actividad_nombre: fito.nombre,
      usuario: "emerson",
      audioBlob: null,
      audioMime: null,
      fotos: [],
      jornales_usados: 2,
      latitud: GPS_BASE.lat - 0.003,
      longitud: GPS_BASE.lon + 0.002,
      precision_gps: 8,
      audio_transcripcion:
        "En El Coyol vi unas matas con mancha en la hoja, se ven feas, como con hongo. Tomé foto.",
      cantidad: null,
      unidad: null,
      observaciones: "Matas con mancha foliar, posible hongo.",
      problema_detectado: true,
      descripcion_problema: "Mancha foliar en varias matas, posible hongo.",
      insumo_agotado: false,
      estadoSync: "sincronizado",
      intentos: 0,
      sincronizado_en: Date.now() - 3 * 3600_000,
    },
    {
      id: "demo-reg-0003",
      fecha,
      creado_en: Date.now() - 3 * 3600_000,
      area_id: areaId("Los Gringos").id,
      area_nombre: "Los Gringos",
      actividad_id: bioles.id,
      actividad_codigo: "bioles",
      actividad_nombre: bioles.nombre,
      usuario: "emerson",
      audioBlob: null,
      audioMime: null,
      fotos: [],
      jornales_usados: 2,
      latitud: GPS_BASE.lat + 0.004,
      longitud: GPS_BASE.lon + 0.004,
      precision_gps: 5,
      audio_transcripcion:
        "Echamos biol foliar en Los Gringos, como 60 litros. Ya casi no queda biol, hay que hacer más.",
      cantidad: 60,
      unidad: "litros",
      observaciones: "Aplicación foliar de biol.",
      problema_detectado: false,
      descripcion_problema: null,
      insumo_agotado: true,
      estadoSync: "sincronizado",
      intentos: 0,
      sincronizado_en: Date.now() - 2 * 3600_000,
    },
    {
      id: "demo-reg-0004",
      fecha,
      creado_en: Date.now() - 2 * 3600_000,
      area_id: areaId("Los Gringos").id,
      area_nombre: "Los Gringos",
      actividad_id: limpias.id,
      actividad_codigo: "limpias",
      actividad_nombre: limpias.nombre,
      usuario: "emerson",
      audioBlob: null,
      audioMime: null,
      fotos: [],
      jornales_usados: 4,
      latitud: GPS_BASE.lat + 0.0045,
      longitud: GPS_BASE.lon + 0.0035,
      precision_gps: 7,
      audio_transcripcion: "Terminamos la limpia del bloque de arriba, andábamos cuatro.",
      cantidad: null,
      unidad: "matas",
      observaciones: "Limpia del bloque de arriba terminada.",
      problema_detectado: false,
      descripcion_problema: null,
      insumo_agotado: false,
      estadoSync: "sincronizado",
      intentos: 0,
      sincronizado_en: Date.now() - 1 * 3600_000,
    },
  ];

  const asistencia: AsistenciaLocal[] = TRABAJADORES.slice(0, 5).map((t, i) => ({
    id: `demo-asis-${i}`,
    fecha,
    trabajador_id: t.id,
    trabajador_nombre: t.nombre,
    area_id: areaId("La Vitrina").id,
    area_nombre: "La Vitrina",
    presente: i !== 3, // uno ausente
    hora: i !== 3 ? Date.now() - (6 * 3600_000 - i * 120_000) : null,
    latitud: i !== 3 ? GPS_BASE.lat + 0.002 : null,
    longitud: i !== 3 ? GPS_BASE.lon - 0.001 : null,
    precision_gps: i !== 3 ? 6 : null,
    evidencia_foto: i !== 3,
    registrado_por: "emerson",
    estadoSync: "sincronizado",
    intentos: 0,
    sincronizado_en: Date.now() - 6 * 3600_000,
  }));

  const destajo: TareaDestajoLocal[] = [
    {
      id: "demo-dest-0001",
      fecha,
      area_id: areaId("El Coyol").id,
      area_nombre: "El Coyol",
      actividad_id: limpias.id,
      actividad_nombre: limpias.nombre,
      descripcion_unidad: "Limpias",
      precio_pactado: 0.15,
      unidades_ejecutadas: 320,
      trabajador_id: TRABAJADORES[3].id,
      trabajador_nombre: TRABAJADORES[3].nombre,
      total_calculado: 0.15 * 320,
      estadoSync: "sincronizado",
      intentos: 0,
      sincronizado_en: Date.now() - 2 * 3600_000,
    },
  ];

  await base.registros.bulkPut(registros);
  await base.asistencia.bulkPut(asistencia);
  await base.tareas_destajo.bulkPut(destajo);
}
