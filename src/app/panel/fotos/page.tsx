import { obtenerResumen } from "@/lib/panel/datos";
import { SinDatos, AvisoSinConexion } from "@/components/panel/piezas";

export const dynamic = "force-dynamic";

export default async function FotosPage() {
  const { configurado, fotos } = await obtenerResumen();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Estado de la planta</h1>
        <p className="text-finca-600">Fotos recientes del campo, por área</p>
      </div>

      {!configurado && <AvisoSinConexion />}

      {fotos.length === 0 ? (
        <SinDatos>Aún no hay fotos sincronizadas desde el campo.</SinDatos>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fotos.map((f, i) => (
            <figure key={i} className="bg-white rounded-2xl border border-finca-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`${f.area} · ${f.actividad}`} className="w-full h-44 object-cover" />
              <figcaption className="p-3">
                <p className="font-bold text-finca-900 text-sm">{f.area}</p>
                <p className="text-xs text-finca-600">
                  {f.actividad} · {f.fecha}
                </p>
                {f.problema && (
                  <p className="text-xs text-alerta font-bold mt-1">🐛 {f.nota ?? "Problema reportado"}</p>
                )}
                {!f.problema && f.nota && <p className="text-xs text-finca-600 mt-1">{f.nota}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
