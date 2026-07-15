"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BotonInstalar from "@/components/BotonInstalar";
import { landingDeRol } from "@/lib/auth/token";

/** Pantalla de ingreso: usuario + contraseña. Sesión permanente. */
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo ingresar.");
        setCargando(false);
        return;
      }
      if (data.cambiar) {
        router.replace("/cambiar-clave");
      } else {
        router.replace(landingDeRol(data.rol));
      }
      router.refresh();
    } catch {
      setError("Sin conexión. Probá de nuevo con señal.");
      setCargando(false);
    }
  }

  return (
    <main className="min-h-full flex flex-col items-center justify-center p-6 bg-finca-700">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🌿</div>
          <h1 className="text-3xl font-extrabold text-white">Finca El Salto</h1>
          <p className="text-finca-100 mt-1">Ingresá para continuar</p>
        </div>

        <form onSubmit={ingresar} className="tarjeta flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800">Usuario</span>
            <input
              className="entrada text-left"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: Supervisor1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold text-finca-800">Contraseña</span>
            <input
              className="entrada text-left"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="text-alerta font-bold text-center bg-alerta/10 rounded-xl p-2">
              {error}
            </p>
          )}

          <button type="submit" className="boton-primario" disabled={cargando}>
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        <p className="text-finca-100 text-center text-sm mt-5">
          Primera vez: usá tu usuario y la contraseña <b>password</b>. El sistema
          te pedirá cambiarla.
        </p>

        <BotonInstalar className="mt-6" />
      </div>
    </main>
  );
}
