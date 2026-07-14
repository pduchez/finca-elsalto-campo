"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Cambio de contraseña. Obligatorio en el primer ingreso. */
export default function CambiarClavePage() {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nueva !== repetir) {
      setError("Las dos contraseñas nuevas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      const res = await fetch("/api/auth/cambiar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo cambiar.");
        setCargando(false);
        return;
      }
      router.replace(data.rol === "supervisor" ? "/campo" : "/panel");
      router.refresh();
    } catch {
      setError("Sin conexión. Probá de nuevo con señal.");
      setCargando(false);
    }
  }

  return (
    <main className="min-h-full flex flex-col items-center justify-center p-6 bg-finca-700">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-2xl font-extrabold text-white">Cambiá tu contraseña</h1>
          <p className="text-finca-100 mt-1">Por seguridad, elegí una nueva.</p>
        </div>

        <form onSubmit={guardar} className="tarjeta flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800">Contraseña actual</span>
            <input
              className="entrada text-left"
              type="password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="La que usaste para entrar"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800">Nueva contraseña</span>
            <input
              className="entrada text-left"
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800">Repetí la nueva</span>
            <input
              className="entrada text-left"
              type="password"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              placeholder="Igual que arriba"
            />
          </label>

          {error && (
            <p className="text-alerta font-bold text-center bg-alerta/10 rounded-xl p-2">
              {error}
            </p>
          )}

          <button type="submit" className="boton-primario" disabled={cargando}>
            {cargando ? "Guardando…" : "Guardar y entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
