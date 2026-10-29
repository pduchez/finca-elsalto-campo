"use client";

import { useState } from "react";
import Link from "next/link";
import { useAreas, usePesajesDeCorte } from "@/lib/db/hooks";
import { crearCorte, agregarPesaje, netoLb } from "@/lib/cosecha";
import NuevaPesada from "@/components/cosecha/NuevaPesada";

export default function RegistrarCorte() {
  const areas = useAreas();
  const [areaId, setAreaId] = useState("");
  const [corteId, setCorteId] = useState<string | null>(null);
  const pesadas = usePesajesDeCorte(corteId);
  const totalVerde = (pesadas ?? []).reduce((s, p) => s + netoLb(p), 0);

  async function iniciar() {
    if (!areaId) return;
    const area = (areas ?? []).find((a) => a.id === areaId);
    const id = await crearCorte({ area_id: areaId, area_nombre: area?.nombre ?? null });
    setCorteId(id);
  }

  async function guardarPesada(o: { bruto_lb: number | null; tara_lb: number | null; foto: Blob | null }) {
    if (!corteId) return;
    await agregarPesaje({ destino: "verde", corte_id: corteId, ...o, fotoBlob: o.foto });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Registrar corte</h1>
        <p className="text-finca-600">Cardamomo en verde (cereza), en libras</p>
      </div>

      {!corteId ? (
        <div className="tarjeta flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800">¿En qué área se cortó?</span>
            <select
              className="entrada text-left"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              <option value="">Elegí un área…</option>
              {(areas ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={iniciar}
            disabled={!areaId}
            className={`boton-primario ${!areaId ? "opacity-50" : ""}`}
          >
            Iniciar corte
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-finca-500 text-white p-4 text-center">
            <div className="text-3xl font-extrabold">{Math.round(totalVerde * 100) / 100} lb</div>
            <div className="text-sm opacity-90">
              verde · {(pesadas ?? []).length} {(pesadas ?? []).length === 1 ? "pesada" : "pesadas"}
            </div>
          </div>

          <NuevaPesada etiqueta="Agregar pesada de verde" onGuardar={guardarPesada} />

          {(pesadas ?? []).length > 0 && (
            <ul className="flex flex-col gap-2">
              {(pesadas ?? [])
                .slice()
                .sort((a, b) => b.creado_en - a.creado_en)
                .map((p, i) => (
                  <li key={p.id} className="tarjeta flex items-center justify-between py-3">
                    <span className="font-semibold text-finca-800">Pesada {(pesadas ?? []).length - i}</span>
                    <span className="text-finca-700 font-bold">
                      {p.bruto_lb != null ? `${netoLb(p)} lb` : "📷 leerá Claude"}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          <Link href="/campo/cosecha" className="boton-listo text-center">
            ✓ Listo
          </Link>
        </>
      )}

      <Link href="/campo/cosecha" className="text-finca-600 font-bold text-center">
        ← Volver
      </Link>
    </div>
  );
}
