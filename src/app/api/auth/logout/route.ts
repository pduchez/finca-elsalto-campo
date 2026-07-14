import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Cierra la sesión: borra la cookie y manda al login. */
export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESION, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.set(COOKIE_SESION, "", { path: "/", maxAge: 0 });
  return res;
}
