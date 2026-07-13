import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finca El Salto — Campo",
  description:
    "Registro de campo de la finca de cardamomo orgánico El Salto. Funciona sin señal.",
  manifest: "/manifest.webmanifest",
  applicationName: "Finca El Salto",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finca El Salto",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b4d1e",
  width: "device-width",
  initialScale: 1,
  // Permitimos zoom por accesibilidad; el layout ya es grande de por sí.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-SV">
      <body>{children}</body>
    </html>
  );
}
