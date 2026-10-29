-- Validación de solo-prueba del esquema de cosecha (NO deja rastro: rollback).
-- Inserta un lote, un corte y dos pesajes con la misma forma que escribe el
-- servidor (/api/sync aFila), comprueba el neto generado y el rendimiento, y
-- revierte todo. Si algo no calza (columna, FK, columna generada), psql corta.
begin;

insert into cosecha_lotes (id, fecha_inicio, horas_secado, propano_cantidad, propano_unidad, combustible_cantidad, combustible_unidad, horas_hombre, usuario)
values ('bbbbbbb1-0000-4000-8000-000000000001', current_date, 20, 100, 'libras', 5, 'galones', 8, 'test');

insert into cosecha_cortes (id, fecha, area_id, usuario, lote_id)
values ('bbbbbbb2-0000-4000-8000-000000000001', current_date, null, 'test', 'bbbbbbb1-0000-4000-8000-000000000001');

-- Verde con peso tecleado (bruto 50, tara 2 → neto 48).
insert into cosecha_pesajes (id, destino, corte_id, bruto_lb, tara_lb, leido_por)
values ('bbbbbbb3-0000-4000-8000-000000000001', 'verde', 'bbbbbbb2-0000-4000-8000-000000000001', 50, 2, 'manual');

-- Pergamino (salida del lote): bruto 12.
insert into cosecha_pesajes (id, destino, lote_id, bruto_lb, leido_por)
values ('bbbbbbb3-0000-4000-8000-000000000002', 'pergamino', 'bbbbbbb1-0000-4000-8000-000000000001', 12, 'manual');

\echo '===== neto generado (espera 48) ====='
select destino, bruto_lb, tara_lb, neto_lb
from cosecha_pesajes
where id in ('bbbbbbb3-0000-4000-8000-000000000001','bbbbbbb3-0000-4000-8000-000000000002')
order by destino;

\echo '===== rendimiento del lote (pergamino/verde) ====='
select
  (select sum(neto_lb) from cosecha_pesajes where destino='pergamino' and lote_id='bbbbbbb1-0000-4000-8000-000000000001') as pergamino_lb,
  (select sum(p.neto_lb) from cosecha_pesajes p join cosecha_cortes c on c.id=p.corte_id
     where p.destino='verde' and c.lote_id='bbbbbbb1-0000-4000-8000-000000000001') as verde_lb;

rollback;
\echo '===== rollback hecho: no quedó ningún dato de prueba ====='
