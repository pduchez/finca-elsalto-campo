import { NextResponse } from "next/server";
import { extraerDeTranscripcion } from "@/lib/anthropic/extraccion";

export const runtime = "nodejs";

/**
 * Recibe un registro pendiente del cliente y lo persiste de forma IDEMPOTENTE
 * (upsert por `id`/uuid). Si Supabase no está configurado, corre en MODO DEMO:
 * responde 200 sin persistir, para que la cola del cliente drene y se pueda
 * probar el flujo completo sin backend.
 *
 * Procesamiento con Claude: cuando el registro trae `audio_transcripcion`
 * (transcripción hecha por el proveedor de STT), se extraen los campos
 * estructurados y se guardan junto al registro.
 */

function configurado(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Deja en cada tabla solo las columnas reales del esquema Postgres.
function aFila(tipo: string, item: any): { tabla: string; fila: any } {
  switch (tipo) {
    case "registros":
      return {
        tabla: "registros",
        fila: {
          id: item.id,
          fecha: item.fecha,
          area_id: item.area_id,
          actividad_id: item.actividad_id,
          usuario: item.usuario ?? "emerson",
          latitud: item.latitud,
          longitud: item.longitud,
          precision_gps: item.precision_gps,
          jornales_usados: item.jornales_usados,
          audio_transcripcion: item.audio_transcripcion ?? null,
        },
      };
    case "asistencia":
      return {
        tabla: "asistencia",
        fila: {
          id: item.id,
          fecha: item.fecha,
          trabajador_id: item.trabajador_id,
          area_id: item.area_id,
          presente: item.presente,
          registrado_por: item.registrado_por ?? "emerson",
        },
      };
    case "tareas_destajo":
      return {
        tabla: "tareas_destajo",
        fila: {
          id: item.id,
          fecha: item.fecha,
          area_id: item.area_id,
          actividad_id: item.actividad_id,
          descripcion_unidad: item.descripcion_unidad,
          precio_pactado: item.precio_pactado,
          unidades_ejecutadas: item.unidades_ejecutadas,
          trabajador_id: item.trabajador_id,
        },
      };
    case "consultas_protocolo":
      return {
        tabla: "consultas_protocolo",
        fila: {
          id: item.id,
          protocolo_id: item.protocolo_id,
          usuario: item.usuario ?? "emerson",
        },
      };
    default:
      throw new Error(`tipo desconocido: ${tipo}`);
  }
}

export async function POST(req: Request) {
  let body: { tipo?: string; item?: any };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const { tipo, item } = body;
  if (!tipo || !item?.id) {
    return NextResponse.json(
      { ok: false, error: "Falta tipo o item.id" },
      { status: 400 },
    );
  }

  // Modo demo: sin backend, confirmamos igual para que el cliente marque enviado.
  if (!configurado()) {
    return NextResponse.json({ ok: true, demo: true, id: item.id });
  }

  try {
    const { crearClienteServicio } = await import("@/lib/supabase/server");
    const supa = crearClienteServicio();
    const { tabla, fila } = aFila(tipo, item);

    // Procesamiento con Claude si ya hay transcripción del audio.
    if (
      tabla === "registros" &&
      fila.audio_transcripcion &&
      process.env.ANTHROPIC_API_KEY
    ) {
      try {
        const ext = await extraerDeTranscripcion(fila.audio_transcripcion, {
          area: item.area_nombre,
          actividad: item.actividad_nombre,
        });
        Object.assign(fila, {
          cantidad: ext.cantidad,
          unidad: ext.unidad,
          jornales_usados: ext.jornales_usados ?? fila.jornales_usados,
          observaciones: ext.observaciones,
          problema_detectado: ext.problema_detectado,
          descripcion_problema: ext.descripcion_problema,
          insumo_agotado: ext.insumo_agotado,
          extraccion_confianza: ext.confianza,
          requiere_revision: ext.confianza < 0.7,
          procesado: true,
          raw_json: ext,
          sincronizado_en: new Date().toISOString(),
        });
      } catch {
        // Si Claude falla, se guarda igual y queda para revisión.
        Object.assign(fila, { requiere_revision: true });
      }
    } else if (tabla === "registros") {
      Object.assign(fila, { sincronizado_en: new Date().toISOString() });
    } else {
      Object.assign(fila, { sincronizado_en: new Date().toISOString() });
    }

    const { error } = await supa.from(tabla).upsert(fila, { onConflict: "id" });
    if (error) throw error;
    return NextResponse.json({ ok: true, id: item.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "error" },
      { status: 500 },
    );
  }
}
