"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProtocolos } from "@/lib/db/hooks";
import { registrarConsultaProtocolo } from "@/lib/registros";
import ModalProtocolo from "@/components/ModalProtocolo";
import type { ProtocoloLocal } from "@/lib/db";

// Biblioteca de protocolos offline. El acceso principal es contextual (al
// registrar), pero acá se puede buscar y consultar cualquiera.
export default function ProtocolosPage() {
  const router = useRouter();
  const protocolos = useProtocolos();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState<ProtocoloLocal | null>(null);

  const filtro = q.trim().toLowerCase();
  const lista = filtro
    ? protocolos.filter(
        (p) =>
          p.titulo.toLowerCase().includes(filtro) ||
          p.disparador_keywords.some((k) => k.toLowerCase().includes(filtro)),
      )
    : protocolos;

  function abrir(p: ProtocoloLocal) {
    setAbierto(p);
    void registrarConsultaProtocolo(p.id);
  }

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
      <h1 className="text-2xl font-extrabold text-finca-900">Protocolos</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar (ej: mancha, bocashi, biol)"
        className="seleccionable text-lg bg-white rounded-xl p-3 border-2 border-finca-100"
      />

      <ul className="flex flex-col gap-3">
        {lista.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => abrir(p)}
              className="tarjeta text-left w-full flex items-center gap-3"
            >
              <span className="text-2xl">📖</span>
              <div>
                <p className="font-bold text-finca-900">{p.titulo}</p>
                <p className="text-sm text-finca-500">
                  {p.disparador_keywords.slice(0, 4).join(" · ")}
                </p>
              </div>
            </button>
          </li>
        ))}
        {lista.length === 0 && (
          <p className="text-finca-600">No se encontró nada con “{q}”.</p>
        )}
      </ul>

      {abierto && (
        <ModalProtocolo protocolo={abierto} onCerrar={() => setAbierto(null)} />
      )}
    </div>
  );
}
