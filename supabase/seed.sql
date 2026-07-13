-- =====================================================================
-- Finca El Salto — Datos semilla
-- UUID fijos: coinciden con el seed del cliente (src/lib/db/seed.ts) para que
-- la sincronización por uuid sea idempotente. Correr después de schema.sql.
-- =====================================================================

-- Áreas
insert into areas (id, nombre, activa) values
  ('a1000000-0000-4000-8000-000000000001', 'Los Gringos', true),
  ('a1000000-0000-4000-8000-000000000002', 'La Vitrina', true),
  ('a1000000-0000-4000-8000-000000000003', 'El Coyol', true),
  ('a1000000-0000-4000-8000-000000000004', 'Paniagua', true),
  ('a1000000-0000-4000-8000-000000000005', 'El Amatón', true),
  ('a1000000-0000-4000-8000-000000000006', 'El Vivero', true)
on conflict (id) do nothing;

-- Actividades
insert into actividades (id, codigo, nombre, unidad_medida, requiere_insumo, orden) values
  ('a2000000-0000-4000-8000-000000000001', 'limpias', 'Limpias', 'matas', false, 1),
  ('a2000000-0000-4000-8000-000000000002', 'sombra', 'Manejo de sombra', 'matas', false, 2),
  ('a2000000-0000-4000-8000-000000000003', 'bocashi', 'Fertilización Bocashi', 'matas', true, 3),
  ('a2000000-0000-4000-8000-000000000004', 'bioles', 'Fertilización Bioles (foliar)', 'litros', true, 4),
  ('a2000000-0000-4000-8000-000000000005', 'fitosanitario', 'Ronda de control fitosanitario', 'matas', false, 5),
  ('a2000000-0000-4000-8000-000000000006', 'corte', 'Corte de cardamomo', 'quintales', false, 6),
  ('a2000000-0000-4000-8000-000000000007', 'jornales', 'Control de jornales', 'jornales', false, 7),
  ('a2000000-0000-4000-8000-000000000008', 'vivero', 'Operación de vivero', 'plantas', false, 8)
on conflict (id) do nothing;

-- Insumos: solo Bocashi. Los bioles los carga el dueño desde el panel.
insert into insumos (id, nombre, tipo, unidad, activo) values
  ('a4000000-0000-4000-8000-000000000001', 'Bocashi', 'bocashi', 'quintal', true)
on conflict (id) do nothing;

-- Trabajadores de ejemplo (ajustar a los reales)
insert into trabajadores (id, nombre, tipo, activo) values
  ('a3000000-0000-4000-8000-000000000001', 'Santos Pérez', 'planilla', true),
  ('a3000000-0000-4000-8000-000000000002', 'Julio Ramírez', 'planilla', true),
  ('a3000000-0000-4000-8000-000000000003', 'María Chávez', 'planilla', true),
  ('a3000000-0000-4000-8000-000000000004', 'Rigoberto López', 'tarea', true),
  ('a3000000-0000-4000-8000-000000000005', 'Tránsito Hernández', 'mixto', true),
  ('a3000000-0000-4000-8000-000000000006', 'Óscar Menjívar', 'tarea', true)
on conflict (id) do nothing;

-- Protocolos (placeholder de contenido; disparadores reales). El dueño edita el
-- contenido_md desde Administración.
insert into protocolos (id, titulo, actividad_codigo, disparador_keywords, contenido_md, orden) values
  ('a5000000-0000-4000-8000-000000000001', 'Control fitosanitario: qué observar', 'fitosanitario',
   '{cochinilla,trips,mancha,hongo,plaga,enfermo}',
   '## Ronda de control fitosanitario\n\n_Contenido pendiente de cargar por el dueño._\n\n- Revisá hoja por hoja las matas del plan.\n- Si ves algo raro, tomá foto y describilo en el audio.\n- No apliques nada sin confirmar con el técnico.\n', 1),
  ('a5000000-0000-4000-8000-000000000002', 'Aplicación de Bocashi (dosis y registro)', 'bocashi',
   '{bocashi,abono,fertiliz}',
   '## Fertilización con Bocashi\n\n_Contenido pendiente de cargar por el dueño._\n\n- Anotá cuántas matas y cuántos quintales.\n- Si se acaba el bocashi, decilo en el audio.\n', 2),
  ('a5000000-0000-4000-8000-000000000003', 'Aplicación foliar de Bioles', 'bioles',
   '{biol,foliar,aspersi}',
   '## Fertilización foliar (Bioles)\n\n_Contenido pendiente de cargar por el dueño._\n\n- Decí qué biol y cuántos litros.\n- Registrá el área y tomá foto.\n', 3)
on conflict (id) do nothing;
