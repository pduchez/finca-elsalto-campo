import withPWAInit from "@ducanh2912/next-pwa";

/**
 * PWA offline-first.
 * - El Service Worker se genera en build (deshabilitado en `next dev` para no
 *   estorbar el desarrollo).
 * - `cacheOnFrontEndNav` + `aggressiveFrontEndNavCaching`: navegar entre
 *   pantallas funciona sin señal.
 * - Runtime caching pensado para el Android de gama baja de Emerson: la app
 *   (shell), el plan del día y los protocolos deben quedar disponibles offline.
 * - Al publicar una versión nueva, el Service Worker toma el control de una
 *   (`skipWaiting` + `clientsClaim`) y borra la caché vieja
 *   (`cleanupOutdatedCaches`), para que un teléfono con la versión anterior
 *   guardada no quede en pantalla en blanco al actualizar.
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
