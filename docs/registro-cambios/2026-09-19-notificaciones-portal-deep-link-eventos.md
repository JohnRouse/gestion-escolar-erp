# Cambio: navegación de notificaciones y deep link de Eventos en el portal

## Fecha y estado

2026-09-19. **En pruebas**, listo para la aceptación humana final.

## Módulos

Portal de apoderados, Notificaciones y Eventos.

## Motivo y problema detectado

La fila del dropdown de la campana esperaba que terminara el `PATCH` de lectura
antes de cerrar y navegar. Una respuesta lenta o pendiente hacía que el tap
pareciera no producir ninguna acción. Además, las notificaciones nuevas de
Eventos solo guardaban `/dashboard/calendario`, sin el contexto necesario para
abrir el mes y día del evento.

## Comportamiento nuevo

- Una fila no leída actualiza contador y estado local de inmediato, lanza
  `PATCH /notificaciones/portal/:id/leida` sin bloquear, cierra el dropdown y
  navega en el mismo evento de interacción.
- Un fallo de lectura se registra en consola y no cancela la navegación. Al
  volver a cargar, el listado del backend restituye el estado persistido real.
- Solo se acepta `notif.url` si es una ruta del mismo origen bajo `/dashboard`.
  Una URL ausente o rechazada usa el fallback por origen.
- Eventos nuevos, actualizados, cancelados y sus recordatorios generan
  `/dashboard/calendario?anio_id=<id>&mes=<mes>&dia=<dia>&evento_id=<id>`.
- El calendario considera el año solicitado solo si aparece entre los años
  familiares autorizados. Consulta el mes por `GET /eventos/padres`; solo abre
  el día de `evento_id` cuando ese ID está dentro de esa respuesta. El query no
  crea autorización ni dispara una consulta directa por ID. Un evento cancelado
  no se abre automáticamente y deja la vista mensual normal.
- Las notificaciones históricas con `/dashboard/calendario` siguen abriendo el
  calendario normal. No se analiza el texto del mensaje.

## Reglas, roles y alcance

Aplica a Apoderado, Padre y Madre autenticados mediante `jwt-portal`. La
propiedad de la notificación se revalida en el endpoint externo y la audiencia
del evento se deriva nuevamente desde vínculos y matrículas operativas. No se
alteran tenant, colegio, audiencia, fecha/año ni autorización de Eventos.

## Fallbacks

- `eventos` → `/dashboard/calendario`
- `citas` → `/dashboard/citas`
- `pagos` → `/dashboard/pagos`
- `academico` → `/dashboard/calificaciones`
- `matricula`, `sistema`, `enfermeria` u otro → `/dashboard/actividad`

## Archivos y base de datos

Se modifican helpers/componentes del portal, servicios y pruebas de Eventos, y
documentación de módulos/escenarios. No hay cambios de Prisma, migraciones ni
datos. El registro histórico inconsistente de prueba no se modifica y no se
adapta la lógica de producto para mostrarlo.

## Pruebas y validaciones

- Portal Node test: 13/13 aprobadas, incluida URL válida, fallback de Eventos,
  rechazo malicioso, fallo de PATCH no bloqueante, histórico genérico,
  interpretación año/mes/día y ausencia de concesión por `evento_id`.
- Jest dirigido de Eventos, recordatorios y Notificaciones: 54/54 aprobadas.
- `tsc --noEmit` del portal: aprobado.
- ESLint dirigido del portal: aprobado.
- ESLint dirigido de Eventos y Notificaciones en API: aprobado sin `--fix`. Se
  normalizaron manualmente dos saltos de línea de Prettier ya detectados en el
  servicio actual, sin cambio funcional.
- Builds de API y Padres: aprobados. Next informó únicamente el aviso existente
  por múltiples lockfiles al inferir la raíz del workspace.
- `git diff --check`: aprobado.

## Diseño, accesibilidad y responsive

Se conserva el dropdown, sus tokens, el botón de fila y las transiciones
existentes. `button` mantiene activación nativa con Enter y Space, foco visible
y área interactiva; no se añade modal ni animación. No cambia el layout, por lo
que las revisiones previas 390×844, 1366×768 y 1440×900 siguen siendo la
referencia. La aceptación humana final debe confirmar tap, teclado, zoom y
reducción de movimiento en el navegador real.

## Riesgos, compatibilidad y reversión

La actualización optimista puede verse leída durante la navegación aunque el
PATCH falle; una carga posterior mostrará el estado persistido. Revertir
consiste en aplicar el patch inverso de código y documentación. No hay esquema
ni datos que revertir. No se realizó commit, push ni merge.
