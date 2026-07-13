"use client";

import BotonGrande from "@/components/BotonGrande";
import { usePlanHoy, useRegistrosHoy } from "@/lib/db/hooks";

const ESTADOS: Record<string, string> = {
  pendiente: "Guardado aquí",
  error: "Reintentando…",
  sincronizando: "Enviando…",
  sincronizado: "✓ Enviado",
};

// Home de Emerson: plan del día (offline) + botón REGISTRAR + accesos.
export default function CampoHome() {
  const plan = usePlanHoy();
  const registrosHoy = useRegistrosHoy();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-extrabold text-finca-900 mb-3">
          Plan de hoy
        </h1>
        {plan.length === 0 ? (
          <div className="tarjeta text-finca-700">
            <p className="text-lg">
              Aún no hay plan para hoy. Registrá lo que hagas de todos modos.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {plan.map((p) => (
              <li key={p.id} className="tarjeta flex items-start gap-3">
                <span className="text-2xl">{p.completado ? "✅" : "⬜"}</span>
                <div>
                  <p className="font-bold text-finca-900">
                    {p.area_nombre} · {p.actividad_nombre}
                  </p>
                  {p.nota && <p className="text-finca-700">{p.nota}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BotonGrande href="/campo/registrar" className="text-2xl py-8">
        🎤 REGISTRAR
      </BotonGrande>

      <div className="grid grid-cols-1 gap-4">
        <BotonGrande href="/campo/areas" variante="secundario">
          🗺️ Áreas
        </BotonGrande>
        <BotonGrande href="/campo/asistencia" variante="secundario">
          👷 Asistencia
        </BotonGrande>
        <BotonGrande href="/campo/destajo" variante="secundario">
          💵 Tarea por destajo
        </BotonGrande>
        <BotonGrande href="/campo/protocolos" variante="secundario">
          📖 Protocolos
        </BotonGrande>
      </div>

      {registrosHoy.length > 0 && (
        <section>
          <h2 className="text-xl font-extrabold text-finca-900 mb-2">
            Lo que llevás hoy ({registrosHoy.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {registrosHoy.map((r) => (
              <li
                key={r.id}
                className="tarjeta flex items-center justify-between py-3"
              >
                <span className="font-semibold text-finca-800">
                  {r.area_nombre} · {r.actividad_nombre}
                </span>
                <span className="text-sm text-finca-600">
                  {ESTADOS[r.estadoSync] ?? r.estadoSync}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
