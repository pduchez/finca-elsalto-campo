"use client";

/**
 * Reconocimiento facial 100% en el dispositivo (offline), con @vladmandic/face-api
 * (TensorFlow.js). Los modelos se sirven desde /models (mismo origen) y quedan
 * cacheados por el Service Worker tras el primer uso con señal.
 *
 * Privacidad: NUNCA se sube la cara para reconocer. Se guarda solo un "descriptor"
 * (128 números) que representa el rostro y NO permite reconstruir la foto. La
 * foto de evidencia se guarda aparte, como hasta ahora.
 *
 * Es a prueba de fallos: si el modelo no carga o no hay rostro, devuelve null y
 * la asistencia se puede registrar igual (queda como "no verificada").
 */

type FaceApi = typeof import("@vladmandic/face-api");

let mod: FaceApi | null = null;
let cargaModelos: Promise<boolean> | null = null;
let listo = false;

/** Distancia euclidiana máxima para considerar que es la misma persona. */
export const UMBRAL_ROSTRO = 0.55;

async function api(): Promise<FaceApi> {
  if (!mod) mod = await import("@vladmandic/face-api");
  return mod;
}

/** Carga los modelos una sola vez. Devuelve false si no se pudieron cargar. */
export async function prepararReconocimiento(): Promise<boolean> {
  if (listo) return true;
  if (!cargaModelos) {
    cargaModelos = (async () => {
      try {
        const f = await api();
        await Promise.all([
          f.nets.tinyFaceDetector.loadFromUri("/models"),
          f.nets.faceLandmark68Net.loadFromUri("/models"),
          f.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        listo = true;
        return true;
      } catch {
        cargaModelos = null; // permitir reintento
        return false;
      }
    })();
  }
  return cargaModelos;
}

export function reconocimientoListo(): boolean {
  return listo;
}

async function blobAImagen(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("no img"));
      img.src = url;
    });
    return img;
  } finally {
    // La imagen ya está decodificada; se puede revocar.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Extrae el descriptor facial (128 números) de una foto. Devuelve null si no se
 * detecta un rostro o si el modelo no está disponible.
 */
export async function descriptorDeBlob(blob: Blob): Promise<number[] | null> {
  const ok = await prepararReconocimiento();
  if (!ok) return null;
  try {
    const f = await api();
    const img = await blobAImagen(blob);
    const det = await f
      .detectSingleFace(img, new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!det) return null;
    return Array.from(det.descriptor);
  } catch {
    return null;
  }
}

export function distanciaRostro(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Compara un descriptor contra el de referencia de una persona. */
export function coincide(
  descriptor: number[],
  referencia: number[],
): { ok: boolean; distancia: number } {
  const distancia = distanciaRostro(descriptor, referencia);
  return { ok: distancia <= UMBRAL_ROSTRO, distancia };
}

/** Similitud 0–100% derivada de la distancia (para mostrar de forma amigable). */
export function similitudPct(distancia: number): number {
  const s = Math.max(0, 1 - distancia / (UMBRAL_ROSTRO * 2));
  return Math.round(s * 100);
}

/**
 * Identifica el mejor candidato entre los colaboradores con rostro registrado.
 * Devuelve null si nadie queda bajo el umbral.
 */
export function identificar(
  descriptor: number[],
  candidatos: { id: string; nombre: string; descriptor: number[] }[],
): { id: string; nombre: string; distancia: number } | null {
  let mejor: { id: string; nombre: string; distancia: number } | null = null;
  for (const c of candidatos) {
    if (!c.descriptor || c.descriptor.length === 0) continue;
    const distancia = distanciaRostro(descriptor, c.descriptor);
    if (!mejor || distancia < mejor.distancia) {
      mejor = { id: c.id, nombre: c.nombre, distancia };
    }
  }
  return mejor && mejor.distancia <= UMBRAL_ROSTRO ? mejor : null;
}
