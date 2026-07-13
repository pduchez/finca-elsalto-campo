"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { useAreas, useActividades, useTrabajadores } from "@/lib/db/hooks";

// Administración: catálogos. Aquí el dueño carga los BIOLES (tipos foliares y su
// uso) que NO vienen predefinidos. El resto se muestra como referencia; el CRUD
// completo contra Supabase se conecta cuando el panel corre en producción.
export default function AdminPage() {
  const areas = useAreas();
  const actividades = useActividades();
  const trabajadores = useTrabajadores();
  const insumos = useLiveQuery(() => db().insumos.toArray(), [], []);

  const bioles = insumos.filter((i) => i.tipo === "biol");

  const [nombre, setNombre] = useState("");
  const [subtipo, setSubtipo] = useState("");
  const [uso, setUso] = useState("");

  async function agregarBiol() {
    if (!nombre.trim()) return;
    await db().insumos.put({
      id: uuidv4(),
      nombre: nombre.trim(),
      tipo: "biol",
      unidad: "litro",
      subtipo: subtipo.trim() || null,
      descripcion_uso: uso.trim() || null,
      activo: true,
    });
    setNombre("");
    setSubtipo("");
    setUso("");
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-extrabold text-finca-900">Administración</h1>

      {/* Bioles: catálogo editable */}
      <section>
        <h2 className="text-xl font-extrabold text-finca-900 mb-1">
          Bioles (foliares)
        </h2>
        <p className="text-finca-600 text-sm mb-3">
          Cargá acá los tipos de biol y su uso agronómico. No vienen
          predefinidos: los definís vos.
        </p>

        <div className="bg-white rounded-xl p-4 border border-finca-100 flex flex-col gap-3 mb-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del biol (ej: Biol de estiércol)"
            className="seleccionable border-2 border-finca-100 rounded-lg p-2"
          />
          <input
            value={subtipo}
            onChange={(e) => setSubtipo(e.target.value)}
            placeholder="Subtipo / variante (opcional)"
            className="seleccionable border-2 border-finca-100 rounded-lg p-2"
          />
          <textarea
            value={uso}
            onChange={(e) => setUso(e.target.value)}
            placeholder="¿Para qué se aplica? (uso agronómico)"
            className="seleccionable border-2 border-finca-100 rounded-lg p-2"
            rows={2}
          />
          <button
            onClick={() => void agregarBiol()}
            className="bg-finca-500 text-white rounded-lg px-4 py-2 font-semibold self-start"
          >
            + Agregar biol
          </button>
        </div>

        {bioles.length === 0 ? (
          <p className="text-finca-600">Todavía no hay bioles cargados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bioles.map((b) => (
              <li
                key={b.id}
                className="bg-white rounded-lg p-3 border border-finca-100"
              >
                <p className="font-bold text-finca-800">
                  {b.nombre}
                  {b.subtipo ? ` · ${b.subtipo}` : ""}
                </p>
                {b.descripcion_uso && (
                  <p className="text-finca-600 text-sm">{b.descripcion_uso}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Catálogos de referencia */}
      <CatalogoRef titulo="Áreas" items={areas.map((a) => a.nombre)} />
      <CatalogoRef
        titulo="Actividades"
        items={actividades.map((a) => a.nombre)}
      />
      <CatalogoRef
        titulo="Trabajadores"
        items={trabajadores.map((t) => `${t.nombre} (${t.tipo})`)}
      />
      <CatalogoRef
        titulo="Otros insumos"
        items={insumos
          .filter((i) => i.tipo !== "biol")
          .map((i) => `${i.nombre} (${i.unidad ?? ""})`)}
      />
    </div>
  );
}

function CatalogoRef({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold text-finca-900 mb-2">{titulo}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span
            key={t}
            className="bg-white border border-finca-100 rounded-lg px-3 py-2 text-finca-700 font-semibold"
          >
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
