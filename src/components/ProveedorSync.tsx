"use client";

import { useEffect } from "react";
import { sembrarSiVacio } from "@/lib/db/seed";
import { iniciarAutoSync } from "@/lib/sync/cola";

/**
 * Efectos globales de la app de campo: siembra la base local la primera vez y
 * arranca la sincronización automática. No pinta nada.
 */
export default function ProveedorSync() {
  useEffect(() => {
    let detener: (() => void) | undefined;
    void sembrarSiVacio().then(() => {
      detener = iniciarAutoSync();
    });
    return () => detener?.();
  }, []);
  return null;
}
