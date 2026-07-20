"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { db, type AsistenciaLocal, type TrabajadorLocal } from "@/lib/db";
import { hoyISO } from "@/lib/db/seed";
import { useTrabajadores, useTodosTrabajadores } from "@/lib/db/hooks";
import { registrarAsistencia } from "@/lib/registros";
import { agregarColaborador, setActivoColaborador, guardarRostro, borrarRostro } from "@/lib/colaboradores";
import { comprimirFoto } from "@/lib/media";
import { fmtCoord } from "@/lib/geo";
import {
  prepararReconocimiento,
  descriptorDeBlob,
  coincide,
  identificar,
  similitudPct,
} from "@/lib/rostro/reconocimiento";
import type { Trabajador } from "@/lib/types";

function horaFmt(ms: number | null | undefined): string {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
}

type EstadoModelo = "cargando" | "listo" | "error";

// Colaboradores: asistencia verificada por reconocimiento facial (offline).
export default function ColaboradoresPage() {
  const router = useRouter();
  const trabajadores = useTrabajadores();
  const hoy = useLiveQuery(
    () => db().asistencia.where("fecha").equals(hoyISO()).toArray(),
    [],
    [],
  );
  const [sel, setSel] = useState<TrabajadorLocal | null>(null);
  const [gestionar, setGestionar] = useState(false);
  const [identificando, setIdentificando] = useState(false);
  const [modelo, setModelo] = useState<EstadoModelo>("cargando");

  // Precargar los modelos de reconocimiento (una vez; luego quedan cacheados).
  useEffect(() => {
    let vivo = true;
    prepararReconocimiento().then((ok) => vivo && setModelo(ok ? "listo" : "error"));
    return () => {
      vivo = false;
    };
  }, []);

  const map = new Map<string, AsistenciaLocal>(hoy.map((a) => [a.trabajador_id, a]));
  const presentes = hoy.filter((a) => a.presente).length;
  const conRostro = trabajadores.filter((t) => (t.face_descriptor?.length ?? 0) > 0);

  if (gestionar) return <Gestionar onCerrar={() => setGestionar(false)} modelo={modelo} />;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push("/campo")} className="text-finca-600 font-bold text-lg self-start">
        ← Atrás
      </button>
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Colaboradores</h1>
        <p className="text-finca-600 font-semibold">
          {presentes} presente{presentes === 1 ? "" : "s"} hoy
        </p>
      </div>

      <EstadoReconocimiento modelo={modelo} />

      <div className="grid grid-cols-2 gap-3">
        <button className="boton-secundario py-3 text-base" onClick={() => router.push("/campo/planilla")}>
          📋 Planilla
        </button>
        <button className="boton-secundario py-3 text-base" onClick={() => setGestionar(true)}>
          ⚙️ Gestionar base
        </button>
      </div>

      {/* Identificación automática: tomás la foto y la app reconoce quién es. */}
      <button
        className="boton-primario disabled:opacity-50"
        disabled={conRostro.length === 0}
        onClick={() => setIdentificando(true)}
      >
        📸 Identificar por rostro
      </button>
      {conRostro.length === 0 ? (
        <p className="text-finca-600 -mt-2 text-sm">
          Todavía no hay rostros registrados. Andá a <b>Gestionar base</b> y registrá la
          cara de cada colaborador para poder verificar la asistencia.
        </p>
      ) : (
        <p className="text-finca-600 -mt-2 text-sm">
          Tocá <b>Identificar por rostro</b> y fotografiá al colaborador: la app lo
          reconoce y marca su asistencia verificada. O tocá su nombre para marcarlo.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {trabajadores.map((t) => {
          const a = map.get(t.id);
          const presente = a?.presente === true;
          const tieneRostro = (t.face_descriptor?.length ?? 0) > 0;
          return (
            <li key={t.id}>
              <button
                onClick={() => setSel(t)}
                className={`toque-grande justify-between ${
                  presente
                    ? "bg-listo text-white"
                    : a?.presente === false
                      ? "bg-white text-finca-400 border-4 border-finca-100"
                      : "bg-white text-finca-800 border-4 border-finca-100"
                }`}
              >
                <span className="text-left flex items-center gap-2">
                  {t.nombre}
                  {!tieneRostro && (
                    <span className={`text-xs font-bold ${presente ? "text-white/80" : "text-pendiente"}`}>
                      · sin rostro
                    </span>
                  )}
                </span>
                <span className="text-right text-base font-bold leading-tight">
                  {presente ? (
                    <>
                      ✓ {horaFmt(a?.hora)}
                      <span className="block text-sm font-semibold opacity-90">
                        {a?.verificado_rostro
                          ? `🧑‍🦰 verificado ${a?.similitud != null ? `${a.similitud}%` : ""}`
                          : a?.evidencia_foto
                            ? "📷 con foto · 📍"
                            : "sin foto"}
                      </span>
                    </>
                  ) : a?.presente === false ? (
                    "Ausente"
                  ) : (
                    "Registrar →"
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {sel && (
        <HojaRegistro
          trabajador={sel}
          actual={map.get(sel.id) ?? null}
          modelo={modelo}
          onCerrar={() => setSel(null)}
        />
      )}

      {identificando && (
        <IdentificarModal
          candidatos={conRostro}
          yaPresentes={map}
          onCerrar={() => setIdentificando(false)}
        />
      )}
    </div>
  );
}

function EstadoReconocimiento({ modelo }: { modelo: EstadoModelo }) {
  if (modelo === "listo") return null;
  return (
    <div
      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
        modelo === "error"
          ? "bg-pendiente/10 text-pendiente border border-pendiente/30"
          : "bg-finca-50 text-finca-700 border border-finca-100"
      }`}
    >
      {modelo === "cargando"
        ? "🧠 Preparando reconocimiento facial… (la primera vez descarga el modelo con señal)"
        : "Reconocimiento no disponible ahora. Podés registrar con foto igual."}
    </div>
  );
}

// ---- Check-in de un colaborador, verificado por rostro ----
type Resultado =
  | { tipo: "verificado"; foto: Blob; pct: number }
  | { tipo: "no_coincide"; foto: Blob; pct: number }
  | { tipo: "sin_rostro"; foto: Blob }
  | { tipo: "sin_registro"; foto: Blob }; // el colaborador no tiene rostro guardado

function HojaRegistro({
  trabajador,
  actual,
  modelo,
  onCerrar,
}: {
  trabajador: TrabajadorLocal;
  actual: AsistenciaLocal | null;
  modelo: EstadoModelo;
  onCerrar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  const referencia = trabajador.face_descriptor ?? null;

  async function alTomarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setProcesando(true);
    setRes(null);
    const foto = await comprimirFoto(file);
    const descriptor = await descriptorDeBlob(foto);
    if (!referencia || referencia.length === 0) {
      setRes({ tipo: "sin_registro", foto });
    } else if (!descriptor) {
      setRes({ tipo: "sin_rostro", foto });
    } else {
      const { ok, distancia } = coincide(descriptor, referencia);
      const pct = similitudPct(distancia);
      setRes({ tipo: ok ? "verificado" : "no_coincide", foto, pct });
    }
    setProcesando(false);
  }

  async function guardar(foto: Blob, verificado: boolean, pct: number | null) {
    setProcesando(true);
    await registrarAsistencia(
      { id: trabajador.id, nombre: trabajador.nombre },
      { presente: true, foto, verificado_rostro: verificado, similitud: pct },
    );
    onCerrar();
  }

  async function ausente() {
    setProcesando(true);
    await registrarAsistencia({ id: trabajador.id, nombre: trabajador.nombre }, { presente: false });
    onCerrar();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2" onClick={onCerrar}>
      <div className="bg-crema rounded-2xl p-5 max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-extrabold text-finca-900">{trabajador.nombre}</h2>
          <button onClick={onCerrar} className="text-finca-600 font-bold text-2xl px-2" aria-label="Cerrar">×</button>
        </div>

        {actual?.presente && (
          <div className="tarjeta bg-finca-50 border-finca-500 mb-3 text-finca-800">
            <p className="font-bold">Ya registrado hoy</p>
            <p className="text-sm">
              {horaFmt(actual.hora)}
              {actual.verificado_rostro ? " · 🧑‍🦰 verificado" : actual.evidencia_foto ? " · 📷 con foto" : " · sin foto"}
              {actual.latitud != null && ` · 📍 ${fmtCoord(actual.latitud, actual.longitud)}`}
            </p>
          </div>
        )}

        {!referencia && modelo !== "error" && (
          <div className="bg-pendiente/10 text-pendiente border border-pendiente/30 rounded-xl px-4 py-2 text-sm mb-3">
            Sin rostro registrado. Se guardará solo con foto. Para verificar, registrá su
            rostro en <b>Gestionar base</b>.
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void alTomarFoto(e)}
        />

        {procesando && (
          <p className="text-center text-finca-700 font-bold py-2">🧠 Verificando rostro…</p>
        )}

        {/* Resultado tras tomar la foto */}
        {res && !procesando && (
          <div className="mb-3">
            {res.tipo === "verificado" && (
              <div className="tarjeta bg-listo/10 border-listo text-finca-900">
                <p className="font-extrabold text-listo">✓ Rostro verificado ({res.pct}%)</p>
                <p className="text-sm">Es {trabajador.nombre}. Registro fidedigno.</p>
                <button className="boton-listo mt-3" onClick={() => void guardar(res.foto, true, res.pct)}>
                  ✓ MARCAR PRESENTE
                </button>
              </div>
            )}
            {res.tipo === "no_coincide" && (
              <div className="tarjeta bg-alerta/10 border-alerta text-finca-900">
                <p className="font-extrabold text-alerta">⚠️ El rostro no coincide (parecido {res.pct}%)</p>
                <p className="text-sm">No parece ser {trabajador.nombre}. Volvé a intentar de frente y con luz.</p>
                <div className="flex flex-col gap-2 mt-3">
                  <button className="boton-primario" onClick={() => inputRef.current?.click()}>🔁 Reintentar</button>
                  <button className="text-finca-600 font-bold text-sm" onClick={() => void guardar(res.foto, false, res.pct)}>
                    Guardar de todos modos (sin verificar)
                  </button>
                </div>
              </div>
            )}
            {res.tipo === "sin_rostro" && (
              <div className="tarjeta bg-pendiente/10 border-pendiente text-finca-900">
                <p className="font-extrabold text-pendiente">No se detectó un rostro</p>
                <p className="text-sm">Tomá la foto de frente, con buena luz, el rostro dentro del cuadro.</p>
                <div className="flex flex-col gap-2 mt-3">
                  <button className="boton-primario" onClick={() => inputRef.current?.click()}>🔁 Reintentar</button>
                  <button className="text-finca-600 font-bold text-sm" onClick={() => void guardar(res.foto, false, null)}>
                    Guardar solo con foto
                  </button>
                </div>
              </div>
            )}
            {res.tipo === "sin_registro" && (
              <div className="tarjeta bg-finca-50 border-finca-500 text-finca-900">
                <p className="font-bold">Foto tomada</p>
                <p className="text-sm">Este colaborador no tiene rostro registrado; se guarda con foto.</p>
                <button className="boton-listo mt-3" onClick={() => void guardar(res.foto, false, null)}>
                  ✓ MARCAR PRESENTE
                </button>
              </div>
            )}
          </div>
        )}

        {!res && !procesando && (
          <div className="flex flex-col gap-3">
            <button
              className="boton-listo disabled:opacity-50"
              disabled={procesando}
              onClick={() => inputRef.current?.click()}
            >
              📷 TOMAR FOTO {referencia ? "Y VERIFICAR" : ""}
            </button>
            <button className="text-alerta font-bold py-2 disabled:opacity-50" disabled={procesando} onClick={() => void ausente()}>
              Marcar ausente
            </button>
          </div>
        )}

        <p className="text-center text-finca-500 text-sm mt-3">
          Guarda hora y ubicación aunque no haya señal. El reconocimiento corre en el
          teléfono; nunca se sube la cara.
        </p>
      </div>
    </div>
  );
}

// ---- Identificación automática por rostro ----
function IdentificarModal({
  candidatos,
  yaPresentes,
  onCerrar,
}: {
  candidatos: TrabajadorLocal[];
  yaPresentes: Map<string, AsistenciaLocal>;
  onCerrar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<
    | { tipo: "ok"; nombre: string; pct: number }
    | { tipo: "nadie" }
    | { tipo: "sin_rostro" }
    | null
  >(null);

  async function alTomarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setProcesando(true);
    setResultado(null);
    const foto = await comprimirFoto(file);
    const descriptor = await descriptorDeBlob(foto);
    if (!descriptor) {
      setResultado({ tipo: "sin_rostro" });
      setProcesando(false);
      return;
    }
    const lista = candidatos.map((c) => ({ id: c.id, nombre: c.nombre, descriptor: c.face_descriptor! }));
    const m = identificar(descriptor, lista);
    if (!m) {
      setResultado({ tipo: "nadie" });
      setProcesando(false);
      return;
    }
    const pct = similitudPct(m.distancia);
    await registrarAsistencia(
      { id: m.id, nombre: m.nombre },
      { presente: true, foto, verificado_rostro: true, similitud: pct },
    );
    setResultado({ tipo: "ok", nombre: m.nombre, pct });
    setProcesando(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2" onClick={onCerrar}>
      <div className="bg-crema rounded-2xl p-5 max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-extrabold text-finca-900">Identificar por rostro</h2>
          <button onClick={onCerrar} className="text-finca-600 font-bold text-2xl px-2" aria-label="Cerrar">×</button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void alTomarFoto(e)}
        />

        {procesando && <p className="text-center text-finca-700 font-bold py-4">🧠 Reconociendo…</p>}

        {resultado?.tipo === "ok" && (
          <div className="tarjeta bg-listo/10 border-listo text-finca-900 mb-3">
            <p className="font-extrabold text-listo text-lg">✓ {resultado.nombre}</p>
            <p className="text-sm">Asistencia verificada ({resultado.pct}%).</p>
          </div>
        )}
        {resultado?.tipo === "nadie" && (
          <div className="tarjeta bg-pendiente/10 border-pendiente text-finca-900 mb-3">
            <p className="font-bold text-pendiente">No se reconoció a nadie</p>
            <p className="text-sm">Probá de nuevo de frente, o marcá al colaborador por su nombre.</p>
          </div>
        )}
        {resultado?.tipo === "sin_rostro" && (
          <div className="tarjeta bg-pendiente/10 border-pendiente text-finca-900 mb-3">
            <p className="font-bold text-pendiente">No se detectó un rostro</p>
            <p className="text-sm">Fotografiá la cara de frente y con luz.</p>
          </div>
        )}

        {!procesando && (
          <button className="boton-listo" onClick={() => inputRef.current?.click()}>
            {resultado?.tipo === "ok" ? "📸 Identificar a otro" : "📸 TOMAR FOTO"}
          </button>
        )}
        <p className="text-center text-finca-500 text-sm mt-3">
          {candidatos.length} colaborador{candidatos.length === 1 ? "" : "es"} con rostro registrado.
        </p>
      </div>
    </div>
  );
}

// ---- Gestión de la base + registro de rostro (enrolamiento) ----
function Gestionar({ onCerrar, modelo }: { onCerrar: () => void; modelo: EstadoModelo }) {
  const todos = useTodosTrabajadores();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<Trabajador["tipo"]>("planilla");
  const [enrolando, setEnrolando] = useState<TrabajadorLocal | null>(null);
  const activos = todos.filter((t) => t.activo).length;
  const conRostro = todos.filter((t) => (t.face_descriptor?.length ?? 0) > 0).length;

  async function agregar() {
    if (!nombre.trim()) return;
    await agregarColaborador(nombre, tipo);
    setNombre("");
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onCerrar} className="text-finca-600 font-bold text-lg self-start">← Colaboradores</button>
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">Base de colaboradores</h1>
        <p className="text-finca-600 font-semibold">
          {activos} activo{activos === 1 ? "" : "s"} de {todos.length} · {conRostro} con rostro
        </p>
      </div>

      <div className="tarjeta bg-finca-50 border-finca-100 text-finca-700 text-sm">
        🔒 El rostro se guarda como un código matemático en el teléfono (no una foto) y sirve
        para verificar la asistencia. Registralo con el consentimiento del colaborador.
      </div>

      {/* Alta rápida */}
      <div className="tarjeta flex flex-col gap-3">
        <span className="font-bold text-finca-800">Agregar colaborador</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre y apellido"
          className="entrada seleccionable text-left"
        />
        <div className="flex gap-2">
          {(["planilla", "tarea", "mixto"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex-1 rounded-lg py-2 font-bold border-2 capitalize text-sm ${
                tipo === t ? "bg-finca-500 text-white border-finca-500" : "bg-white text-finca-700 border-finca-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button className="boton-primario py-3 text-lg" onClick={() => void agregar()}>
          + Agregar
        </button>
      </div>

      {/* Lista con rostro + activar/desactivar */}
      <ul className="flex flex-col gap-2">
        {todos.map((t) => {
          const tieneRostro = (t.face_descriptor?.length ?? 0) > 0;
          return (
            <li key={t.id} className="tarjeta flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-bold ${t.activo ? "text-finca-900" : "text-finca-400"}`}>{t.nombre}</p>
                  <p className="text-xs text-finca-500 capitalize">
                    {t.tipo}
                    {t.activo ? "" : " · inactivo"}
                    {tieneRostro ? " · 🧑‍🦰 rostro ✓" : " · sin rostro"}
                  </p>
                </div>
                <button
                  onClick={() => void setActivoColaborador(t.id, !t.activo)}
                  className={`rounded-lg px-3 py-2 font-bold border-2 text-sm ${
                    t.activo ? "bg-white text-alerta border-alerta/40" : "bg-listo text-white border-listo"
                  }`}
                >
                  {t.activo ? "Desactivar" : "Reactivar"}
                </button>
              </div>
              <button
                onClick={() => setEnrolando(t)}
                className={`rounded-lg py-2 font-bold border-2 text-sm ${
                  tieneRostro
                    ? "bg-white text-finca-700 border-finca-100"
                    : "bg-finca-500 text-white border-finca-500"
                }`}
              >
                {tieneRostro ? "🧑‍🦰 Actualizar rostro" : "📷 Registrar rostro"}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-finca-600 text-sm">
        Desactivá a quien no vuelve; reactivá al que regresa por temporada. Los cambios se sincronizan solos.
      </p>

      {enrolando && (
        <EnrolarRostro trabajador={enrolando} modelo={modelo} onCerrar={() => setEnrolando(null)} />
      )}
    </div>
  );
}

function EnrolarRostro({
  trabajador,
  modelo,
  onCerrar,
}: {
  trabajador: TrabajadorLocal;
  modelo: EstadoModelo;
  onCerrar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const tieneRostro = (trabajador.face_descriptor?.length ?? 0) > 0;

  async function alTomarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setProcesando(true);
    setMsg(null);
    const foto = await comprimirFoto(file);
    const descriptor = await descriptorDeBlob(foto);
    if (!descriptor) {
      setMsg({ ok: false, texto: "No se detectó un rostro. Tomá la foto de frente, con buena luz." });
    } else {
      await guardarRostro(trabajador.id, descriptor);
      setMsg({ ok: true, texto: "✓ Rostro registrado. Ya se puede verificar su asistencia." });
    }
    setProcesando(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2" onClick={onCerrar}>
      <div className="bg-crema rounded-2xl p-5 max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-extrabold text-finca-900">Registrar rostro · {trabajador.nombre}</h2>
          <button onClick={onCerrar} className="text-finca-600 font-bold text-2xl px-2" aria-label="Cerrar">×</button>
        </div>

        <p className="text-finca-700 text-sm mb-3">
          Fotografiá la cara del colaborador <b>de frente, con buena luz y sin gorra</b>. Se guarda
          solo el código del rostro, no la foto.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void alTomarFoto(e)}
        />

        {procesando && <p className="text-center text-finca-700 font-bold py-2">🧠 Procesando rostro…</p>}
        {msg && !procesando && (
          <div
            className={`tarjeta mb-3 ${
              msg.ok ? "bg-listo/10 border-listo text-listo" : "bg-alerta/10 border-alerta text-alerta"
            }`}
          >
            <p className="font-bold">{msg.texto}</p>
          </div>
        )}

        {modelo === "error" && (
          <div className="bg-pendiente/10 text-pendiente border border-pendiente/30 rounded-xl px-4 py-2 text-sm mb-3">
            El modelo de reconocimiento no cargó. Conectate a internet una vez para descargarlo.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            className="boton-listo disabled:opacity-50"
            disabled={procesando}
            onClick={() => inputRef.current?.click()}
          >
            {msg?.ok ? "📷 Tomar otra" : "📷 TOMAR FOTO DEL ROSTRO"}
          </button>
          {tieneRostro && (
            <button
              className="text-alerta font-bold py-2"
              onClick={async () => {
                await borrarRostro(trabajador.id);
                setMsg({ ok: true, texto: "Rostro borrado." });
              }}
            >
              Borrar rostro registrado
            </button>
          )}
          {msg?.ok && (
            <button className="boton-primario" onClick={onCerrar}>Listo</button>
          )}
        </div>
      </div>
    </div>
  );
}
