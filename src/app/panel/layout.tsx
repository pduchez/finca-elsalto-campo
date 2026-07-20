import Link from "next/link";
import ProveedorPanel from "@/components/ProveedorPanel";

// Panel del dueño: reportes leídos de Supabase en el servidor (con la sesión
// del director). Presenta la finca de un pantallazo.
const NAV = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/cosecha", label: "Cosecha" },
  { href: "/panel/campanas", label: "Campañas" },
  { href: "/panel/fotos", label: "Fotos" },
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
          <div className="flex items-center gap-4">
            <Link href="/campo" className="text-sm text-white/80 underline">
              Ir a la app de campo
            </Link>
            <a
              href="/api/auth/logout"
              className="text-sm font-bold bg-white/15 rounded-lg px-3 py-1.5"
            >
              Salir
            </a>
          </div>
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
        <div className="max-w-5xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
