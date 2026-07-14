import "server-only";
import { cookies } from "next/headers";
import { verificarToken, COOKIE_SESION, type SesionPayload } from "./token";

export { COOKIE_SESION };

/** Opciones de la cookie: httpOnly, permanente (10 años ≈ "nunca expira"). */
export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365 * 10, // 10 años
};

/** Lee y valida la sesión actual desde la cookie (en rutas/componentes server). */
export async function sesionActual(): Promise<SesionPayload | null> {
  const token = cookies().get(COOKIE_SESION)?.value;
  return verificarToken(token);
}
