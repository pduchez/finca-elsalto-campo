"use client";

import { db, type AreaDetalleLocal } from "@/lib/db";
import type { Vertice, Topografia, ClasificacionTopografia } from "@/lib/types";
import { medirPoligono, rangoAltitud } from "@/lib/geo";
import { sincronizar } from "@/lib/sync/cola";

function vacio(areaId: string): AreaDetalleLocal {
  return {
    area_id: areaId,
    vertices: [],
    area_m2: null,
    area_manzanas: null,
    area_hectareas: null,
    perimetro_m: null,
    centro_lat: null,
    centro_lon: null,
    topografia: { clasificacion: null, alt_min: null, alt_max: null },
    manzanas_sembradas: null,
    variedad: null,
    anio_siembra: null,
    densidad_matas_mz: null,
    matas_estimadas: null,
    notas: null,
    actualizado_en: Date.now(),
    estadoSync: "pendiente",
    intentos: 0,
  };
}

export async function getDetalle(areaId: string): Promise<AreaDetalleLocal> {
  return (await db().area_detalle.get(areaId)) ?? vacio(areaId);
}

// Recalcula tamaño/perímetro/centro y el rango de altitud desde los vértices.
function recalcular(d: AreaDetalleLocal): AreaDetalleLocal {
  const m = medirPoligono(d.vertices);
  const alt = rangoAltitud(d.vertices);
  return {
    ...d,
    area_m2: m?.area_m2 ?? null,
    area_manzanas: m?.area_manzanas ?? null,
    area_hectareas: m?.area_hectareas ?? null,
    perimetro_m: m?.perimetro_m ?? null,
    centro_lat: m?.centro_lat ?? null,
    centro_lon: m?.centro_lon ?? null,
    topografia: { ...d.topografia, alt_min: alt.min, alt_max: alt.max },
  };
}

async function persistir(d: AreaDetalleLocal): Promise<void> {
  const listo = recalcular({ ...d, actualizado_en: Date.now(), estadoSync: "pendiente", intentos: 0 });
  await db().area_detalle.put(listo);
  void sincronizar();
}

/** Reemplaza la lista de vértices del lindero (medición GPS). */
export async function guardarVertices(areaId: string, vertices: Vertice[]): Promise<void> {
  const d = await getDetalle(areaId);
  await persistir({ ...d, vertices });
}

/** Guarda los datos de siembra y recalcula las matas estimadas. */
export async function guardarSiembra(
  areaId: string,
  s: {
    manzanas_sembradas: number | null;
    variedad: string | null;
    anio_siembra: number | null;
    densidad_matas_mz: number | null;
  },
): Promise<void> {
  const d = await getDetalle(areaId);
  const matas =
    s.manzanas_sembradas != null && s.densidad_matas_mz != null
      ? Math.round(s.manzanas_sembradas * s.densidad_matas_mz)
      : null;
  await persistir({ ...d, ...s, matas_estimadas: matas });
}

/** Guarda la clasificación de topografía elegida por Emerson. */
export async function guardarTopografia(
  areaId: string,
  clasificacion: ClasificacionTopografia,
): Promise<void> {
  const d = await getDetalle(areaId);
  const topografia: Topografia = { ...d.topografia, clasificacion };
  await persistir({ ...d, topografia });
}
