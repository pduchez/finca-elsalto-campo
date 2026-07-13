"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { hoyISO } from "@/lib/db/seed";
import { calcularPlanilla, inicioSugerido } from "@/lib/planilla";
import { exportarPlanillaExcel, exportarPlanillaCSV } from "@/lib/exportar";

const JORNAL_KEY = "finca_jornal";

// Planilla catorcenal: un clic -> preview que Emerson valida -> exporta a Excel.
export default function PlanillaPage() {
  const router = useRouter();
  const asistencia = useLiveQuery(() => db().asistencia.toArray(), [], []);
  const [inicio, setInicio] = useState<string>(() => inicioSugerido(hoyISO()));
  const [jornal, setJornal] = useState<number>(8);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const g = localStorage.getItem(JORNAL_KEY);
    if (g) setJornal(parseFloat(g) || 8);
  }, []);

  function cambiarJornal(v: string) {
    const n = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
    setJornal(n);
    localStorage.setItem(JORNAL_KEY, String(n));
  }

  const planilla = useMemo(
    () => calcularPlanilla(inicio, jornal, asistencia),
    [inicio, jornal, asistencia],
  );

  async function exportarExcel() {
    setExportando(true);
    try {
      await exportarPlanillaExcel(planilla);
    } catch {
      exportarPlanillaCSV(planilla); // respaldo si no cargó Excel (sin señal)
    }
    setExportando(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push("/campo/colaboradores")} className="text-finca-600 font-bold text-lg self-start">
        ← Colaboradores
      </button>
      <h1 className="text-2xl font-extrabold text-finca-900">Planilla de la catorcena</h1>

      {/* Parámetros */}
      <div className="grid grid-cols-2 gap-3">
        <label className="tarjeta">
          <span className="text-sm font-bold text-finca-700">Inicio (día 1)</span>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="entrada mt-1 text-lg"
          />
        </label>
        <label className="tarjeta">
          <span className="text-sm font-bold text-finca-700">Jornal ($)</span>
          <input
            inputMode="decimal"
            value={jornal}
            onChange={(e) => cambiarJornal(e.target.value)}
            className="entrada mt-1 text-lg"
          />
        </label>
      </div>

      <p className="text-finca-600 text-sm -mt-1">
        Del <b>{planilla.inicio}</b> al <b>{planilla.fin}</b>. Se trabajan los 13
        días; el <b>día 14 (sábado de pago)</b> se paga solo a quien trabajó los 13.
      </p>

      {/* Tira de días */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {planilla.dias.map((d, i) => (
          <div
            key={d.fecha}
            className={`shrink-0 rounded-lg px-2 py-1 text-center text-xs font-bold border ${
              d.esPago ? "bg-pendiente/15 border-pendiente text-pendiente" : "bg-white border-finca-100 text-finca-700"
            }`}
            title={d.fecha}
          >
            <div>{i + 1}</div>
            <div className="uppercase">{d.dow}</div>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="grid grid-cols-3 gap-3">
        <Cifra n={planilla.filas.length} etiqueta="Colaboradores" />
        <Cifra n={planilla.totalDias} etiqueta="Días a pagar" />
        <Cifra n={planilla.totalPago} etiqueta="Total $" money destacado />
      </div>

      {/* Preview */}
      {planilla.filas.length === 0 ? (
        <p className="text-finca-600">
          No hay días trabajados en este período. Ajustá la fecha de inicio o registrá asistencia.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-finca-100">
          <table className="w-full text-left bg-white text-sm">
            <thead className="bg-finca-100 text-finca-800">
              <tr>
                <th className="px-3 py-2">Colaborador</th>
                <th className="px-2 py-2 text-center">Días</th>
                <th className="px-2 py-2 text-center">Sáb.</th>
                <th className="px-2 py-2 text-center">Total</th>
                <th className="px-3 py-2 text-right">Pago</th>
              </tr>
            </thead>
            <tbody>
              {planilla.filas.map((f) => (
                <tr key={f.trabajador_id} className="border-t border-finca-100">
                  <td className="px-3 py-2 font-semibold text-finca-800">{f.nombre}</td>
                  <td className="px-2 py-2 text-center">{f.diasTrabajados}</td>
                  <td className="px-2 py-2 text-center">
                    {f.completo ? "✓" : <span className="text-finca-300">—</span>}
                  </td>
                  <td className="px-2 py-2 text-center font-bold">{f.totalDias}</td>
                  <td className="px-3 py-2 text-right font-bold">${f.totalPago.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-finca-500 bg-finca-50 font-extrabold text-finca-800">
                <td className="px-3 py-2">TOTALES</td>
                <td></td>
                <td></td>
                <td className="px-2 py-2 text-center">{planilla.totalDias}</td>
                <td className="px-3 py-2 text-right">${planilla.totalPago.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-finca-600 text-sm">
        Revisá que esté bien. La columna <b>Sáb.</b> marca ✓ a quien completó los 13
        días y gana el sábado de pago.
      </p>

      <button
        className="boton-listo disabled:opacity-50"
        disabled={exportando || planilla.filas.length === 0}
        onClick={() => void exportarExcel()}
      >
        {exportando ? "Generando…" : "⬇ EXPORTAR A EXCEL"}
      </button>
      <button
        className="text-finca-600 font-bold underline text-sm"
        disabled={planilla.filas.length === 0}
        onClick={() => exportarPlanillaCSV(planilla)}
      >
        o descargar CSV
      </button>
    </div>
  );
}

function Cifra({ n, etiqueta, money, destacado }: { n: number; etiqueta: string; money?: boolean; destacado?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center border ${destacado ? "bg-finca-500 text-white border-finca-500" : "bg-white text-finca-700 border-finca-100"}`}>
      <div className="text-xl font-extrabold">{money ? `$${n.toFixed(2)}` : n}</div>
      <div className="text-xs opacity-90">{etiqueta}</div>
    </div>
  );
}
