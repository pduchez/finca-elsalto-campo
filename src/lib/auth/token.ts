/**
 * Token de sesión firmado (HMAC-SHA256) con Web Crypto.
 * Funciona igual en el runtime `edge` (middleware) y en `nodejs` (rutas API),
 * porque usa el `crypto.subtle` global disponible en ambos.
 *
 * El token NO caduca (sesión permanente): no lleva expiración. La validez la
 * da únicamente la firma. Formato: `<payloadB64Url>.<firmaB64Url>`.
 */

export interface SesionPayload {
  u: string; // username
  r: Rol; // rol
  n: string; // nombre para mostrar
  cambiar: boolean; // debe cambiar contraseña antes de entrar
  iat: number; // emitido en (epoch ms)
}

export type Rol = "director" | "supervisor" | "administrativo";

/** Nombre de la cookie de sesión (definido aquí para poder usarlo en el edge). */
export const COOKIE_SESION = "finca_sesion";

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Secreto de firma. Usa AUTH_SECRET; si no, cae al service role (ya secreto). */
export function authSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "finca-el-salto-dev-inseguro"
  );
}

/** A dónde entra cada rol después de iniciar sesión. */
export function landingDeRol(rol: Rol | string): string {
  if (rol === "supervisor") return "/campo";
  if (rol === "director") return "/director"; // pantalla con los dos accesos
  return "/panel";
}

function bytesABinario(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}
function binarioABytes(bin: string): Uint8Array {
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function aB64Url(bin: string): string {
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function deB64Url(b64: string): string {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  return atob(s);
}

async function claveHmac(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Firma un payload y devuelve el token. */
export async function firmarToken(
  payload: SesionPayload,
  secret = authSecret(),
): Promise<string> {
  const p = aB64Url(bytesABinario(enc.encode(JSON.stringify(payload))));
  const key = await claveHmac(secret);
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(p)));
  return `${p}.${aB64Url(bytesABinario(firma))}`;
}

/** Verifica el token; devuelve el payload o null si la firma no cuadra. */
export async function verificarToken(
  token: string | undefined | null,
  secret = authSecret(),
): Promise<SesionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  try {
    const key = await claveHmac(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      binarioABytes(deB64Url(s)) as unknown as BufferSource,
      enc.encode(p),
    );
    if (!ok) return null;
    const json = dec.decode(binarioABytes(deB64Url(p)));
    return JSON.parse(json) as SesionPayload;
  } catch {
    return null;
  }
}
