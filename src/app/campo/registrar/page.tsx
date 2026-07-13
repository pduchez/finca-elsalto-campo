"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAreas, useActividades, useProtocolos } from "@/lib/db/hooks";
import { guardarRegistro, registrarConsultaProtocolo } from "@/lib/registros";
import GrabadoraAudio from "@/components/captura/GrabadoraAudio";
import CapturaFotos from "@/components/captura/CapturaFotos";
import ModalProtocolo from "@/components/ModalProtocolo";
import type { Area, Actividad } from "@/lib/types";
import type { ProtocoloLocal } from "@/lib/db";

type Paso = "area" | "actividad" | "captura" | "listo";

export default function RegistrarFlujo() {
  const router = useRouter();
  const areas = useAreas();
  const actividades = useActividades();
  const protocolos = useProtocolos();

  const [paso, setPaso] = useState<Paso>("area");
  const [area, setArea] = useState<Area | null>(null);
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioMime, setAudioMime] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Blob[]>([]);
  const [jornales, setJornales] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [verProtocolo, setVerProtocolo] = useState<ProtocoloLocal | null>(null);

  // Si venimos de la ficha de un área (?area=<id>), la preseleccionamos y
  // saltamos directo a elegir la actividad.
  const preseleccionHecha = useRef(false);
  useEffect(() => {
    if (preseleccionHecha.current || areas.length === 0) return;
    const id = new URLSearchParams(window.location.search).get("area");
    if (!id) {
      preseleccionHecha.current = true;
      return;
    }
    const a = areas.find((x) => x.id === id);
    if (a) {
      setArea(a);
      setPaso("actividad");
    }
    preseleccionHecha.current = true;
  }, [areas]);

  // Protocolo contextual: se dispara por la actividad seleccionada.
  const protocoloContextual = useMemo(
    () =>
      actividad
        ? protocolos.find((p) => p.actividad_codigo === actividad.codigo) ?? null
        : null,
    [actividad, protocolos],
  );

  function abrirProtocolo(p: ProtocoloLocal) {
    setVerProtocolo(p);
    void registrarConsultaProtocolo(p.id);
  }

  async function finalizar() {
    if (guardando) return;
    setGuardando(true);
    await guardarRegistro({
      area: area ? { id: area.id, nombre: area.nombre } : null,
      actividad: actividad
        ? { id: actividad.id, codigo: actividad.codigo, nombre: actividad.nombre }
        : null,
      audio,
      audioMime,
      fotos,
      jornales: jornales > 0 ? jornales : null,
    });
    setPaso("listo");
  }

  const hayCaptura = audio !== null || fotos.length > 0;

  // ---- Paso 1: área ----
  if (paso === "area") {
    return (
      <Encabezado titulo="¿En qué área?" onAtras={() => router.push("/campo")}>
        <div className="rejilla-botones">
          {areas.map((a) => (
            <button
              key={a.id}
              className="boton-primario h-28 text-xl"
              onClick={() => {
                setArea(a);
                setPaso("actividad");
              }}
            >
              {a.nombre}
            </button>
          ))}
        </div>
      </Encabezado>
    );
  }

  // ---- Paso 2: actividad ----
  if (paso === "actividad") {
    return (
      <Encabezado
        titulo="¿Qué hiciste?"
        subtitulo={area?.nombre}
        onAtras={() => setPaso("area")}
      >
        <div className="grid grid-cols-1 gap-3">
          {actividades.map((ac) => (
            <button
              key={ac.id}
              className="boton-primario h-20 text-lg justify-start"
              onClick={() => {
                setActividad(ac);
                setPaso("captura");
              }}
            >
              {ac.nombre}
            </button>
          ))}
        </div>
      </Encabezado>
    );
  }

  // ---- Paso 3: captura ----
  if (paso === "captura") {
    return (
      <Encabezado
        titulo="Contá qué pasó"
        subtitulo={`${area?.nombre} · ${actividad?.nombre}`}
        onAtras={() => setPaso("actividad")}
      >
        <div className="flex flex-col gap-5">
          {protocoloContextual && (
            <button
              onClick={() => abrirProtocolo(protocoloContextual)}
              className="tarjeta text-left bg-finca-50 border-finca-500 flex items-center gap-3"
            >
              <span className="text-2xl">📖</span>
              <span className="font-bold text-finca-700">
                Ver cómo se hace: {protocoloContextual.titulo}
              </span>
            </button>
          )}

          <GrabadoraAudio
            audio={audio}
            onCambio={(a, m) => {
              setAudio(a);
              setAudioMime(m);
            }}
          />

          <CapturaFotos fotos={fotos} onCambio={setFotos} />

          <div className="tarjeta flex items-center justify-between">
            <span className="font-bold text-finca-800 text-lg">Jornaleros</span>
            <div className="flex items-center gap-4">
              <button
                className="boton-secundario w-16 h-16 text-3xl"
                onClick={() => setJornales((j) => Math.max(0, j - 1))}
                aria-label="Menos"
              >
                −
              </button>
              <span className="text-3xl font-extrabold w-10 text-center">
                {jornales}
              </span>
              <button
                className="boton-secundario w-16 h-16 text-3xl"
                onClick={() => setJornales((j) => j + 1)}
                aria-label="Más"
              >
                +
              </button>
            </div>
          </div>

          <button
            className="boton-listo disabled:opacity-50"
            disabled={guardando}
            onClick={() => void finalizar()}
          >
            {guardando ? "Guardando…" : "✓ LISTO"}
          </button>
          {!hayCaptura && (
            <p className="text-center text-finca-600 text-sm -mt-2">
              Podés guardar solo con jornaleros, pero lo mejor es un audio o foto.
            </p>
          )}
        </div>

        {verProtocolo && (
          <ModalProtocolo
            protocolo={verProtocolo}
            onCerrar={() => setVerProtocolo(null)}
          />
        )}
      </Encabezado>
    );
  }

  // ---- Paso 4: confirmación ----
  return (
    <div className="flex flex-col items-center justify-center text-center gap-6 py-10">
      <div className="text-7xl">✅</div>
      <h1 className="text-2xl font-extrabold text-finca-900">¡Guardado!</h1>
      <p className="text-finca-700 text-lg">
        Quedó guardado en el teléfono. Se envía solo cuando haya señal.
      </p>
      <div className="w-full flex flex-col gap-3">
        <button
          className="boton-primario"
          onClick={() => {
            // Reiniciar para otro registro rápido.
            setArea(null);
            setActividad(null);
            setAudio(null);
            setAudioMime(null);
            setFotos([]);
            setJornales(0);
            setGuardando(false);
            setPaso("area");
          }}
        >
          🎤 Registrar otra cosa
        </button>
        <button
          className="boton-secundario"
          onClick={() => router.push("/campo")}
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
}

function Encabezado({
  titulo,
  subtitulo,
  onAtras,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  onAtras: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onAtras}
          className="text-finca-600 font-bold text-lg"
          aria-label="Atrás"
        >
          ← Atrás
        </button>
      </div>
      <div>
        <h1 className="text-2xl font-extrabold text-finca-900">{titulo}</h1>
        {subtitulo && <p className="text-finca-600 font-semibold">{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}
