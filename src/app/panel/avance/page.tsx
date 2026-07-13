"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

// Avance de Emerson: qué protocolos consulta y con qué frecuencia.
export default function AvancePage() {
  const consultas = useLiveQuery(
    () => db().consultas_protocolo.toArray(),
    [],
    [],
  );
  const protocolos = useLiveQuery(() => db().protocolos.toArray(), [], []);

  const titulo = new Map(protocolos.map((p) => [p.id, p.titulo]));
  const conteo = new Map<string, number>();
  consultas.forEach((c) =>
    conteo.set(c.protocolo_id, (conteo.get(c.protocolo_id) ?? 0) + 1),
  );
  const filas = [...conteo.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold text-finca-900">
        Avance de Emerson
      </h1>
      <p className="text-finca-600 -mt-2">
        Protocolos que consulta. Muchas consultas del mismo tema = dónde reforzar
        la capacitación.
      </p>

      {filas.length === 0 ? (
        <p className="text-finca-600">
          Aún no hay consultas de protocolo registradas.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-white rounded-xl overflow-hidden">
            <thead className="bg-finca-100 text-finca-800">
              <tr>
                <th className="px-3 py-2 text-sm font-bold">Protocolo</th>
                <th className="px-3 py-2 text-sm font-bold">Consultas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(([id, n]) => (
                <tr key={id} className="border-t border-finca-100">
                  <td className="px-3 py-2 font-semibold text-finca-800">
                    {titulo.get(id) ?? id}
                  </td>
                  <td className="px-3 py-2 text-finca-700">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
