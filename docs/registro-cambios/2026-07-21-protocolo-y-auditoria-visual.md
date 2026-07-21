
# Cambio: protocolo de aplicación y auditoría visual inicial

## Fecha

2026-07-21

## Estado

En desarrollo.

## Área

Documentación, metodología de trabajo y sistema de diseño.

## Motivo

Establecer reglas precisas para aplicar cambios y utilizar la revisión documental como herramienta para detectar errores, inconsistencias y oportunidades de unificación visual.

## Comportamiento anterior

El repositorio contenía principios generales de diseño y documentación, pero no disponía de:

- Un formato detallado para los bloques ejecutables.
- Reglas completas para Bash y Python 3.
- Un inventario de tokens y patrones visuales.
- Reglas detalladas de animación.
- Reglas exhaustivas de responsive y accesibilidad.
- Una auditoría estática por página.
- Una priorización de hallazgos visuales.

## Comportamiento nuevo

Se incorporaron documentos para:

- Preparar respuestas y bloques de aplicación.
- Crear respaldos y validar cambios.
- Decidir cuándo utilizar Bash o Python 3.
- Unificar campos, botones, tarjetas, tablas y modales.
- Establecer criterios para animaciones y transiciones.
- Revisar responsive, zoom, foco, teclado y legibilidad.
- Detectar candidatos a inconsistencias mediante análisis estático.
- Priorizar la revisión visual.

## Resultados iniciales de la auditoría

- 140 archivos TS, TSX y CSS revisados.
- 49 páginas revisadas.
- 24 componentes compartidos detectados.
- 244 colores diferentes detectados.
- 28 estilos inline detectados.
- 113 usos de `transition-all`.
- 21 páginas interactivas sin foco local detectado.
- 4 páginas sin prefijos responsive locales detectados.
- 30 páginas con texto menor de 12 px.
- 5 coincidencias de reducción de movimiento.

## Interpretación

Las cantidades anteriores representan candidatos.

No deben considerarse errores confirmados hasta revisar:

- Componentes compartidos.
- Estilos heredados.
- Comportamiento en ejecución.
- Resoluciones.
- Zoom.
- Navegación por teclado.
- Reducción de movimiento.

## Código funcional

Sin modificaciones.

## Base de datos

Sin modificaciones.

## Archivos documentales incorporados

- `docs/08-formato-respuestas-y-bloques-aplicacion.md`.
- `docs/09-tokens-y-patrones-visuales.md`.
- `docs/10-animaciones-y-transiciones.md`.
- `docs/11-responsive-legibilidad-y-accesibilidad.md`.
- `docs/plantillas/plantilla-bloque-aplicacion.md`.
- `docs/auditoria/06-auditoria-estatica-diseno.md`.
- `docs/auditoria/07-matriz-paginas-diseno.md`.
- `docs/auditoria/08-backlog-unificacion-ui.md`.
- `docs/auditoria/09-prioridades-revision-visual.md`.

## Validaciones

- Generación mediante Python 3.
- Comprobación de archivos no vacíos.
- Auditoría estática de 140 archivos.
- Validación mediante `git diff --check`.

## Riesgos

El análisis estático puede generar falsos positivos cuando los estilos o comportamientos provienen de componentes compartidos o librerías.

## Próxima fase

Revisión del código real y comprobación visual de:

1. Estructura global y navegación.
2. Páginas sin responsive local.
3. Páginas con texto menor de 12 px.
4. Componentes compartidos.
5. Foco visible.
6. Transiciones y reducción de movimiento.

## Reversión

Revertir el futuro commit documental de esta rama.

## Referencias

- Issue #2.
- Rama `docs/protocolo-y-auditoria-visual`.
