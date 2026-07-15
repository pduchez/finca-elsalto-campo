import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verificarToken, landingDeRol, COOKIE_SESION } from "@/lib/auth/token";

/**
 * Portero de la app: exige sesión para /campo, /panel y la raíz.
 * - Sin sesión → /login.
 * - Sesión con contraseña por cambiar → /cambiar-clave (hasta que la cambie).
 * - La raíz "/" reparte a cada rol a su pantalla.
 *
 * Corre en el runtime edge; la verificación del token usa Web Crypto (HMAC).
 * Nota: sin señal el Service Worker sirve las pantallas cacheadas y el middleware
 * no interviene, por eso la sesión permanente mantiene a Emerson dentro offline.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_SESION)?.value;
  const sesion = await verificarToken(token);

  const irA = (destino: string) => NextResponse.redirect(new URL(destino, req.url));

  if (pathname === "/") {
    if (!sesion) return irA("/login");
    if (sesion.cambiar) return irA("/cambiar-clave");
    return irA(landingDeRol(sesion.r));
  }

  if (!sesion) return irA("/login");
  if (sesion.cambiar && pathname !== "/cambiar-clave") return irA("/cambiar-clave");
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/director", "/campo/:path*", "/panel/:path*", "/cambiar-clave"],
};
