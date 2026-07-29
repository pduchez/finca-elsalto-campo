import { resolverRango } from "@/lib/panel/datos";
import { obtenerAsistencia, obtenerColaboradores } from "@/lib/panel/detalle";
import { Tarjeta, Cifra, Chip, SinDatos, AvisoSinConexion, TituloReporte } from "@/components/panel/piezas";
import RangoFechas from "@/components/panel/RangoFechas";

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

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams?: { desde?: string; hasta?: string };
}) {
  const { desde, hasta } = resolverRango(searchParams);
  const [{ configurado, dias }, { colaboradores }] = await Promise.all([
    obtenerAsistencia(desde, hasta),
    obtenerColaboradores(desde, hasta),
  ]);

  const activos = colaboradores.filter((c) => c.activo).length;
  const conRostro = colaboradores.filter((c) => c.tieneRostro).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Asistencia y colaboradores</h1>
        <p className="text-finca-600">Marcas diarias y padrón de trabajadores</p>
      </div>

      <RangoFechas desde={desde} hasta={hasta} />

      {!configurado && <AvisoSinConexion />}

      {/* ------- Padrón de colaboradores ------- */}
      <Tarjeta>
        <TituloReporte titulo="Colaboradores registrados" sub="Padrón de trabajadores de la finca" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Cifra valor={colaboradores.length} etiqueta="Total" />
          <Cifra valor={activos} etiqueta="Activos" />
          <Cifra valor={`${conRostro}/${colaboradores.length}`} etiqueta="Con rostro" />
        </div>
        {colaboradores.length === 0 ? (
          <SinDatos>Aún no hay colaboradores registrados.</SinDatos>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-finca-600 border-b border-finca-100">
                  <th className="py-2 pr-3 font-bold">Nombre</th>
                  <th className="py-2 pr-3 font-bold">Tipo</th>
                  <th className="py-2 pr-3 font-bold">Rostro</th>
                  <th className="py-2 pr-3 font-bold">Días asistidos</th>
                  <th className="py-2 pr-3 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c, i) => (
                  <tr key={i} className="border-b border-finca-50">
                    <td className="py-2 pr-3 font-semibold text-finca-900">{c.nombre}</td>
                    <td className="py-2 pr-3 text-finca-700 capitalize">{c.tipo ?? "—"}</td>
                    <td className="py-2 pr-3">{c.tieneRostro ? "✅" : "—"}</td>
                    <td className="py-2 pr-3 text-finca-900 font-bold">{c.diasAsistidos}</td>
                    <td className="py-2 pr-3">
                      {c.activo ? <Chip tono="verde">Activo</Chip> : <Chip tono="rojo">Inactivo</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {/* ------- Asistencia diaria ------- */}
      <Tarjeta>
        <TituloReporte titulo="Asistencia diaria" sub="Marcas por día en el período (más reciente primero)" />
        {dias.length === 0 ? (
          <SinDatos>No hay asistencia registrada en el período.</SinDatos>
        ) : (
          <div className="flex flex-col gap-5">
            {dias.map((d) => (
              <div key={d.fecha}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-extrabold text-finca-900">{d.fecha}</span>
                  <span className="text-sm text-finca-700">
                    <b>{d.presentes}</b> presentes · {d.verificados} por rostro
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {d.filas.map((f, i) => (
                        <tr key={i} className="border-b border-finca-50">
                          <td className="py-1.5 pr-3 font-semibold text-finca-900">{f.trabajador}</td>
                          <td className="py-1.5 pr-3 text-finca-700">{f.area ?? "—"}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap text-finca-700">{hora(f.hora)}</td>
                          <td className="py-1.5 pr-3">
                            {f.presente ? <Chip tono="verde">Presente</Chip> : <Chip tono="rojo">Ausente</Chip>}
                          </td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">
                            {f.verificado ? (
                              <span className="text-finca-700">
                                🧑‍🦰 {f.similitud != null ? `${Math.round(f.similitud)}%` : "sí"}
                              </span>
                            ) : f.foto ? (
                              <span className="text-finca-500">📷</span>
                            ) : (
                              <span className="text-finca-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
