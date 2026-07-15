"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAreas,
  useAreaDetalle,
  useConsolidadoArea,
  useRegistrosArea,
} from "@/lib/db/hooks";
import {
  guardarVertices,
  guardarSiembra,
  guardarTopografia,
  agregarFotoArea,
  quitarFotoArea,
} from "@/lib/areas";
import { capturarPunto } from "@/lib/gps";
import { comprimirFoto } from "@/lib/media";
import { medirPoligono, edadPlantas, fmtCoord } from "@/lib/geo";
import type { Vertice, ClasificacionTopografia } from "@/lib/types";
import type { AreaDetalleLocal } from "@/lib/db";

type Modo = "resumen" | "medir" | "siembra" | "historial";
const TOPOS: ClasificacionTopografia[] = ["plano", "ladera", "quebrado", "mixto"];

export default function AreaDetallePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const areas = useAreas();
  const detalle = useAreaDetalle(params.id);
  const consolidado = useConsolidadoArea(params.id);
  const area = areas.find((a) => a.id === params.id);
  const [modo, setModo] = useState<Modo>("resumen");

  if (!area) return <p className="text-finca-600">Cargando área…</p>;

  if (modo === "medir")
    return <Medir areaId={params.id} nombre={area.nombre} vertices={detalle?.vertices ?? []} onListo={() => setModo("resumen")} />;
  if (modo === "siembra")
    return <Siembra areaId={params.id} nombre={area.nombre} inicial={detalle} onListo={() => setModo("resumen")} />;
  if (modo === "historial")
    return <Historial areaId={params.id} nombre={area.nombre} onListo={() => setModo("resumen")} />;

  const d = detalle;
  const edad = edadPlantas(d?.anio_siembra ?? null, new Date().getFullYear());
  const pct = d?.topografia.pendiente_pct;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push("/campo/areas")} className="text-finca-600 font-bold text-lg self-start">
        ← Áreas
      </button>
      <h1 className="text-2xl font-extrabold text-finca-900">{area.nombre}</h1>

      {/* Información general */}
      <section className="tarjeta flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-finca-900">Información general</h2>
          <button className="text-finca-600 font-bold underline" onClick={() => setModo("medir")}>
            {d?.area_manzanas != null ? "Volver a medir" : "Medir"}
          </button>
        </div>
        {d?.area_manzanas != null ? (
          <>
            <Croquis vertices={d.vertices} />
            <div className="grid grid-cols-2 gap-2 text-finca-800">
              <Dato etiqueta="Tamaño" valor={`${d.area_manzanas.toFixed(2)} mz`} />
              <Dato etiqueta="Perímetro" valor={`${Math.round(d.perimetro_m ?? 0)} m`} />
              <Dato etiqueta="Vértices" valor={`${d.vertices.length}`} />
              <Dato etiqueta="Pendiente (ref. GPS)" valor={pct != null ? `~${pct.toFixed(0)}%` : "—"} />
              <Dato
                etiqueta="Altitud (GPS)"
                valor={d.topografia.alt_min != null ? `${Math.round(d.topografia.alt_min)}–${Math.round(d.topografia.alt_max ?? 0)} m` : "—"}
              />
              <Dato etiqueta="Coordenada central" valor={fmtCoord(d.centro_lat, d.centro_lon)} />
            </div>
          </>
        ) : (
          <p className="text-finca-600">
            Aún no está medida. Tocá <b>Medir</b> y caminá las esquinas del terreno.
          </p>
        )}
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

      {/* Fotos de referencia */}
      <FotosArea areaId={params.id} fotos={d?.fotos ?? []} />

      {/* Siembra */}
      <section className="tarjeta flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-finca-900">Cardamomo sembrado</h2>
          <button className="text-finca-600 font-bold underline" onClick={() => setModo("siembra")}>
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

      {/* Consolidado */}
      <section className="tarjeta flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-finca-900">Lo que se ha hecho aquí</h2>
          {consolidado && consolidado.totalRegistros > 0 && (
            <button className="text-finca-600 font-bold underline" onClick={() => setModo("historial")}>
              Historial ({consolidado.totalRegistros})
            </button>
          )}
        </div>
        {consolidado && consolidado.totalRegistros > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-finca-800">
              <Dato etiqueta="Última actividad" valor={consolidado.ultimaActividad?.nombre ?? "—"} />
              <Dato etiqueta="Sin actividad" valor={consolidado.diasSinActividad === 0 ? "Hoy" : `Hace ${consolidado.diasSinActividad} d`} />
              <Dato etiqueta="Jornales acumulados" valor={`${consolidado.jornalesAcumulados}`} />
              <Dato
                etiqueta="Producción (cortado / meta)"
                valor={`${consolidado.quintalesCortados || 0} qq${d?.meta_produccion_qq ? ` / ${d.meta_produccion_qq} qq` : ""}`}
              />
            </div>
            {d?.meta_produccion_qq ? (
              <MetaBarra cortado={consolidado.quintalesCortados} meta={d.meta_produccion_qq} />
            ) : null}
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

      <button className="boton-primario" onClick={() => router.push(`/campo/registrar?area=${params.id}`)}>
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

function MetaBarra({ cortado, meta }: { cortado: number; meta: number }) {
  const pct = Math.min(100, Math.round((cortado / meta) * 100));
  return (
    <div>
      <div className="h-3 rounded-full bg-finca-100 overflow-hidden">
        <div className="h-full bg-finca-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-finca-600 mt-1">{pct}% de la meta</p>
    </div>
  );
}

//// ---------- Croquis del polígono ----------
function Croquis({ vertices }: { vertices: Vertice[] }) {
  if (vertices.length < 3) return null;
  const R = 6371000;
  const latRef = (vertices.reduce((s, v) => s + v.latitud, 0) / vertices.length) * (Math.PI / 180);
  const pts = vertices.map((v) => ({
    x: (v.longitud * Math.PI) / 180 * R * Math.cos(latRef),
    y: (v.latitud * Math.PI) / 180 * R,
  }));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1);
  const pad = 12, W = 300, H = 180;
  const esc = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  const map = (p: { x: number; y: number }) => ({
    x: pad + (p.x - minX) * esc,
    y: H - (pad + (p.y - minY) * esc), // invertir Y (norte arriba)
  });
  const mp = pts.map(map);
  const d = mp.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44 rounded-xl bg-finca-50 border border-finca-100" role="img" aria-label="Croquis del área">
      <path d={d} fill="rgba(47,125,50,0.18)" stroke="#256628" strokeWidth={2.5} strokeLinejoin="round" />
      {mp.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill="#1b4d1e" />
          <text x={p.x} y={p.y - 8} fontSize={11} fontWeight="700" fill="#1b4d1e" textAnchor="middle">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}

//// ---------- Fotos de referencia ----------
function FotosArea({ areaId, fotos }: { areaId: string; fotos: Blob[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const u = fotos.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [fotos]);

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) await agregarFotoArea(areaId, await comprimirFoto(f));
    e.target.value = "";
  }

  return (
    <section className="tarjeta flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-finca-900">Fotos del área</h2>
        <label className="text-finca-600 font-bold underline cursor-pointer">
          + Foto
          <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void alSeleccionar(e)} />
        </label>
      </div>
      {urls.length === 0 ? (
        <p className="text-finca-600 text-sm">Sin fotos. Agregá una de referencia (entrada, estado general).</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((u, i) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Foto área ${i + 1}`} className="w-full h-24 object-cover rounded-xl border-2 border-finca-100" />
              <button onClick={() => void quitarFotoArea(areaId, i)} className="absolute -top-2 -right-2 bg-alerta text-white w-7 h-7 rounded-full font-bold" aria-label="Quitar">×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

//// ---------- Medir el área ----------
function Medir({ areaId, nombre, vertices, onListo }: { areaId: string; nombre: string; vertices: Vertice[]; onListo: () => void }) {
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
      { orden: prev.length, latitud: p.latitud!, longitud: p.longitud!, altitud: p.altitud, precision_gps: p.precision_gps, tipo, capturado_en: Date.now() },
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
        <p className="text-finca-600">Parate en cada esquina y quiebre del terreno y tocá <b>capturar</b>. Andá en orden, siguiendo el borde.</p>
      </div>
      <div className="flex gap-2">
        {(["esquina", "quiebre"] as const).map((t) => (
          <button key={t} onClick={() => setTipo(t)} className={`flex-1 rounded-lg py-2 font-bold border-2 capitalize ${tipo === t ? "bg-finca-500 text-white border-finca-500" : "bg-white text-finca-700 border-finca-100"}`}>{t}</button>
        ))}
      </div>
      <button className="boton-primario text-xl py-6" disabled={capturando} onClick={() => void capturar()}>
        {capturando ? "📡 Leyendo GPS…" : `📍 CAPTURAR ${tipo.toUpperCase()}`}
      </button>
      {pts.length >= 3 && <Croquis vertices={pts.map((p, i) => ({ ...p, orden: i }))} />}
      {medida && (
        <div className="tarjeta bg-finca-50 border-finca-500 flex items-center justify-between">
          <span className="font-bold text-finca-800">Tamaño estimado</span>
          <span className="text-xl font-extrabold text-finca-700">{medida.area_manzanas.toFixed(2)} mz</span>
        </div>
      )}
      {pts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-finca-700">{pts.length} punto{pts.length === 1 ? "" : "s"}</p>
            <button className="text-finca-600 underline font-bold" onClick={() => setPts((p) => p.slice(0, -1))}>Deshacer último</button>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-finca-800">
            {pts.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span>#{i + 1} · {p.tipo}</span>
                <span className="text-finca-500">{fmtCoord(p.latitud, p.longitud)}{p.precision_gps != null && ` ±${Math.round(p.precision_gps)}m`}</span>
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
function Siembra({ areaId, nombre, inicial, onListo }: { areaId: string; nombre: string; inicial: AreaDetalleLocal | undefined; onListo: () => void }) {
  const [mz, setMz] = useState(inicial?.manzanas_sembradas?.toString() ?? "");
  const [variedad, setVariedad] = useState(inicial?.variedad ?? "");
  const [anio, setAnio] = useState(inicial?.anio_siembra?.toString() ?? "");
  const [densidad, setDensidad] = useState(inicial?.densidad_matas_mz?.toString() ?? "");
  const [meta, setMeta] = useState(inicial?.meta_produccion_qq?.toString() ?? "");
  const anioNum = anio ? parseInt(anio, 10) : null;
  const edad = edadPlantas(anioNum, new Date().getFullYear());
  const matas = mz && densidad ? Math.round(parseFloat(mz) * parseFloat(densidad)) : null;

  async function guardar() {
    await guardarSiembra(areaId, {
      manzanas_sembradas: mz ? parseFloat(mz) : null,
      variedad: variedad.trim() || null,
      anio_siembra: anioNum,
      densidad_matas_mz: densidad ? parseFloat(densidad) : null,
      meta_produccion_qq: meta ? parseFloat(meta) : null,
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
      <Campo etiqueta="Meta de producción (quintales)">
        <input inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Ej: 40" className="entrada" />
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

//// ---------- Reproductor del audio local ----------
function ReproductorAudio({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return null;
  return (
    <audio controls preload="none" src={url} className="w-full mt-2 h-9">
      Tu teléfono no puede reproducir este audio.
    </audio>
  );
}

//// ---------- Historial completo ----------
function Historial({ areaId, nombre, onListo }: { areaId: string; nombre: string; onListo: () => void }) {
  const registros = useRegistrosArea(areaId);
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onListo} className="text-finca-600 font-bold text-lg self-start">← {nombre}</button>
      <h1 className="text-2xl font-extrabold text-finca-900">Historial · {nombre}</h1>
      {registros.length === 0 ? (
        <p className="text-finca-600">Sin registros en esta área.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {registros.map((r) => (
            <li key={r.id} className="tarjeta py-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-finca-900">{r.actividad_nombre}</span>
                <span className="text-sm text-finca-500">{r.fecha}</span>
              </div>
              <div className="text-sm text-finca-700 flex flex-wrap gap-x-3">
                {r.cantidad != null && <span>{r.cantidad} {r.unidad ?? ""}</span>}
                {r.jornales_usados != null && <span>{r.jornales_usados} jornal(es)</span>}
                {r.fotos?.length ? <span>📷 {r.fotos.length}</span> : null}
                {r.problema_detectado && <span className="text-alerta">🐛 problema</span>}
              </div>
              {r.audio_transcripcion ? (
                <p className="text-sm text-finca-800 mt-2 seleccionable">
                  <span className="text-finca-500">🎤 </span>“{r.audio_transcripcion}”
                </p>
              ) : r.audioBlob ? (
                <p className="text-xs text-finca-500 mt-1">
                  🎤 Audio guardado; se transcribe cuando haya señal.
                </p>
              ) : null}
              {r.observaciones && r.observaciones !== r.audio_transcripcion && (
                <p className="text-sm text-finca-600 mt-1">
                  <span className="text-finca-400">Resumen:</span> {r.observaciones}
                </p>
              )}
              {r.audioBlob && <ReproductorAudio blob={r.audioBlob} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
