"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActividades, useAreas, useTrabajadores } from "@/lib/db/hooks";
import { guardarDestajo } from "@/lib/registros";
import type { Actividad, Area, Trabajador } from "@/lib/types";

// Tarea por destajo: actividad + precio pactado + unidades + trabajador.
// El total se calcula solo.
export default function DestajoPage() {
  const router = useRouter();
  const areas = useAreas();
  const actividades = useActividades();
  const trabajadores = useTrabajadores();

  const [area, setArea] = useState<Area | null>(null);
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [precio, setPrecio] = useState<string>("");
  const [unidades, setUnidades] = useState<number>(0);
  const [guardado, setGuardado] = useState(false);

  const precioNum = parseFloat(precio) || 0;
  const total = precioNum * unidades;
  const completo =
    !!actividad && !!trabajador && precioNum > 0 && unidades > 0;

  async function guardar() {
    if (!completo) return;
    await guardarDestajo({
      area: area ? { id: area.id, nombre: area.nombre } : null,
      actividad: actividad ? { id: actividad.id, nombre: actividad.nombre } : null,
      descripcion_unidad: actividad!.nombre,
      precio_pactado: precioNum,
      unidades_ejecutadas: unidades,
      trabajador: trabajador ? { id: trabajador.id, nombre: trabajador.nombre } : null,
    });
    setGuardado(true);
  }

  if (guardado) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-6 py-10">
        <div className="text-7xl">✅</div>
        <h1 className="text-2xl font-extrabold text-finca-900">
          Tarea guardada
        </h1>
        <p className="text-finca-700 text-lg">
          {actividad?.nombre} · {trabajador?.nombre}
          <br />
          <b>${total.toFixed(2)}</b>
        </p>
        <div className="w-full flex flex-col gap-3">
          <button
            className="boton-primario"
            onClick={() => {
              setArea(null);
              setActividad(null);
              setTrabajador(null);
              setPrecio("");
              setUnidades(0);
              setGuardado(false);
            }}
          >
            Otra tarea
          </button>
          <button className="boton-secundario" onClick={() => router.push("/campo")}>
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/campo")}
          className="text-finca-600 font-bold text-lg"
        >
          ← Atrás
        </button>
      </div>
      <h1 className="text-2xl font-extrabold text-finca-900">Tarea por destajo</h1>

      <Selector<Area>
        etiqueta="Área"
        opciones={areas}
        valor={area}
        onSelect={setArea}
        render={(a) => a.nombre}
      />
      <Selector<Actividad>
        etiqueta="Actividad"
        opciones={actividades}
        valor={actividad}
        onSelect={setActividad}
        render={(a) => a.nombre}
      />
      <Selector<Trabajador>
        etiqueta="Trabajador"
        opciones={trabajadores}
        valor={trabajador}
        onSelect={setTrabajador}
        render={(t) => t.nombre}
      />

      <div className="tarjeta flex flex-col gap-2">
        <label className="font-bold text-finca-800 text-lg">
          Precio por unidad ($)
        </label>
        <input
          inputMode="decimal"
          value={precio}
          onChange={(e) => setPrecio(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          className="text-3xl font-extrabold text-finca-900 bg-crema rounded-xl p-3 w-full text-center"
        />
      </div>

      <div className="tarjeta flex items-center justify-between">
        <span className="font-bold text-finca-800 text-lg">Unidades</span>
        <div className="flex items-center gap-4">
          <button
            className="boton-secundario w-16 h-16 text-3xl"
            onClick={() => setUnidades((u) => Math.max(0, u - 1))}
          >
            −
          </button>
          <span className="text-3xl font-extrabold w-14 text-center">
            {unidades}
          </span>
          <button
            className="boton-secundario w-16 h-16 text-3xl"
            onClick={() => setUnidades((u) => u + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="tarjeta bg-finca-50 border-finca-500 flex items-center justify-between">
        <span className="font-bold text-finca-800 text-xl">Total</span>
        <span className="text-3xl font-extrabold text-finca-700">
          ${total.toFixed(2)}
        </span>
      </div>

      <button
        className="boton-listo disabled:opacity-50"
        disabled={!completo}
        onClick={() => void guardar()}
      >
        ✓ GUARDAR
      </button>
    </div>
  );
}

function Selector<T extends { id: string }>({
  etiqueta,
  opciones,
  valor,
  onSelect,
  render,
}: {
  etiqueta: string;
  opciones: T[];
  valor: T | null;
  onSelect: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-bold text-finca-800 text-lg">{etiqueta}</span>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o)}
            className={`rounded-xl px-4 py-3 font-bold border-2 ${
              valor?.id === o.id
                ? "bg-finca-500 text-white border-finca-500"
                : "bg-white text-finca-700 border-finca-100"
            }`}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
