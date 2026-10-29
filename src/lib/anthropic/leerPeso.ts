import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODELO_EXTRACCION } from "./extraccion";

/**
 * Lee el PESO de la foto de una báscula con Claude (visión). Mismo patrón de
 * tool-use forzado que la extracción de audio: el modelo devuelve el número que
 * SE VE en el visor, o marca `legible=false` si no se distingue. No adivina.
 *
 * Se usa cuando Emerson tomó la foto del pesaje sin señal y no tecleó el número:
 * el servidor la procesa al sincronizar y llena el peso.
 */

const esquema = z.object({
  peso: z.number().nullable(),
  unidad_detectada: z.string().nullable(),
  legible: z.boolean(),
  confianza: z.number().min(0).max(1),
});
export type LecturaPeso = z.infer<typeof esquema>;

const inputSchema = {
  type: "object" as const,
  properties: {
    peso: {
      type: ["number", "null"],
      description: "El número que se ve en el visor de la báscula. null si no se distingue.",
    },
    unidad_detectada: {
      type: ["string", "null"],
      description: "Unidad que muestra la báscula si es visible: 'lb' o 'kg'. null si no se ve.",
    },
    legible: {
      type: "boolean",
      description: "true solo si el número se ve con claridad suficiente para confiar en él.",
    },
    confianza: { type: "number", description: "0 a 1: qué tan seguro estás de la lectura." },
  },
  required: ["peso", "unidad_detectada", "legible", "confianza"],
};

const SISTEMA = `Sos un asistente que lee el peso mostrado en el visor de una báscula/balanza en la foto de una finca de cardamomo. Reglas absolutas:
- Devolvé EXACTAMENTE el número que se ve en el visor. No lo redondees ni lo supongas.
- Si el visor no se ve, está borroso, apagado o ambiguo: legible=false y peso=null.
- Si ves la unidad (lb/kg), reportála; si no, null.
- Respondé SIEMPRE llamando a la herramienta 'registrar_peso'.`;

function mediaType(tipo: string): "image/jpeg" | "image/png" | "image/webp" {
  if (tipo.includes("png")) return "image/png";
  if (tipo.includes("webp")) return "image/webp";
  return "image/jpeg";
}

/** Lee el peso de la foto. Lanza si falta la API key o la respuesta no cumple. */
export async function leerPesoDeFoto(imagen: Blob): Promise<LecturaPeso> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });

  const base64 = Buffer.from(await imagen.arrayBuffer()).toString("base64");

  const resp = await client.messages.create({
    model: MODELO_EXTRACCION,
    max_tokens: 512,
    system: SISTEMA,
    tools: [
      {
        name: "registrar_peso",
        description: "Registra el peso leído del visor de la báscula.",
        input_schema: inputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "registrar_peso" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType(imagen.type || ""), data: base64 },
          },
          { type: "text", text: "¿Qué peso muestra la báscula en esta foto?" },
        ],
      },
    ],
  });

  const bloque = resp.content.find((b) => b.type === "tool_use");
  if (!bloque || bloque.type !== "tool_use") {
    throw new Error("Claude no devolvió la herramienta esperada");
  }
  return esquema.parse(bloque.input);
}
