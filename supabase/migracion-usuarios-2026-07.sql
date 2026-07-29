-- =====================================================================
-- Finca El Salto — Cambios de usuarios (julio 2026)
-- 1) Reset de contraseña de Director2 a "password" (exige cambiarla).
-- 2) Alta del usuario supervisor2 (Gerver) con contraseña "gerver123".
-- Idempotente: se puede correr de nuevo sin romper nada.
-- Los hashes son scrypt, mismo formato que usa el login.
-- =====================================================================

-- 1) Director2 -> "password", debe cambiarla al próximo ingreso.
update usuarios
set password_hash = 'scrypt:0df23e0c8bd8b21de15787c9901837f2:6eeacc8bcf44201140d8caf2b148a371eecdf5c0bef4e087971f9172a17f00898ffe31b1b987be17520093537c0f92301125290a04b18dfa242df6d0ad045ef2',
    debe_cambiar_password = true,
    actualizado_en = now()
where username = 'Director2';

-- 2) supervisor2 (Gerver) -> "gerver123". Usa esa clave directamente.
insert into usuarios (username, nombre, rol, password_hash, debe_cambiar_password, activo)
values (
  'supervisor2',
  'Gerver',
  'supervisor',
  'scrypt:51f51f1d8c6f4dcf4f899403008e0700:fc9f462bcc8fb6528f2e8bbf7cb25114c2ad0ec383359c26481e7ddbfdde1d1ebdf99b4cf419f3560f8669d17982fc3e0156a8fafe22d98d8c04915764faf184',
  false,
  true
)
on conflict (username) do update
set nombre = excluded.nombre,
    rol = excluded.rol,
    password_hash = excluded.password_hash,
    activo = true,
    actualizado_en = now();
