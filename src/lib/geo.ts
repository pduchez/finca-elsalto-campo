import type { Vertice } from "@/lib/types";

/**
 * Cálculos de geometría para el lindero de un área a partir de vértices GPS.
 * Proyección equirectangular local (buena para parcelas de finca) + fórmula del
 * área de Gauss (shoelace). Nada de dependencias.
 */

// 1 manzana = 10 000 varas²; vara ≈ 0.836 m  ->  6988.96 m² por manzana.
export const M2_POR_MANZANA = 6988.96;
export const M2_POR_HECTAREA = 10000;
const R_TIERRA = 6371000; // m

type Punto = { latitud: number; longitud: number };

function aMetros(pts: Punto[]): { x: number; y: number }[] {
  const latRef = (pts.reduce((s, p) => s + p.latitud, 0) / pts.length) * (Math.PI / 180);
  return pts.map((p) => ({
    x: (p.longitud * Math.PI / 180) * R_TIERRA * Math.cos(latRef),
    y: (p.latitud * Math.PI / 180) * R_TIERRA,
  }));
}

export interface MedidasArea {
  area_m2: number;
  area_manzanas: number;
  area_hectareas: number;
  perimetro_m: number;
  centro_lat: number;
  centro_lon: number;
}

/** Devuelve las medidas del polígono, o null si hay menos de 3 vértices. */
export function medirPoligono(vertices: Vertice[]): MedidasArea | null {
  const pts = [...vertices].sort((a, b) => a.orden - b.orden);
  if (pts.length < 3) return null;
  const m = aMetros(pts);
  let area2 = 0;
  let perim = 0;
  for (let i = 0; i < m.length; i++) {
    const j = (i + 1) % m.length;
    area2 += m[i].x * m[j].y - m[j].x * m[i].y;
    perim += Math.hypot(m[j].x - m[i].x, m[j].y - m[i].y);
  }
  const area_m2 = Math.abs(area2) / 2;
  const centro_lat = pts.reduce((s, p) => s + p.latitud, 0) / pts.length;
  const centro_lon = pts.reduce((s, p) => s + p.longitud, 0) / pts.length;
  return {
    area_m2,
    area_manzanas: area_m2 / M2_POR_MANZANA,
    area_hectareas: area_m2 / M2_POR_HECTAREA,
    perimetro_m: perim,
    centro_lat,
    centro_lon,
  };
}

/** Rango de altitud a partir de la altura GPS de los vértices (referencia). */
export function rangoAltitud(vertices: Vertice[]): { min: number | null; max: number | null } {
  const alts = vertices.map((v) => v.altitud).filter((a): a is number => a != null);
  if (alts.length === 0) return { min: null, max: null };
  return { min: Math.min(...alts), max: Math.max(...alts) };
}

/** Edad de las plantas en años a partir del año de siembra. */
export function edadPlantas(anioSiembra: number | null, anioActual: number): number | null {
  if (!anioSiembra) return null;
  return Math.max(0, anioActual - anioSiembra);
}

/** Formatea coordenadas para mostrar/exportar. */
export function fmtCoord(lat: number | null, lon: number | null): string {
  if (lat == null || lon == null) return "—";
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
