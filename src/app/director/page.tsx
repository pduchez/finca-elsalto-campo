import Link from "next/link";
import { sesionActual } from "@/lib/auth/session";

export const dynamic = "force-dynamic"; // depende de la cookie de sesión

/**
 * Pantalla de inicio para Directores: dos accesos grandes.
 * 1) App de campo (lo que usa Emerson).
 * 2) Sección de directores (panel de reportes).
 * 3) Acceso directo a los resultados de cosecha.
 */
export default async function DirectorHub() {
  const s = await sesionActual();
  const nombre = s?.n ?? "Director";

  return (
    <main className="min-h-full flex flex-col bg-finca-700">
      <header className="px-5 py-3 flex items-center justify-between text-white">
        <span className="text-xl font-extrabold">Finca El Salto</span>
        <a href="/api/auth/logout" className="text-sm font-bold bg-white/15 rounded-lg px-3 py-2">
          Salir
        </a>
      </header>

      <div className="flex-1 flex flex-col justify-center p-6 max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🌿</div>
          <h1 className="text-2xl font-extrabold text-white">Hola, {nombre}</h1>
          <p className="text-finca-100 mt-1">¿A dónde querés entrar?</p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/campo"
            className="bg-white rounded-2xl p-6 flex items-center gap-4 shadow-lg active:scale-[0.98] transition-transform"
          >
            <span className="text-4xl">🗺️</span>
            <span>
              <span className="block text-xl font-extrabold text-finca-900">App de campo</span>
              <span className="block text-finca-600">Registro diario, áreas, colaboradores, planilla</span>
            </span>
          </Link>

          <Link
            href="/panel"
            className="bg-finca-500 rounded-2xl p-6 flex items-center gap-4 shadow-lg active:scale-[0.98] transition-transform"
          >
            <span className="text-4xl">📊</span>
            <span>
              <span className="block text-xl font-extrabold text-white">Sección de directores</span>
              <span className="block text-white/90">Reportes y seguimiento de la finca</span>
            </span>
          </Link>

          <Link
            href="/panel/cosecha"
            className="bg-white rounded-2xl p-6 flex items-center gap-4 shadow-lg active:scale-[0.98] transition-transform"
          >
            <span className="text-4xl">🌿</span>
            <span>
              <span className="block text-xl font-extrabold text-finca-900">Ver cosecha</span>
              <span className="block text-finca-600">Libras en verde, pergamino, rendimiento y cada corte</span>
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
