import { NextResponse } from "next/server";
import { sesionActual } from "@/lib/auth/session";
import { resolverRango } from "@/lib/panel/datos";
import { obtenerCosecha } from "@/lib/panel/cosecha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resultados de cosecha de TODA la finca (lo que registraron todos los
 * teléfonos y ya llegó a la base). Lo usa la pantalla "Ver resultados" de la
 * app de campo cuando hay señal. Solo para usuarios con sesión.
 * Rango por defecto: últimos 90 días (una temporada); acepta ?desde&hasta.
 */
export async function GET(req: Request) {
  const s = await sesionActual();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const hoy = new Date();
  const hace90 = new Date(hoy.getTime() - 90 * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const { desde, hasta } = resolverRango({
    desde: url.searchParams.get("desde") ?? iso(hace90),
    // +1 día: los cortes se fechan por el teléfono y pueden ir un día adelante en UTC.
    hasta: url.searchParams.get("hasta") ?? iso(new Date(hoy.getTime() + 86400000)),
  });

  const c = await obtenerCosecha(desde, hasta);
  return NextResponse.json({ ok: true, desde, hasta, ...c });
}
