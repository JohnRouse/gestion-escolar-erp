
# Cambio: auditoría de estructura global

## Fecha

2026-07-21

## Estado

En análisis.

## Área

Frontend, diseño, accesibilidad y documentación.

## Motivo

Revisar la estructura transversal antes de corregir páginas individuales.

## Archivos revisados

- Layout.
- Header.
- Sidebar.
- Backdrop.
- Componentes compartidos.
- Modales.
- CSS global.
- Cadena de importación.

## Resultados

- 5 archivos de layout revisados.
- 24 componentes compartidos revisados.
- 50 archivos CSS encontrados.
- 49 CSS alcanzables desde la cadena de entrada.
- 299 variables CSS detectadas.
- 221 colores diferentes detectados.
- 7 candidatos a diálogo.
- 6 candidatos sin `role="dialog"`.
- 7 candidatos sin focus trap detectado.
- 15 componentes interactivos sin foco local detectado.
- 10 componentes con texto menor de 12 px.

## Errores confirmados

- ConfirmDialog sin semántica ni gestión completa de foco.
- ReportarPagoModal sin semántica modal ni gestión completa de foco.
- Texto funcional de 11 px en componentes compartidos.
- Uso repetido de `transition-all`.

## Deuda arquitectónica confirmada

- Implementaciones independientes de diálogos.
- Responsabilidades acumuladas en header y sidebar.
- Cadena CSS global altamente acoplada.
- Animaciones declaradas dentro de componentes.

## Decisión propuesta

Crear una base de diálogo accesible y migrar consumidores progresivamente.

Separar estilos globales y estilos específicos por módulos mediante fases pequeñas.

## Código funcional

Sin modificaciones.

## Base de datos

Sin modificaciones.

## Validaciones

- Análisis estático.
- Revisión semántica.
- Mapa de importaciones CSS.
- Validación mediante `git diff --check`.

## Próxima fase

Implementar y probar el diálogo compartido en una rama funcional separada.

## Reversión

Revertir el futuro commit documental de esta rama.

## Referencias

- Issue #2.
- ADR-003.
- Rama `docs/auditoria-estructura-global`.
