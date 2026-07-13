"use client";

import { useEffect, useRef, useState } from "react";
import { comprimirFoto } from "@/lib/media";

type Props = {
  fotos: Blob[];
  onCambio: (fotos: Blob[]) => void;
};

/** Toma varias fotos con la cámara trasera; se comprimen antes de guardar. */
export default function CapturaFotos({ fotos, onCambio }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const nuevas = fotos.map((f) => URL.createObjectURL(f));
    setUrls(nuevas);
    return () => nuevas.forEach((u) => URL.revokeObjectURL(u));
  }, [fotos]);

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const comprimidas = await Promise.all(files.map((f) => comprimirFoto(f)));
    onCambio([...fotos, ...comprimidas]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function quitar(i: number) {
    onCambio(fotos.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => void alSeleccionar(e)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="boton-secundario"
      >
        📷 TOMAR FOTO {fotos.length > 0 ? `(${fotos.length})` : ""}
      </button>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((u, i) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt={`Foto ${i + 1}`}
                className="w-full h-24 object-cover rounded-xl border-2 border-finca-100"
              />
              <button
                type="button"
                onClick={() => quitar(i)}
                className="absolute -top-2 -right-2 bg-alerta text-white w-7 h-7 rounded-full font-bold"
                aria-label="Quitar foto"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
