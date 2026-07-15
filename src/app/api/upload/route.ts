import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Sube a Supabase Storage (bucket `capturas`) el audio y/o las fotos de una fila
 * ya sincronizada, y guarda las rutas de los archivos en la fila correspondiente.
 *
 * Recibe FormData: `tabla`, `id`, `audio` (0..1) y `foto` (0..n).
 * Es idempotente: sube con `upsert` a rutas deterministas `<tabla>/<id>/...`,
 * así reintentar no duplica. Si Supabase no está configurado, responde en MODO
 * DEMO (200) para que el cliente marque los archivos como subidos y no reintente.
 */

const BUCKET = "capturas";

function configurado(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function extDe(tipo: string): string {
  if (tipo.includes("jpeg") || tipo.includes("jpg")) return "jpg";
  if (tipo.includes("png")) return "png";
  if (tipo.includes("webp")) return "webp";
  if (tipo.includes("mp4")) return "mp4";
  if (tipo.includes("mpeg")) return "mp3";
  if (tipo.includes("webm")) return "webm";
  if (tipo.includes("ogg")) return "ogg";
  return "bin";
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "FormData inválido" }, { status: 400 });
  }

  const tabla = String(form.get("tabla") ?? "");
  const id = String(form.get("id") ?? "");
  const tablasOk = new Set(["registros", "asistencia", "areas_detalle"]);
  if (!tablasOk.has(tabla) || !id) {
    return NextResponse.json({ ok: false, error: "tabla o id inválidos" }, { status: 400 });
  }

  const audio = form.get("audio");
  const fotos = form.getAll("foto").filter((f): f is File => f instanceof File);
  const areaNombre = (form.get("area_nombre") as string) || null;
  const actividadNombre = (form.get("actividad_nombre") as string) || null;

  if (!configurado()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  try {
    const { crearClienteServicio } = await import("@/lib/supabase/server");
    const supa = crearClienteServicio();

    async function subir(nombre: string, archivo: Blob): Promise<string> {
      const ruta = `${tabla}/${id}/${nombre}`;
      const buf = Buffer.from(await archivo.arrayBuffer());
      const { error } = await supa.storage.from(BUCKET).upload(ruta, buf, {
        contentType: archivo.type || "application/octet-stream",
        upsert: true,
      });
      if (error) throw error;
      return ruta;
    }

    let audioRuta: string | null = null;
    if (audio instanceof File && audio.size > 0) {
      audioRuta = await subir(`audio.${extDe(audio.type)}`, audio);
    }
    const fotoRutas: string[] = [];
    for (let i = 0; i < fotos.length; i++) {
      fotoRutas.push(await subir(`foto-${i}.${extDe(fotos[i].type)}`, fotos[i]));
    }

    if (tabla === "registros") {
      const patch: Record<string, unknown> = {};
      if (audioRuta) patch.audio_url = audioRuta;
      if (fotoRutas.length) patch.fotos = fotoRutas;

      // Cadena de voz: audio → texto (Groq) → datos estructurados (Claude).
      if (audio instanceof File && audio.size > 0 && process.env.GROQ_API_KEY) {
        const { transcribirAudio } = await import("@/lib/groq/transcribir");
        const texto = await transcribirAudio(audio, `audio.${extDe(audio.type)}`);
        if (texto) {
          patch.audio_transcripcion = texto;
          patch.procesado = true;
          if (process.env.ANTHROPIC_API_KEY) {
            try {
              const { extraerDeTranscripcion } = await import(
                "@/lib/anthropic/extraccion"
              );
              const ext = await extraerDeTranscripcion(texto, {
                area: areaNombre,
                actividad: actividadNombre,
              });
              patch.cantidad = ext.cantidad;
              patch.unidad = ext.unidad;
              if (ext.jornales_usados != null) patch.jornales_usados = ext.jornales_usados;
              patch.observaciones = ext.observaciones;
              patch.problema_detectado = ext.problema_detectado;
              patch.descripcion_problema = ext.descripcion_problema;
              patch.insumo_agotado = ext.insumo_agotado;
              patch.extraccion_confianza = ext.confianza;
              patch.requiere_revision = ext.confianza < 0.7;
              patch.raw_json = ext;
            } catch {
              // El texto igual queda guardado; se marca para revisión manual.
              patch.requiere_revision = true;
            }
          }
        }
      }

      if (Object.keys(patch).length) {
        const { error } = await supa.from("registros").update(patch).eq("id", id);
        if (error) throw error;
      }
    } else if (tabla === "asistencia") {
      if (fotoRutas.length) {
        const { error } = await supa
          .from("asistencia")
          .update({ foto_url: fotoRutas[0] })
          .eq("id", id);
        if (error) throw error;
      }
    } else if (tabla === "areas_detalle") {
      if (fotoRutas.length) {
        const { error } = await supa
          .from("areas_detalle")
          .update({ fotos: fotoRutas, num_fotos: fotoRutas.length })
          .eq("area_id", id);
        if (error) throw error;
      }
    }

    return NextResponse.json({ ok: true, audio: audioRuta, fotos: fotoRutas });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "error de Storage" },
      { status: 500 },
    );
  }
}
