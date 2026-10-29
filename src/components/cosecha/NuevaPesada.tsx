"use client";

import { useRef, useState } from "react";

/**
 * Captura de UNA pesada: foto de la báscula (cámara) + peso y tara opcionales.
 * Si no se teclea el peso, Claude lo lee de la foto al sincronizar.
 * Pensado para manos sucias y sin señal: todo se guarda local.
 */
export default function NuevaPesada({
  etiqueta = "Agregar pesada",
  onGuardar,
}: {
  etiqueta?: string;
  onGuardar: (opts: { bruto_lb: number | null; tara_lb: number | null; foto: Blob | null }) => Promise<void>;
}) {
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [peso, setPeso] = useState("");
  const [tara, setTara] = useState("");
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function elegirFoto(f: File | null) {
    setFoto(f);
    if (previa) URL.revokeObjectURL(previa);
    setPrevia(f ? URL.createObjectURL(f) : null);
  }

  const pesoNum = peso.trim() ? Number(peso.replace(",", ".")) : null;
  const taraNum = tara.trim() ? Number(tara.replace(",", ".")) : null;
  const puedeGuardar = (!!foto || (pesoNum != null && !Number.isNaN(pesoNum))) && !guardando;

  async function guardar() {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      await onGuardar({
        bruto_lb: pesoNum != null && !Number.isNaN(pesoNum) ? pesoNum : null,
        tara_lb: taraNum != null && !Number.isNaN(taraNum) ? taraNum : null,
        foto,
      });
      elegirFoto(null);
      setPeso("");
      setTara("");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="tarjeta flex flex-col gap-3">
      <p className="font-extrabold text-finca-900">{etiqueta}</p>

      <label className="boton-secundario text-center cursor-pointer">
        📷 {foto ? "Cambiar foto de la báscula" : "Foto de la báscula"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)}
        />
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {previa && <img src={previa} alt="pesada" className="w-full h-44 object-cover rounded-xl border border-finca-100" />}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-bold text-finca-800 text-sm">Peso (lb)</span>
          <input
            className="entrada text-left"
            inputMode="decimal"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="opcional"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-bold text-finca-800 text-sm">Tara (lb)</span>
          <input
            className="entrada text-left"
            inputMode="decimal"
            value={tara}
            onChange={(e) => setTara(e.target.value)}
            placeholder="0"
          />
        </label>
      </div>

      {!peso.trim() && foto && (
        <p className="text-xs text-finca-600">
          Si no escribís el peso, Claude lo lee de la foto cuando haya señal.
        </p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className={`boton-primario ${!puedeGuardar ? "opacity-50" : ""}`}
      >
        {guardando ? "Guardando…" : "Guardar pesada"}
      </button>
    </div>
  );
}
