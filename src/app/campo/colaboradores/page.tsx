"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { db, type AsistenciaLocal } from "@/lib/db";
import { hoyISO } from "@/lib/db/seed";
import { useTrabajadores, useTodosTrabajadores } from "@/lib/db/hooks";
import { registrarAsistencia } from "@/lib/registros";
import { agregarColaborador, setActivoColaborador } from "@/lib/colaboradores";
import { comprimirFoto } from "@/lib/media";
import { fmtCoord } from "@/lib/geo";
import type { Trabajador } from "@/lib/types";

function horaFmt(ms: number | null | undefined): string {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
}

// Colaboradores: registro de asistencia con foto geoposicionada, fecha y hora.
export default function ColaboradoresPage() {
  const router = useRouter();
  const trabajadores = useTrabajadores();
  const hoy = useLiveQuery(
    () => db().asistencia.where("fecha").equals(hoyISO()).toArray(),
    [],
    [],
  );
  const [sel, setSel] = useState<Trabajador | null>(null);
  const [gestionar, setGestionar] = useState(false);

  const map = new Map<string, AsistenciaLocal>(hoy.map((a) => [a.trabajador_id, a]));
  const presentes = hoy.filter((a) => a.presente).length;

  if (gestionar) return <Gestionar onCerrar={() => setGestionar(false)} />;

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
      <div className="grid grid-cols-2 gap-3">
        <button className="boton-secundario py-3 text-base" onClick={() => router.push("/campo/planilla")}>
          📋 Planilla
        </button>
        <button className="boton-secundario py-3 text-base" onClick={() => setGestionar(true)}>
          ⚙️ Gestionar base
        </button>
      </div>
      <p className="text-finca-600 -mt-1">
        Tocá un colaborador y tomale la foto: se guarda la hora y el lugar como prueba de que llegó.
      </p>

      <ul className="flex flex-col gap-3">
        {trabajadores.map((t) => {
          const a = map.get(t.id);
          const presente = a?.presente === true;
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
                <span className="text-left">{t.nombre}</span>
                <span className="text-right text-base font-bold leading-tight">
                  {presente ? (
                    <>
                      ✓ {horaFmt(a?.hora)}
                      <span className="block text-sm font-semibold opacity-90">
                        {a?.evidencia_foto ? "📷 con foto · 📍" : "sin foto"}
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
          onCerrar={() => setSel(null)}
        />
      )}
    </div>
  );
}

function HojaRegistro({
  trabajador,
  actual,
  onCerrar,
}: {
  trabajador: Trabajador;
  actual: AsistenciaLocal | null;
  onCerrar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [guardando, setGuardando] = useState(false);

  async function conFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGuardando(true);
    const foto = await comprimirFoto(file);
    await registrarAsistencia({ id: trabajador.id, nombre: trabajador.nombre }, { presente: true, foto });
    setGuardando(false);
    onCerrar();
  }

  async function ausente() {
    setGuardando(true);
    await registrarAsistencia({ id: trabajador.id, nombre: trabajador.nombre }, { presente: false });
    setGuardando(false);
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
              {actual.evidencia_foto ? " · 📷 con foto" : " · sin foto"}
              {actual.latitud != null && ` · 📍 ${fmtCoord(actual.latitud, actual.longitud)}`}
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void conFoto(e)}
        />
        <div className="flex flex-col gap-3">
          <button
            className="boton-listo disabled:opacity-50"
            disabled={guardando}
            onClick={() => inputRef.current?.click()}
          >
            {guardando ? "Guardando…" : "📷 TOMAR FOTO"}
          </button>
          <button className="text-alerta font-bold py-2 disabled:opacity-50" disabled={guardando} onClick={() => void ausente()}>
            Marcar ausente
          </button>
        </div>
        <p className="text-center text-finca-500 text-sm mt-3">
          El registro es con foto: guarda hora y ubicación aunque no haya señal. Se envía sola cuando aparezca.
        </p>
      </div>
    </div>
  );
}

// Gestión de la base de colaboradores (alta rotación): agregar, activar/desactivar.
function Gestionar({ onCerrar }: { onCerrar: () => void }) {
  const todos = useTodosTrabajadores();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<Trabajador["tipo"]>("planilla");
  const activos = todos.filter((t) => t.activo).length;

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
        <p className="text-finca-600 font-semibold">{activos} activo{activos === 1 ? "" : "s"} de {todos.length}</p>
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

      {/* Lista completa con activar/desactivar */}
      <ul className="flex flex-col gap-2">
        {todos.map((t) => (
          <li key={t.id} className="tarjeta flex items-center justify-between py-3">
            <div>
              <p className={`font-bold ${t.activo ? "text-finca-900" : "text-finca-400"}`}>{t.nombre}</p>
              <p className="text-xs text-finca-500 capitalize">{t.tipo}{t.activo ? "" : " · inactivo"}</p>
            </div>
            <button
              onClick={() => void setActivoColaborador(t.id, !t.activo)}
              className={`rounded-lg px-3 py-2 font-bold border-2 text-sm ${
                t.activo ? "bg-white text-alerta border-alerta/40" : "bg-listo text-white border-listo"
              }`}
            >
              {t.activo ? "Desactivar" : "Reactivar"}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-finca-600 text-sm">
        Desactivá a quien no vuelve; reactivá al que regresa por temporada. Los cambios se sincronizan solos.
      </p>
    </div>
  );
}
