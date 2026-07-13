"use client";

import { v4 as uuidv4 } from "uuid";
import { db, type TrabajadorLocal } from "@/lib/db";
import { sincronizar } from "@/lib/sync/cola";

/**
 * Gestión de la base de colaboradores (alta rotación: temporada, nuevos, los
 * que no vuelven o vuelven eventualmente). Todo se guarda local y se sincroniza.
 */

export async function agregarColaborador(
  nombre: string,
  tipo: TrabajadorLocal["tipo"] = "planilla",
): Promise<void> {
  const limpio = nombre.trim();
  if (!limpio) return;
  const fila: TrabajadorLocal = {
    id: uuidv4(),
    nombre: limpio,
    tipo,
    activo: true,
    estadoSync: "pendiente",
    intentos: 0,
  };
  await db().trabajadores.put(fila);
  void sincronizar();
}

/** Activa (regresó) o desactiva (no vuelve) a un colaborador. */
export async function setActivoColaborador(id: string, activo: boolean): Promise<void> {
  await db().trabajadores.update(id, { activo, estadoSync: "pendiente", intentos: 0 });
  void sincronizar();
}

/** Cambia el nombre de un colaborador. */
export async function renombrarColaborador(id: string, nombre: string): Promise<void> {
  const limpio = nombre.trim();
  if (!limpio) return;
  await db().trabajadores.update(id, { nombre: limpio, estadoSync: "pendiente", intentos: 0 });
  void sincronizar();
}
