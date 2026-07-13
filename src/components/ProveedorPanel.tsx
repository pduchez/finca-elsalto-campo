"use client";

import { useEffect } from "react";
import { sembrarSiVacio } from "@/lib/db/seed";

// Asegura que los catálogos existan aunque se abra el panel sin pasar por /campo.
export default function ProveedorPanel() {
  useEffect(() => {
    void sembrarSiVacio();
  }, []);
  return null;
}
