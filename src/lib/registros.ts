"use client";

import { v4 as uuidv4 } from "uuid";
import { db, type RegistroLocal, type AsistenciaLocal, type TareaDestajoLocal } from "@/lib/db";
import { hoyISO } from "@/lib/db/seed";
import { capturarGps } from "@/lib/gps";
import { sincronizar } from "@/lib/sync/cola";

const USUARIO = "emerson";

type NuevoRegistro = {
  area: { id: string; nombre: string } | null;
  actividad: { id: string; codigo: string; nombre: string } | null;
  audio: Blob | null;
  audioMime: string | null;
  fotos: Blob[];
  jornales: number | null;
};

/** Crea y guarda un registro de campo en la base local (estado pendiente). */
export async function guardarRegistro(n: NuevoRegistro): Promise<string> {
  const gps = await capturarGps();
  const reg: RegistroLocal = {
    id: uuidv4(),
    fecha: hoyISO(),
    creado_en: Date.now(),
    area_id: n.area?.id ?? null,
    area_nombre: n.area?.nombre ?? null,
    actividad_id: n.actividad?.id ?? null,
    actividad_codigo: n.actividad?.codigo ?? null,
    actividad_nombre: n.actividad?.nombre ?? null,
    usuario: USUARIO,
    audioBlob: n.audio,
    audioMime: n.audioMime,
    fotos: n.fotos,
    jornales_usados: n.jornales,
    ...gps,
    estadoSync: "pendiente",
    intentos: 0,
  };
  await db().registros.put(reg);
  // Intentar enviar de una vez (si hay señal). Si no, queda pendiente.
  void sincronizar();
  return reg.id;
}

/** Marca la asistencia de un trabajador para hoy (upsert por fecha+trabajador). */
export async function marcarAsistencia(
  trabajador: { id: string; nombre: string },
  presente: boolean,
  areaId: string | null = null,
): Promise<void> {
  const fecha = hoyISO();
  const base = db();
  const existente = await base.asistencia
    .where("[fecha+trabajador_id]")
    .equals([fecha, trabajador.id])
    .first();
  const fila: AsistenciaLocal = {
    id: existente?.id ?? uuidv4(),
    fecha,
    trabajador_id: trabajador.id,
    trabajador_nombre: trabajador.nombre,
    area_id: areaId,
    presente,
    registrado_por: USUARIO,
    estadoSync: "pendiente",
    intentos: 0,
  };
  await base.asistencia.put(fila);
  void sincronizar();
}

/** Guarda una tarea por destajo (el total se calcula en el cliente y el servidor). */
export async function guardarDestajo(t: {
  area: { id: string; nombre: string } | null;
  actividad: { id: string; nombre: string } | null;
  descripcion_unidad: string;
  precio_pactado: number;
  unidades_ejecutadas: number;
  trabajador: { id: string; nombre: string } | null;
}): Promise<void> {
  const fila: TareaDestajoLocal = {
    id: uuidv4(),
    fecha: hoyISO(),
    area_id: t.area?.id ?? null,
    area_nombre: t.area?.nombre ?? null,
    actividad_id: t.actividad?.id ?? null,
    actividad_nombre: t.actividad?.nombre ?? null,
    descripcion_unidad: t.descripcion_unidad,
    precio_pactado: t.precio_pactado,
    unidades_ejecutadas: t.unidades_ejecutadas,
    trabajador_id: t.trabajador?.id ?? null,
    trabajador_nombre: t.trabajador?.nombre ?? null,
    total_calculado: t.precio_pactado * t.unidades_ejecutadas,
    estadoSync: "pendiente",
    intentos: 0,
  };
  await db().tareas_destajo.put(fila);
  void sincronizar();
}

/** Registra que Emerson consultó un protocolo (curva de aprendizaje). */
export async function registrarConsultaProtocolo(protocoloId: string): Promise<void> {
  await db().consultas_protocolo.put({
    id: uuidv4(),
    protocolo_id: protocoloId,
    consultado_en: Date.now(),
    usuario: USUARIO,
    estadoSync: "pendiente",
    intentos: 0,
  });
  void sincronizar();
}
