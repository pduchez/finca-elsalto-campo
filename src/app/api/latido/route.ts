/**
 * Latido ("heartbeat") para mantener viva la base de Supabase.
 *
 * El plan gratuito de Supabase PAUSA el proyecto tras varios días sin actividad
 * y eso tumba la app. Esta ruta hace lecturas REALES (COUNT sobre tablas que de
 * verdad existen: registros y asistencia) para generar actividad en la base. Un
 * cron diario la llama. NO devuelve datos del negocio: solo { ok, ts }.
 *
 * Autorización:
 *  - Si CRON_SECRET está definido: se exige, por header
 *    "Authorization: Bearer <secreto>" (el que pone Vercel Cron), por
 *    "x-cron-secret: <secreto>" o por ?key=<secreto>.
 *  - Si CRON_SECRET NO está definido: la ruta queda abierta (para que funcione
 *    sin configurar nada; solo hace conteos, no expone nada ni cuesta).
 */
import { NextResponse } from "next/server";
import { crearClienteServicio } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // nunca cachear: cada llamada toca la base

function autorizado(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return true; // sin secreto configurado → ruta abierta
  const url = new URL(req.url);
  const bearer = req.headers.get("authorization") || "";
  if (bearer === `Bearer ${secret}`) return true; // Vercel Cron / curl
  if ((req.headers.get("x-cron-secret") || "") === secret) return true; // alterno
  if (url.searchParams.get("key") === secret) return true; // alterno
  return false;
}

async function handle(req: Request) {
  if (!autorizado(req)) {
    // Sin detalle: el diagnóstico va en otro lado.
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const supa = crearClienteServicio();
    // Lecturas REALES contra tablas reales (COUNT, sin traer filas ni datos).
    const [r1, r2] = await Promise.all([
      supa.from("registros").select("*", { count: "exact", head: true }),
      supa.from("asistencia").select("*", { count: "exact", head: true }),
    ]);
    if (r1.error || r2.error) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch {
    // Base inalcanzable/pausada o sin configurar: 503 sin detalle.
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

export const GET = handle;
export const POST = handle;
