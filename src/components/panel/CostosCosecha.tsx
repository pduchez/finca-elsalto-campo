"use client";

import { useEffect, useState } from "react";

/**
 * Ingreso y costo del secado a partir de precios que el dueño fija (se recuerdan
 * en el equipo). Si no hay precios, muestra solo las cantidades. No asume nada.
 */
export default function CostosCosecha({
  pergaminoLb,
  propanoTotal,
  combustibleTotal,
  horasHombreTotal,
}: {
  pergaminoLb: number;
  propanoTotal: number;
  combustibleTotal: number;
  horasHombreTotal: number;
}) {
  const [precioPerg, setPrecioPerg] = useState(0);
  const [costoProp, setCostoProp] = useState(0);
  const [costoComb, setCostoComb] = useState(0);
  const [costoHora, setCostoHora] = useState(0);

  useEffect(() => {
    const g = (k: string) => parseFloat(localStorage.getItem(k) || "") || 0;
    setPrecioPerg(g("finca_precio_pergamino_lb"));
    setCostoProp(g("finca_costo_propano_lb"));
    setCostoComb(g("finca_costo_combustible_gal"));
    setCostoHora(g("finca_costo_hora_hombre"));
  }, []);

  function set(k: string, v: string, fn: (n: number) => void) {
    const n = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
    fn(n);
    localStorage.setItem(k, String(n));
  }

  const ingreso = pergaminoLb * precioPerg;
  const costoSecado = propanoTotal * costoProp + combustibleTotal * costoComb + horasHombreTotal * costoHora;
  const costoPorLb = pergaminoLb > 0 ? costoSecado / pergaminoLb : 0;
  const money = (n: number) => `$${n.toLocaleString("es-SV", { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-finca-500 text-white rounded-2xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs opacity-90">Ingreso estimado</p>
          <p className="text-2xl font-extrabold">{money(ingreso)}</p>
        </div>
        <div>
          <p className="text-xs opacity-90">Costo de secado</p>
          <p className="text-2xl font-extrabold">{money(costoSecado)}</p>
        </div>
        <div>
          <p className="text-xs opacity-90">Costo por lb pergamino</p>
          <p className="text-2xl font-extrabold">{pergaminoLb > 0 ? `$${costoPorLb.toFixed(2)}` : "—"}</p>
        </div>
      </div>
      <details className="text-finca-900">
        <summary className="text-white/90 text-sm cursor-pointer">Ajustar precios</summary>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="bg-white rounded-lg p-2 text-sm">
            <span className="block text-xs text-finca-600">Precio pergamino ($/lb)</span>
            <input inputMode="decimal" value={precioPerg || ""} onChange={(e) => set("finca_precio_pergamino_lb", e.target.value, setPrecioPerg)} className="w-full font-bold text-finca-900" placeholder="0" />
          </label>
          <label className="bg-white rounded-lg p-2 text-sm">
            <span className="block text-xs text-finca-600">Propano ($/lb)</span>
            <input inputMode="decimal" value={costoProp || ""} onChange={(e) => set("finca_costo_propano_lb", e.target.value, setCostoProp)} className="w-full font-bold text-finca-900" placeholder="0" />
          </label>
          <label className="bg-white rounded-lg p-2 text-sm">
            <span className="block text-xs text-finca-600">Combustible ($/gal)</span>
            <input inputMode="decimal" value={costoComb || ""} onChange={(e) => set("finca_costo_combustible_gal", e.target.value, setCostoComb)} className="w-full font-bold text-finca-900" placeholder="0" />
          </label>
          <label className="bg-white rounded-lg p-2 text-sm">
            <span className="block text-xs text-finca-600">Hora hombre ($)</span>
            <input inputMode="decimal" value={costoHora || ""} onChange={(e) => set("finca_costo_hora_hombre", e.target.value, setCostoHora)} className="w-full font-bold text-finca-900" placeholder="0" />
          </label>
        </div>
      </details>
    </div>
  );
}
