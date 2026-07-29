-- Diagnóstico de solo lectura: ¿llegaron los datos del campo a Supabase?
\echo '===== CONTEO GENERAL ====='
select
  (select count(*) from registros)        as registros,
  (select count(*) from asistencia)        as asistencia,
  (select count(*) from tareas_destajo)    as destajo,
  (select count(*) from areas)             as areas,
  (select count(*) from actividades)       as actividades;

\echo '===== REGISTROS: rango de fechas y frescura ====='
select
  min(fecha) as primera,
  max(fecha) as ultima,
  count(*) filter (where fecha >= current_date - 30) as ultimos_30d,
  count(*) filter (where fecha >= current_date - 90) as ultimos_90d,
  count(*) filter (where sincronizado_en is not null) as sincronizados
from registros;

\echo '===== ULTIMOS 8 REGISTROS ====='
select fecha, usuario, area_id, actividad_id,
       (cantidad is not null) as tiene_cantidad,
       (fotos is not null and fotos <> '[]'::jsonb) as tiene_foto,
       creado_en
from registros
order by creado_en desc nulls last
limit 8;

\echo '===== AREAS: manzanas sembradas / meta (para campañas y cosecha) ====='
select count(*) as areas_con_manzanas,
       count(*) filter (where meta_produccion_qq is not null) as con_meta
from areas_detalle where manzanas_sembradas is not null;

\echo '===== ACTIVIDADES: codigos presentes ====='
select codigo, count(r.id) as registros
from actividades a left join registros r on r.actividad_id = a.id
group by codigo order by registros desc;
