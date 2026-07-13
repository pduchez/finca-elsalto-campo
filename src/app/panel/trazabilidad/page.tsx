"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type RegistroLocal } from "@/lib/db";

// Bitácora de trazabilidad orgánica: cada aplicación de bocashi/biol con fecha,
// área, dosis, responsable, coordenada GPS y foto. Exportable a CSV para el
// auditor de certificación orgánica.
const APLICACIONES = ["bocashi", "bioles"];

function fmtFecha(ms: number) {
  return new Date(ms).toLocaleString("es-SV");
}

function aCSV(rows: RegistroLocal[]): string {
  const cab = [
    "fecha",
    "area",
    "actividad",
    "cantidad",
    "unidad",
    "responsable",
    "latitud",
    "longitud",
    "precision_gps_m",
    "fotos",
    "transcripcion",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lineas = rows.map((r) =>
    [
      r.fecha,
      r.area_nombre,
      r.actividad_nombre,
      r.cantidad,
      r.unidad,
      r.usuario,
      r.latitud,
      r.longitud,
      r.precision_gps,
      r.fotos?.length ?? 0,
      r.audio_transcripcion,
    ]
      .map(esc)
      .join(","),
  );
  return [cab.join(","), ...lineas].join("\n");
}

export default function TrazabilidadPage() {
  const registros = useLiveQuery(
    () =>
      db()
        .registros.filter((r) =>
          APLICACIONES.includes(r.actividad_codigo ?? ""),
        )
        .reverse()
        .sortBy("creado_en"),
    [],
    [],
  );

  function descargar() {
    const csv = aCSV(registros);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trazabilidad-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-finca-900">
          Bitácora de trazabilidad
        </h1>
        <button
          onClick={descargar}
          disabled={registros.length === 0}
          className="bg-finca-500 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-40"
        >
          ⬇ Exportar CSV
        </button>
      </div>
      <p className="text-finca-600 -mt-2">
        Aplicaciones de bocashi y bioles con evidencia (GPS + foto) para la
        certificación orgánica.
      </p>

      {registros.length === 0 ? (
        <p className="text-finca-600">
          Aún no hay aplicaciones registradas. (Podés cargar datos de ejemplo
          desde el Briefing.)
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-white rounded-xl overflow-hidden text-sm">
            <thead className="bg-finca-100 text-finca-800">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Área</th>
                <th className="px-3 py-2">Aplicación</th>
                <th className="px-3 py-2">Dosis</th>
                <th className="px-3 py-2">Responsable</th>
                <th className="px-3 py-2">GPS</th>
                <th className="px-3 py-2">Foto</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-t border-finca-100">
                  <td className="px-3 py-2">{fmtFecha(r.creado_en)}</td>
                  <td className="px-3 py-2 font-semibold">{r.area_nombre}</td>
                  <td className="px-3 py-2">{r.actividad_nombre}</td>
                  <td className="px-3 py-2">
                    {r.cantidad != null
                      ? `${r.cantidad} ${r.unidad ?? ""}`
                      : "pendiente"}
                  </td>
                  <td className="px-3 py-2">{r.usuario}</td>
                  <td className="px-3 py-2">
                    {r.latitud != null && r.longitud != null ? (
                      <span className="text-finca-700">
                        {r.latitud.toFixed(5)}, {r.longitud.toFixed(5)}
                        {r.precision_gps != null && (
                          <span className="text-finca-400">
                            {" "}
                            ±{Math.round(r.precision_gps)}m
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{r.fotos?.length ?? 0} 📷</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
