import "server-only";

/**
 * Transcripción de audio con Groq (Whisper large-v3), API compatible con OpenAI.
 * Gratis dentro del plan de Groq; se activa con GROQ_API_KEY. Es el primer
 * eslabón de la cadena de voz: audio → texto (aquí) → extracción con Claude.
 *
 * Es a prueba de fallos: si falta la llave o Groq no responde, devuelve null y
 * el audio igual queda guardado en Storage (nunca se pierde el dato).
 */

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Whisper large-v3: mejor precisión en español. Se puede sobreescribir por env.
const MODELO = process.env.GROQ_MODELO_STT ?? "whisper-large-v3";

// Vocabulario propio de la finca para que Whisper escriba bien estos términos.
const VOCABULARIO =
  "Finca El Salto, cardamomo, bocashi, biol, bioles, foliar, quintal, quintales, " +
  "manzana, manzanas, mata, matas, jornal, jornales, destajo, limpias, sombra, " +
  "fitosanitario, cochinilla, trips, mancha, vivero, Los Gringos, La Vitrina, " +
  "El Coyol, Paniagua, El Amatón, El Vivero.";

/**
 * Devuelve la transcripción en español del audio, o null si no se pudo.
 * @param audio Blob/File del audio (webm/opus, mp4/m4a, mp3, ogg...).
 */
export async function transcribirAudio(
  audio: Blob,
  nombreArchivo = "audio.webm",
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const fd = new FormData();
  fd.append("file", audio, nombreArchivo);
  fd.append("model", MODELO);
  fd.append("language", "es");
  fd.append("response_format", "text");
  fd.append("temperature", "0");
  fd.append("prompt", VOCABULARIO);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!res.ok) return null;
    const texto = (await res.text()).trim();
    return texto.length > 0 ? texto : null;
  } catch {
    return null;
  }
}
