"use client";

import type { ProtocoloLocal } from "@/lib/db";

/**
 * Muestra un protocolo técnico. Render de markdown mínimo (encabezados y
 * viñetas) sin dependencias, suficiente para el contenido de los protocolos.
 */
function RenderMd({ md }: { md: string }) {
  const lineas = md.split("\n");
  return (
    <div className="seleccionable flex flex-col gap-1">
      {lineas.map((l, i) => {
        if (l.startsWith("## "))
          return (
            <h3 key={i} className="text-xl font-extrabold text-finca-900 mt-2">
              {l.slice(3)}
            </h3>
          );
        if (l.startsWith("# "))
          return (
            <h2 key={i} className="text-2xl font-extrabold text-finca-900">
              {l.slice(2)}
            </h2>
          );
        if (l.startsWith("- "))
          return (
            <p key={i} className="pl-4 text-finca-800">
              • {l.slice(2)}
            </p>
          );
        if (l.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-finca-800">
            {l}
          </p>
        );
      })}
    </div>
  );
}

export default function ModalProtocolo({
  protocolo,
  onCerrar,
}: {
  protocolo: ProtocoloLocal;
  onCerrar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2"
      onClick={onCerrar}
    >
      <div
        className="bg-crema rounded-2xl p-5 max-w-xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold text-finca-900">
            📖 {protocolo.titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-finca-600 font-bold text-2xl px-2"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <RenderMd md={protocolo.contenido_md} />
        <button
          type="button"
          onClick={onCerrar}
          className="boton-primario mt-5"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
