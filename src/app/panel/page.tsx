import { obtenerResumen, resolverRango } from "@/lib/panel/datos";
import { Cifra, Barra, Tarjeta, TituloReporte, SinDatos, AvisoSinConexion } from "@/components/panel/piezas";
import RangoFechas from "@/components/panel/RangoFechas";

export const dynamic = "force-dynamic"; // siempre datos frescos

export default async function ResumenPanel({
  searchParams,
}: {
  searchParams?: { desde?: string; hasta?: string };
}) {
  const { desde, hasta } = resolverRango(searchParams);
  const r = await obtenerResumen(desde, hasta);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Resumen de la finca</h1>
        <p className="text-finca-600">Hoy · {r.hoy.fecha}</p>
      </div>

      <RangoFechas desde={r.rango.desde} hasta={r.rango.hasta} />

      {!r.configurado && <AvisoSinConexion />}

      {/* ------- Lo de HOY ------- */}
      <Tarjeta>
        <TituloReporte titulo="Hoy en el campo" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Cifra valor={r.hoy.registros} etiqueta="Registros" />
          <Cifra valor={r.hoy.presentes} etiqueta="Presentes" />
          <Cifra valor={`${r.hoy.verificados}/${r.hoy.presentes}`} etiqueta="Verificados por rostro" />
          <Cifra valor={r.hoy.areas.length} etiqueta="Áreas trabajadas" />
        </div>
        {r.hoy.areas.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1 text-finca-800 text-sm">
            {r.hoy.areas.map((a) => (
              <li key={a.nombre}>
                <b>{a.nombre}</b>: {a.actividades.join(", ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-finca-500 text-sm">Aún no hay actividad registrada hoy.</p>
        )}
      </Tarjeta>

      {/* ------- Campañas en curso ------- */}
      <Tarjeta>
        <TituloReporte
          titulo="Campañas en curso"
          sub="Avance de área en el período seleccionado"
          verMas={{ href: "/panel/campanas", texto: "Ver detalle" }}
        />
        {r.campanas.length === 0 ? (
          <SinDatos>No hay campañas activas registradas.</SinDatos>
        ) : (
          <div className="flex flex-col gap-4">
            {r.campanas.map((c) => (
              <div key={c.codigo}>
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-finca-900">{c.nombre}</span>
                  <span className="text-finca-700 font-extrabold">
                    {c.mzHechas} / {c.mzTotal} mz
                  </span>
                </div>
                <div className="mt-1">
                  <Barra pct={c.pct} />
                </div>
                <p className="text-xs text-finca-600 mt-1">
                  {c.pct}% cubierto · falta {Math.max(0, Math.round((c.mzTotal - c.mzHechas) * 100) / 100)} mz
                  {c.areasFaltan.length > 0 && ` (${c.areasFaltan.slice(0, 4).join(", ")}${c.areasFaltan.length > 4 ? "…" : ""})`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {/* ------- Cosecha ------- */}
      <Tarjeta>
        <TituloReporte
          titulo="Cosecha"
          sub="Quintales cortados (de aquí vienen los ingresos)"
          verMas={{ href: "/panel/cosecha", texto: "Ver detalle" }}
        />
        <div className="grid grid-cols-3 gap-3">
          <Cifra valor={`${r.cosecha.totalQq} qq`} etiqueta="Cortado" destacado />
          <Cifra valor={r.cosecha.metaTotalQq ? `${r.cosecha.metaTotalQq} qq` : "—"} etiqueta="Meta total" />
          <Cifra valor={r.cosecha.metaTotalQq ? `${r.cosecha.pctTotal}%` : "—"} etiqueta="De la meta" />
        </div>
        {r.cosecha.metaTotalQq > 0 && (
          <div className="mt-3">
            <Barra pct={r.cosecha.pctTotal} tono="cosecha" />
          </div>
        )}
        {r.cosecha.ultimo && (
          <p className="text-sm text-finca-600 mt-3">
            Último corte: <b>{r.cosecha.ultimo.qq} qq</b> en {r.cosecha.ultimo.area} ({r.cosecha.ultimo.fecha})
          </p>
        )}
      </Tarjeta>

      {/* ------- Alertas ------- */}
      <Tarjeta>
        <TituloReporte titulo="Alertas" />
        <div className="flex flex-col gap-2">
          {r.alertas.problemas.map((p, i) => (
            <div key={i} className="rounded-lg bg-alerta/10 border border-alerta/30 text-alerta px-4 py-2 text-sm font-semibold">
              🐛 {p.area}: {p.descripcion} <span className="opacity-70">({p.fecha})</span>
            </div>
          ))}
          {r.alertas.areasSinActividad.length > 0 && (
            <div className="rounded-lg bg-pendiente/10 border border-pendiente/30 text-pendiente px-4 py-2 text-sm font-semibold">
              🗺️ Sin actividad reciente:{" "}
              {r.alertas.areasSinActividad
                .map((a) => `${a.area}${a.dias != null ? ` (${a.dias} d)` : " (nunca)"}`)
                .join(", ")}
            </div>
          )}
          {r.alertas.problemas.length === 0 && r.alertas.areasSinActividad.length === 0 && (
            <SinDatos>Sin alertas. Todo en orden.</SinDatos>
          )}
        </div>
      </Tarjeta>

      {/* ------- Fotos ------- */}
      <Tarjeta>
        <TituloReporte
          titulo="Estado de la planta"
          sub="Fotos recientes del campo"
          verMas={{ href: "/panel/fotos", texto: "Ver galería" }}
        />
        {r.fotos.length === 0 ? (
          <SinDatos>Aún no hay fotos sincronizadas.</SinDatos>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {r.fotos.slice(0, 8).map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={f.url}
                alt={`${f.area} · ${f.actividad}`}
                className="w-full h-24 object-cover rounded-xl border border-finca-100"
              />
            ))}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
