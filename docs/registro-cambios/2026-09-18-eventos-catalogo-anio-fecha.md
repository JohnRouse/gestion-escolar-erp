# Corrección: Eventos — catálogo anual, años y fecha

## Fecha y estado

2026-09-18. En pruebas; validación automatizada aprobada y prueba manual final
pendiente.

## Módulo y motivo

Eventos. Una prueba humana detectó que el formulario elegía el primer año por
orden de fecha, mostraba años cerrados y permitía una fecha fuera del rango del
año lectivo. El vacío de audiencia observado correspondía a 2027 en
Planificación, seleccionado arbitrariamente, sin estructura anual configurada.

## Comportamiento anterior

- `GET /eventos/opciones` devolvía también años cerrados.
- El modal tomaba `anios[0]`, que podía ser un año futuro en Planificación.
- La fecha no se comparaba con `fecha_inicio` y `fecha_fin`.
- La consulta anual de audiencia no exigía en todos sus enlaces el mismo
  tenant/colegio/año.

## Comportamiento nuevo

- Crear ofrece Abierto, En curso, Activo, Matrícula abierta y Planificación;
  excluye estados históricos y devuelve un `anio_predeterminado_id` que prioriza
  el grupo abierto/en curso/activo antes de Planificación.
- Los eventos históricos de años cerrados permanecen consultables; al editar se
  conserva el año histórico necesario para representar el registro.
- Niveles, grados y secciones se deduplican desde `SeccionAnio` activa del mismo
  tenant, colegio y año mediante `Seccion → Grado → Nivel`.
- Cambiar institución o año limpia los destinos. Si la fecha no pertenece al
  nuevo rango, se limpia con aviso y el campo expone límites `min`/`max`.
- Crear y editar revalidan la fecha en backend y responden 400 con `La fecha del
  evento no corresponde al año lectivo seleccionado.`
- Sin estructura anual, Todo el colegio sigue disponible; una audiencia
  específica vacía no se guarda.

## Roles, alcance y trazabilidad

No cambian los roles. Admin, Director y Secretaria conservan gestión según rol
efectivo; Profesor y Apoderado conservan consulta. Se endurece la pertenencia de
destinos a tenant/colegio/año. No se agregan movimientos nuevos porque los
rechazos ocurren antes de persistir; las operaciones aceptadas conservan la
trazabilidad V1.

## Archivos y base de datos

Se modifican el servicio y pruebas de Eventos, el formulario/contrato de
intranet y la documentación funcional relacionada. La migración
`20260915120000_eventos_v1` ya estaba aplicada correctamente en la base local y
no fue modificada. Tampoco se modificó `schema.prisma` como parte de esta
corrección.

## Casos y validaciones

Se cubren año Cerrado excluido, Abierto predeterminado, Planificación disponible,
fecha dentro/fuera del rango, 2027 con fecha 2026, catálogos de nivel/grado/
sección derivados de la estructura anual, sección inactiva o de otro colegio,
limpieza al cambiar año y año sin estructura con Todo el colegio.

## UI y accesibilidad

Se mantienen `PageHeader`, `AccessibleDialog`, `ConfirmDialog`, `inputClass`,
los tokens y el layout responsive existentes. No se agregan animaciones ni se
altera la reducción de movimiento. Los controles mantienen etiquetas, foco
visible y navegación por teclado heredados. La revisión visual previa cubrió
1440×900, 1366×768 y 390×844; esta corrección queda en GO para repetir la prueba
manual final, incluido zoom aumentado, sin presentarla aún como aceptación.

## Pruebas y resultado

- Jest dirigido de Eventos y recordatorios: 29/29 aprobadas.
- Reglas puras del formulario: 2/2 aprobadas con el runner nativo de Node.
- API build e intranet `build:check`: aprobados.
- ESLint dirigido de API e intranet sin `--fix`: aprobado.
- `git diff --check`: aprobado.
- Prisma no se ejecuta porque no se tocó el esquema.

## Riesgos y compatibilidad

Los estados desconocidos no se consideran operables para crear hasta que la
convención del ERP los reconozca. Los registros históricos no se ocultan. Un año
en Planificación sin `SeccionAnio` solo permite Todo el colegio, sin copiar la
estructura de otro año.

## Reversión

Aplicar el patch inverso sobre código y documentación. No revertir la migración
ni borrar datos, porque esta corrección no cambió esquema ni persistencia.

## Git

Rama `feat/v1-eventos`. Sin commit, push ni merge.
