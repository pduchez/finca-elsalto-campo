"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { db, type AsistenciaLocal } from "@/lib/db";
import { hoyISO } from "@/lib/db/seed";
import { useTrabajadores } from "@/lib/db/hooks";
import { registrarAsistencia } from "@/lib/registros";
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

  const map = new Map<string, AsistenciaLocal>(hoy.map((a) => [a.trabajador_id, a]));
  const presentes = hoy.filter((a) => a.presente).length;

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

  async function sinFoto() {
    setGuardando(true);
    await registrarAsistencia({ id: trabajador.id, nombre: trabajador.nombre }, { presente: true });
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
          <button className="boton-secundario disabled:opacity-50" disabled={guardando} onClick={() => void sinFoto()}>
            Marcar presente sin foto
          </button>
          <button className="text-alerta font-bold py-2 disabled:opacity-50" disabled={guardando} onClick={() => void ausente()}>
            Marcar ausente
          </button>
        </div>
        <p className="text-center text-finca-500 text-sm mt-3">
          La foto guarda hora y ubicación automáticamente.
        </p>
      </div>
    </div>
  );
}
