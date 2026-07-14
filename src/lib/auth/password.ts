import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Hash de contraseñas con scrypt (sin dependencias externas). Solo servidor.
 * Formato almacenado: `scrypt:<saltHex>:<derivadoHex>`.
 */

const KEYLEN = 64;

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const d = scryptSync(pw, salt, KEYLEN).toString("hex");
  return `scrypt:${salt}:${d}`;
}

export function verifyPassword(pw: string, almacenado: string): boolean {
  const partes = (almacenado ?? "").split(":");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;
  const [, salt, d] = partes;
  try {
    const calc = scryptSync(pw, salt, KEYLEN);
    const esperado = Buffer.from(d, "hex");
    return calc.length === esperado.length && timingSafeEqual(calc, esperado);
  } catch {
    return false;
  }
}
