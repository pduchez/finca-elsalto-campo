import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el navegador (anon key, RLS aplica).
 * Se usa en el panel del dueño y donde haga falta leer con sesión de usuario.
 * La captura de campo NO depende de esto: primero va a IndexedDB (Paso 3).
 */
export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, anonKey);
}
