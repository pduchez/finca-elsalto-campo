import type { Rol } from "./token";

/**
 * Usuarios iniciales del sistema. La contraseña inicial de todos es "password"
 * y el sistema exige cambiarla en el primer ingreso (debe_cambiar_password).
 * En producción los datos viven en la tabla `usuarios` de Supabase; esta lista
 * es la referencia (y el respaldo para modo demo sin backend).
 */
export interface UsuarioSemilla {
  username: string;
  nombre: string;
  rol: Rol;
}

export const USUARIOS_INICIALES: UsuarioSemilla[] = [
  { username: "Director1", nombre: "Director 1", rol: "director" },
  { username: "Director2", nombre: "Director 2", rol: "director" },
  { username: "Supervisor1", nombre: "Emerson", rol: "supervisor" },
  { username: "Administrativo1", nombre: "Administrativo 1", rol: "administrativo" },
];

export function buscarUsuarioSemilla(username: string): UsuarioSemilla | undefined {
  const u = username.trim().toLowerCase();
  return USUARIOS_INICIALES.find((x) => x.username.toLowerCase() === u);
}
