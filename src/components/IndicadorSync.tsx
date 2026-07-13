"use client";

import { useEffect, useState } from "react";

/**
 * Indicador discreto de registros pendientes de enviar.
 * Emerson NUNCA ve un error de red: solo un contador tranquilo.
 *
 * TODO (Paso 3): leer el conteo real desde IndexedDB (Dexie) y suscribirse a
 * cambios con dexie-react-hooks. Por ahora solo refleja el estado de conexión.
 */
export default function IndicadorSync() {
  const [enLinea, setEnLinea] = useState(true);
  // Placeholder hasta implementar la cola de sincronización (Paso 3).
  const pendientes = 0;

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
      <span className="text-sm font-semibold text-finca-600">
        {enLinea ? "Todo enviado" : "Sin señal — guardando aquí"}
      </span>
    );
  }

  return (
    <span className="text-sm font-semibold text-pendiente">
      {pendientes} registro{pendientes === 1 ? "" : "s"} pendiente
      {pendientes === 1 ? "" : "s"} de enviar
    </span>
  );
}
