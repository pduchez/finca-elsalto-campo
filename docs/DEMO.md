# Recorrido de la app (capturas)

Capturas reales generadas manejando la app con un navegador headless
(`docs/capturas/`). El teléfono usa un dispositivo de audio y una ubicación GPS
simulados; todo lo demás es la app funcionando de verdad contra IndexedDB.

## App de campo (Emerson)

| # | Pantalla | Archivo |
|---|---|---|
| 1 | Home: plan del día + REGISTRAR + “Todo enviado” | `capturas/01-campo-home.png` |
| 2 | Selección de área (6 botones grandes) | `capturas/02-registrar-area.png` |
| 3 | Selección de actividad (8) | `capturas/03-registrar-actividad.png` |
| 4 | Captura: banner de protocolo contextual | `capturas/04-registrar-captura.png` |
| 5 | Captura con audio grabado + jornaleros | `capturas/05-registrar-captura-con-audio.png` |
| 6 | Protocolo contextual (se abre solo por la actividad) | `capturas/06-protocolo-contextual.png` |
| 7 | Confirmación “¡Guardado!” | `capturas/07-registrar-guardado.png` |
| 8 | Home con el registro del día y su estado de envío | `capturas/08-campo-home-con-registro.png` |
| 9 | Asistencia (un toque por persona) | `capturas/09-asistencia.png` |
| 10 | Tarea por destajo (total automático) | `capturas/10-destajo.png` |
| 11 | Biblioteca de protocolos (buscable, offline) | `capturas/11-protocolos-biblioteca.png` |

## Panel del dueño

| # | Pantalla | Archivo |
|---|---|---|
| 12 | Briefing diario (cifras + alertas + qué se hizo) | `capturas/12-panel-briefing.png` |
| 13 | Trazabilidad orgánica (dosis + GPS + foto + CSV) | `capturas/13-panel-trazabilidad.png` |
| 14 | Costos por área y actividad (planilla + destajo) | `capturas/14-panel-costos.png` |
| 15 | Avance de Emerson (consultas de protocolo) | `capturas/15-panel-avance.png` |
| 16 | Administración (carga de bioles + catálogos) | `capturas/16-panel-admin.png` |

> **Modo demo:** sin variables de Supabase/Anthropic, la app corre 100% local
> (IndexedDB) y la cola de sincronización se confirma en el servidor sin
> persistir, para poder probar el flujo completo sin backend. El botón
> “+ Datos de ejemplo” del Briefing carga registros de muestra (ya “procesados”
> por Claude) para previsualizar el panel.
