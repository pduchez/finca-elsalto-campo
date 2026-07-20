import { obtenerResumen } from "@/lib/panel/datos";
import { Cifra, Barra, Tarjeta, TituloReporte, SinDatos, AvisoSinConexion } from "@/components/panel/piezas";
import IngresoEstimado from "@/components/panel/IngresoEstimado";

export const dynamic = "force-dynamic";

export default async function CosechaPage() {
  const { configurado, cosecha } = await obtenerResumen();
  const maxSemana = Math.max(1, ...cosecha.porSemana.map((s) => s.qq));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Cosecha</h1>
        <p className="text-finca-600">Quintales de cardamomo cortados</p>
      </div>

      {!configurado && <AvisoSinConexion />}

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
