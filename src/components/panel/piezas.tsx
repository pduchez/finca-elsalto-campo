import Link from "next/link";
import type { ReactNode } from "react";

/** Piezas de presentación del panel (server components, sin estado). */

export function Cifra({ valor, etiqueta, destacado }: { valor: ReactNode; etiqueta: string; destacado?: boolean }) {
  return (
    <div
      className={`rounded-xl p-4 text-center border ${
        destacado ? "bg-finca-500 text-white border-finca-500" : "bg-white text-finca-700 border-finca-100"
      }`}
    >
      <div className="text-2xl font-extrabold leading-tight">{valor}</div>
      <div className="text-xs opacity-90 mt-1">{etiqueta}</div>
    </div>
  );
}

export function Barra({ pct, tono = "finca" }: { pct: number; tono?: "finca" | "cosecha" }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-3 rounded-full bg-finca-100 overflow-hidden">
      <div className={`h-full ${tono === "cosecha" ? "bg-pendiente" : "bg-finca-500"}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Chip({ children, tono = "gris" }: { children: ReactNode; tono?: "gris" | "verde" | "rojo" }) {
  const cls =
    tono === "verde"
      ? "bg-finca-100 text-finca-700"
      : tono === "rojo"
        ? "bg-alerta/10 text-alerta"
        : "bg-crema text-finca-600 border border-finca-100";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white rounded-2xl p-5 border border-finca-100 ${className}`}>{children}</section>;
}

export function TituloReporte({ titulo, sub, verMas }: { titulo: string; sub?: string; verMas?: { href: string; texto: string } }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-xl font-extrabold text-finca-900">{titulo}</h2>
        {sub && <p className="text-finca-600 text-sm">{sub}</p>}
      </div>
      {verMas && (
        <Link href={verMas.href} className="text-finca-600 font-bold underline whitespace-nowrap text-sm">
          {verMas.texto} →
        </Link>
      )}
    </div>
  );
}

export function SinDatos({ children }: { children: ReactNode }) {
  return <p className="text-finca-500">{children}</p>;
}

export function AvisoSinConexion() {
  return (
    <div className="rounded-xl bg-pendiente/10 border border-pendiente/30 text-pendiente px-4 py-3 text-sm font-semibold">
      No hay conexión con la base de datos. Los reportes se muestran cuando la app está conectada a
      Supabase (en producción) y Emerson ha sincronizado desde el campo.
    </div>
  );
}
