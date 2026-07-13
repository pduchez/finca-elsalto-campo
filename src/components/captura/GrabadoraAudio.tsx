"use client";

import { useEffect, useRef, useState } from "react";
import { mimeAudioSoportado } from "@/lib/media";

type Props = {
  audio: Blob | null;
  onCambio: (audio: Blob | null, mime: string | null) => void;
};

/**
 * Botón "mantener para hablar". Graba mientras se mantiene presionado.
 * Un solo audio por registro; se puede regrabar. Sin texto.
 */
export default function GrabadoraAudio({ audio, onCambio }: Props) {
  const [grabando, setGrabando] = useState(false);
  const [permisoNegado, setPermisoNegado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>("audio/webm");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  async function iniciar() {
    if (grabando) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = mimeAudioSoportado();
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        onCambio(blob, mimeRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      rec.start();
      recRef.current = rec;
      setGrabando(true);
      setSegundos(0);
      timerRef.current = window.setInterval(
        () => setSegundos((s) => s + 1),
        1000,
      );
    } catch {
      setPermisoNegado(true);
    }
  }

  function detener() {
    if (!grabando) return;
    recRef.current?.stop();
    setGrabando(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          void iniciar();
        }}
        onPointerUp={detener}
        onPointerLeave={detener}
        onPointerCancel={detener}
        className={`toque-grande select-none text-2xl py-10 w-full ${
          grabando
            ? "bg-alerta text-white scale-[1.02]"
            : "bg-finca-500 text-white"
        }`}
      >
        {grabando ? `🔴 GRABANDO ${segundos}s` : "🎤 MANTENER PARA HABLAR"}
      </button>

      {audio && !grabando && (
        <div className="w-full flex items-center gap-3">
          <span className="text-listo font-bold">✓ Audio listo</span>
          <button
            type="button"
            className="ml-auto text-finca-600 underline font-semibold"
            onClick={() => onCambio(null, null)}
          >
            Regrabar
          </button>
        </div>
      )}

      {permisoNegado && (
        <p className="text-alerta text-sm text-center">
          No se pudo usar el micrófono. Revisá los permisos del teléfono.
        </p>
      )}
    </div>
  );
}
