import Link from "next/link";
import { obtenerResumen, resolverRango } from "@/lib/panel/datos";
import { SinDatos, AvisoSinConexion } from "@/components/panel/piezas";
import RangoFechas from "@/components/panel/RangoFechas";

export const dynamic = "force-dynamic";

export default async function FotosPage({
  searchParams,
}: {
  searchParams?: { desde?: string; hasta?: string };
}) {
  const { desde, hasta } = resolverRango(searchParams);
  const { configurado, fotos, rango } = await obtenerResumen(desde, hasta);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Estado de la planta</h1>
        <p className="text-finca-600">Fotos recientes del campo, por área</p>
      </div>

      <RangoFechas desde={rango.desde} hasta={rango.hasta} />

      {!configurado && <AvisoSinConexion />}

      {fotos.length === 0 ? (
        <SinDatos>Aún no hay fotos sincronizadas desde el campo.</SinDatos>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fotos.map((f, i) => (
            <Link
              href={`/panel/registros/${f.id}`}
              key={i}
              className="bg-white rounded-2xl border border-finca-100 overflow-hidden block hover:border-finca-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`${f.area} · ${f.actividad}`} className="w-full h-44 object-cover" />
              <div className="p-3">
                <p className="font-bold text-finca-900 text-sm">{f.area}</p>
                <p className="text-xs text-finca-600">
                  {f.actividad} · {f.fecha}
                </p>
                {f.problema && (
                  <p className="text-xs text-alerta font-bold mt-1">🐛 {f.nota ?? "Problema reportado"}</p>
                )}
                {!f.problema && f.nota && <p className="text-xs text-finca-600 mt-1">{f.nota}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
