-- =====================================================================
-- Finca El Salto — Nuevas áreas (julio 2026)
-- Agrega Los Chapines, El Quemado y El Guachipilin, igual que las áreas
-- actuales. Mismos UUID fijos que el seed local (para que la sincronización
-- por uuid sea idempotente). No toca las áreas existentes.
-- =====================================================================

insert into areas (id, nombre, activa) values
  ('a1000000-0000-4000-8000-000000000007', 'Los Chapines', true),
  ('a1000000-0000-4000-8000-000000000008', 'El Quemado', true),
  ('a1000000-0000-4000-8000-000000000009', 'El Guachipilin', true)
on conflict (id) do nothing;
