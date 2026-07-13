"use client";

/**
 * Utilidades de medios pensadas para un Android de gama baja:
 * comprimir fotos antes de guardarlas y elegir un formato de audio soportado.
 */

const MAX_ANCHO = 1200;
const CALIDAD = 0.7;

/** Comprime una foto (máx 1200px de ancho, calidad 0.7) y devuelve un Blob JPEG. */
export async function comprimirFoto(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_ANCHO / bitmap.width);
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", CALIDAD),
    );
    return blob ?? file;
  } catch {
    // Si algo falla, guardamos la original: nunca perdemos el dato.
    return file;
  }
}

/** Devuelve el primer mimeType de audio soportado (webm y, si no, mp4). */
export function mimeAudioSoportado(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidatos = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];
  for (const m of candidatos) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "audio/webm";
}

/** Crea una URL de objeto para previsualizar un Blob (recordá revocarla). */
export function urlDe(blob: Blob): string {
  return URL.createObjectURL(blob);
}
