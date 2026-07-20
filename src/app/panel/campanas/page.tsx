import { obtenerResumen } from "@/lib/panel/datos";
import { Barra, Chip, Tarjeta, SinDatos, AvisoSinConexion } from "@/components/panel/piezas";

export const dynamic = "force-dynamic";

export default async function CampanasPage() {
  const { configurado, campanas } = await obtenerResumen();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Campañas / cobertura</h1>
        <p className="text-finca-600">Área trabajada por actividad (últimos 21 días)</p>
      </div>

      {!configurado && <AvisoSinConexion />}

      {campanas.length === 0 ? (
        <SinDatos>No hay campañas activas registradas en el período.</SinDatos>
      ) : (
        campanas.map((c) => {
          const falta = Math.max(0, Math.round((c.mzTotal - c.mzHechas) * 100) / 100);
          return (
            <Tarjeta key={c.codigo}>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-xl font-extrabold text-finca-900">{c.nombre}</h2>
                <span className="text-finca-700 font-extrabold">
                  {c.mzHechas} / {c.mzTotal} mz
                </span>
              </div>
              <Barra pct={c.pct} />
              <p className="text-sm text-finca-600 mt-1">
                <b>{c.pct}%</b> cubierto · falta <b>{falta} mz</b>
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-finca-700 mb-1">Hecho ({c.areasHechas.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.areasHechas.length ? (
                      c.areasHechas.map((a, i) => <Chip key={i} tono="verde">✓ {a}</Chip>)
                    ) : (
                      <SinDatos>—</SinDatos>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-finca-700 mb-1">Falta ({c.areasFaltan.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.areasFaltan.length ? (
                      c.areasFaltan.map((a, i) => <Chip key={i} tono="rojo">{a}</Chip>)
                    ) : (
                      <span className="text-listo font-bold text-sm">¡Completo! 🎉</span>
                    )}
                  </div>
                </div>
              </div>
            </Tarjeta>
          );
        })
      )}
    </div>
  );
}
