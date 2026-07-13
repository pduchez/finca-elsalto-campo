import Link from "next/link";
import ProveedorPanel from "@/components/ProveedorPanel";

// Panel del dueño. En este build lee los datos locales del dispositivo (modo
// demo). En producción se protege con Supabase Auth y lee de Postgres.
const NAV = [
  { href: "/panel", label: "Briefing" },
  { href: "/panel/trazabilidad", label: "Trazabilidad" },
  { href: "/panel/costos", label: "Costos" },
  { href: "/panel/avance", label: "Avance" },
  { href: "/panel/admin", label: "Administración" },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <ProveedorPanel />
      <header className="bg-finca-900 text-white px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-extrabold">Finca El Salto · Panel</h1>
          <Link href="/campo" className="text-sm text-white/80 underline">
            Ir a la app de campo
          </Link>
        </div>
      </header>
      <nav className="bg-finca-700 text-white overflow-x-auto">
        <div className="max-w-5xl mx-auto flex gap-1 px-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-4 py-3 font-semibold whitespace-nowrap hover:bg-finca-600"
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="flex-1 bg-crema">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-4 text-sm text-pendiente bg-pendiente/10 border border-pendiente/30 rounded-lg px-4 py-2">
            Modo demo: mostrando los datos guardados en este dispositivo. En
            producción el panel lee de Supabase con tu sesión.
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
