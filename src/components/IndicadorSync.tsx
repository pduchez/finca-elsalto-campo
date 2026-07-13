"use client";

import { useEffect, useState } from "react";
import { useConteoPendientes } from "@/lib/db/hooks";
import { sincronizar } from "@/lib/sync/cola";

/**
 * Indicador discreto de registros pendientes de enviar.
 * Emerson NUNCA ve un error de red: solo un contador tranquilo.
 */
export default function IndicadorSync() {
  const pendientes = useConteoPendientes();
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    actualizar();
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);

  if (pendientes === 0) {
    return (
      <span className="text-sm font-semibold text-white/90">
        {enLinea ? "✓ Todo enviado" : "Sin señal — guardando aquí"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void sincronizar()}
      className="text-sm font-bold bg-pendiente text-white rounded-full px-3 py-1"
      title="Tocá para intentar enviar ahora"
    >
      {pendientes} pendiente{pendientes === 1 ? "" : "s"}
      {enLinea ? "" : " · sin señal"}
    </button>
  );
}
