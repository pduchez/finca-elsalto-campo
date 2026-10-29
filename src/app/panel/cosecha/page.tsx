import { obtenerResumen, resolverRango } from "@/lib/panel/datos";
import { obtenerCosecha } from "@/lib/panel/cosecha";
import { Cifra, Barra, Tarjeta, TituloReporte, SinDatos, AvisoSinConexion } from "@/components/panel/piezas";
import IngresoEstimado from "@/components/panel/IngresoEstimado";
import CostosCosecha from "@/components/panel/CostosCosecha";
import RangoFechas from "@/components/panel/RangoFechas";

export const dynamic = "force-dynamic";

export default async function CosechaPage({
  searchParams,
}: {
  searchParams?: { desde?: string; hasta?: string };
}) {
  const { desde, hasta } = resolverRango(searchParams);
  const [{ configurado, cosecha, rango }, c] = await Promise.all([
    obtenerResumen(desde, hasta),
    obtenerCosecha(desde, hasta),
  ]);
  const maxSemana = Math.max(1, ...cosecha.porSemana.map((s) => s.qq));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Cosecha</h1>
        <p className="text-finca-600">Corte en verde → secado → pergamino (libras)</p>
      </div>

      <RangoFechas desde={rango.desde} hasta={rango.hasta} />

      {!configurado && <AvisoSinConexion />}

      {/* ===== Cosecha en libras (verde → pergamino) ===== */}
      <div className="grid grid-cols-3 gap-3">
        <Cifra valor={`${c.verdeTotalLb} lb`} etiqueta="Verde cortado" destacado />
        <Cifra valor={`${c.pergaminoTotalLb} lb`} etiqueta="Pergamino" />
        <Cifra valor={c.rendimientoPct != null ? `${c.rendimientoPct}%` : "—"} etiqueta="Rendimiento" />
      </div>

      <CostosCosecha
        pergaminoLb={c.pergaminoTotalLb}
        propanoTotal={c.propanoTotal}
        combustibleTotal={c.combustibleTotal}
        horasHombreTotal={c.horasHombreTotal}
      />

      {c.revisiones > 0 && (
        <div className="rounded-xl bg-pendiente/10 border border-pendiente/30 text-pendiente px-4 py-2 text-sm font-semibold">
          {c.revisiones} {c.revisiones === 1 ? "pesaje necesita" : "pesajes necesitan"} revisión (Claude no leyó bien la foto de la báscula).
        </div>
      )}

      {/* Verde por área */}
      <Tarjeta>
        <TituloReporte titulo="Verde por área" sub="Libras cortadas en el período" />
        {c.porArea.length === 0 ? (
          <SinDatos>Aún no hay cortes registrados en el período.</SinDatos>
        ) : (
          <div className="flex flex-col gap-2">
            {c.porArea.map((a) => (
              <div key={a.area} className="flex items-baseline justify-between border-b border-finca-50 py-1">
                <span className="font-bold text-finca-900">{a.area}</span>
                <span className="text-finca-700 font-extrabold">{a.verdeLb} lb</span>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {/* Lotes de secado */}
      <Tarjeta>
        <TituloReporte titulo="Lotes de secado" sub="Verde que entró, pergamino que salió y recursos usados" />
        {c.lotes.length === 0 ? (
          <SinDatos>No hay lotes de secado en el período.</SinDatos>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-finca-600 border-b border-finca-100">
                  <th className="py-2 pr-3 font-bold">Lote</th>
                  <th className="py-2 pr-3 font-bold">Verde</th>
                  <th className="py-2 pr-3 font-bold">Pergamino</th>
                  <th className="py-2 pr-3 font-bold">Rend.</th>
                  <th className="py-2 pr-3 font-bold">Horas</th>
                  <th className="py-2 pr-3 font-bold">Propano</th>
                  <th className="py-2 pr-3 font-bold">Comb.</th>
                  <th className="py-2 font-bold">H-H</th>
                </tr>
              </thead>
              <tbody>
                {c.lotes.map((l) => (
                  <tr key={l.id} className="border-b border-finca-50">
                    <td className="py-2 pr-3 whitespace-nowrap text-finca-900">
                      {l.fecha_inicio}
                      {!l.fecha_fin && <span className="block text-xs text-pendiente">abierto</span>}
                    </td>
                    <td className="py-2 pr-3 text-finca-900">{l.verdeLb} lb</td>
                    <td className="py-2 pr-3 font-bold text-finca-900">{l.pergaminoLb} lb</td>
                    <td className="py-2 pr-3">{l.rendimientoPct != null ? `${l.rendimientoPct}%` : "—"}</td>
                    <td className="py-2 pr-3">{l.horas_secado ?? "—"}</td>
                    <td className="py-2 pr-3">{l.propano_cantidad != null ? `${l.propano_cantidad} ${l.propano_unidad ?? ""}` : "—"}</td>
                    <td className="py-2 pr-3">{l.combustible_cantidad != null ? `${l.combustible_cantidad} ${l.combustible_unidad ?? ""}` : "—"}</td>
                    <td className="py-2">{l.horas_hombre ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {/* ===== Histórico: cortes por voz (quintales) ===== */}
      <div className="pt-2">
        <h2 className="text-lg font-extrabold text-finca-900">Histórico de cortes por voz (quintales)</h2>
        <p className="text-finca-600 text-sm">Registros de la actividad «corte» capturados por audio.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Cifra valor={`${cosecha.totalQq} qq`} etiqueta="Cortado" destacado />
        <Cifra valor={cosecha.metaTotalQq ? `${cosecha.metaTotalQq} qq` : "—"} etiqueta="Meta total" />
        <Cifra valor={cosecha.metaTotalQq ? `${cosecha.pctTotal}%` : "—"} etiqueta="De la meta" />
      </div>

      <IngresoEstimado totalQq={cosecha.totalQq} />

      {/* Por área vs meta */}
      <Tarjeta>
        <TituloReporte titulo="Por área" sub="Cortado vs meta de producción" />
        {cosecha.porArea.length === 0 ? (
          <SinDatos>Aún no hay cortes registrados.</SinDatos>
        ) : (
          <div className="flex flex-col gap-4">
            {cosecha.porArea.map((a) => (
              <div key={a.area}>
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-finca-900">{a.area}</span>
                  <span className="text-finca-700 font-extrabold">
                    {a.qq} qq{a.meta ? ` / ${a.meta}` : ""}
                  </span>
                </div>
                {a.meta ? (
                  <div className="mt-1">
                    <Barra pct={a.pct ?? 0} tono="cosecha" />
                  </div>
                ) : null}
                <p className="text-xs text-finca-600 mt-1">
                  {a.meta ? `${a.pct}% de la meta · ` : "Sin meta definida · "}
                  {a.ultimo ? `último corte ${a.ultimo}` : "sin fecha"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {/* Tendencia por semana */}
      <Tarjeta>
        <TituloReporte titulo="Tendencia por semana" sub="Últimas semanas con corte" />
        {cosecha.porSemana.length === 0 ? (
          <SinDatos>Sin datos de tendencia todavía.</SinDatos>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {cosecha.porSemana.map((s) => (
              <div key={s.semana} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs font-bold text-finca-700 mb-1">{s.qq}</span>
                <div
                  className="w-full bg-pendiente rounded-t-md"
                  style={{ height: `${(s.qq / maxSemana) * 100}%` }}
                  title={`${s.qq} qq`}
                />
                <span className="text-[0.65rem] text-finca-500 mt-1">{s.semana.split("-")[1]}</span>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
