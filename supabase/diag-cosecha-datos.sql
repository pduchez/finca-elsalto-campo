-- Diagnóstico de solo lectura: ¿qué datos de cosecha llegaron a la base?
\echo '===== CONTEOS ====='
select (select count(*) from cosecha_cortes) cortes,
       (select count(*) from cosecha_lotes) lotes,
       (select count(*) from cosecha_pesajes) pesajes;
\echo '===== CORTES ====='
select c.fecha, a.nombre area, c.usuario, (c.lote_id is not null) en_lote, c.creado_en, c.sincronizado_en
from cosecha_cortes c left join areas a on a.id=c.area_id order by c.creado_en desc limit 20;
\echo '===== PESAJES ====='
select destino, bruto_lb, tara_lb, neto_lb, leido_por, confianza, requiere_revision, (foto is not null) con_foto, creado_en
from cosecha_pesajes order by creado_en desc limit 30;
\echo '===== LOTES ====='
select fecha_inicio, fecha_fin, horas_secado, propano_cantidad, combustible_cantidad, horas_hombre, creado_en
from cosecha_lotes order by creado_en desc limit 10;
\echo '===== REGISTROS por voz con actividad corte (ultimos 15 dias) ====='
select r.fecha, a.nombre area, r.cantidad, r.unidad, r.usuario
from registros r join actividades ac on ac.id=r.actividad_id left join areas a on a.id=r.area_id
where ac.codigo='corte' and r.fecha >= current_date - 15 order by r.creado_en desc limit 10;
