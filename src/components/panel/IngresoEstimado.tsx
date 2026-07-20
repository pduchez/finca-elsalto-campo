"use client";

import { useEffect, useState } from "react";

const KEY = "finca_precio_qq";

/** Estimador de ingresos: precio por quintal editable (se recuerda en el equipo). */
export default function IngresoEstimado({ totalQq }: { totalQq: number }) {
  const [precio, setPrecio] = useState<number>(0);

  useEffect(() => {
    const g = localStorage.getItem(KEY);
    if (g) setPrecio(parseFloat(g) || 0);
  }, []);

  function cambiar(v: string) {
    const n = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
    setPrecio(n);
    localStorage.setItem(KEY, String(n));
  }

  const ingreso = totalQq * precio;

  return (
    <div className="bg-finca-500 text-white rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm opacity-90">Ingreso estimado</p>
          <p className="text-3xl font-extrabold">${ingreso.toLocaleString("es-SV", { maximumFractionDigits: 0 })}</p>
        </div>
        <label className="text-right">
          <span className="block text-xs opacity-90">Precio por quintal ($)</span>
          <input
            inputMode="decimal"
            value={precio || ""}
            onChange={(e) => cambiar(e.target.value)}
            placeholder="0"
            className="mt-1 w-28 text-right text-lg font-bold rounded-lg p-2 text-finca-900"
          />
        </label>
      </div>
      <p className="text-xs opacity-90 mt-2">{totalQq} qq cortados × ${precio || 0} por quintal.</p>
    </div>
  );
}
