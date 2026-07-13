"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { hoyISO } from "@/lib/db/seed";
import { useTrabajadores } from "@/lib/db/hooks";
import { marcarAsistencia } from "@/lib/registros";

// Asistencia diaria (planilla): un toque por persona.
export default function AsistenciaPage() {
  const router = useRouter();
  const trabajadores = useTrabajadores();
  const asistenciaHoy = useLiveQuery(
    () => db().asistencia.where("fecha").equals(hoyISO()).toArray(),
    [],
    [],
  );

  const estado = new Map(asistenciaHoy.map((a) => [a.trabajador_id, a.presente]));
  const presentes = asistenciaHoy.filter((a) => a.presente).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/campo")}
          className="text-finca-600 font-bold text-lg"
        >
          ← Atrás
        </button>
      </div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold text-finca-900">Asistencia</h1>
        <span className="text-finca-600 font-semibold">
          {presentes} presente{presentes === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {trabajadores.map((t) => {
          const marcado = estado.get(t.id);
          const presente = marcado === true;
          return (
            <li key={t.id}>
              <button
                onClick={() =>
                  void marcarAsistencia(
                    { id: t.id, nombre: t.nombre },
                    !presente,
                  )
                }
                className={`toque-grande justify-between ${
                  presente
                    ? "bg-listo text-white"
                    : marcado === false
                      ? "bg-white text-finca-400 border-4 border-finca-100"
                      : "bg-white text-finca-800 border-4 border-finca-100"
                }`}
              >
                <span>{t.nombre}</span>
                <span className="text-2xl">
                  {presente ? "✓ Presente" : marcado === false ? "Ausente" : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-finca-600 text-sm">
        Tocá el nombre para marcar presente. Se guarda solo.
      </p>
    </div>
  );
}
