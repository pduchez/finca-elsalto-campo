"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ActividadOpc } from "@/lib/panel/detalle";

/** Filtro por actividad. Escribe ?actividad=<codigo> conservando el período. */
export default function FiltroActividad({
  actividades,
  seleccion,
}: {
  actividades: ActividadOpc[];
  seleccion?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function elegir(codigo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (codigo) params.set("actividad", codigo);
    else params.delete("actividad");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="bg-white rounded-2xl border border-finca-100 p-3 flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-finca-700 mr-1">Actividad:</span>
      <button
        onClick={() => elegir("")}
        className={`rounded-full px-3 py-1.5 text-sm font-bold border-2 ${
          !seleccion ? "bg-finca-500 text-white border-finca-500" : "bg-white text-finca-700 border-finca-100"
        }`}
      >
        Todas
      </button>
      {actividades.map((a) => (
        <button
          key={a.codigo}
          onClick={() => elegir(a.codigo)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold border-2 ${
            seleccion === a.codigo ? "bg-finca-500 text-white border-finca-500" : "bg-white text-finca-700 border-finca-100"
          }`}
        >
          {a.nombre}
        </button>
      ))}
    </div>
  );
}
