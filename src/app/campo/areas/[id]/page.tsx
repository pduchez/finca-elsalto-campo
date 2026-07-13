"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAreas, useAreaDetalle, useConsolidadoArea } from "@/lib/db/hooks";
import { guardarVertices, guardarSiembra, guardarTopografia } from "@/lib/areas";
import { capturarPunto } from "@/lib/gps";
import { medirPoligono, edadPlantas, fmtCoord } from "@/lib/geo";
import type { Vertice, ClasificacionTopografia } from "@/lib/types";

type Modo = "resumen" | "medir" | "siembra";
const TOPOS: ClasificacionTopografia[] = ["plano", "ladera", "quebrado", "mixto"];

export default function AreaDetalle({ params }: { params: { id: string } }) {
  const router = useRouter();
  const areas = useAreas();
  const detalle = useAreaDetalle(params.id);
  const consolidado = useConsolidadoArea(params.id);
  const area = areas.find((a) => a.id === params.id);
  const [modo, setModo] = useState<Modo>("resumen");

  if (!area) {
    return <p className="text-finca-600">Cargando área…</p>;
  }

  if (modo === "medir")
    return <Medir areaId={params.id} nombre={area.nombre} onListo={() => setModo("resumen")} vertices={detalle?.vertices ?? []} />;
  if (modo === "siembra")
    return (
      <Siembra
        areaId={params.id}
        nombre={area.nombre}
        inicial={detalle}
        onListo={() => setModo("resumen")}
      />
    );

  const d = detalle;
  const edad = edadPlantas(d?.anio_siembra ?? null, new Date().getFullYear());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/campo/areas")} className="text-finca-600 font-bold text-lg">
          ← Áreas
        </button>
      </div>
      <h1 className="text-2xl font-extrabold text-finca-900">{area.nombre}</h1>

      {/* Información general (geolocalización) */}
      <section className="tarjeta flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-finca-900">Información general</h2>
          <button className="link text-finca-600 font-bold underline" onClick={() => setModo("medir")}>
            {d?.area_manzanas != null ? "Volver a medir" : "Medir"}
          </button>
        </div>
        {d?.area_manzanas != null ? (
          <div className="grid grid-cols-2 gap-2 text-finca-800">
            <Dato etiqueta="Tamaño" valor={`${d.area_manzanas.toFixed(2)} mz`} />
            <Dato etiqueta="Hectáreas" valor={`${d.area_hectareas!.toFixed(2)} ha`} />
            <Dato etiqueta="Perímetro" valor={`${Math.round(d.perimetro_m ?? 0)} m`} />
            <Dato etiqueta="Vértices" valor={`${d.vertices.length}`} />
            <Dato
              etiqueta="Altitud (GPS)"
              valor={
                d.topografia.alt_min != null
                  ? `${Math.round(d.topografia.alt_min)}–${Math.round(d.topografia.alt_max ?? 0)} m`
                  : "—"
              }
            />
            <Dato etiqueta="Coordenada central" valor={fmtCoord(d.centro_lat, d.centro_lon)} />
          </div>
        ) : (
          <p className="text-finca-600">
            Aún no está medida. Tocá <b>Medir</b> y caminá las esquinas del terreno.
          </p>
        )}
        {/* Topografía */}
        <div className="mt-1">
          <p className="text-sm font-bold text-finca-700 mb-1">Topografía</p>
          <div className="flex flex-wrap gap-2">
            {TOPOS.map((t) => (
              <button
                key={t}
                onClick={() => void guardarTopografia(params.id, t)}
                className={`rounded-lg px-3 py-2 font-bold border-2 capitalize ${
                  d?.topografia.clasificacion === t
                    ? "bg-finca-500 text-white border-finca-500"
                    : "bg-white text-finca-700 border-finca-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Siembra */}
      <section className="tarjeta flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-finca-900">Cardamomo sembrado</h2>
          <button className="link text-finca-600 font-bold underline" onClick={() => setModo("siembra")}>
            Editar
          </button>
        </div>
        {d?.manzanas_sembradas != null || d?.anio_siembra != null ? (
          <div className="grid grid-cols-2 gap-2 text-finca-800">
            <Dato etiqueta="Manzanas sembradas" valor={d?.manzanas_sembradas != null ? `${d.manzanas_sembradas} mz` : "—"} />
            <Dato etiqueta="Edad de las plantas" valor={edad != null ? `${edad} año${edad === 1 ? "" : "s"}` : "—"} />
            <Dato etiqueta="Variedad" valor={d?.variedad || "—"} />
            <Dato etiqueta="Matas estimadas" valor={d?.matas_estimadas != null ? d.matas_estimadas.toLocaleString("es-SV") : "—"} />
          </div>
        ) : (
          <p className="text-finca-600">Sin datos de siembra. Tocá <b>Editar</b>.</p>
        )}
      </section>

      {/* Consolidado de los reportes diarios */}
      <section className="tarjeta flex flex-col gap-3">
        <h2 className="text-lg font-extrabold text-finca-900">Lo que se ha hecho aquí</h2>
        {consolidado && consolidado.totalRegistros > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-finca-800">
              <Dato
                etiqueta="Última actividad"
                valor={consolidado.ultimaActividad ? `${consolidado.ultimaActividad.nombre}` : "—"}
              />
              <Dato
                etiqueta="Sin actividad"
                valor={consolidado.diasSinActividad === 0 ? "Hoy" : `Hace ${consolidado.diasSinActividad} d`}
              />
              <Dato etiqueta="Jornales acumulados" valor={`${consolidado.jornalesAcumulados}`} />
              <Dato etiqueta="Cortado" valor={consolidado.quintalesCortados ? `${consolidado.quintalesCortados} qq` : "—"} />
            </div>
            {consolidado.ultimasAplicaciones.length > 0 && (
              <div>
                <p className="text-sm font-bold text-finca-700 mb-1">Últimas aplicaciones</p>
                <ul className="text-finca-800 text-sm flex flex-col gap-1">
                  {consolidado.ultimasAplicaciones.map((a, i) => (
                    <li key={i}>
                      • {a.actividad}{a.cantidad != null ? ` — ${a.cantidad} ${a.unidad ?? ""}` : ""} <span className="text-finca-500">({a.fecha})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {consolidado.problemasAbiertos.length > 0 && (
              <div>
                <p className="text-sm font-bold text-alerta mb-1">Problemas reportados</p>
                <ul className="text-alerta text-sm flex flex-col gap-1">
                  {consolidado.problemasAbiertos.map((p, i) => (
                    <li key={i}>🐛 {p.descripcion} <span className="opacity-70">({p.fecha})</span></li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-finca-600">Todavía no hay registros en esta área.</p>
        )}
      </section>

      <button
        className="boton-primario"
        onClick={() => router.push(`/campo/registrar?area=${params.id}`)}
      >
        🎤 Registrar aquí
      </button>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-finca-500 font-semibold">{etiqueta}</p>
      <p className="font-bold">{valor}</p>
    </div>
  );
}

//// ---------- Medir el área (caminar vértices) ----------
function Medir({
  areaId,
  nombre,
  vertices,
  onListo,
}: {
  areaId: string;
  nombre: string;
  vertices: Vertice[];
  onListo: () => void;
}) {
  const [pts, setPts] = useState<Vertice[]>(vertices);
  const [tipo, setTipo] = useState<"esquina" | "quiebre">("esquina");
  const [capturando, setCapturando] = useState(false);
  const medida = medirPoligono(pts);

  async function capturar() {
    if (capturando) return;
    setCapturando(true);
    const p = await capturarPunto();
    setCapturando(false);
    if (p.latitud == null) {
      alert("No se pudo leer el GPS. Probá de nuevo parado en el punto, al aire libre.");
      return;
    }
    setPts((prev) => [
      ...prev,
      {
        orden: prev.length,
        latitud: p.latitud!,
        longitud: p.longitud!,
        altitud: p.altitud,
        precision_gps: p.precision_gps,
        tipo,
        capturado_en: Date.now(),
      },
    ]);
  }

  async function guardar() {
    await guardarVertices(areaId, pts.map((p, i) => ({ ...p, orden: i })));
    onListo();
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onListo} className="text-finca-600 font-bold text-lg self-start">← Cancelar</button>
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Medir {nombre}</h1>
        <p className="text-finca-600">
          Parate en cada esquina y quiebre del terreno y tocá <b>capturar</b>. Andá en orden, siguiendo el borde.
        </p>
      </div>

      <div className="flex gap-2">
        {(["esquina", "quiebre"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`flex-1 rounded-lg py-2 font-bold border-2 capitalize ${
              tipo === t ? "bg-finca-500 text-white border-finca-500" : "bg-white text-finca-700 border-finca-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <button className="boton-primario text-xl py-6" disabled={capturando} onClick={() => void capturar()}>
        {capturando ? "📡 Leyendo GPS…" : `📍 CAPTURAR ${tipo.toUpperCase()}`}
      </button>

      {medida && (
        <div className="tarjeta bg-finca-50 border-finca-500 flex items-center justify-between">
          <span className="font-bold text-finca-800">Tamaño estimado</span>
          <span className="text-xl font-extrabold text-finca-700">
            {medida.area_manzanas.toFixed(2)} mz · {medida.area_hectareas.toFixed(2)} ha
          </span>
        </div>
      )}

      {pts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-finca-700">{pts.length} punto{pts.length === 1 ? "" : "s"}</p>
            <button className="link text-finca-600 underline font-bold" onClick={() => setPts((p) => p.slice(0, -1))}>
              Deshacer último
            </button>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-finca-800">
            {pts.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span>#{i + 1} · {p.tipo}</span>
                <span className="text-finca-500">
                  {fmtCoord(p.latitud, p.longitud)}
                  {p.precision_gps != null && ` ±${Math.round(p.precision_gps)}m`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="boton-listo disabled:opacity-50" disabled={pts.length < 3} onClick={() => void guardar()}>
        {pts.length < 3 ? `Faltan ${3 - pts.length} punto(s)` : "✓ GUARDAR LINDERO"}
      </button>
    </div>
  );
}

//// ---------- Datos de siembra ----------
function Siembra({
  areaId,
  nombre,
  inicial,
  onListo,
}: {
  areaId: string;
  nombre: string;
  inicial: { manzanas_sembradas: number | null; variedad: string | null; anio_siembra: number | null; densidad_matas_mz: number | null } | undefined;
  onListo: () => void;
}) {
  const [mz, setMz] = useState(inicial?.manzanas_sembradas?.toString() ?? "");
  const [variedad, setVariedad] = useState(inicial?.variedad ?? "");
  const [anio, setAnio] = useState(inicial?.anio_siembra?.toString() ?? "");
  const [densidad, setDensidad] = useState(inicial?.densidad_matas_mz?.toString() ?? "");
  const anioNum = anio ? parseInt(anio, 10) : null;
  const edad = edadPlantas(anioNum, new Date().getFullYear());
  const matas =
    mz && densidad ? Math.round(parseFloat(mz) * parseFloat(densidad)) : null;

  async function guardar() {
    await guardarSiembra(areaId, {
      manzanas_sembradas: mz ? parseFloat(mz) : null,
      variedad: variedad.trim() || null,
      anio_siembra: anioNum,
      densidad_matas_mz: densidad ? parseFloat(densidad) : null,
    });
    onListo();
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onListo} className="text-finca-600 font-bold text-lg self-start">← Cancelar</button>
      <h1 className="text-2xl font-extrabold text-finca-900">Siembra · {nombre}</h1>

      <Campo etiqueta="Manzanas de cardamomo sembradas">
        <input inputMode="decimal" value={mz} onChange={(e) => setMz(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" className="entrada" />
      </Campo>
      <Campo etiqueta="Año de siembra">
        <input inputMode="numeric" value={anio} onChange={(e) => setAnio(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="Ej: 2021" className="entrada" />
        {edad != null && <p className="text-finca-600 text-sm mt-1">Edad: <b>{edad} año{edad === 1 ? "" : "s"}</b></p>}
      </Campo>
      <Campo etiqueta="Variedad (opcional)">
        <input type="text" value={variedad} onChange={(e) => setVariedad(e.target.value)} placeholder="Ej: variedad local" className="entrada seleccionable" />
      </Campo>
      <Campo etiqueta="Densidad (matas por manzana)">
        <input inputMode="numeric" value={densidad} onChange={(e) => setDensidad(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Ej: 1000" className="entrada" />
        {matas != null && <p className="text-finca-600 text-sm mt-1">Matas estimadas: <b>{matas.toLocaleString("es-SV")}</b></p>}
      </Campo>

      <button className="boton-listo" onClick={() => void guardar()}>✓ GUARDAR</button>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="tarjeta">
      <label className="font-bold text-finca-800">{etiqueta}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
