# Cambio: búsqueda de familias y reuniones de sección en Citas

## Fecha

2026-09-12. Corrección de contrato previa al commit: 2026-09-13.

## Estado

En pruebas.

## Módulo

Citas, agenda institucional y contrato futuro del portal de familias.

## Motivo

La prueba manual de Citas V1 confirmó que un código real de matrícula como
`SMV-2027-0004` no encontraba al estudiante. También confirmó la necesidad de
registrar reuniones colectivas de una sección sin fabricar una cita individual.

## Problema anterior

El frontend cargaba hasta 100 matrículas al abrir el diálogo y luego filtraba en
memoria. El endpoint no comparaba `codigo_matricula` y una consulta compuesta no
resolvía nombres completos de forma útil. `Cita` exigía `id_apoderado` y solo
representaba entrevistas individuales.

La primera versión de la respuesta expandía cada matrícula con `flatMap`, una
fila por vínculo `ApoderadoEstudiante`. Por ello un alumno con padre y madre se
renderizaba dos veces y la selección principal quedaba acoplada al apoderado.

## Comportamiento nuevo

La búsqueda es incremental, cancelable y limitada en base de datos. Admite
nombres/apellidos/DNI de estudiante y apoderado, código de matrícula y código de
estudiante. La UI ofrece `Individual` y `Reunión de sección`, monta solo los
campos del tipo activo y presenta una sola opción por matrícula con estudiante,
sección, institución cuando corresponde y código. La respuesta incluye
`apoderados[]` con todos los vínculos reales y `apoderado_coincidente` solo si
una búsqueda familiar identifica inequívocamente uno. Después de elegir alumno,
el formulario muestra `Apoderado participante` como campo separado y obligatorio.

Una reunión persiste `tipo=seccion`, `id_seccion`, responsable y horario, con
matrícula/apoderado nulos. Sus familias y estudiantes se derivan de matrículas
activas y vínculos existentes. Agenda, detalle, estados, reprogramación, acuerdos
e historial comparten el motor de Citas; rechazo no se ofrece a la audiencia
colectiva.

## Reglas afectadas

- Tenant, colegio, alcance activo y rol efectivo se verifican en cada consulta.
- Individual exige matrícula activa y apoderado vinculado.
- Reunión exige sección autorizada y no acepta IDs individuales.
- Profesor usa solo asignaciones reales; Tutor suma su sección asignada.
- Responsable Docente/Tutor y Staff permanecen separados por contexto.
- Pendiente/confirmada bloquean solapamiento en ambos tipos.
- Participantes colectivos no se copian en `Cita`.

## Roles afectados

Admin, Director, Secretaria, Profesor/Tutor y, como contrato futuro aún bloqueado
por autenticación, Apoderado.

## Alcance institucional

Colegio específico y `Todos los colegios`. En consolidado, resultados de familia
y secciones conservan siempre la institución. Secretaria y Profesor no amplían
su alcance a consolidado.

## Archivos modificados

- Prisma: `api/prisma/schema.prisma` y segunda migración aditiva.
- API: controlador, DTO, servicio y pruebas de Citas.
- Intranet: API tipada, formulario, agenda y detalle de Citas.
- Portal: presentación futura de reuniones en Mis Citas.
- Documentación de módulo, seguridad, reglas, escenario, estado y registro.
- `graphify-out`: actualización incremental posterior a las validaciones.

## Base de datos

Se creó `20260911220000_citas_reuniones_seccion`, no aplicada. Vuelve nullable
`Cita.id_apoderado`, agrega `tipo`, `id_seccion`, dos índices y FK restrictiva.
La migración aplicada `20260911160000_citas_v1_agenda` no se modificó. No se usó
`prisma db push`, reset ni seed.

## Casos contemplados

- Búsqueda parcial por seis familias de campos y vacío real.
- Cero carga de alumnos al abrir y cancelación de búsquedas obsoletas.
- Alumno con padre y madre representado una vez por `id_matricula`.
- Búsqueda por DNI de padre o madre con hijos deduplicados y coincidencia familiar
  disponible para preselección.
- Coincidencia simultánea de alumno y apoderado sin duplicar la matrícula.
- Selector familiar limitado a los vínculos `ApoderadoEstudiante` del alumno.
- Creación manipulada con un apoderado no vinculado rechazada con 400.
- Admin/Director/Secretaria en colegios autorizados.
- Profesor asignado, Profesor ajeno (403) y Tutor de sección.
- Persona dual Docente/Staff.
- Audiencia y conteos deduplicados.
- Agenda y detalle discriminados.
- Confirmación, realización, cancelación, reprogramación y acuerdos.
- Portal por cita propia o sección de un hijo activo.
- Eventos familiares de creación, reprogramación y cancelación.

## Validaciones

DTO estricto, tipo discriminado, pertenencia institucional, matrícula activa,
vínculo de apoderado, asignación de sección, responsable elegible, fecha futura,
orden de horas, solapamiento y máquina de estados.

La creación interna valida el vínculo después de volver a cargar la matrícula y
resolver el alcance dentro de la transacción; no confía en la opción enviada por
el frontend.

## Pruebas realizadas

- `npx prisma format`, `validate` y `generate`.
- `npm run build` en API.
- `npm run build:check` en intranet.
- Jest dirigido: 48 pruebas. La corrección cubre alumno con padre+madre una sola
  vez, DNI de padre, DNI de madre, lista de vínculos, apoderado coincidente,
  coincidencia alumno+apoderado, rechazo 400 del vínculo manipulado y exclusión
  de otro colegio.
- ESLint dirigido sin `--fix` en API, intranet y página afectada del portal.
- Chrome sobre el build de intranet con API simulada segura: `/citas`, alta
  Individual, alta Reunión y detalle grupal en 1440×900, 390×844 y reflow
  720×450 equivalente a zoom 200 %.
- `git diff --check`.
- `graphify update .`.

En la corrección del 2026-09-13 se ejecutaron nuevamente Jest de Citas, API build,
intranet `build:check` y `git diff --check`. Por instrucción expresa no se ejecutó
Graphify ni se repitió una revisión responsive/visual extensa.

## Resultado

Prisma, API, intranet, Jest y ESLint aprobaron. El build de intranet conserva
únicamente el aviso conocido por chunk mayor de 500 kB. Chrome no encontró
overflow horizontal, errores de consola o página ni pérdida de campos/acciones;
Individual mostró institución en consolidado y Reunión ocultó la búsqueda de
familia. El detalle grupal mostró conteos y no renderizó Apoderado ni Rechazar.
Escape devolvió foco al disparador y reducción de movimiento dejó cero animaciones
activas. Se inspeccionaron las capturas y se corrigió la etiqueta heredada
`Destinatario` a `Responsable`. `git diff --check` aprobó. Graphify reconstruyó
el grafo de código con 3417 nodos, 7292 aristas y 253 comunidades; informó solo
la dependencia opcional ausente `tree_sitter_sql` y el parseo parcial
preexistente de `web/src/app/layout.tsx`.

## Revisión visual

- Patrón/token: `PageHeader`, `AccessibleDialog`, `Toast`, slate/azul y badges de
  estado existentes.
- Componente compartido: no se creó un modal paralelo; ambos tipos usan
  `CitaForm` dentro de `AccessibleDialog`.
- Resoluciones: 1440×900 y 390×844; reflow 720×450 equivalente a 200 %.
- Teclado/foco: entrada en el radio Individual, Escape, trampa y retorno de foco
  aprobados; foco visible comprobado en el tipo activo.
- Movimiento: `prefers-reduced-motion: reduce` reconocido, 0 animaciones activas;
  no se agregaron animaciones y se conservaron transiciones de color de 150 ms.
- Hallazgo corregido: filtro de agenda `Destinatario` pasó a `Responsable` para
  coincidir con formulario, filas y detalle.

## Riesgos

- La audiencia es dinámica: refleja matrículas/vínculos activos al consultar o
  notificar, no una fotografía histórica de convocatoria.
- La autenticación externa impide aceptación real del portal.
- La segunda migración debe probarse/aplicarse de forma controlada antes de usar
  reuniones contra la base local.

## Compatibilidad

El default `individual` clasifica todas las citas históricas sin reescribirlas.
Los registros legacy sin matrícula continúan legibles. El flujo individual
mantiene sus relaciones y validaciones.

## Reversión

Revertir código/documentación mediante patch inverso. La migración no aplicada
puede retirarse junto con el schema nuevo. Si se aplicara después, primero se
deben preservar reuniones y movimientos, retirar FK/índices con otra migración
revisada y nunca borrar información histórica.

## Documentación actualizada

`docs/modulos/citas.md`, `docs/03-multitenant-roles-y-seguridad.md`,
`docs/04-reglas-funcionales-transversales.md`, `docs/06-estado-del-proyecto.md`,
`docs/escenarios/citas-participantes-autorizacion.md`, este registro y el índice
de registros.

## Referencia

Rama `feat/v1-citas`. Sin commit, push ni merge.
