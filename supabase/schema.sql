-- =====================================================================
-- Finca El Salto — Esquema Postgres (Supabase)
-- Correr en el SQL editor de Supabase. Idempotente donde se puede.
-- =====================================================================

create extension if not exists "pgcrypto";

-- Áreas físicas de la finca
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  hectareas numeric,
  activa boolean default true
);

-- Catálogo de actividades
create table if not exists actividades (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  unidad_medida text,            -- 'matas','manzanas','quintales','jornales','litros'
  requiere_insumo boolean default false,
  orden int
);

-- Catálogo de insumos (bocashi, bioles, etc.)
create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text,                     -- 'bocashi' | 'biol' | 'otro'
  unidad text,                   -- 'quintal','litro','kg'
  subtipo text,                  -- para bioles: variante específica
  descripcion_uso text,          -- para qué se aplica (lo carga el dueño)
  activo boolean default true
);

-- Personal de campo
create table if not exists trabajadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text check (tipo in ('planilla','tarea','mixto')),
  activo boolean default true,
  face_descriptor jsonb,                   -- descriptor biométrico (128 números); no es la foto
  sincronizado_en timestamptz
);

-- REGISTRO CENTRAL: cada evento de campo
create table if not exists registros (
  id uuid primary key,                     -- uuid generado en el cliente (idempotencia)
  fecha date not null,
  creado_en timestamptz default now(),
  sincronizado_en timestamptz,
  area_id uuid references areas(id),
  actividad_id uuid references actividades(id),
  usuario text not null,                   -- 'emerson'
  -- Captura cruda
  audio_url text,
  audio_transcripcion text,
  fotos jsonb default '[]',
  latitud numeric, longitud numeric, precision_gps numeric,
  -- Campos estructurados por Claude
  cantidad numeric,
  unidad text,
  jornales_usados numeric,
  observaciones text,
  problema_detectado boolean default false,
  descripcion_problema text,
  insumo_agotado boolean default false,
  -- Control de calidad de la extracción
  extraccion_confianza numeric,
  requiere_revision boolean default false,
  procesado boolean default false,
  raw_json jsonb
);
create index if not exists idx_registros_fecha on registros(fecha);
create index if not exists idx_registros_area on registros(area_id);
create index if not exists idx_registros_revision on registros(requiere_revision) where requiere_revision;

-- Ficha del área: linderos GPS, tamaño calculado, topografía y siembra.
-- La carga Emerson desde el campo (una fila por área).
create table if not exists areas_detalle (
  area_id uuid primary key references areas(id) on delete cascade,
  vertices jsonb default '[]',            -- [{orden,latitud,longitud,altitud,precision_gps,tipo,capturado_en}]
  area_m2 numeric,
  area_manzanas numeric,
  area_hectareas numeric,
  perimetro_m numeric,
  centro_lat numeric, centro_lon numeric,
  topografia jsonb,                       -- {clasificacion, alt_min, alt_max}
  manzanas_sembradas numeric,
  variedad text,
  anio_siembra int,
  densidad_matas_mz numeric,
  matas_estimadas numeric,
  meta_produccion_qq numeric,             -- meta de quintales para el área
  num_fotos int default 0,                -- cantidad de fotos de referencia
  fotos jsonb default '[]',               -- rutas de las fotos en Storage
  notas text,
  actualizado_en timestamptz,
  sincronizado_en timestamptz
);

-- Consumo de insumos por registro
create table if not exists consumos (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid references registros(id) on delete cascade,
  insumo_id uuid references insumos(id),
  cantidad numeric,
  unidad text
);

-- MODELO 1 DE JORNAL: asistencia diaria (planilla)
create table if not exists asistencia (
  id uuid primary key,                     -- uuid del cliente
  fecha date not null,
  trabajador_id uuid references trabajadores(id),
  area_id uuid references areas(id),
  presente boolean not null,
  -- Check-in verificado: foto geoposicionada + hora (planillas fidedignas)
  hora timestamptz,                        -- fecha y hora de la marca/foto
  latitud numeric, longitud numeric, precision_gps numeric,
  evidencia_foto boolean default false,
  verificado_rostro boolean default false, -- true si el rostro coincidió con el registrado
  similitud numeric,                       -- 0–100% de parecido con el rostro registrado
  foto_url text,                           -- archivo en Storage (se sube aparte)
  registrado_por text,
  sincronizado_en timestamptz,
  unique (fecha, trabajador_id)
);

-- MODELO 2 DE JORNAL: trabajo por tarea (destajo)
create table if not exists tareas_destajo (
  id uuid primary key,                     -- uuid del cliente (una línea por colaborador)
  grupo_id uuid,                           -- agrupa las líneas de una misma tarea
  fecha date not null,
  area_id uuid references areas(id),
  actividad_id uuid references actividades(id),
  descripcion_unidad text not null,
  unidad text,                             -- unidad de medida (matas, quintales, litros...)
  precio_pactado numeric not null,
  unidades_ejecutadas numeric not null,    -- unidades de ESTE colaborador (destajo individual)
  trabajador_id uuid references trabajadores(id),
  total_calculado numeric generated always as (precio_pactado * unidades_ejecutadas) stored,
  sincronizado_en timestamptz
);

-- Vivero (operación propia dentro de la finca)
create table if not exists vivero_registros (
  id uuid primary key,
  fecha date not null,
  actividad text,                          -- 'siembra','riego','deshije','trasplante','sanidad'
  cantidad_plantas numeric,
  audio_url text, audio_transcripcion text, fotos jsonb default '[]',
  observaciones text,
  jornales_usados numeric,
  sincronizado_en timestamptz
);

-- Protocolos técnicos (capacitación contextual)
create table if not exists protocolos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  actividad_codigo text,                   -- se dispara cuando registra esta actividad
  disparador_keywords text[],              -- ej: {'cochinilla','trips','mancha'}
  contenido_md text not null,
  orden int
);

-- Registro de consultas de protocolo (curva de aprendizaje de Emerson)
create table if not exists consultas_protocolo (
  id uuid primary key default gen_random_uuid(),
  protocolo_id uuid references protocolos(id),
  consultado_en timestamptz default now(),
  usuario text,
  sincronizado_en timestamptz
);

-- Plan del día (lo genera el sistema, lo consume Emerson offline)
create table if not exists plan_dia (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  area_id uuid references areas(id),
  actividad_id uuid references actividades(id),
  nota text,
  completado boolean default false,
  unique (fecha, area_id, actividad_id)
);

-- Usuarios del sistema (login con usuario y contraseña). Los hashes se guardan
-- con scrypt. El acceso es SOLO vía service role desde los endpoints server; por
-- eso RLS queda habilitado SIN políticas de lectura (la anon key no ve nada).
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

-- =====================================================================
-- Storage: bucket para audio y fotos (crear en el panel de Supabase o aquí)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('capturas', 'capturas', false)
on conflict (id) do nothing;

-- =====================================================================
-- RLS: la escritura pasa SIEMPRE por el endpoint del servidor (service role,
-- que ignora RLS). Habilitamos RLS y dejamos lectura autenticada para el panel.
-- Ajustar políticas según los roles reales antes de producción.
-- =====================================================================
alter table registros        enable row level security;
alter table asistencia       enable row level security;
alter table tareas_destajo   enable row level security;
alter table consultas_protocolo enable row level security;
alter table vivero_registros enable row level security;
alter table areas_detalle    enable row level security;
alter table usuarios         enable row level security; -- sin políticas: solo service role

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'lectura_autenticada_registros') then
    create policy lectura_autenticada_registros on registros
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'lectura_autenticada_asistencia') then
    create policy lectura_autenticada_asistencia on asistencia
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'lectura_autenticada_destajo') then
    create policy lectura_autenticada_destajo on tareas_destajo
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'lectura_autenticada_areas_detalle') then
    create policy lectura_autenticada_areas_detalle on areas_detalle
      for select to authenticated using (true);
  end if;
end $$;
