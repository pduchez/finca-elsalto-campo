import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { firmarToken, verificarToken, type Rol } from "@/lib/auth/token";
import { COOKIE_SESION, COOKIE_OPTS } from "@/lib/auth/session";

export const runtime = "nodejs";

function configurado(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Cambia la contraseña del usuario en sesión (ingreso inicial u ordinario).
 * Verifica la contraseña actual, guarda la nueva y baja la bandera
 * debe_cambiar_password. Reemite la cookie sin la marca de "cambiar".
 */
export async function POST(req: Request) {
  const token = cookies().get(COOKIE_SESION)?.value;
  const sesion = await verificarToken(token);
  if (!sesion) {
    return NextResponse.json({ ok: false, error: "Sesión no válida" }, { status: 401 });
  }

  let body: { actual?: string; nueva?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  const actual = body.actual ?? "";
  const nueva = body.nueva ?? "";
  if (nueva.length < 6) {
    return NextResponse.json(
      { ok: false, error: "La nueva contraseña debe tener al menos 6 caracteres." },
      { status: 400 },
    );
  }
  if (nueva === actual) {
    return NextResponse.json(
      { ok: false, error: "La nueva contraseña debe ser distinta de la actual." },
      { status: 400 },
    );
  }

  let rol: Rol = sesion.r;
  if (configurado()) {
    const { crearClienteServicio } = await import("@/lib/supabase/server");
    const supa = crearClienteServicio();
    const { data, error } = await supa
      .from("usuarios")
      .select("username, rol, password_hash, activo")
      .ilike("username", sesion.u)
      .maybeSingle();
    if (error || !data || !data.activo) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
    }
    if (!verifyPassword(actual, data.password_hash)) {
      return NextResponse.json(
        { ok: false, error: "La contraseña actual no es correcta." },
        { status: 401 },
      );
    }
    rol = data.rol as Rol;
    const { error: upErr } = await supa
      .from("usuarios")
      .update({
        password_hash: hashPassword(nueva),
        debe_cambiar_password: false,
        actualizado_en: new Date().toISOString(),
      })
      .ilike("username", sesion.u);
    if (upErr) {
      return NextResponse.json({ ok: false, error: "No se pudo guardar" }, { status: 500 });
    }
  } else {
    // Modo demo: la contraseña actual debe ser la inicial.
    if (actual !== "password") {
      return NextResponse.json(
        { ok: false, error: "La contraseña actual no es correcta." },
        { status: 401 },
      );
    }
  }

  const nuevoToken = await firmarToken({
    u: sesion.u,
    r: rol,
    n: sesion.n,
    cambiar: false,
    iat: Date.now(),
  });
  const res = NextResponse.json({ ok: true, rol });
  res.cookies.set(COOKIE_SESION, nuevoToken, COOKIE_OPTS);
  return res;
}
