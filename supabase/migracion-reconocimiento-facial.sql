-- =====================================================================
-- Finca El Salto — Migración: reconocimiento facial en asistencia
-- Correr UNA vez en el SQL Editor de Supabase. Idempotente.
-- =====================================================================

-- Descriptor biométrico del colaborador (128 números; NO es la foto y no se
-- puede reconstruir la cara desde él). Se usa para verificar la asistencia.
alter table trabajadores add column if not exists face_descriptor jsonb;

-- Marca de verificación en la asistencia.
alter table asistencia add column if not exists verificado_rostro boolean default false;
alter table asistencia add column if not exists similitud numeric; -- 0–100% de parecido
