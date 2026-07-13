"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { hoyISO, AREAS } from "@/lib/db/seed";
import { cargarDatosEjemplo } from "@/lib/db/demo";

// Briefing diario: qué se hizo, dónde, jornales, insumos, alertas.
export default function BriefingPage() {
  const fecha = hoyISO();
  const registros = useLiveQuery(
    () => db().registros.where("fecha").equals(fecha).toArray(),
    [fecha],
    [],
  );
  const asistencia = useLiveQuery(
    () => db().asistencia.where("fecha").equals(fecha).toArray(),
    [fecha],
    [],
  );
  const destajo = useLiveQuery(
    () => db().tareas_destajo.where("fecha").equals(fecha).toArray(),
    [fecha],
    [],
  );

  const presentes = asistencia.filter((a) => a.presente).length;
  const jornalesReportados = registros.reduce(
    (s, r) => s + (r.jornales_usados ?? 0),
    0,
  );
  const areasConActividad = new Set(
    registros.map((r) => r.area_nombre).filter(Boolean),
  );
  const areasSinActividad = AREAS.filter(
    (a) => a.nombre !== "El Vivero" && !areasConActividad.has(a.nombre),
  );

  // Alertas
  const problemas = registros.filter((r) => r.problema_detectado);
  const insumosAgotados = registros.filter((r) => r.insumo_agotado);
  const paraRevisar = registros.filter(
    (r) => r.audio_transcripcion == null && r.audioBlob != null,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-finca-900">
          Briefing de hoy
        </h1>
        <button
          onClick={() => void cargarDatosEjemplo()}
          className="bg-white text-finca-600 border border-finca-200 rounded-lg px-4 py-2 font-semibold"
          title="Agrega registros de ejemplo para previsualizar el panel"
        >
          + Datos de ejemplo
        </button>
      </div>

      {/* Cifras */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Cifra n={registros.length} etiqueta="Registros" />
        <Cifra n={presentes} etiqueta="En planilla" />
        <Cifra n={jornalesReportados} etiqueta="Jornales reportados" />
        <Cifra n={areasConActividad.size} etiqueta="Áreas trabajadas" />
      </div>

      {/* Alertas */}
      <section>
        <h2 className="text-xl font-extrabold text-finca-900 mb-2">Alertas</h2>
        <div className="flex flex-col gap-2">
          {problemas.map((r) => (
            <Alerta key={r.id} color="alerta">
              🐛 Problema en <b>{r.area_nombre}</b>:{" "}
              {r.descripcion_problema ?? "ver registro"}
            </Alerta>
          ))}
          {insumosAgotados.map((r) => (
            <Alerta key={r.id} color="pendiente">
              📦 Insumo por agotarse (reportado en <b>{r.area_nombre}</b>)
            </Alerta>
          ))}
          {areasSinActividad.length > 0 && (
            <Alerta color="pendiente">
              🗺️ Sin actividad hoy:{" "}
              {areasSinActividad.map((a) => a.nombre).join(", ")}
            </Alerta>
          )}
          {paraRevisar.length > 0 && (
            <Alerta color="pendiente">
              🎧 {paraRevisar.length} audio(s) pendientes de procesar
            </Alerta>
          )}
          {problemas.length === 0 &&
            insumosAgotados.length === 0 &&
            areasSinActividad.length === 0 &&
            paraRevisar.length === 0 && (
              <p className="text-finca-600">Sin alertas. Todo en orden.</p>
            )}
        </div>
      </section>

      {/* Qué se hizo */}
      <section>
        <h2 className="text-xl font-extrabold text-finca-900 mb-2">
          Qué se hizo
        </h2>
        {registros.length === 0 ? (
          <p className="text-finca-600">Aún no hay registros hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left bg-white rounded-xl overflow-hidden">
              <thead className="bg-finca-100 text-finca-800">
                <tr>
                  <Th>Área</Th>
                  <Th>Actividad</Th>
                  <Th>Cantidad</Th>
                  <Th>Jornales</Th>
                  <Th>Nota</Th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-t border-finca-100">
                    <Td>{r.area_nombre}</Td>
                    <Td>{r.actividad_nombre}</Td>
                    <Td>
                      {r.cantidad != null
                        ? `${r.cantidad} ${r.unidad ?? ""}`
                        : "—"}
                    </Td>
                    <Td>{r.jornales_usados ?? "—"}</Td>
                    <Td>{r.observaciones ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Cifra({ n, etiqueta }: { n: number; etiqueta: string }) {
  return (
    <div className="bg-white rounded-xl p-4 text-center border border-finca-100">
      <div className="text-3xl font-extrabold text-finca-700">{n}</div>
      <div className="text-sm text-finca-600">{etiqueta}</div>
    </div>
  );
}

function Alerta({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "alerta" | "pendiente";
}) {
  const cls =
    color === "alerta"
      ? "bg-alerta/10 border-alerta/40 text-alerta"
      : "bg-pendiente/10 border-pendiente/40 text-pendiente";
  return (
    <div className={`rounded-lg border px-4 py-2 font-semibold ${cls}`}>
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-sm font-bold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-finca-800">{children}</td>;
}
