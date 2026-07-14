"use client";

import { useEffect, useState } from "react";
import {
  puedeInstalar,
  yaInstalada,
  esIOS,
  alCambiar,
  lanzarInstalacion,
} from "@/lib/pwa/instalar";

/**
 * Botón para instalar la app sin depender del menú escondido del navegador.
 * - Android/Chrome: usa el evento nativo (botón "Instalar app").
 * - Si el evento aún no llegó (primer ingreso, el Service Worker se está
 *   activando) o es iPhone: muestra instrucciones claras paso a paso.
 * Se oculta solo cuando la app ya corre instalada.
 */
export default function BotonInstalar({
  className = "",
  tono = "oscuro",
}: {
  className?: string;
  /** "oscuro": fondo verde/login (texto blanco). "claro": fondo crema (botón verde). */
  tono?: "oscuro" | "claro";
}) {
  const [listo, setListo] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const sync = () => {
      setListo(puedeInstalar());
      setInstalada(yaInstalada());
    };
    setIos(esIOS());
    sync();
    return alCambiar(sync);
  }, []);

  if (instalada) return null;

  async function instalar() {
    const r = await lanzarInstalacion();
    if (r == null) setAyuda(true); // no había evento: mostramos instrucciones
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={listo && !ios ? instalar : () => setAyuda(true)}
        className={`w-full font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-2 active:scale-[0.98] ${
          tono === "claro"
            ? "bg-finca-500 text-white shadow-md"
            : "bg-white/15 text-white"
        }`}
      >
        📲 Instalar app en el teléfono
      </button>

      {ayuda && (
        <div className="mt-3 bg-white rounded-xl p-4 text-finca-900 text-base leading-relaxed">
          {ios ? (
            <>
              <p className="font-bold mb-2">En iPhone (Safari):</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Tocá el botón <b>Compartir</b> (el cuadro con la flecha ↑).</li>
                <li>Elegí <b>“Agregar a inicio”</b>.</li>
                <li>Tocá <b>Agregar</b>. Queda el ícono <b>Finca El Salto</b>.</li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-bold mb-2">En Android (Chrome):</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Tocá el menú <b>⋮</b> (arriba a la derecha).</li>
                <li>
                  Elegí <b>“Instalar app”</b> o <b>“Agregar a la pantalla de inicio”</b>.
                </li>
                <li>Confirmá. Queda el ícono <b>Finca El Salto</b>.</li>
              </ol>
              <p className="mt-3 text-finca-700">
                ¿No aparece la opción? Esperá unos segundos y <b>recargá la página
                una vez</b> (deslizá hacia abajo). La primera vez el teléfono
                necesita un momento para preparar la app.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => setAyuda(false)}
            className="mt-3 text-finca-600 font-bold underline"
          >
            Entendido
          </button>
        </div>
      )}
    </div>
  );
}
