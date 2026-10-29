"use client";

import Link from "next/link";
import BotonGrande from "@/components/BotonGrande";
import { useCortes, useLotes } from "@/lib/db/hooks";

const ESTADOS: Record<string, string> = {
  pendiente: "Guardado aquí",
  error: "Reintentando…",
  sincronizando: "Enviando…",
  sincronizado: "✓ Enviado",
};

/** Hub de cosecha: corte en verde y secado (pergamino). */
export default function CosechaHome() {
  const cortes = useCortes(10);
  const lotes = useLotes(10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Cosecha</h1>
        <p className="text-finca-600">Corte en verde y secado a pergamino</p>
      </div>

      <BotonGrande href="/campo/cosecha/corte" className="text-2xl py-8">
        🌿 REGISTRAR CORTE
      </BotonGrande>
      <BotonGrande href="/campo/cosecha/secado" variante="secundario" className="text-2xl py-8">
        🔥 REGISTRAR SECADO
      </BotonGrande>

      {cortes.length > 0 && (
        <section>
          <h2 className="text-xl font-extrabold text-finca-900 mb-2">Últimos cortes</h2>
          <ul className="flex flex-col gap-2">
            {cortes.map((c) => (
              <li key={c.id} className="tarjeta flex items-center justify-between py-3">
                <span className="font-semibold text-finca-800">
                  {c.area_nombre ?? "—"} · {c.fecha}
                  {c.lote_id ? " · en secado" : ""}
                </span>
                <span className="text-sm text-finca-600">{ESTADOS[c.estadoSync] ?? c.estadoSync}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lotes.length > 0 && (
        <section>
          <h2 className="text-xl font-extrabold text-finca-900 mb-2">Lotes de secado</h2>
          <ul className="flex flex-col gap-2">
            {lotes.map((l) => (
              <li key={l.id} className="tarjeta flex items-center justify-between py-3">
                <span className="font-semibold text-finca-800">
                  Lote {l.fecha_inicio}
                  {l.fecha_fin ? " (cerrado)" : " (abierto)"}
                </span>
                <span className="text-sm text-finca-600">{ESTADOS[l.estadoSync] ?? l.estadoSync}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/campo" className="text-finca-600 font-bold text-center">
        ← Volver
      </Link>
    </div>
  );
}
