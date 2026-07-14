"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAreas, useActividades, useTrabajadores, useTareasDestajo } from "@/lib/db/hooks";
import { guardarGrupoDestajo } from "@/lib/registros";
import type { TareaDestajoLocal } from "@/lib/db";

type Miembro = { id: string; nombre: string; unidades: number };

// Tareas a destajo: mismos colaboradores y áreas. Grupos simultáneos, destajo
// individual (cada quien sus unidades). Alimenta el reporte de la catorcena.
export default function DestajoPage() {
  const router = useRouter();
  const tareas = useTareasDestajo();
  const [modo, setModo] = useState<"lista" | "nueva">("lista");

  if (modo === "nueva") return <NuevaTarea onListo={() => setModo("lista")} />;

  // Agrupar las líneas por grupo_id (una tarea = un grupo de colaboradores).
  const grupos = new Map<string, TareaDestajoLocal[]>();
  for (const t of tareas) {
    const k = t.grupo_id || t.id;
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(t);
  }
  const lista = [...grupos.values()].sort((a, b) => b[0].fecha.localeCompare(a[0].fecha));

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push("/campo")} className="text-finca-600 font-bold text-lg self-start">
        ← Atrás
      </button>
      <h1 className="text-2xl font-extrabold text-finca-900">Tareas a destajo</h1>

      <button className="boton-primario" onClick={() => setModo("nueva")}>
        ➕ Nueva tarea a destajo
      </button>
      <button className="boton-secundario" onClick={() => router.push("/campo/planilla")}>
        📋 Ver en la planilla (catorcena)
      </button>

      {lista.length === 0 ? (
        <p className="text-finca-600">Aún no hay tareas a destajo registradas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((g) => {
            const t0 = g[0];
            const total = g.reduce((s, x) => s + x.total_calculado, 0);
            return (
              <div key={t0.grupo_id || t0.id} className="tarjeta flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-finca-900">{t0.area_nombre}</p>
                    <p className="text-sm text-finca-600">{t0.actividad_nombre} · {t0.fecha}</p>
                  </div>
                  <span className="text-lg font-extrabold text-finca-700">${total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-finca-500">
                  ${t0.precio_pactado.toFixed(2)} por {t0.unidad || "unidad"}
                </p>
                <ul className="flex flex-col gap-1">
                  {g.map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-finca-800 text-sm">
                      <span className="font-semibold">{m.trabajador_nombre}</span>
                      <span>
                        {m.unidades_ejecutadas} {m.unidad || ""} · <b>${m.total_calculado.toFixed(2)}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NuevaTarea({ onListo }: { onListo: () => void }) {
  const areas = useAreas();
  const actividades = useActividades();
  const colaboradores = useTrabajadores();

  const [areaId, setAreaId] = useState("");
  const [actividadId, setActividadId] = useState("");
  const [precio, setPrecio] = useState("");
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [porAgregar, setPorAgregar] = useState("");
  const [guardado, setGuardado] = useState(false);

  const area = areas.find((a) => a.id === areaId) ?? null;
  const actividad = actividades.find((a) => a.id === actividadId) ?? null;
  const unidad = actividad?.unidad_medida ?? "unidad";
  const precioNum = parseFloat(precio) || 0;

  const disponibles = useMemo(
    () => colaboradores.filter((c) => !miembros.some((m) => m.id === c.id)),
    [colaboradores, miembros],
  );

  const totalTarea = miembros.reduce((s, m) => s + precioNum * m.unidades, 0);
  const completo = !!area && !!actividad && precioNum > 0 && miembros.some((m) => m.unidades > 0);

  function agregar(id: string) {
    const c = colaboradores.find((x) => x.id === id);
    if (!c) return;
    setMiembros((m) => [...m, { id: c.id, nombre: c.nombre, unidades: 0 }]);
    setPorAgregar("");
  }
  function setUnidades(id: string, v: number) {
    setMiembros((m) => m.map((x) => (x.id === id ? { ...x, unidades: Math.max(0, v) } : x)));
  }
  function quitar(id: string) {
    setMiembros((m) => m.filter((x) => x.id !== id));
  }

  async function guardar() {
    if (!completo) return;
    await guardarGrupoDestajo({
      area: area ? { id: area.id, nombre: area.nombre } : null,
      actividad: actividad ? { id: actividad.id, nombre: actividad.nombre } : null,
      descripcion_unidad: actividad!.nombre,
      unidad,
      precio_pactado: precioNum,
      miembros,
    });
    setGuardado(true);
  }

  if (guardado) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-6 py-10">
        <div className="text-7xl">✅</div>
        <h1 className="text-2xl font-extrabold text-finca-900">Tarea guardada</h1>
        <p className="text-finca-700 text-lg">
          {actividad?.nombre} · {area?.nombre}
          <br />
          {miembros.filter((m) => m.unidades > 0).length} colaborador(es) · <b>${totalTarea.toFixed(2)}</b>
        </p>
        <div className="w-full flex flex-col gap-3">
          <button
            className="boton-primario"
            onClick={() => {
              setPrecio("");
              setMiembros([]);
              setGuardado(false);
            }}
          >
            Otra tarea
          </button>
          <button className="boton-secundario" onClick={onListo}>
            Ver tareas
          </button>
        </div>
      </div>
    );
  }

  const selCls = "w-full text-lg font-bold bg-crema rounded-xl p-3 border-2 border-finca-100 text-finca-900";

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onListo} className="text-finca-600 font-bold text-lg self-start">← Cancelar</button>
      <h1 className="text-2xl font-extrabold text-finca-900">Nueva tarea a destajo</h1>

      <div className="tarjeta flex flex-col gap-3">
        <label className="font-bold text-finca-800">Área</label>
        <select className={selCls} value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          <option value="">Elegí el área…</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>

        <label className="font-bold text-finca-800 mt-1">Actividad</label>
        <select className={selCls} value={actividadId} onChange={(e) => setActividadId(e.target.value)}>
          <option value="">Elegí la actividad…</option>
          {actividades.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>

        <label className="font-bold text-finca-800 mt-1">Precio por {unidad} ($)</label>
        <input
          inputMode="decimal"
          value={precio}
          onChange={(e) => setPrecio(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          className="entrada"
        />
      </div>

      {/* Grupo de colaboradores (destajo individual) */}
      <div className="tarjeta flex flex-col gap-3">
        <label className="font-bold text-finca-800">Colaboradores del grupo</label>
        <select
          className={selCls}
          value={porAgregar}
          onChange={(e) => agregar(e.target.value)}
          disabled={disponibles.length === 0}
        >
          <option value="">
            {disponibles.length === 0 ? "Todos agregados" : "+ Agregar colaborador…"}
          </option>
          {disponibles.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        {miembros.length === 0 ? (
          <p className="text-finca-500 text-sm">Agregá a cada colaborador y poné cuántas {unidad} hizo.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {miembros.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="flex-1 font-semibold text-finca-800">{m.nombre}</span>
                <button className="stepper-sm" onClick={() => setUnidades(m.id, m.unidades - 1)}>−</button>
                <input
                  inputMode="numeric"
                  value={m.unidades}
                  onChange={(e) => setUnidades(m.id, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                  className="w-16 text-center text-lg font-extrabold bg-crema rounded-lg p-2 border-2 border-finca-100"
                />
                <button className="stepper-sm" onClick={() => setUnidades(m.id, m.unidades + 1)}>+</button>
                <span className="w-16 text-right font-bold text-finca-700">
                  ${(precioNum * m.unidades).toFixed(2)}
                </span>
                <button onClick={() => quitar(m.id)} className="text-alerta font-bold px-1" aria-label="Quitar">×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tarjeta bg-finca-50 border-finca-500 flex items-center justify-between">
        <span className="font-bold text-finca-800 text-lg">Total de la tarea</span>
        <span className="text-2xl font-extrabold text-finca-700">${totalTarea.toFixed(2)}</span>
      </div>

      <button className="boton-listo disabled:opacity-50" disabled={!completo} onClick={() => void guardar()}>
        ✓ GUARDAR
      </button>
    </div>
  );
}
