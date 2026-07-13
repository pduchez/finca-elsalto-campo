import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el servidor con service role.
 * Se usa SOLO en endpoints server-side (sincronización, upserts idempotentes,
 * Storage). NUNCA se importa desde componentes de cliente.
 */
export function crearClienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
