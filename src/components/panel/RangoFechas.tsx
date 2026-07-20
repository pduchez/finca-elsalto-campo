"use client";

import { usePathname, useRouter } from "next/navigation";

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function haceDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}

const PRESETS = [
  { label: "14 días", n: 14 },
  { label: "30 días", n: 30 },
  { label: "90 días", n: 90 },
  { label: "1 año", n: 365 },
];

/** Selector de período para los reportes del panel. Escribe ?desde&hasta en la URL. */
export default function RangoFechas({ desde, hasta }: { desde: string; hasta: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const hoy = iso(new Date());

  function ir(d: string, h: string) {
    router.push(`${pathname}?desde=${d}&hasta=${h}`);
  }

  return (
    <div className="bg-white rounded-2xl border border-finca-100 p-3 flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-finca-700 mr-1">Período:</span>
      {PRESETS.map((p) => {
        const d = haceDias(p.n);
        const activo = desde === d && hasta === hoy;
        return (
          <button
            key={p.n}
            onClick={() => ir(d, hoy)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold border-2 ${
              activo ? "bg-finca-500 text-white border-finca-500" : "bg-white text-finca-700 border-finca-100"
            }`}
          >
            {p.label}
          </button>
        );
      })}
      <span className="mx-1 text-finca-200">|</span>
      <input
        type="date"
        value={desde}
        max={hasta}
        onChange={(e) => ir(e.target.value || haceDias(30), hasta)}
        className="rounded-lg border-2 border-finca-100 px-2 py-1 text-sm text-finca-900"
      />
      <span className="text-finca-500 text-sm">a</span>
      <input
        type="date"
        value={hasta}
        min={desde}
        max={hoy}
        onChange={(e) => ir(desde, e.target.value || hoy)}
        className="rounded-lg border-2 border-finca-100 px-2 py-1 text-sm text-finca-900"
      />
    </div>
  );
}
