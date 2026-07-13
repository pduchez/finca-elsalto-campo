"use client";

import type { Gps } from "@/lib/types";

/**
 * Captura la ubicación. El GPS es satelital: funciona SIN señal celular.
 * Es la prueba de trazabilidad para la certificación orgánica.
 * Nunca falla hacia el usuario: si no se puede, devuelve nulos y seguimos.
 */
export function capturarGps(timeoutMs = 8000): Promise<Gps> {
  return new Promise((resolve) => {
    const vacio: Gps = { latitud: null, longitud: null, precision_gps: null };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(vacio);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precision_gps: pos.coords.accuracy ?? null,
        }),
      () => resolve(vacio),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}
