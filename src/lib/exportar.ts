"use client";

import type { Planilla } from "@/lib/planilla";

const CAB = ["Colaborador", "Días trabajados", "Sábado de pago", "Total días", "Total a pagar"];

function aoa(pl: Planilla): (string | number)[][] {
  return [
    ["Finca El Salto — Planilla catorcenal"],
    [`Del ${pl.inicio} al ${pl.fin}`, "", "", "Jornal:", pl.jornal],
    [],
    CAB,
    ...pl.filas.map((f) => [f.nombre, f.diasTrabajados, f.sabadoPago, f.totalDias, f.totalPago]),
    ["TOTALES", "", "", pl.totalDias, pl.totalPago],
  ];
}

function nombre(pl: Planilla, ext: string): string {
  return `planilla-catorcena-${pl.inicio}_a_${pl.fin}.${ext}`;
}

function descargar(blob: Blob, archivo: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = archivo;
  a.click();
  URL.revokeObjectURL(u);
}

/** Exporta la planilla a un archivo Excel (.xlsx). Carga xlsx bajo demanda. */
export async function exportarPlanillaExcel(pl: Planilla): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(aoa(pl));
  ws["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catorcena");
  XLSX.writeFile(wb, nombre(pl, "xlsx"));
}

/** Alternativa liviana: CSV (abre en Excel, siempre funciona sin conexión). */
export function exportarPlanillaCSV(pl: Planilla): void {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lineas = aoa(pl).map((fila) => fila.map(esc).join(","));
  const blob = new Blob(["﻿" + lineas.join("\n")], { type: "text/csv;charset=utf-8" });
  descargar(blob, nombre(pl, "csv"));
}
