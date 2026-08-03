-- Diagnóstico de la cadena de voz: ¿está hablando la app con Groq y con Claude?
\echo '===== CADENA DE VOZ (sobre todos los registros) ====='
select
  count(*)                                                                as registros,
  count(*) filter (where audio_url is not null)                          as con_audio,
  count(*) filter (where audio_transcripcion is not null
                     and audio_transcripcion <> '')                      as transcritos_groq,
  count(*) filter (where procesado)                                      as procesados_claude,
  count(*) filter (where cantidad is not null)                           as con_cantidad,
  count(*) filter (where requiere_revision)                              as requieren_revision
from registros;

\echo '===== ULTIMAS TRANSCRIPCIONES (muestra) ====='
select fecha, creado_en, left(audio_transcripcion, 90) as transcripcion
from registros
where audio_transcripcion is not null and audio_transcripcion <> ''
order by creado_en desc
limit 5;
