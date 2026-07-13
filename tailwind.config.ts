import type { Config } from "tailwindcss";

/**
 * Sistema de diseño para uso en campo bajo sol directo, con manos sucias y en
 * un Android de gama baja:
 * - Alto contraste (verde oscuro sobre crema, texto casi negro).
 * - Touch targets grandes (ver .toque-* en globals.css).
 * - Tipografía grande por defecto.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Verde cardamomo, alto contraste
        finca: {
          50: "#f0f7f0",
          100: "#dcecdc",
          500: "#2f7d32",
          600: "#256628",
          700: "#1b4d1e",
          900: "#0f2b11",
        },
        tierra: "#5c4326",
        crema: "#f7f5ee",
        // Estados
        alerta: "#c62828",
        pendiente: "#b45309",
        listo: "#256628",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        // Escala grande, legible bajo sol
        base: ["1.125rem", { lineHeight: "1.6rem" }],
        lg: ["1.375rem", { lineHeight: "1.9rem" }],
        xl: ["1.75rem", { lineHeight: "2.1rem" }],
        "2xl": ["2.25rem", { lineHeight: "2.6rem" }],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
