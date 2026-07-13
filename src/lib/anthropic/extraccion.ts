import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ExtraccionClaude } from "@/lib/types";

/**
 * Extracción estructurada con Claude a partir de la transcripción del audio.
 *
 * - Usa TOOL USE con `tool_choice` forzado para garantizar el esquema
 *   (nunca se parsea texto libre con regex).
 * - Regla dura: Claude estructura lo que Emerson dijo. Si un dato no se dice,
 *   va `null`. No completa, no supone, no rellena.
 *
 * Los IDs de modelo son configurables por entorno. El proyecto pide
 * `claude-sonnet-4-6` para extracción y `claude-haiku-4-5` para clasificación;
 * confirmá el ID exacto de Sonnet contra la referencia de la API antes de
 * producción (se puede sobreescribir sin tocar código con las variables).
 */
export const MODELO_EXTRACCION =
  process.env.ANTHROPIC_MODEL_EXTRACCION ?? "claude-sonnet-4-6";
export const MODELO_CLASIFICACION =
  process.env.ANTHROPIC_MODEL_CLASIFICACION ?? "claude-haiku-4-5";

const esquema = z.object({
  cantidad: z.number().nullable(),
  unidad: z.string().nullable(),
  jornales_usados: z.number().nullable(),
  insumos_usados: z
    .array(
      z.object({
        nombre: z.string(),
        cantidad: z.number().nullable(),
        unidad: z.string().nullable(),
      }),
    )
    .default([]),
  observaciones: z.string().nullable(),
  problema_detectado: z.boolean(),
  descripcion_problema: z.string().nullable(),
  insumo_agotado: z.boolean(),
  confianza: z.number().min(0).max(1),
});

// Esquema JSON para el tool use (fuerza la forma de la respuesta).
const inputSchema = {
  type: "object" as const,
  properties: {
    cantidad: {
      type: ["number", "null"],
      description: "Cantidad principal mencionada (ej: 200 matas). null si no se dijo.",
    },
    unidad: {
      type: ["string", "null"],
      description: "Unidad de la cantidad (matas, quintales, litros, jornales...). null si no se dijo.",
    },
    jornales_usados: {
      type: ["number", "null"],
      description: "Número de jornaleros/jornales usados. null si no se dijo.",
    },
    insumos_usados: {
      type: "array",
      description: "Insumos aplicados que se mencionan explícitamente.",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          cantidad: { type: ["number", "null"] },
          unidad: { type: ["string", "null"] },
        },
        required: ["nombre", "cantidad", "unidad"],
      },
    },
    observaciones: {
      type: ["string", "null"],
      description: "Resumen breve de lo que contó, en sus palabras. null si no hay nada relevante.",
    },
    problema_detectado: {
      type: "boolean",
      description: "true si describe un problema (plaga, enfermedad, daño, algo que salió mal).",
    },
    descripcion_problema: {
      type: ["string", "null"],
      description: "Qué problema, si lo hay. null si no.",
    },
    insumo_agotado: {
      type: "boolean",
      description: "true si dice que se le acabó o está por acabarse un insumo.",
    },
    confianza: {
      type: "number",
      description: "0 a 1: qué tan seguro estás de la extracción dado el audio.",
    },
  },
  required: [
    "cantidad",
    "unidad",
    "jornales_usados",
    "insumos_usados",
    "observaciones",
    "problema_detectado",
    "descripcion_problema",
    "insumo_agotado",
    "confianza",
  ],
};

const SISTEMA = `Sos un asistente que estructura lo que dijo un trabajador de campo de una finca de cardamomo orgánico en El Salvador/Guatemala. El habla es natural, campesina, con modismos.

Tu único trabajo es EXTRAER lo que la persona DIJO y ponerlo en el esquema de la herramienta. Reglas absolutas:
- NO inventes datos. Si algo no se dijo, el campo va null.
- NO completes ni supongas cantidades, unidades ni insumos.
- Si no entendés bien o el audio es ambiguo, bajá la 'confianza'.
- 'observaciones' es un resumen fiel, no una interpretación.
- Respondé SIEMPRE llamando a la herramienta 'registrar_extraccion'.`;

/**
 * Extrae los campos estructurados de una transcripción. Devuelve el objeto
 * validado. Lanza si falta la API key o si la respuesta no cumple el esquema.
 */
export async function extraerDeTranscripcion(
  transcripcion: string,
  contexto?: { area?: string | null; actividad?: string | null },
): Promise<ExtraccionClaude> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });

  const ctx = contexto
    ? `\n\nContexto (no lo uses para inventar): área="${contexto.area ?? "?"}", actividad="${contexto.actividad ?? "?"}".`
    : "";

  const resp = await client.messages.create({
    model: MODELO_EXTRACCION,
    max_tokens: 1024,
    system: SISTEMA,
    tools: [
      {
        name: "registrar_extraccion",
        description:
          "Registra los datos estructurados extraídos de lo que dijo el trabajador.",
        input_schema: inputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "registrar_extraccion" },
    messages: [
      {
        role: "user",
        content: `Transcripción del audio:\n"""${transcripcion}"""${ctx}`,
      },
    ],
  });

  const bloque = resp.content.find((b) => b.type === "tool_use");
  if (!bloque || bloque.type !== "tool_use") {
    throw new Error("Claude no devolvió la herramienta esperada");
  }
  return esquema.parse(bloque.input);
}
