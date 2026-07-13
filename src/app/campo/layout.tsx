import Link from "next/link";
import IndicadorSync from "@/components/IndicadorSync";
import ProveedorSync from "@/components/ProveedorSync";

// Shell de la app de campo: encabezado fijo con nombre e indicador de pendientes.
export default function CampoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <ProveedorSync />
      <header className="sticky top-0 z-10 bg-finca-700 text-white px-5 py-3 flex items-center justify-between shadow-md">
        <Link href="/campo" className="text-xl font-extrabold tracking-tight">
          Finca El Salto
        </Link>
        <IndicadorSync />
      </header>
      <main className="flex-1 p-5 max-w-xl w-full mx-auto">{children}</main>
    </div>
  );
}
