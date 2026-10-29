"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useLotes,
  useLote,
  useCortesDisponibles,
  useCortesDeLote,
  usePergaminoDeLote,
  useVerdeDeLote,
  useVerdeDeCorte,
} from "@/lib/db/hooks";
import { crearLote, actualizarLote, asignarCorteALote, agregarPesaje, netoLb } from "@/lib/cosecha";
import type { CorteLocal } from "@/lib/db";
import NuevaPesada from "@/components/cosecha/NuevaPesada";

/** Una línea de corte con su verde (hook propio por fila). */
function FilaCorte({
  corte,
  enLote,
  onToggle,
}: {
  corte: CorteLocal;
  enLote: boolean;
  onToggle: () => void;
}) {
  const verde = useVerdeDeCorte(corte.id);
  return (
    <li className="tarjeta flex items-center justify-between py-3">
      <span className="font-semibold text-finca-800">
        {corte.area_nombre ?? "—"} · {corte.fecha}
        <span className="block text-xs text-finca-600">{Math.round(verde * 100) / 100} lb verde</span>
      </span>
      <button
        type="button"
        onClick={onToggle}
        className={enLote ? "boton-alerta" : "boton-secundario"}
        style={{ padding: "0.4rem 0.9rem" }}
      >
        {enLote ? "Quitar" : "Agregar"}
      </button>
    </li>
  );
}

function Editor({ loteId }: { loteId: string }) {
  const lote = useLote(loteId);
  const disponibles = useCortesDisponibles();
  const enLote = useCortesDeLote(loteId);
  const pergaminoPesadas = usePergaminoDeLote(loteId);
  const verde = useVerdeDeLote(loteId);
  const pergamino = (pergaminoPesadas ?? []).reduce((s, p) => s + netoLb(p), 0);
  const rendimiento = verde > 0 ? Math.round((pergamino / verde) * 1000) / 10 : null;

  const [horas, setHoras] = useState("");
  const [propano, setPropano] = useState("");
  const [combustible, setCombustible] = useState("");
  const [horasHombre, setHorasHombre] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [precargado, setPrecargado] = useState(false);

  // Precargar desde el lote la primera vez que llega (sin tocar lo que ya tecleó).
  useEffect(() => {
    if (!lote || precargado) return;
    if (lote.horas_secado != null) setHoras(String(lote.horas_secado));
    if (lote.propano_cantidad != null) setPropano(String(lote.propano_cantidad));
    if (lote.combustible_cantidad != null) setCombustible(String(lote.combustible_cantidad));
    if (lote.horas_hombre != null) setHorasHombre(String(lote.horas_hombre));
    setPrecargado(true);
  }, [lote, precargado]);

  const num = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : null);

  async function guardarProceso() {
    await actualizarLote(loteId, {
      horas_secado: num(horas),
      propano_cantidad: num(propano),
      combustible_cantidad: num(combustible),
      horas_hombre: num(horasHombre),
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen verde → pergamino */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-finca-500 text-white p-3 text-center">
          <div className="text-xl font-extrabold">{Math.round(verde * 100) / 100}</div>
          <div className="text-xs opacity-90">verde (lb)</div>
        </div>
        <div className="rounded-xl bg-pendiente text-white p-3 text-center">
          <div className="text-xl font-extrabold">{Math.round(pergamino * 100) / 100}</div>
          <div className="text-xs opacity-90">pergamino (lb)</div>
        </div>
        <div className="rounded-xl bg-white border border-finca-100 p-3 text-center">
          <div className="text-xl font-extrabold text-finca-900">{rendimiento != null ? `${rendimiento}%` : "—"}</div>
          <div className="text-xs text-finca-600">rendimiento</div>
        </div>
      </div>

      {/* Datos del secado */}
      <div className="tarjeta flex flex-col gap-3">
        <p className="font-extrabold text-finca-900">Datos del secado</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800 text-sm">Horas de secado</span>
            <input className="entrada" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="0" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800 text-sm">Propano (lb)</span>
            <input className="entrada" inputMode="decimal" value={propano} onChange={(e) => setPropano(e.target.value)} placeholder="0" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800 text-sm">Combustible (gal)</span>
            <input className="entrada" inputMode="decimal" value={combustible} onChange={(e) => setCombustible(e.target.value)} placeholder="0" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800 text-sm">Horas hombre</span>
            <input className="entrada" inputMode="decimal" value={horasHombre} onChange={(e) => setHorasHombre(e.target.value)} placeholder="0" />
          </label>
        </div>
        <button type="button" onClick={guardarProceso} className="boton-secundario">
          {guardado ? "✓ Guardado" : "Guardar datos del secado"}
        </button>
      </div>

      {/* Cortes que entran al lote */}
      <section>
        <h2 className="text-lg font-extrabold text-finca-900 mb-2">Verde que entra al lote</h2>
        {(enLote ?? []).length > 0 && (
          <ul className="flex flex-col gap-2 mb-2">
            {(enLote ?? []).map((c) => (
              <FilaCorte key={c.id} corte={c} enLote onToggle={() => asignarCorteALote(c.id, null)} />
            ))}
          </ul>
        )}
        {(disponibles ?? []).length > 0 ? (
          <>
            <p className="text-sm text-finca-600 mb-1">Cortes disponibles para secar:</p>
            <ul className="flex flex-col gap-2">
              {(disponibles ?? []).map((c) => (
                <FilaCorte key={c.id} corte={c} enLote={false} onToggle={() => asignarCorteALote(c.id, loteId)} />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-finca-500 text-sm">No hay cortes libres. Registrá un corte primero.</p>
        )}
      </section>

      {/* Pergamino (salida) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold text-finca-900">Pergamino (salida del secado)</h2>
        <NuevaPesada
          etiqueta="Agregar pesada de pergamino"
          onGuardar={async (o) => {
            await agregarPesaje({ destino: "pergamino", lote_id: loteId, ...o, fotoBlob: o.foto });
          }}
        />
        {(pergaminoPesadas ?? []).length > 0 && (
          <ul className="flex flex-col gap-2">
            {(pergaminoPesadas ?? []).map((p, i) => (
              <li key={p.id} className="tarjeta flex items-center justify-between py-3">
                <span className="font-semibold text-finca-800">Pesada {i + 1}</span>
                <span className="text-finca-700 font-bold">
                  {p.bruto_lb != null ? `${netoLb(p)} lb` : "📷 leerá Claude"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!lote?.fecha_fin && (
        <button
          type="button"
          onClick={() => actualizarLote(loteId, { fecha_fin: new Date().toISOString().slice(0, 10) })}
          className="boton-listo"
        >
          ✓ Cerrar lote
        </button>
      )}
    </div>
  );
}

export default function RegistrarSecado() {
  const lotes = useLotes(20);
  const [loteId, setLoteId] = useState<string | null>(null);
  const abiertos = (lotes ?? []).filter((l) => !l.fecha_fin);

  async function nuevo() {
    const id = await crearLote({});
    setLoteId(id);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Registrar secado</h1>
        <p className="text-finca-600">Deshidratación: verde → pergamino</p>
      </div>

      {!loteId ? (
        <>
          <button type="button" onClick={nuevo} className="boton-primario text-xl py-6">
            🔥 Nuevo lote de secado
          </button>
          {abiertos.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-finca-900 mb-2">Continuar un lote abierto</h2>
              <ul className="flex flex-col gap-2">
                {abiertos.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setLoteId(l.id)}
                      className="tarjeta w-full text-left font-semibold text-finca-800 py-3"
                    >
                      Lote {l.fecha_inicio}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <Editor loteId={loteId} />
      )}

      <Link href="/campo/cosecha" className="text-finca-600 font-bold text-center">
        ← Volver
      </Link>
    </div>
  );
}
