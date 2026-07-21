import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { firmarToken, type Rol } from "@/lib/auth/token";
import { COOKIE_SESION, COOKIE_OPTS } from "@/lib/auth/session";
import { buscarUsuarioSemilla } from "@/lib/auth/roster";

export const runtime = "nodejs";

function configurado(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Inicia sesión con usuario y contraseña. Emite una cookie de sesión firmada,
 * permanente (no caduca). Si el usuario debe cambiar su contraseña, se indica
 * en la respuesta y en el propio token (para forzar el cambio en el ingreso).
 */
export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  const username = (body.username ?? "").trim();
  // Recortamos espacios que el teclado del celular suele agregar al inicio/fin.
  const password = (body.password ?? "").trim();
  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Escribí usuario y contraseña." },
      { status: 400 },
    );
  }

  let usuario:
    | { username: string; nombre: string; rol: Rol; cambiar: boolean }
    | null = null;

  if (configurado()) {
    const { crearClienteServicio } = await import("@/lib/supabase/server");
    const supa = crearClienteServicio();
    const { data, error } = await supa
      .from("usuarios")
      .select("username, nombre, rol, password_hash, debe_cambiar_password, activo")
      .ilike("username", username)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
    }
    if (!data || !data.activo || !verifyPassword(password, data.password_hash)) {
      return NextResponse.json(
        { ok: false, error: "Usuario o contraseña incorrectos." },
        { status: 401 },
      );
    }
    usuario = {
      username: data.username,
      nombre: data.nombre ?? data.username,
      rol: data.rol as Rol,
      cambiar: !!data.debe_cambiar_password,
    };
  } else {
    // Modo demo (sin backend): la contraseña inicial "password" abre la sesión.
    const semilla = buscarUsuarioSemilla(username);
    if (!semilla || password !== "password") {
      return NextResponse.json(
        { ok: false, error: "Usuario o contraseña incorrectos." },
        { status: 401 },
      );
    }
    usuario = { ...semilla, cambiar: true };
  }

  const token = await firmarToken({
    u: usuario.username,
    r: usuario.rol,
    n: usuario.nombre,
    cambiar: usuario.cambiar,
    iat: Date.now(),
  });

  const res = NextResponse.json({
    ok: true,
    cambiar: usuario.cambiar,
    rol: usuario.rol,
    nombre: usuario.nombre,
  });
  res.cookies.set(COOKIE_SESION, token, COOKIE_OPTS);
  return res;
}
