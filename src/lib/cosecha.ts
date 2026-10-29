"use client";

import { db } from "./db";
import type { CorteLocal, LoteSecadoLocal, PesajeLocal } from "./db";

/** Helpers de cosecha: escriben en la base local (offline-first). */

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function uuid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function nuevoUsuario(): string {
  try {
    return localStorage.getItem("finca_usuario") || "emerson";
  } catch {
    return "emerson";
  }
}

/** Crea un corte en verde para un área y devuelve su id. */
export async function crearCorte(opts: {
  area_id: string | null;
  area_nombre?: string | null;
  notas?: string | null;
}): Promise<string> {
  const id = uuid();
  const corte: CorteLocal = {
    id,
    fecha: hoyISO(),
    area_id: opts.area_id,
    area_nombre: opts.area_nombre ?? null,
    usuario: nuevoUsuario(),
    lote_id: null,
    notas: opts.notas ?? null,
    creado_en: Date.now(),
    estadoSync: "pendiente",
    intentos: 0,
  };
  await db().cosecha_cortes.add(corte);
  return id;
}

/** Crea un lote de secado y devuelve su id. */
export async function crearLote(opts: {
  horas_secado?: number | null;
  propano_cantidad?: number | null;
  propano_unidad?: string;
  combustible_cantidad?: number | null;
  combustible_unidad?: string;
  horas_hombre?: number | null;
  notas?: string | null;
}): Promise<string> {
  const id = uuid();
  const lote: LoteSecadoLocal = {
    id,
    fecha_inicio: hoyISO(),
    fecha_fin: null,
    horas_secado: opts.horas_secado ?? null,
    propano_cantidad: opts.propano_cantidad ?? null,
    propano_unidad: opts.propano_unidad ?? "libras",
    combustible_cantidad: opts.combustible_cantidad ?? null,
    combustible_unidad: opts.combustible_unidad ?? "galones",
    horas_hombre: opts.horas_hombre ?? null,
    notas: opts.notas ?? null,
    usuario: nuevoUsuario(),
    creado_en: Date.now(),
    estadoSync: "pendiente",
    intentos: 0,
  };
  await db().cosecha_lotes.add(lote);
  return id;
}

/** Marca un lote como cerrado (fin del secado) y guarda sus datos de proceso. */
export async function actualizarLote(
  id: string,
  cambios: Partial<Pick<
    LoteSecadoLocal,
    | "fecha_fin"
    | "horas_secado"
    | "propano_cantidad"
    | "combustible_cantidad"
    | "horas_hombre"
    | "notas"
  >>,
): Promise<void> {
  await db().cosecha_lotes.update(id, { ...cambios, estadoSync: "pendiente", intentos: 0 });
}

/** Asigna (o quita) un corte a un lote de secado. */
export async function asignarCorteALote(corteId: string, loteId: string | null): Promise<void> {
  await db().cosecha_cortes.update(corteId, { lote_id: loteId, estadoSync: "pendiente", intentos: 0 });
}

/** Agrega una pesada (verde a un corte, o pergamino a un lote). */
export async function agregarPesaje(opts: {
  destino: "verde" | "pergamino";
  corte_id?: string | null;
  lote_id?: string | null;
  bruto_lb: number | null; // null = que lo lea Claude de la foto
  tara_lb?: number | null;
  fotoBlob?: Blob | null;
}): Promise<string> {
  const id = uuid();
  const pesaje: PesajeLocal = {
    id,
    destino: opts.destino,
    corte_id: opts.corte_id ?? null,
    lote_id: opts.lote_id ?? null,
    bruto_lb: opts.bruto_lb,
    tara_lb: opts.tara_lb ?? 0,
    hora: Date.now(),
    fotoBlob: opts.fotoBlob ?? null,
    leido_por: opts.bruto_lb != null ? "manual" : "claude",
    confianza: null,
    requiere_revision: false,
    creado_en: Date.now(),
    estadoSync: "pendiente",
    intentos: 0,
  };
  await db().cosecha_pesajes.add(pesaje);
  return id;
}

/** Neto de una pesada (bruto - tara), para mostrar en el teléfono. */
export function netoLb(p: PesajeLocal): number {
  return Math.max(0, (p.bruto_lb ?? 0) - (p.tara_lb ?? 0));
}
