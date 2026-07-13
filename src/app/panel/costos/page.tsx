"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { hoyISO } from "@/lib/db/seed";

// Costos por área y por actividad: planilla (jornales × jornal) + destajo.
// El valor del jornal es un parámetro editable (Administración). Valor de
// referencia para el cálculo mientras no se configure:
const JORNAL_DIARIO = 8.0; // USD por jornal (placeholder editable)

export default function CostosPage() {
  const fecha = hoyISO();
  const registros = useLiveQuery(
    () => db().registros.where("fecha").equals(fecha).toArray(),
    [fecha],
    [],
  );
  const destajo = useLiveQuery(
    () => db().tareas_destajo.where("fecha").equals(fecha).toArray(),
    [fecha],
    [],
  );

  // Costo por área
  const porArea = new Map<string, { planilla: number; destajo: number }>();
  const add = (area: string | null | undefined, tipo: "planilla" | "destajo", monto: number) => {
    const k = area ?? "(sin área)";
    const cur = porArea.get(k) ?? { planilla: 0, destajo: 0 };
    cur[tipo] += monto;
    porArea.set(k, cur);
  };
  registros.forEach((r) =>
    add(r.area_nombre, "planilla", (r.jornales_usados ?? 0) * JORNAL_DIARIO),
  );
  destajo.forEach((d) => add(d.area_nombre, "destajo", d.total_calculado));

  // Costo por actividad
  const porActividad = new Map<string, number>();
  registros.forEach((r) => {
    const k = r.actividad_nombre ?? "(sin actividad)";
    porActividad.set(
      k,
      (porActividad.get(k) ?? 0) + (r.jornales_usados ?? 0) * JORNAL_DIARIO,
    );
  });
  destajo.forEach((d) => {
    const k = d.actividad_nombre ?? "(sin actividad)";
    porActividad.set(k, (porActividad.get(k) ?? 0) + d.total_calculado);
  });

  const totalPlanilla = [...porArea.values()].reduce((s, v) => s + v.planilla, 0);
  const totalDestajo = [...porArea.values()].reduce((s, v) => s + v.destajo, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-finca-900">Costos de hoy</h1>
      <p className="text-finca-600 -mt-3 text-sm">
        Jornal de referencia: ${JORNAL_DIARIO.toFixed(2)} (editable en
        Administración).
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Cifra n={totalPlanilla} etiqueta="Planilla" />
        <Cifra n={totalDestajo} etiqueta="Destajo" />
        <Cifra n={totalPlanilla + totalDestajo} etiqueta="Total" destacado />
      </div>

      <section>
        <h2 className="text-xl font-extrabold text-finca-900 mb-2">Por área</h2>
        <Tabla
          filas={[...porArea.entries()].map(([area, v]) => [
            area,
            `$${v.planilla.toFixed(2)}`,
            `$${v.destajo.toFixed(2)}`,
            `$${(v.planilla + v.destajo).toFixed(2)}`,
          ])}
          cabeceras={["Área", "Planilla", "Destajo", "Total"]}
          vacio="Sin costos hoy."
        />
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-finca-900 mb-2">
          Por actividad
        </h2>
        <Tabla
          filas={[...porActividad.entries()].map(([act, v]) => [
            act,
            `$${v.toFixed(2)}`,
          ])}
          cabeceras={["Actividad", "Costo"]}
          vacio="Sin costos hoy."
        />
      </section>
    </div>
  );
}

function Cifra({
  n,
  etiqueta,
  destacado,
}: {
  n: number;
  etiqueta: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 text-center border ${
        destacado
          ? "bg-finca-500 text-white border-finca-500"
          : "bg-white text-finca-700 border-finca-100"
      }`}
    >
      <div className="text-2xl font-extrabold">${n.toFixed(2)}</div>
      <div className="text-sm opacity-90">{etiqueta}</div>
    </div>
  );
}

function Tabla({
  filas,
  cabeceras,
  vacio,
}: {
  filas: string[][];
  cabeceras: string[];
  vacio: string;
}) {
  if (filas.length === 0) return <p className="text-finca-600">{vacio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left bg-white rounded-xl overflow-hidden">
        <thead className="bg-finca-100 text-finca-800">
          <tr>
            {cabeceras.map((c) => (
              <th key={c} className="px-3 py-2 text-sm font-bold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-finca-100">
              {f.map((celda, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 ${j === 0 ? "font-semibold text-finca-800" : "text-finca-700"}`}
                >
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
