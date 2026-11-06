"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";

/**
 * Resultados de cosecha. Con señal: lo de TODA la finca (servidor).
 * Sin señal: lo que está guardado en este teléfono (incluye lo no enviado).
 */

type Corte = { id: string; fecha: string; area: string; verdeLb: number; pesadas: number; enLote: boolean };
type Lote = {
  id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  verdeLb: number;
  pergaminoLb: number;
  rendimientoPct: number | null;
};
type Datos = {
  fuente: "servidor" | "telefono";
  verdeTotalLb: number;
  pergaminoTotalLb: number;
  rendimientoPct: number | null;
  porArea: { area: string; verdeLb: number }[];
  cortesLista: Corte[];
  lotes: Lote[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const neto = (p: { bruto_lb: number | null; tara_lb: number | null }) =>
  Math.max(0, (p.bruto_lb ?? 0) - (p.tara_lb ?? 0));

/** Calcula los resultados con lo guardado en el teléfono (sin señal). */
async function desdeTelefono(): Promise<Datos> {
  const base = db();
  const [cortes, lotes, pesajes, areas] = await Promise.all([
    base.cosecha_cortes.toArray(),
    base.cosecha_lotes.toArray(),
    base.cosecha_pesajes.toArray(),
    base.areas.toArray(),
  ]);
  const nombreArea = new Map(areas.map((a) => [a.id, a.nombre]));
  const verde = new Map<string, number>();
  const pesadas = new Map<string, number>();
  const perg = new Map<string, number>();
  for (const p of pesajes) {
    if (p.destino === "verde" && p.corte_id) {
      verde.set(p.corte_id, (verde.get(p.corte_id) ?? 0) + neto(p));
      pesadas.set(p.corte_id, (pesadas.get(p.corte_id) ?? 0) + 1);
    }
    if (p.destino === "pergamino" && p.lote_id) perg.set(p.lote_id, (perg.get(p.lote_id) ?? 0) + neto(p));
  }
  const cortesLista: Corte[] = cortes
    .slice()
    .sort((a, b) => b.creado_en - a.creado_en)
    .map((c) => ({
      id: c.id,
      fecha: c.fecha,
      area: c.area_nombre ?? (c.area_id ? nombreArea.get(c.area_id) ?? "—" : "—"),
      verdeLb: r2(verde.get(c.id) ?? 0),
      pesadas: pesadas.get(c.id) ?? 0,
      enLote: !!c.lote_id,
    }));
  const porAreaMap = new Map<string, number>();
  for (const c of cortesLista) porAreaMap.set(c.area, (porAreaMap.get(c.area) ?? 0) + c.verdeLb);
  const lotesOut: Lote[] = lotes
    .slice()
    .sort((a, b) => b.creado_en - a.creado_en)
    .map((l) => {
      const v = cortes.filter((c) => c.lote_id === l.id).reduce((s, c) => s + (verde.get(c.id) ?? 0), 0);
      const pg = perg.get(l.id) ?? 0;
      return {
        id: l.id,
        fecha_inicio: l.fecha_inicio,
        fecha_fin: l.fecha_fin ?? null,
        verdeLb: r2(v),
        pergaminoLb: r2(pg),
        rendimientoPct: v > 0 ? Math.round((pg / v) * 1000) / 10 : null,
      };
    });
  const verdeTotalLb = r2(cortesLista.reduce((s, c) => s + c.verdeLb, 0));
  const pergaminoTotalLb = r2(lotesOut.reduce((s, l) => s + l.pergaminoLb, 0));
  return {
    fuente: "telefono",
    verdeTotalLb,
    pergaminoTotalLb,
    // Rendimiento = pergamino ÷ verde que ya pasó por secado (no todo el verde).
    rendimientoPct: (() => {
      const c = lotesOut.filter((l) => l.pergaminoLb > 0 && l.verdeLb > 0);
      const v = c.reduce((s, l) => s + l.verdeLb, 0);
      return v > 0 ? Math.round((c.reduce((s, l) => s + l.pergaminoLb, 0) / v) * 1000) / 10 : null;
    })(),
    porArea: [...porAreaMap.entries()]
      .map(([area, verdeLb]) => ({ area, verdeLb: r2(verdeLb) }))
      .filter((x) => x.verdeLb > 0)
      .sort((a, b) => b.verdeLb - a.verdeLb),
    cortesLista,
    lotes: lotesOut,
  };
}

export default function ResultadosCosecha() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/cosecha/resumen", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      if (!j?.ok || j.configurado === false) throw new Error("sin datos del servidor");
      setDatos({
        fuente: "servidor",
        verdeTotalLb: j.verdeTotalLb,
        pergaminoTotalLb: j.pergaminoTotalLb,
        rendimientoPct: j.rendimientoPct,
        porArea: j.porArea ?? [],
        cortesLista: j.cortesLista ?? [],
        lotes: j.lotes ?? [],
      });
    } catch {
      try {
        setDatos(await desdeTelefono());
      } catch {
        setDatos(null);
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Resultados de cosecha</h1>
        {datos && (
          <p className="text-finca-600">
            {datos.fuente === "servidor"
              ? "Toda la finca · últimos 90 días"
              : "Sin señal: lo guardado en este teléfono"}
          </p>
        )}
      </div>

      {cargando && !datos && <p className="tarjeta text-finca-700">Cargando…</p>}

      {datos && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-finca-500 text-white p-3 text-center">
              <div className="text-2xl font-extrabold">{datos.verdeTotalLb}</div>
              <div className="text-xs opacity-90">lb verde</div>
            </div>
            <div className="rounded-xl bg-pendiente text-white p-3 text-center">
              <div className="text-2xl font-extrabold">{datos.pergaminoTotalLb}</div>
              <div className="text-xs opacity-90">lb pergamino</div>
            </div>
            <div className="rounded-xl bg-white border border-finca-100 p-3 text-center">
              <div className="text-2xl font-extrabold text-finca-900">
                {datos.rendimientoPct != null ? `${datos.rendimientoPct}%` : "—"}
              </div>
              <div className="text-xs text-finca-600">rendimiento</div>
            </div>
          </div>

          {datos.porArea.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-finca-900 mb-2">Verde por área</h2>
              <ul className="flex flex-col gap-2">
                {datos.porArea.map((a) => (
                  <li key={a.area} className="tarjeta flex items-center justify-between py-3">
                    <span className="font-semibold text-finca-800">{a.area}</span>
                    <span className="font-extrabold text-finca-900">{a.verdeLb} lb</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-extrabold text-finca-900 mb-2">Cada corte</h2>
            {datos.cortesLista.length === 0 ? (
              <p className="text-finca-500">Todavía no hay cortes.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {datos.cortesLista.map((c) => (
                  <li key={c.id} className="tarjeta flex items-center justify-between py-3">
                    <span className="font-semibold text-finca-800">
                      {c.area}
                      <span className="block text-xs text-finca-600">
                        {c.fecha} · {c.pesadas} {c.pesadas === 1 ? "pesada" : "pesadas"} ·{" "}
                        {c.enLote ? "en secado" : "por secar"}
                      </span>
                    </span>
                    <span className="font-extrabold text-finca-900 whitespace-nowrap">{c.verdeLb} lb</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {datos.lotes.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-finca-900 mb-2">Lotes de secado</h2>
              <ul className="flex flex-col gap-2">
                {datos.lotes.map((l) => (
                  <li key={l.id} className="tarjeta py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-finca-800">
                        Lote {l.fecha_inicio} {l.fecha_fin ? "(cerrado)" : "(abierto)"}
                      </span>
                      <span className="font-extrabold text-finca-900">
                        {l.rendimientoPct != null ? `${l.rendimientoPct}%` : "—"}
                      </span>
                    </div>
                    <span className="block text-sm text-finca-600">
                      {l.verdeLb} lb verde → {l.pergaminoLb} lb pergamino
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {!cargando && !datos && <p className="tarjeta text-finca-700">No se pudieron cargar los resultados.</p>}

      <button type="button" onClick={() => void cargar()} className="boton-secundario">
        🔄 Actualizar
      </button>
      <Link href="/campo/cosecha" className="text-finca-600 font-bold text-center">
        ← Volver
      </Link>
    </div>
  );
}
