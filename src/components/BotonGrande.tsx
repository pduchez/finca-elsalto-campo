import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variante?: "primario" | "secundario" | "listo" | "alerta";
  className?: string;
};

const CLASES: Record<NonNullable<Props["variante"]>, string> = {
  primario: "boton-primario",
  secundario: "boton-secundario",
  listo: "boton-listo",
  alerta: "boton-alerta",
};

/**
 * Botón grande, alto contraste, pensado para uso con manos sucias bajo sol.
 * Sirve como enlace (href) o como acción (onClick).
 */
export default function BotonGrande({
  children,
  href,
  onClick,
  variante = "primario",
  className = "",
}: Props) {
  const clases = `${CLASES[variante]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={clases}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={clases}>
      {children}
    </button>
  );
}
