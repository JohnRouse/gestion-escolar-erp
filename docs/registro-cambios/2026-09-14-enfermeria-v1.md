# Cambio: Enfermería V1 escolar, segura y trazable

## Fecha y estado

2026-09-14, actualizado 2026-09-15 · **En pruebas**.

## Módulo y motivo

Enfermería. Se reemplaza la pantalla pendiente por un flujo escolar para
información declarada, autorizaciones, atenciones, contactos, cierre,
notificaciones mínimas y trazabilidad, sin construir una historia clínica.

## Comportamiento anterior y nuevo

Antes solo existía `/enfermeria` como `ModuloPendientePage`, visible únicamente
a Admin y sin API ni persistencia. Ahora Admin y Director autorizados disponen
de pantalla, API y cinco modelos separados. Secretaria y Profesor permanecen
sin acceso. La seguridad se revalida en backend por JWT, tenant, colegio,
matrícula/estudiante, vínculo familiar y rol efectivo.

## Alcance, reglas y validaciones

- Colegio específico y consolidado de colegios autorizados del tenant.
- Búsqueda operativa con `Activo`, `Matriculado`, `Pre-matriculado`.
- Ficha única por alumno/colegio y persistente entre años.
- Una sola atención abierta por matrícula, con bloqueo transaccional y
  continuación sobre la atención existente desde intranet.
- El conflicto de apertura responde 409 `ENFERMERIA_ATENCION_ABIERTA`, entrega
  `atencion_abierta_id` y no crea una atención ni movimiento duplicados.
- Apoderado siempre derivado de `ApoderadoEstudiante`.
- Medicación únicamente por autorización activa y vigente seleccionada.
- `Motivo de atención` no equivale a diagnóstico; el texto libre de `Acciones y
  cuidados realizados` no se analiza ni se usa para inferir medicación.
- La métrica se presenta como `Atenciones abiertas` y conserva el cálculo por
  `estado = 'abierta'`; el historial traduce sus códigos solo para mostrarlos.
- El detalle distingue autorización familiar de administración efectiva: muestra
  estados separados con/sin autorización vigente y, después de administrar, los
  datos estructurados reales de medicamento, instrucción, fecha/hora y actor.
- Solo las autorizaciones `activas` cuya vigencia incluye la fecha actual
  habilitan la administración. Crear o revocar una desde la ficha refresca el
  detalle mediante la clave de refetch existente, sin recargar toda la página.
- Atención/contacto/autorización/ficha sin hard delete.
- Corrección posterior al cierre solo con motivo y movimiento.
- Aviso opcional, deduplicado y sin información de salud detallada.

## Archivos y base de datos

Se crean `api/src/enfermeria/**`, `intranet/src/pages/enfermeria/**`, la
migración `20260914120000_enfermeria_v1`, la ficha y escenario documental. Se
actualizan Prisma, AppModule/App, acceso/sidebar, Notificaciones, reglas e
índices documentales. La migración es aditiva y no fue aplicada.

## Pruebas y resultado

- Jest Enfermería: 29/29 aprobadas.
- Prueba unitaria frontend de estados/vigencia de medicación: 6/6 aprobadas con
  Node, sin añadir dependencias.
- Jest Notificaciones: 16/16 aprobadas.
- Prisma format/validate/generate: aprobado.
- API build: aprobado.
- Intranet `build:check`: aprobado.
- ESLint dirigido sin `--fix`: aprobado en API e intranet.
- Build real con mocks no sensibles: aprobado en 1440×900, 1366×768 y smoke
  390×844; reflow 720×450 conservó la acción crítica y el diálogo. Teclado,
  restauración/foco visible, reducción de movimiento, overflow y consola
  aprobaron para la base V1. El aviso final de atención abierta y sus copys
  aprobaron build y lint; su revisión 1440×900 queda para la prueba manual final
  porque no había navegador automatizado disponible en el workspace.
- `git diff --check`: aprobado; estado y estadística final revisados, sin
  archivos accidentales.
- `graphify update .`: aprobado (3723 nodos, 8021 relaciones y 229
  comunidades). Persisten avisos no bloqueantes por ausencia de
  `tree_sitter_sql` y por un error de análisis preexistente en
  `web/src/app/layout.tsx`.

No se ejecutaron `migrate`, `db push`, `reset` ni `seed`.

## Riesgos, compatibilidad y reversión

Falta probar la migración en base aislada y aceptar el flujo con datos reales.
La integración añade canal `portal`; Notificaciones mantiene lectura compatible
con el canal histórico `padres`. El módulo no escribe detalle sensible en logs.

Código/documentación: patch inverso. Si la migración se aplica, exportar y
conservar registros y revertir relaciones/tablas en orden inverso solo mediante
un procedimiento aprobado; no borrar historial para simplificar la reversión.

## Referencia

Rama `feat/v1-enfermeria`. Sin commit, push ni merge.
