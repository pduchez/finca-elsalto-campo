-- =====================================================================
-- Finca El Salto — Módulo de Cosecha (Fase 1 + 2)
-- Corte en verde (libras, con pesajes y foto) → Secado/deshidratación
-- (horas, propano, combustible, horas hombre) → pergamino (libras).
-- Idempotente. Correr en el SQL editor de Supabase o por el robot migrate.yml.
-- =====================================================================

-- LOTE DE SECADO (deshidratación controlada). Toma cardamomo en verde de uno
-- o varios cortes (puede mezclar áreas) y produce pergamino.
create table if not exists cosecha_lotes (
  id uuid primary key,                         -- uuid del cliente (idempotencia)
  fecha_inicio date not null,
  fecha_fin date,
  horas_secado numeric,
  propano_cantidad numeric,
  propano_unidad text default 'libras',
  combustible_cantidad numeric,
  combustible_unidad text default 'galones',
  horas_hombre numeric,
  notas text,
  usuario text,
  creado_en timestamptz default now(),
  sincronizado_en timestamptz
);

-- CORTE en verde (cereza), por área. El total en libras = suma de sus pesajes.
create table if not exists cosecha_cortes (
  id uuid primary key,                         -- uuid del cliente
  fecha date not null,
  area_id uuid references areas(id),
  usuario text,
  lote_id uuid references cosecha_lotes(id) on delete set null,  -- a qué lote entró
  notas text,
  creado_en timestamptz default now(),
  sincronizado_en timestamptz
);

-- PESAJES (pesadas). Sirven para el verde (de un corte) y para el pergamino
-- (salida de un lote). El peso lo teclea la persona o lo lee Claude de la foto
-- de la báscula. El neto se calcula (bruto - tara).
create table if not exists cosecha_pesajes (
  id uuid primary key,                         -- uuid del cliente
  destino text not null check (destino in ('verde','pergamino')),
  corte_id uuid references cosecha_cortes(id) on delete cascade,
  lote_id uuid references cosecha_lotes(id) on delete cascade,
  bruto_lb numeric,                            -- puede llegar null y lo llena Claude
  tara_lb numeric default 0,
  neto_lb numeric generated always as (coalesce(bruto_lb,0) - coalesce(tara_lb,0)) stored,
  hora timestamptz,
  foto text,                                   -- ruta en Storage (bucket capturas)
  leido_por text default 'manual',             -- 'manual' | 'claude'
  confianza numeric,                           -- 0-1 si lo leyó Claude
  requiere_revision boolean default false,
  creado_en timestamptz default now(),
  sincronizado_en timestamptz
);

create index if not exists idx_cosecha_cortes_fecha on cosecha_cortes(fecha);
create index if not exists idx_cosecha_cortes_area on cosecha_cortes(area_id);
create index if not exists idx_cosecha_cortes_lote on cosecha_cortes(lote_id);
create index if not exists idx_cosecha_pesajes_corte on cosecha_pesajes(corte_id);
create index if not exists idx_cosecha_pesajes_lote on cosecha_pesajes(lote_id);
create index if not exists idx_cosecha_lotes_fecha on cosecha_lotes(fecha_inicio);

-- Insumos de proceso del secado (para costear). No rompe los insumos actuales.
insert into insumos (id, nombre, tipo, unidad, activo) values
  ('a4000000-0000-4000-8000-000000000010', 'Gas propano', 'otro', 'libras', true),
  ('a4000000-0000-4000-8000-000000000011', 'Combustible de motor', 'otro', 'galones', true)
on conflict (id) do nothing;

-- RLS: escritura solo por service role (ignora RLS); lectura autenticada para
-- el panel. Mismo patrón que el resto del esquema.
alter table cosecha_lotes   enable row level security;
alter table cosecha_cortes  enable row level security;
alter table cosecha_pesajes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'lectura_autenticada_cosecha_lotes') then
    create policy lectura_autenticada_cosecha_lotes on cosecha_lotes
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'lectura_autenticada_cosecha_cortes') then
    create policy lectura_autenticada_cosecha_cortes on cosecha_cortes
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'lectura_autenticada_cosecha_pesajes') then
    create policy lectura_autenticada_cosecha_pesajes on cosecha_pesajes
      for select to authenticated using (true);
  end if;
end $$;
