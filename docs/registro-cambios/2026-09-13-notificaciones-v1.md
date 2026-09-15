# Cambio: Notificaciones V1 como bandeja personal segura

## Fecha

2026-09-13

## Estado

En pruebas.

## Módulo y motivo

Notificaciones. Se reemplaza la pantalla pendiente y se cierra el bloqueo que
permitía actualizar una notificación únicamente por `id_notif` sin propiedad.

## Comportamiento anterior

El listado y count filtraban por Usuario, pero `PUT /notificaciones/:id/leida`
actualizaba solo por ID. Intranet mostraba una pantalla pendiente y una campana
decorativa. El modelo no conservaba origen ni contexto institucional.

## Comportamiento nuevo

La API pagina y filtra la bandeja personal por actor, tenant y colegio; permite
lectura/no lectura y marcar todas dentro del scope. Prisma agrega contexto,
origen, referencia, canal y fecha de lectura. Intranet incorpora bandeja real,
badge y acceso para Admin, Director, Secretaria y Profesor. El portal adapta su
campana a la respuesta paginada y a la mutación segura.

## Reglas, roles y alcance

- Propiedad obligatoria en toda consulta y mutación.
- Membresías activas y tenant seleccionado obligatorios.
- Globales de tenant visibles junto al colegio específico.
- Rutas internas separadas por canal.
- Matrículas operativas: Activo, Matriculado y Pre-matriculado.
- Roles internos: Admin, Director, Secretaria y Profesor.

## Base de datos

Migración aditiva `20260913180000_notificaciones_v1_bandeja`, no aplicada. No
transforma datos ni modifica migraciones anteriores. Legacy queda NULL.

## Pruebas y resultado

- Prisma format/validate/generate: aprobado.
- Jest dirigido Notificaciones + Citas: 66/66 aprobado.
- API build, intranet `build:check` y TypeScript del portal: aprobados durante el
  desarrollo; deben repetirse en el cierre tras la documentación.
- Lint de los archivos nuevos de API: aprobado. Los consumidores legacy tienen
  deuda de lint previa que se informa por separado.
- Revisión visual sobre build real con respuestas interceptadas en memoria:
  1440×900 y 1366×768 aprobados; 390×844 aprobado como smoke test. No hubo
  overflow horizontal ni errores de consola. El foco visible permaneció en la
  acción principal, todas las acciones siguieron disponibles y con reducción de
  movimiento se detectaron cero animaciones activas. El reflow 720×450,
  equivalente a zoom elevado, conservó marcar todas, marcar una y ver detalle.

## Riesgos y compatibilidad

La migración debe aplicarse antes de desplegar el código. Los avisos legacy se
incluyen solo en contexto no ambiguo. Circulares no emite el aviso
complementario hasta suministrar contexto explícito; el contenido masivo sigue
en su módulo. La autenticación externa no se amplía.

## Reversión

Revertir archivos mediante patch inverso. Si el SQL ya fue aplicado, exportar
campos nuevos, retirar primero FKs/índices y después columnas; nunca borrar las
filas históricas de `Notificacion`.

## Referencia

Rama `feat/v1-notificaciones`. Sin commit, push, PR ni merge.
