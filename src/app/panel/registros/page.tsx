import Link from "next/link";
import { resolverRango } from "@/lib/panel/datos";
import { obtenerRegistros, listarActividades } from "@/lib/panel/detalle";
import { Tarjeta, Chip, SinDatos, AvisoSinConexion } from "@/components/panel/piezas";
import RangoFechas from "@/components/panel/RangoFechas";
import FiltroActividad from "@/components/panel/FiltroActividad";

export const dynamic = "force-dynamic";

function hora(ts: string | null): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString("es-SV", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/El_Salvador",
    });
  } catch {
    return "";
  }
}

export default async function RegistrosPage({
  searchParams,
}: {
  searchParams?: { desde?: string; hasta?: string; actividad?: string };
}) {
  const { desde, hasta } = resolverRango(searchParams);
  const codigo = searchParams?.actividad;
  const [{ configurado, registros }, actividades] = await Promise.all([
    obtenerRegistros(desde, hasta, codigo),
    listarActividades(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Registros del campo</h1>
        <p className="text-finca-600">Todo lo que se registra a diario, con filtros por fecha y actividad</p>
      </div>

      <RangoFechas desde={desde} hasta={hasta} />
      <FiltroActividad actividades={actividades} seleccion={codigo} />

      {!configurado && <AvisoSinConexion />}

      <Tarjeta>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-extrabold text-finca-900">
            {registros.length} {registros.length === 1 ? "registro" : "registros"}
          </h2>
          <span className="text-sm text-finca-600">
            {desde} a {hasta}
          </span>
        </div>

        {registros.length === 0 ? (
          <SinDatos>No hay registros en el período/filtro seleccionado.</SinDatos>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-finca-600 border-b border-finca-100">
                  <th className="py-2 pr-3 font-bold">Fecha</th>
                  <th className="py-2 pr-3 font-bold">Área</th>
                  <th className="py-2 pr-3 font-bold">Actividad</th>
                  <th className="py-2 pr-3 font-bold">Cantidad</th>
                  <th className="py-2 pr-3 font-bold">Registró</th>
                  <th className="py-2 pr-3 font-bold">Detalle</th>
                  <th className="py-2 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, i) => (
                  <tr key={i} className="border-b border-finca-50 align-top hover:bg-crema">
                    <td className="py-2 pr-3 whitespace-nowrap text-finca-900">
                      {r.fecha}
                      {hora(r.hora) && <span className="block text-xs text-finca-500">{hora(r.hora)}</span>}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-finca-900">{r.area}</td>
                    <td className="py-2 pr-3">
                      <Chip tono="verde">{r.actividad}</Chip>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-finca-900">
                      {r.cantidad != null ? `${r.cantidad}${r.unidad ? ` ${r.unidad}` : ""}` : "—"}
                      {r.jornales != null && r.jornales > 0 && (
                        <span className="block text-xs text-finca-500">{r.jornales} jornales</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-finca-700 capitalize">{r.usuario}</td>
                    <td className="py-2 pr-3 text-finca-700 max-w-xs">
                      {r.problema && (
                        <span className="text-alerta font-semibold">🐛 {r.descripcionProblema ?? "Problema"} </span>
                      )}
                      {r.observaciones && <span>{r.observaciones}</span>}
                      {r.tieneFoto && <span className="ml-1">📷</span>}
                      {!r.problema && !r.observaciones && !r.tieneFoto && <span className="text-finca-400">—</span>}
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      <Link href={`/panel/registros/${r.id}`} className="text-finca-600 font-bold underline">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
