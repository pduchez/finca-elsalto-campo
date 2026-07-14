"use client";

/**
 * Captura el evento `beforeinstallprompt` de Chrome/Android lo antes posible
 * (a nivel de módulo, no dentro de un componente) para no perderlo, y expone
 * una API sencilla para lanzar la instalación desde un botón propio.
 *
 * Así Emerson no tiene que buscar el menú "⋮ → Instalar app" del navegador:
 * ve un botón grande dentro de la app.
 */

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let diferido: PromptEvent | null = null;
const suscriptores = new Set<() => void>();

function avisar() {
  suscriptores.forEach((f) => f());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // evitamos el mini-infobar; usamos nuestro botón
    diferido = e as PromptEvent;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    diferido = null;
    avisar();
  });
}

/** ¿Se puede lanzar la instalación nativa ahora mismo? */
export function puedeInstalar(): boolean {
  return diferido != null;
}

/** ¿La app ya corre instalada (modo standalone)? */
export function yaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS marca navigator.standalone
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone;
  return !!standalone || !!iosStandalone;
}

/** ¿Es un iPhone/iPad? (ahí no existe beforeinstallprompt: se instala a mano). */
export function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

/** Suscribe a cambios (evento disponible / instalada). Devuelve el des-suscriptor. */
export function alCambiar(f: () => void): () => void {
  suscriptores.add(f);
  return () => suscriptores.delete(f);
}

/** Lanza el diálogo nativo de instalación. Devuelve el resultado o null. */
export async function lanzarInstalacion(): Promise<"accepted" | "dismissed" | null> {
  if (!diferido) return null;
  await diferido.prompt();
  const { outcome } = await diferido.userChoice;
  diferido = null;
  avisar();
  return outcome;
}
