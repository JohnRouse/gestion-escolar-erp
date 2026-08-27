# Guía obligatoria de Gestión Escolar ERP

Este archivo es el punto de entrada para cualquier persona, desarrollador o asistente que implemente cambios en el proyecto.

Antes de modificar código se deben leer:

1. `docs/00-indice.md`
2. `docs/01-vision-y-arquitectura.md`
3. `docs/02-sistema-de-diseno-ui-ux.md`
4. `docs/03-multitenant-roles-y-seguridad.md`
5. `docs/04-reglas-funcionales-transversales.md`
6. `docs/05-estandares-de-desarrollo.md`
7. `docs/06-estado-del-proyecto.md`
8. `docs/07-protocolo-documentacion-continua.md`
9. `docs/manual/00-portada-e-indice.md`
10. `docs/modulos/README.md`
11. `docs/escenarios/README.md`
12. `docs/08-formato-respuestas-y-bloques-aplicacion.md`
13. `docs/09-tokens-y-patrones-visuales.md`
14. `docs/10-animaciones-y-transiciones.md`
15. `docs/11-responsive-legibilidad-y-accesibilidad.md`
16. `docs/auditoria/09-prioridades-revision-visual.md`

## Propósito

Gestión Escolar ERP es una plataforma SaaS multi-tenant destinada a instituciones educativas independientes o agrupadas dentro de una misma organización.

La visión del producto contempla:

- Colegios y grupos de colegios.
- Academias y grupos de academias.
- Institutos y grupos de institutos.
- Otros centros educativos con procesos equivalentes.

No debe asumirse que toda la visión objetivo ya está implementada.

La documentación debe distinguir entre:

- Regla vigente.
- Funcionalidad implementada.
- Implementación parcial.
- Funcionalidad en pruebas.
- Decisión pendiente.
- Visión futura.

## Reglas no negociables

1. Toda consulta debe respetar el tenant, la institución, el alcance activo, el rol y el permiso del usuario.

2. Ocultar un botón en el frontend no reemplaza la autorización del backend.

3. No se deben codificar nombres concretos de colegios, tenants, años, usuarios o secciones dentro de los componentes.

4. Las reglas de negocio deben mantenerse en una fuente centralizada y no duplicarse entre pantallas.

5. Las operaciones sensibles deben conservar trazabilidad: usuario, fecha, institución, acción, motivo, valor anterior y valor posterior.

6. La información académica o financiera no debe eliminarse irreversiblemente cuando sea necesaria para auditoría.

7. Todo formulario debe contemplar carga, error, vacío, bloqueo y éxito.

8. El sistema debe ser comprensible para docentes, administrativos, padres y personas mayores con poco o ningún conocimiento tecnológico.

9. No se permiten controles ambiguos, textos excesivamente pequeños ni acciones representadas únicamente por iconos poco claros.

10. Toda pantalla nueva debe reutilizar los patrones establecidos en `docs/02-sistema-de-diseno-ui-ux.md`.

11. Cuando varias páginas necesiten el mismo patrón visual, debe crearse o mejorarse un componente compartido.

12. Cuando el alcance activo sea `Todos los colegios`, los años lectivos deben mostrarse junto con el nombre de la institución.

13. Cuando el alcance activo sea un colegio específico, el año lectivo debe mostrarse sin repetir el nombre del colegio.

14. El módulo de Tutoría solo debe estar disponible para el tutor asignado a la sección y para los roles administrativos expresamente autorizados.

15. La autorización de Tutoría debe validarse en frontend y backend.

16. Todo cambio que modifique una regla de negocio debe actualizar la documentación dentro del mismo commit o pull request.

17. Los cambios destructivos o transaccionales deben probarse primero en una base aislada.

18. No se deben realizar pruebas destructivas en la base original.

## Diseño

La aplicación utiliza un diseño minimalista inspirado en los principios de Carbon Design System.

La implementación actual emplea principalmente:

- React.
- TypeScript.
- Tailwind CSS.
- Lucide React.

No se debe introducir otra biblioteca visual sin una decisión arquitectónica registrada mediante ADR.

## Auditoría visual obligatoria

Antes de crear o modificar una pantalla se debe revisar:

- `docs/09-tokens-y-patrones-visuales.md`.
- `docs/10-animaciones-y-transiciones.md`.
- `docs/11-responsive-legibilidad-y-accesibilidad.md`.
- `docs/auditoria/09-prioridades-revision-visual.md`.

Todo cambio visual debe indicar:

- Patrón o token aplicado.
- Componente compartido utilizado o creado.
- Resoluciones revisadas.
- Resultado con zoom aumentado.
- Navegación por teclado.
- Foco visible.
- Reducción de movimiento.
- Animaciones o transiciones afectadas.
- Hallazgo corregido o inconsistencia resuelta.

Un resultado del análisis estático no se considera error confirmado hasta comprobar el comportamiento real de la pantalla.

## Antes de implementar

Se debe comprobar:

- Módulo afectado.
- Regla de negocio aplicable.
- Roles autorizados.
- Alcance institucional.
- Comportamiento con `Todos los colegios`.
- Comportamiento con un colegio específico.
- Estado de carga.
- Estado vacío.
- Manejo de errores.
- Presentación en pantallas pequeñas.
- Trazabilidad.
- Pruebas requeridas.
- Documentación que debe actualizarse.

## Definición mínima de terminado

Una funcionalidad no se considera terminada solo porque aparece visualmente.

Debe incluir, según corresponda:

- Interfaz funcional.
- Validaciones.
- Autorización.
- Backend funcional.
- Persistencia.
- Manejo de errores.
- Estados de carga y vacío.
- Diseño responsivo.
- Trazabilidad.
- Pruebas.
- Documento del módulo actualizado.
- Registro funcional del cambio creado o actualizado.
- Escenarios afectados actualizados.
- Documentación general actualizada.


## Documentación simultánea con la implementación

Todo bloque de implementación debe incluir también la actualización documental correspondiente.

Como mínimo debe revisarse:

- Documento del módulo afectado.
- Registro funcional del cambio.
- Reglas transversales relacionadas.
- Escenarios afectados.
- Estado real de la funcionalidad.
- Pruebas y resultado.
- Procedimiento de reversión cuando corresponda.

No se debe presentar un cambio como terminado si el código fue actualizado pero la documentación permanece desactualizada.

## Validaciones antes de confirmar cambios

Ejecutar como mínimo:

    git diff --check
    npm run build
    git status --short
    git diff --stat

No se debe realizar commit si existen errores de compilación o archivos accidentales.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `$graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
