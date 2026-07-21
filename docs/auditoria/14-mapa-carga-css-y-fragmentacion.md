# Mapa de carga CSS y fragmentación visual

## 1. Objetivo

Distinguir los estilos que participan en la cadena de entrada principal de los archivos CSS presentes en el repositorio.

## 2. Advertencia

La clasificación por módulo o componente es heurística y debe revisarse manualmente.

Que un CSS sea alcanzable desde la entrada no significa que todas sus reglas se utilicen en todas las páginas.

## 3. Resumen

- Archivos CSS encontrados: 50.
- Archivos CSS alcanzables desde main, App, index o App.css: 49.
- Importaciones directas desde TS o TSX: 24.

## 4. Importaciones CSS directas desde TypeScript

| Archivo TypeScript | CSS importado |
|---|---|
| `intranet/src/main.tsx` | `intranet/src/index.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon-theme.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/100-comunidad-login-final.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/101-configuracion-ux.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/102-operacion-matricula-tesoreria.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/103-selecciones-sidebar-y-cabeceras.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/104-matricula-modales-selecciones.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/105-pensiones-carbon-ui.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/106-sidebar-hover-ultimos-registros.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/107-asistencia-mobile-carbon.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/108-calendario-horario-ux.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/109-header-selector-busqueda-global.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/110-sidebar-branding-institucional.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/112-renovacion-historial-tabs.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/113-historial-filtros-revision.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/114-asistencia-desktop-mobile-ux.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/115-calendario-docentes-interaccion.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/116-calendario-programacion-rapida.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/116-comunidad-listados-filtros.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/117-comunidad-tablas-credenciales.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/118-matricula-persona-modales.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` |
| `intranet/src/main.tsx` | `intranet/src/styles/carbon/carbon-refactor.css` |

## 5. Inventario CSS

| Archivo | Cadena de entrada | Clasificación inicial | Líneas | Colores distintos | Usos de color | Variables declaradas | Usos de variables | Importa | Importado por |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | Sí | Módulo específico | 2084 | 51 | 321 | 8 | 22 | 0 | 1 |
| `intranet/src/styles/carbon-theme.css` | Sí | Compartido o transversal | 3386 | 45 | 434 | 104 | 163 | 0 | 1 |
| `intranet/src/styles/carbon/107-asistencia-mobile-carbon.css` | Sí | Módulo específico | 705 | 35 | 103 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/113-historial-filtros-revision.css` | Sí | Pendiente de clasificación | 515 | 35 | 71 | 1 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | Sí | Pendiente de clasificación | 362 | 34 | 47 | 10 | 26 | 0 | 1 |
| `intranet/src/index.css` | Sí | Entrada global | 600 | 28 | 30 | 20 | 5 | 2 | 1 |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | Sí | Módulo específico | 220 | 26 | 42 | 9 | 13 | 0 | 1 |
| `intranet/src/styles/carbon/117-comunidad-tablas-credenciales.css` | Sí | Módulo específico | 480 | 25 | 53 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | Sí | Módulo específico | 328 | 23 | 41 | 10 | 29 | 0 | 1 |
| `intranet/src/styles/carbon/118-matricula-persona-modales.css` | Sí | Módulo específico | 320 | 22 | 39 | 0 | 0 | 0 | 1 |
| `intranet/src/App.css` | Sí | Entrada global | 217 | 21 | 21 | 20 | 5 | 0 | 0 |
| `intranet/src/styles/carbon/109-header-selector-busqueda-global.css` | Sí | Compartido o transversal | 958 | 21 | 112 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/106-sidebar-hover-ultimos-registros.css` | Sí | Compartido o transversal | 357 | 20 | 41 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/00-tokens.css` | Sí | Compartido o transversal | 47 | 19 | 29 | 33 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/17-horario-academico.css` | Sí | Pendiente de clasificación | 713 | 19 | 47 | 9 | 41 | 0 | 1 |
| `intranet/src/styles/carbon/110-sidebar-branding-institucional.css` | Sí | Compartido o transversal | 391 | 18 | 48 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/114-asistencia-desktop-mobile-ux.css` | Sí | Módulo específico | 303 | 18 | 27 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | Sí | Módulo específico | 719 | 18 | 48 | 10 | 24 | 0 | 1 |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | Sí | Módulo específico | 312 | 16 | 33 | 8 | 6 | 0 | 1 |
| `intranet/src/styles/carbon/101-configuracion-ux.css` | Sí | Módulo específico | 126 | 16 | 17 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/104-matricula-modales-selecciones.css` | Sí | Módulo específico | 141 | 14 | 26 | 1 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/105-pensiones-carbon-ui.css` | Sí | Pendiente de clasificación | 213 | 14 | 42 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/100-comunidad-login-final.css` | Sí | Módulo específico | 207 | 13 | 19 | 6 | 9 | 0 | 1 |
| `intranet/src/styles/carbon/102-operacion-matricula-tesoreria.css` | Sí | Módulo específico | 86 | 12 | 16 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/108-calendario-horario-ux.css` | Sí | Módulo específico | 217 | 12 | 17 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/112-renovacion-historial-tabs.css` | Sí | Pendiente de clasificación | 115 | 12 | 19 | 1 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/115-calendario-docentes-interaccion.css` | Sí | Módulo específico | 309 | 12 | 26 | 1 | 9 | 0 | 1 |
| `intranet/src/styles/carbon/116-comunidad-listados-filtros.css` | Sí | Módulo específico | 171 | 12 | 17 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/04-page-scopes.css` | Sí | Pendiente de clasificación | 195 | 11 | 13 | 0 | 10 | 0 | 1 |
| `intranet/src/styles/carbon/103-selecciones-sidebar-y-cabeceras.css` | Sí | Compartido o transversal | 144 | 11 | 29 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/11-modal-header-search-flicker-fix.css` | Sí | Compartido o transversal | 80 | 11 | 12 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | Sí | Módulo específico | 231 | 11 | 17 | 7 | 11 | 0 | 1 |
| `intranet/src/styles/carbon/19-reportes-dashboard-polish.css` | Sí | Módulo específico | 182 | 11 | 17 | 7 | 17 | 0 | 1 |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | Sí | Pendiente de clasificación | 313 | 10 | 12 | 8 | 14 | 0 | 1 |
| `intranet/src/styles/carbon/07-ux-legibility-profile-header.css` | Sí | Compartido o transversal | 282 | 10 | 39 | 4 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/12-contexto-sidebar-selector-legibilidad.css` | Sí | Compartido o transversal | 85 | 8 | 12 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/09-pageheader-profile-icons-final.css` | Sí | Compartido o transversal | 126 | 7 | 10 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/116-calendario-programacion-rapida.css` | Sí | Módulo específico | 74 | 6 | 8 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/05-pending-polish.css` | Sí | Pendiente de clasificación | 257 | 5 | 16 | 1 | 34 | 0 | 1 |
| `intranet/src/styles/carbon/06-final-visual-polish.css` | Sí | Pendiente de clasificación | 331 | 5 | 14 | 1 | 36 | 0 | 1 |
| `intranet/src/styles/carbon/03-modals.css` | Sí | Compartido o transversal | 82 | 3 | 3 | 0 | 6 | 0 | 1 |
| `intranet/src/styles/carbon/16-location-selects.css` | Sí | Pendiente de clasificación | 16 | 3 | 3 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/08-pageheader-consistency.css` | Sí | Compartido o transversal | 63 | 2 | 2 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/13-institution-mark.css` | Sí | Pendiente de clasificación | 24 | 2 | 3 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/02-components.css` | Sí | Compartido o transversal | 162 | 1 | 5 | 0 | 40 | 0 | 1 |
| `intranet/src/styles/carbon/14-error-boundary.css` | Sí | Pendiente de clasificación | 29 | 1 | 1 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/15-docentes-crud.css` | Sí | Módulo específico | 39 | 1 | 2 | 0 | 0 | 0 | 1 |
| `intranet/src/styles/carbon/01-accessibility.css` | Sí | Compartido o transversal | 82 | 0 | 0 | 0 | 6 | 0 | 1 |
| `intranet/src/styles/carbon/carbon-refactor.css` | Sí | Pendiente de clasificación | 55 | 0 | 0 | 0 | 0 | 22 | 1 |
| `intranet/src/components.css` | No | Compartido o transversal | 55 | 0 | 0 | 0 | 0 | 0 | 0 |

## 6. Archivos con mayor cantidad de colores literales

| Archivo | Colores distintos | Usos totales | Cadena de entrada |
|---|---:|---:|---|
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 51 | 321 | Sí |
| `intranet/src/styles/carbon-theme.css` | 45 | 434 | Sí |
| `intranet/src/styles/carbon/107-asistencia-mobile-carbon.css` | 35 | 103 | Sí |
| `intranet/src/styles/carbon/113-historial-filtros-revision.css` | 35 | 71 | Sí |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 34 | 47 | Sí |
| `intranet/src/index.css` | 28 | 30 | Sí |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 26 | 42 | Sí |
| `intranet/src/styles/carbon/117-comunidad-tablas-credenciales.css` | 25 | 53 | Sí |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 23 | 41 | Sí |
| `intranet/src/styles/carbon/118-matricula-persona-modales.css` | 22 | 39 | Sí |
| `intranet/src/styles/carbon/109-header-selector-busqueda-global.css` | 21 | 112 | Sí |
| `intranet/src/App.css` | 21 | 21 | Sí |
| `intranet/src/styles/carbon/106-sidebar-hover-ultimos-registros.css` | 20 | 41 | Sí |
| `intranet/src/styles/carbon/17-horario-academico.css` | 19 | 47 | Sí |
| `intranet/src/styles/carbon/00-tokens.css` | 19 | 29 | Sí |
| `intranet/src/styles/carbon/110-sidebar-branding-institucional.css` | 18 | 48 | Sí |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 18 | 48 | Sí |
| `intranet/src/styles/carbon/114-asistencia-desktop-mobile-ux.css` | 18 | 27 | Sí |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 16 | 33 | Sí |
| `intranet/src/styles/carbon/101-configuracion-ux.css` | 16 | 17 | Sí |
| `intranet/src/styles/carbon/105-pensiones-carbon-ui.css` | 14 | 42 | Sí |
| `intranet/src/styles/carbon/104-matricula-modales-selecciones.css` | 14 | 26 | Sí |
| `intranet/src/styles/carbon/100-comunidad-login-final.css` | 13 | 19 | Sí |
| `intranet/src/styles/carbon/115-calendario-docentes-interaccion.css` | 12 | 26 | Sí |
| `intranet/src/styles/carbon/112-renovacion-historial-tabs.css` | 12 | 19 | Sí |

## 7. Interpretación necesaria

Los colores encontrados deben separarse en:

- Tokens oficiales.
- Sombras.
- Transparencias.
- Estados funcionales.
- Variantes de institución.
- Estilos heredados.
- Duplicados equivalentes.
- Valores obsoletos.

## 8. Riesgos que deben comprobarse

- CSS de módulos cargado globalmente.
- Selectores demasiado generales.
- Reglas duplicadas.
- Orden de importación utilizado para resolver conflictos.
- Valores importantes repetidos.
- Colores literales que deberían utilizar variables.
- Clases antiguas todavía cargadas.
- Dependencia de especificidad creciente.

## 9. Próxima decisión

Antes de unificar colores debe definirse qué archivo contendrá los tokens oficiales y qué estilos modulares deben dejar de depender del orden global de importación.
