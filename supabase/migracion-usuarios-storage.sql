-- =====================================================================
-- Finca El Salto — Migración: usuarios/contraseñas + fotos de área en Storage
-- Correr UNA vez en el SQL Editor de Supabase (sobre la base ya creada).
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- =====================================================================

create extension if not exists "pgcrypto";

-- 1) Fotos de referencia del área: guardamos las rutas de Storage.
alter table areas_detalle add column if not exists fotos jsonb default '[]';

-- 2) Tabla de usuarios (login). Los hashes son scrypt. El acceso es SOLO por
--    service role desde el servidor; RLS habilitado sin políticas de lectura.
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  nombre text,
  rol text check (rol in ('director','supervisor','administrativo')) not null,
  password_hash text not null,
  debe_cambiar_password boolean default true,
  activo boolean default true,
  creado_en timestamptz default now(),
  actualizado_en timestamptz
);
alter table usuarios enable row level security;

-- 3) Usuarios iniciales. Contraseña inicial de TODOS: "password".
--    El sistema exige cambiarla en el primer ingreso.
insert into usuarios (username, nombre, rol, password_hash, debe_cambiar_password) values
  ('Director1', 'Director 1', 'director',
   'scrypt:0df23e0c8bd8b21de15787c9901837f2:6eeacc8bcf44201140d8caf2b148a371eecdf5c0bef4e087971f9172a17f00898ffe31b1b987be17520093537c0f92301125290a04b18dfa242df6d0ad045ef2', true),
  ('Director2', 'Director 2', 'director',
   'scrypt:0df23e0c8bd8b21de15787c9901837f2:6eeacc8bcf44201140d8caf2b148a371eecdf5c0bef4e087971f9172a17f00898ffe31b1b987be17520093537c0f92301125290a04b18dfa242df6d0ad045ef2', true),
  ('Supervisor1', 'Emerson', 'supervisor',
   'scrypt:0df23e0c8bd8b21de15787c9901837f2:6eeacc8bcf44201140d8caf2b148a371eecdf5c0bef4e087971f9172a17f00898ffe31b1b987be17520093537c0f92301125290a04b18dfa242df6d0ad045ef2', true),
  ('Administrativo1', 'Administrativo 1', 'administrativo',
   'scrypt:0df23e0c8bd8b21de15787c9901837f2:6eeacc8bcf44201140d8caf2b148a371eecdf5c0bef4e087971f9172a17f00898ffe31b1b987be17520093537c0f92301125290a04b18dfa242df6d0ad045ef2', true)
on conflict (username) do nothing;
