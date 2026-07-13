"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAreas } from "@/lib/db/hooks";

// Menú de áreas: una tarjeta por área con su estado (medida / sembrada / última visita).
export default function AreasMenu() {
  const router = useRouter();
  const areas = useAreas();
  const detalles = useLiveQuery(() => db().area_detalle.toArray(), [], []);
  const regs = useLiveQuery(() => db().registros.toArray(), [], []);

  const detPorArea = new Map(detalles.map((d) => [d.area_id, d]));
  const ultimaPorArea = new Map<string, number>();
  regs.forEach((r) => {
    if (!r.area_id) return;
    const prev = ultimaPorArea.get(r.area_id) ?? 0;
    if (r.creado_en > prev) ultimaPorArea.set(r.area_id, r.creado_en);
  });

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
      <h1 className="text-2xl font-extrabold text-finca-900">Áreas de la finca</h1>
      <p className="text-finca-600 -mt-2">
        Tocá un área para ver su ficha, medirla con GPS y ver lo que se ha hecho ahí.
      </p>

      <div className="flex flex-col gap-3">
        {areas.map((a) => {
          const d = detPorArea.get(a.id);
          const ult = ultimaPorArea.get(a.id);
          const dias = ult ? Math.floor((Date.now() - ult) / 86400000) : null;
          const medida = d?.area_manzanas != null;
          return (
            <Link
              key={a.id}
              href={`/campo/areas/${a.id}`}
              className="tarjeta flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-extrabold text-finca-900 text-lg">{a.nombre}</p>
                <p className="text-sm text-finca-600">
                  {medida
                    ? `${d!.area_manzanas!.toFixed(2)} mz`
                    : "Sin medir"}
                  {d?.manzanas_sembradas != null &&
                    ` · ${d.manzanas_sembradas} mz sembradas`}
                </p>
              </div>
              <span className="text-sm text-finca-500 text-right shrink-0">
                {dias == null
                  ? "Sin visitas"
                  : dias === 0
                    ? "Hoy"
                    : `Hace ${dias} d`}
                <span className="block text-finca-400">›</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
