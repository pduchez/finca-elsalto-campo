import Link from "next/link";
import { obtenerRegistro } from "@/lib/panel/detalle";
import { Tarjeta, Cifra, Chip, AvisoSinConexion } from "@/components/panel/piezas";

export const dynamic = "force-dynamic";

function fechaHora(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("es-SV", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/El_Salvador",
    });
  } catch {
    return "—";
  }
}

export default async function RegistroDetallePage({ params }: { params: { id: string } }) {
  const { configurado, registro } = await obtenerRegistro(params.id);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/panel/registros" className="text-finca-600 font-bold">
        ← Volver a registros
      </Link>

      {!configurado && <AvisoSinConexion />}

      {!registro ? (
        <Tarjeta>
          <p className="text-finca-700">No se encontró el registro.</p>
        </Tarjeta>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-extrabold text-finca-900">
              {registro.area} · {registro.actividad}
            </h1>
            <p className="text-finca-600">
              {registro.fecha} · registró <span className="capitalize">{registro.usuario}</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {registro.problema && <Chip tono="rojo">Problema reportado</Chip>}
              {registro.insumoAgotado && <Chip tono="rojo">Insumo agotado</Chip>}
              {registro.requiereRevision && <Chip>Requiere revisión</Chip>}
            </div>
          </div>

          {/* Cifras clave */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Cifra
              valor={registro.cantidad != null ? `${registro.cantidad}${registro.unidad ? ` ${registro.unidad}` : ""}` : "—"}
              etiqueta="Cantidad"
              destacado
            />
            <Cifra valor={registro.jornales != null ? registro.jornales : "—"} etiqueta="Jornales" />
            <Cifra valor={registro.fotos.length} etiqueta="Fotos" />
          </div>

          {/* Fotos */}
          {registro.fotos.length > 0 && (
            <Tarjeta>
              <h2 className="text-lg font-extrabold text-finca-900 mb-3">Fotos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {registro.fotos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-40 object-cover rounded-xl border border-finca-100" />
                  </a>
                ))}
              </div>
            </Tarjeta>
          )}

          {/* Observaciones / problema */}
          {(registro.observaciones || registro.problema) && (
            <Tarjeta>
              <h2 className="text-lg font-extrabold text-finca-900 mb-2">Observaciones</h2>
              {registro.problema && (
                <p className="text-alerta font-semibold mb-1">🐛 {registro.descripcionProblema ?? "Problema reportado"}</p>
              )}
              {registro.observaciones && <p className="text-finca-800">{registro.observaciones}</p>}
            </Tarjeta>
          )}

          {/* Transcripción del audio */}
          {registro.transcripcion && (
            <Tarjeta>
              <h2 className="text-lg font-extrabold text-finca-900 mb-2">Lo que dijo Emerson (audio)</h2>
              <p className="text-finca-800 italic">“{registro.transcripcion}”</p>
            </Tarjeta>
          )}

          {/* Datos técnicos */}
          <Tarjeta>
            <h2 className="text-lg font-extrabold text-finca-900 mb-3">Datos del registro</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between border-b border-finca-50 py-1">
                <dt className="text-finca-600">Fecha del trabajo</dt>
                <dd className="text-finca-900 font-semibold">{registro.fecha}</dd>
              </div>
              <div className="flex justify-between border-b border-finca-50 py-1">
                <dt className="text-finca-600">Registrado</dt>
                <dd className="text-finca-900 font-semibold">{fechaHora(registro.creadoEn)}</dd>
              </div>
              <div className="flex justify-between border-b border-finca-50 py-1">
                <dt className="text-finca-600">Sincronizado</dt>
                <dd className="text-finca-900 font-semibold">{fechaHora(registro.sincronizadoEn)}</dd>
              </div>
              <div className="flex justify-between border-b border-finca-50 py-1">
                <dt className="text-finca-600">Ubicación GPS</dt>
                <dd className="text-finca-900 font-semibold">
                  {registro.lat != null && registro.lon != null ? (
                    <a
                      className="underline text-finca-600"
                      href={`https://www.google.com/maps?q=${registro.lat},${registro.lon}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {registro.lat.toFixed(5)}, {registro.lon.toFixed(5)}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-b border-finca-50 py-1">
                <dt className="text-finca-600">Precisión GPS</dt>
                <dd className="text-finca-900 font-semibold">
                  {registro.precisionGps != null ? `${Math.round(registro.precisionGps)} m` : "—"}
                </dd>
              </div>
            </dl>
          </Tarjeta>
        </>
      )}
    </div>
  );
}
