# Auditoría estática de diseño del frontend

## 1. Objetivo

Identificar candidatos a errores, inconsistencias y oportunidades de unificación visual en el frontend real.

## 2. Advertencia metodológica

Los resultados de este documento no constituyen automáticamente errores confirmados.

El análisis estático puede no detectar estilos aplicados mediante componentes compartidos, funciones, librerías o expresiones dinámicas.

Cada hallazgo deberá clasificarse después como:

- Error confirmado.
- Inconsistencia probable.
- Mejora recomendada.
- Decisión visual válida.
- Ausencia justificada.
- Falso positivo.
- Pendiente de revisión visual.

## 3. Resumen

- Archivos TS, TSX y CSS revisados: 140.
- Páginas TSX revisadas: 49.
- Componentes compartidos detectados: 24.
- Declaraciones estáticas de clases analizadas: 5010.
- Tokens de clase analizados: 27305.
- Variables CSS detectadas: 299.
- Valores de color detectados: 2169.
- Colores diferentes detectados: 244.
- Estilos inline detectados: 28.
- Clases con valores arbitrarios detectadas: 1108.
- Bloques extensos de clases repetidos: 64.
- Usos de transition-all: 113.
- Coincidencias de reducción de movimiento: 5.

## 4. Candidatos por categoría

- Páginas interactivas sin foco local detectado: 21.
- Páginas con hover sin transición local detectada: 0.
- Páginas sin prefijos responsive detectados: 4.
- Páginas sin transición ni animación local detectada: 2.
- Páginas con dimensiones arbitrarias en px: 29.
- Páginas con texto menor de 12 px: 30.
- Páginas con transition-all: 19.
- Páginas con estilos inline: 14.

## 5. Variables CSS detectadas

| Archivo | Línea | Variable | Valor |
|---|---:|---|---|
| `intranet/src/App.css` | 8 | `--color-gray-50` | `#f8f9fa` |
| `intranet/src/App.css` | 9 | `--color-gray-100` | `#f1f3f5` |
| `intranet/src/App.css` | 10 | `--color-gray-200` | `#e9ecef` |
| `intranet/src/App.css` | 11 | `--color-gray-300` | `#dee2e6` |
| `intranet/src/App.css` | 12 | `--color-gray-400` | `#ced4da` |
| `intranet/src/App.css` | 13 | `--color-gray-500` | `#adb5bd` |
| `intranet/src/App.css` | 14 | `--color-gray-600` | `#6c757d` |
| `intranet/src/App.css` | 15 | `--color-gray-700` | `#495057` |
| `intranet/src/App.css` | 16 | `--color-gray-800` | `#343a40` |
| `intranet/src/App.css` | 17 | `--color-gray-900` | `#212529` |
| `intranet/src/App.css` | 20 | `--color-accent-50` | `#f0f4ff` |
| `intranet/src/App.css` | 21 | `--color-accent-100` | `#dbe4ff` |
| `intranet/src/App.css` | 22 | `--color-accent-200` | `#bac8ff` |
| `intranet/src/App.css` | 23 | `--color-accent-300` | `#91a7ff` |
| `intranet/src/App.css` | 24 | `--color-accent-400` | `#748ffc` |
| `intranet/src/App.css` | 25 | `--color-accent-500` | `#5c7cfa` |
| `intranet/src/App.css` | 26 | `--color-accent-600` | `#4c6ef5` |
| `intranet/src/App.css` | 27 | `--color-accent-700` | `#4263eb` |
| `intranet/src/App.css` | 28 | `--color-accent-800` | `#3b5bdb` |
| `intranet/src/App.css` | 29 | `--color-accent-900` | `#364fc7` |
| `intranet/src/index.css` | 11 | `--color-gray-50` | `#f8f9fa` |
| `intranet/src/index.css` | 12 | `--color-gray-100` | `#f1f3f5` |
| `intranet/src/index.css` | 13 | `--color-gray-200` | `#e9ecef` |
| `intranet/src/index.css` | 14 | `--color-gray-300` | `#dee2e6` |
| `intranet/src/index.css` | 15 | `--color-gray-400` | `#ced4da` |
| `intranet/src/index.css` | 16 | `--color-gray-500` | `#adb5bd` |
| `intranet/src/index.css` | 17 | `--color-gray-600` | `#6c757d` |
| `intranet/src/index.css` | 18 | `--color-gray-700` | `#495057` |
| `intranet/src/index.css` | 19 | `--color-gray-800` | `#343a40` |
| `intranet/src/index.css` | 20 | `--color-gray-900` | `#212529` |
| `intranet/src/index.css` | 23 | `--color-accent-50` | `#f0f4ff` |
| `intranet/src/index.css` | 24 | `--color-accent-100` | `#dbe4ff` |
| `intranet/src/index.css` | 25 | `--color-accent-200` | `#bac8ff` |
| `intranet/src/index.css` | 26 | `--color-accent-300` | `#91a7ff` |
| `intranet/src/index.css` | 27 | `--color-accent-400` | `#748ffc` |
| `intranet/src/index.css` | 28 | `--color-accent-500` | `#5c7cfa` |
| `intranet/src/index.css` | 29 | `--color-accent-600` | `#4c6ef5` |
| `intranet/src/index.css` | 30 | `--color-accent-700` | `#4263eb` |
| `intranet/src/index.css` | 31 | `--color-accent-800` | `#3b5bdb` |
| `intranet/src/index.css` | 32 | `--color-accent-900` | `#364fc7` |
| `intranet/src/styles/carbon/00-tokens.css` | 7 | `--erp-carbon-blue-60` | `#0f62fe` |
| `intranet/src/styles/carbon/00-tokens.css` | 8 | `--erp-carbon-blue-70` | `#0043ce` |
| `intranet/src/styles/carbon/00-tokens.css` | 9 | `--erp-carbon-blue-80` | `#002d9c` |
| `intranet/src/styles/carbon/00-tokens.css` | 10 | `--erp-carbon-blue-10` | `#d0e2ff` |
| `intranet/src/styles/carbon/00-tokens.css` | 12 | `--erp-carbon-gray-10` | `#f4f4f4` |
| `intranet/src/styles/carbon/00-tokens.css` | 13 | `--erp-carbon-gray-20` | `#e0e0e0` |
| `intranet/src/styles/carbon/00-tokens.css` | 14 | `--erp-carbon-gray-30` | `#c6c6c6` |
| `intranet/src/styles/carbon/00-tokens.css` | 15 | `--erp-carbon-gray-40` | `#a8a8a8` |
| `intranet/src/styles/carbon/00-tokens.css` | 16 | `--erp-carbon-gray-50` | `#8d8d8d` |
| `intranet/src/styles/carbon/00-tokens.css` | 17 | `--erp-carbon-gray-60` | `#6f6f6f` |
| `intranet/src/styles/carbon/00-tokens.css` | 18 | `--erp-carbon-gray-70` | `#525252` |
| `intranet/src/styles/carbon/00-tokens.css` | 19 | `--erp-carbon-gray-80` | `#393939` |
| `intranet/src/styles/carbon/00-tokens.css` | 20 | `--erp-carbon-gray-90` | `#262626` |
| `intranet/src/styles/carbon/00-tokens.css` | 21 | `--erp-carbon-gray-100` | `#161616` |
| `intranet/src/styles/carbon/00-tokens.css` | 23 | `--erp-carbon-green-60` | `#198038` |
| `intranet/src/styles/carbon/00-tokens.css` | 24 | `--erp-carbon-red-60` | `#da1e28` |
| `intranet/src/styles/carbon/00-tokens.css` | 25 | `--erp-carbon-yellow-30` | `#f1c21b` |
| `intranet/src/styles/carbon/00-tokens.css` | 26 | `--erp-carbon-orange-40` | `#ff832b` |
| `intranet/src/styles/carbon/00-tokens.css` | 28 | `--erp-carbon-bg` | `#f4f4f4` |
| `intranet/src/styles/carbon/00-tokens.css` | 29 | `--erp-carbon-layer` | `#ffffff` |
| `intranet/src/styles/carbon/00-tokens.css` | 30 | `--erp-carbon-layer-alt` | `#f4f4f4` |
| `intranet/src/styles/carbon/00-tokens.css` | 32 | `--erp-carbon-border` | `#e0e0e0` |
| `intranet/src/styles/carbon/00-tokens.css` | 33 | `--erp-carbon-border-strong` | `#c6c6c6` |
| `intranet/src/styles/carbon/00-tokens.css` | 34 | `--erp-carbon-border-input` | `#8d8d8d` |
| `intranet/src/styles/carbon/00-tokens.css` | 36 | `--erp-carbon-text` | `#161616` |
| `intranet/src/styles/carbon/00-tokens.css` | 37 | `--erp-carbon-text-secondary` | `#393939` |
| `intranet/src/styles/carbon/00-tokens.css` | 38 | `--erp-carbon-text-helper` | `#525252` |
| `intranet/src/styles/carbon/00-tokens.css` | 39 | `--erp-carbon-text-placeholder` | `#6f6f6f` |
| `intranet/src/styles/carbon/00-tokens.css` | 41 | `--erp-carbon-radius-xs` | `2px` |
| `intranet/src/styles/carbon/00-tokens.css` | 42 | `--erp-carbon-radius-sm` | `4px` |
| `intranet/src/styles/carbon/00-tokens.css` | 43 | `--erp-carbon-radius-md` | `8px` |
| `intranet/src/styles/carbon/00-tokens.css` | 45 | `--erp-carbon-focus` | `#0f62fe` |
| `intranet/src/styles/carbon/00-tokens.css` | 46 | `--erp-carbon-transition` | `110ms cubic-bezier(0.2, 0, 0.38, 0.9)` |
| `intranet/src/styles/carbon/05-pending-polish.css` | 41 | `--tw-ring-color` | `rgba(15, 98, 254, 0.22) !important` |
| `intranet/src/styles/carbon/06-final-visual-polish.css` | 113 | `--tw-ring-color` | `rgba(15, 98, 254, 0.28) !important` |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | 8 | `--erp-carbon-text-strong` | `#111827` |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | 9 | `--erp-carbon-text` | `#1f2937` |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | 10 | `--erp-carbon-text-soft` | `#5b6574` |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | 11 | `--erp-carbon-border-2` | `#d8e0ea` |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | 12 | `--erp-carbon-bg-card` | `#ffffff` |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | 13 | `--erp-carbon-bg-soft` | `#f8fafc` |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | 14 | `--erp-carbon-primary-strong` | `#0f62fe` |
| `intranet/src/styles/carbon/06-usabilidad-final.css` | 15 | `--erp-carbon-chip-text` | `#243142` |
| `intranet/src/styles/carbon/07-ux-legibility-profile-header.css` | 8 | `--erp-readable-title` | `#161616` |
| `intranet/src/styles/carbon/07-ux-legibility-profile-header.css` | 9 | `--erp-readable-text` | `#262626` |
| `intranet/src/styles/carbon/07-ux-legibility-profile-header.css` | 10 | `--erp-readable-muted` | `#393939` |
| `intranet/src/styles/carbon/07-ux-legibility-profile-header.css` | 11 | `--erp-readable-helper` | `#525252` |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 7 | `--erp-readable-black` | `#161616` |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 8 | `--erp-readable-text` | `#262626` |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 9 | `--erp-readable-muted` | `#393939` |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 10 | `--erp-readable-soft` | `#525252` |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 11 | `--erp-border-carbon` | `#d0d7de` |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 12 | `--erp-panel-carbon` | `#ffffff` |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 13 | `--erp-bg-carbon` | `#f4f4f4` |
| `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css` | 14 | `--erp-blue-carbon` | `#0f62fe` |
| `intranet/src/styles/carbon/100-comunidad-login-final.css` | 7 | `--community-blue` | `#0f62fe` |
| `intranet/src/styles/carbon/100-comunidad-login-final.css` | 8 | `--community-blue-dark` | `#0043ce` |
| `intranet/src/styles/carbon/100-comunidad-login-final.css` | 9 | `--community-header` | `#262626` |
| `intranet/src/styles/carbon/100-comunidad-login-final.css` | 10 | `--community-border` | `#c5ced8` |
| `intranet/src/styles/carbon/100-comunidad-login-final.css` | 11 | `--community-row-border` | `#d7dee7` |
| `intranet/src/styles/carbon/100-comunidad-login-final.css` | 12 | `--community-muted` | `#475569` |
| `intranet/src/styles/carbon/104-matricula-modales-selecciones.css` | 91 | `--danger` | `hover { border-color: #da1e28 !important` |
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 6 | `--matricula-blue` | `#0f62fe` |
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 7 | `--matricula-blue-dark` | `#0043ce` |
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 8 | `--matricula-border` | `#c6c6c6` |
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 9 | `--matricula-border-soft` | `#e0e0e0` |
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 10 | `--matricula-text` | `#161616` |
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 11 | `--matricula-muted` | `#525252` |
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 12 | `--matricula-background` | `#f4f4f4` |
| `intranet/src/styles/carbon/111-matricula-flujo-compacto.css` | 1160 | `--selected` | `hover { border-color: #198038 !important` |
| `intranet/src/styles/carbon/112-renovacion-historial-tabs.css` | 57 | `--active` | `hover { border-color: #0043ce` |
| `intranet/src/styles/carbon/113-historial-filtros-revision.css` | 156 | `--active` | `hover { border-color: #0043ce !important` |
| `intranet/src/styles/carbon/115-calendario-docentes-interaccion.css` | 197 | `--action` | `hover:not(:disabled) { border-color: #0f62fe !important` |
| `intranet/src/styles/carbon/115-calendario-docentes-interaccion.css` | 203 | `--action` | `focus-visible { outline: 2px solid #0f62fe` |
| `intranet/src/styles/carbon/115-calendario-docentes-interaccion.css` | 209 | `--action` | `disabled { cursor: not-allowed` |
| `intranet/src/styles/carbon/115-calendario-docentes-interaccion.css` | 216 | `--action` | `disabled small { color: #6f6f6f` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 8 | `--hc-text` | `#161616` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 9 | `--hc-muted` | `#525252` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 10 | `--hc-border` | `#d0d7de` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 11 | `--hc-border-soft` | `#e5e7eb` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 12 | `--hc-bg` | `#ffffff` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 13 | `--hc-surface` | `#f4f4f4` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 14 | `--hc-input` | `#f1f5f9` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 15 | `--hc-blue` | `#0f62fe` |
| `intranet/src/styles/carbon/17-horario-academico.css` | 16 | `--hc-blue-hover` | `#0353e9` |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | 9 | `--erp-cohesion-border` | `#d8e0ea` |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | 10 | `--erp-cohesion-border-soft` | `#e5edf5` |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | 11 | `--erp-cohesion-soft` | `#f8fafc` |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | 12 | `--erp-cohesion-blue` | `#2563eb` |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | 13 | `--erp-cohesion-shadow` | `0 1px 2px rgba(15, 23, 42, 0.06)` |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | 14 | `--erp-cohesion-shadow-hover` | `0 8px 24px rgba(15, 23, 42, 0.08)` |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | 138 | `--tw-ring-color` | `transparent !important` |
| `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css` | 147 | `--tw-ring-color` | `transparent !important` |
| `intranet/src/styles/carbon/19-reportes-dashboard-polish.css` | 8 | `--erp-polish-border` | `#d8e0ea` |
| `intranet/src/styles/carbon/19-reportes-dashboard-polish.css` | 9 | `--erp-polish-soft-border` | `#e5edf5` |
| `intranet/src/styles/carbon/19-reportes-dashboard-polish.css` | 10 | `--erp-polish-bg` | `#ffffff` |
| `intranet/src/styles/carbon/19-reportes-dashboard-polish.css` | 11 | `--erp-polish-soft` | `#f8fafc` |
| `intranet/src/styles/carbon/19-reportes-dashboard-polish.css` | 12 | `--erp-polish-track` | `#edf2f7` |
| `intranet/src/styles/carbon/19-reportes-dashboard-polish.css` | 13 | `--erp-polish-shadow` | `0 1px 2px rgba(15, 23, 42, 0.06)` |
| `intranet/src/styles/carbon/19-reportes-dashboard-polish.css` | 14 | `--erp-polish-shadow-hover` | `0 8px 24px rgba(15, 23, 42, 0.08)` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 9 | `--erp-final-page` | `#f4f4f4` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 10 | `--erp-final-layer` | `#ffffff` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 11 | `--erp-final-soft` | `#f8fafc` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 12 | `--erp-final-border` | `#d8e0ea` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 13 | `--erp-final-border-strong` | `#c2cedc` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 14 | `--erp-final-text` | `#111827` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 15 | `--erp-final-muted` | `#475569` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 16 | `--erp-final-helper` | `#64748b` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 17 | `--erp-final-blue` | `#0f62fe` |
| `intranet/src/styles/carbon/20-dashboard-reportes-final.css` | 18 | `--erp-final-black` | `#161616` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 7 | `--agenda-border` | `#d8e0ea` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 8 | `--agenda-border-strong` | `#c2cedc` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 9 | `--agenda-layer` | `#ffffff` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 10 | `--agenda-soft` | `#f8fafc` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 11 | `--agenda-text` | `#111827` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 12 | `--agenda-muted` | `#475569` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 13 | `--agenda-helper` | `#64748b` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 14 | `--agenda-blue` | `#0f62fe` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 15 | `--agenda-black` | `#161616` |
| `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css` | 16 | `--agenda-danger` | `#b42318` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 7 | `--centro-border` | `#d8e0ea` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 8 | `--centro-border-strong` | `#c2cedc` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 9 | `--centro-soft` | `#f8fafc` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 10 | `--centro-text` | `#111827` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 11 | `--centro-muted` | `#475569` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 12 | `--centro-helper` | `#64748b` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 13 | `--centro-blue` | `#0f62fe` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 14 | `--centro-black` | `#161616` |
| `intranet/src/styles/carbon/22-centro-pagos-agrupado.css` | 15 | `--centro-danger` | `#b42318` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 8 | `--erp-readable-900` | `#161616` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 9 | `--erp-readable-800` | `#262626` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 10 | `--erp-readable-700` | `#374151` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 11 | `--erp-readable-600` | `#4b5563` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 12 | `--erp-line` | `#d5dce5` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 13 | `--erp-line-strong` | `#aeb8c4` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 14 | `--erp-header-bg` | `#e9eef4` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 15 | `--erp-row-alt` | `#fafbfd` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 16 | `--erp-focus` | `#0f62fe` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 78 | `--tw-ring-color` | `#dfe5ec !important` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 98 | `--tw-ring-color` | `transparent !important` |
| `intranet/src/styles/carbon/99-legibilidad-y-tablas.css` | 356 | `--tw-ring-color` | `#cbd3dd !important` |
| `intranet/src/styles/carbon-theme.css` | 10 | `--cds-blue-60` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 11 | `--cds-blue-70` | `#0043ce` |
| `intranet/src/styles/carbon-theme.css` | 12 | `--cds-blue-50` | `#4589ff` |
| `intranet/src/styles/carbon-theme.css` | 13 | `--cds-blue-20` | `#a6c8ff` |
| `intranet/src/styles/carbon-theme.css` | 14 | `--cds-blue-10` | `#d0e2ff` |
| `intranet/src/styles/carbon-theme.css` | 16 | `--cds-gray-10` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 17 | `--cds-gray-20` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 18 | `--cds-gray-30` | `#c6c6c6` |
| `intranet/src/styles/carbon-theme.css` | 19 | `--cds-gray-40` | `#a8a8a8` |
| `intranet/src/styles/carbon-theme.css` | 20 | `--cds-gray-50` | `#8d8d8d` |
| `intranet/src/styles/carbon-theme.css` | 21 | `--cds-gray-60` | `#6f6f6f` |
| `intranet/src/styles/carbon-theme.css` | 22 | `--cds-gray-70` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 23 | `--cds-gray-80` | `#393939` |
| `intranet/src/styles/carbon-theme.css` | 24 | `--cds-gray-90` | `#262626` |
| `intranet/src/styles/carbon-theme.css` | 25 | `--cds-gray-100` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 27 | `--cds-green-60` | `#198038` |
| `intranet/src/styles/carbon-theme.css` | 28 | `--cds-red-60` | `#da1e28` |
| `intranet/src/styles/carbon-theme.css` | 29 | `--cds-yellow-30` | `#f1c21b` |
| `intranet/src/styles/carbon-theme.css` | 30 | `--cds-cyan-60` | `#009d9a` |
| `intranet/src/styles/carbon-theme.css` | 31 | `--cds-purple-60` | `#8a3ffc` |
| `intranet/src/styles/carbon-theme.css` | 33 | `--cds-bg` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 34 | `--cds-layer` | `#ffffff` |
| `intranet/src/styles/carbon-theme.css` | 35 | `--cds-layer-alt` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 36 | `--cds-border-subtle` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 37 | `--cds-border-strong` | `#8d8d8d` |
| `intranet/src/styles/carbon-theme.css` | 38 | `--cds-text-primary` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 39 | `--cds-text-secondary` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 40 | `--cds-text-helper` | `#6f6f6f` |
| `intranet/src/styles/carbon-theme.css` | 41 | `--cds-focus` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 43 | `--cds-radius-sm` | `2px` |
| `intranet/src/styles/carbon-theme.css` | 44 | `--cds-radius-md` | `4px` |
| `intranet/src/styles/carbon-theme.css` | 45 | `--cds-radius-lg` | `8px` |
| `intranet/src/styles/carbon-theme.css` | 46 | `--cds-transition` | `110ms cubic-bezier(0.2, 0, 0.38, 0.9)` |
| `intranet/src/styles/carbon-theme.css` | 551 | `--dashboard-accent` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 552 | `--dashboard-border` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 553 | `--dashboard-muted` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 554 | `--dashboard-soft` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 655 | `--tw-ring-color` | `#e0e0e0 !important` |
| `intranet/src/styles/carbon-theme.css` | 846 | `--community-border` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 847 | `--community-muted` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 848 | `--community-soft` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 849 | `--community-blue` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 1319 | `--carbon-line` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 1320 | `--carbon-line-strong` | `#c6c6c6` |
| `intranet/src/styles/carbon-theme.css` | 1321 | `--carbon-layer` | `#ffffff` |
| `intranet/src/styles/carbon-theme.css` | 1322 | `--carbon-layer-alt` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 1323 | `--carbon-text` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 1324 | `--carbon-muted` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 1325 | `--carbon-blue` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 1481 | `--teso-border` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 1482 | `--teso-border-strong` | `#c6c6c6` |
| `intranet/src/styles/carbon-theme.css` | 1483 | `--teso-bg` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 1484 | `--teso-layer` | `#ffffff` |
| `intranet/src/styles/carbon-theme.css` | 1485 | `--teso-text` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 1486 | `--teso-muted` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 1487 | `--teso-blue` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 1602 | `--report-border` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 1603 | `--report-border-strong` | `#c6c6c6` |
| `intranet/src/styles/carbon-theme.css` | 1604 | `--report-bg` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 1605 | `--report-layer` | `#ffffff` |
| `intranet/src/styles/carbon-theme.css` | 1606 | `--report-layer-alt` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 1607 | `--report-text` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 1608 | `--report-muted` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 1609 | `--report-helper` | `#6f6f6f` |
| `intranet/src/styles/carbon-theme.css` | 1610 | `--report-blue` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 1611 | `--report-blue-dark` | `#0043ce` |
| `intranet/src/styles/carbon-theme.css` | 1612 | `--report-green` | `#198038` |
| `intranet/src/styles/carbon-theme.css` | 1613 | `--report-red` | `#da1e28` |
| `intranet/src/styles/carbon-theme.css` | 1614 | `--report-yellow` | `#f1c21b` |
| `intranet/src/styles/carbon-theme.css` | 1841 | `--config-border` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 1842 | `--config-border-strong` | `#c6c6c6` |
| `intranet/src/styles/carbon-theme.css` | 1843 | `--config-bg` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 1844 | `--config-layer` | `#ffffff` |
| `intranet/src/styles/carbon-theme.css` | 1845 | `--config-layer-alt` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 1846 | `--config-text` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 1847 | `--config-muted` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 1848 | `--config-helper` | `#6f6f6f` |
| `intranet/src/styles/carbon-theme.css` | 1849 | `--config-blue` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 1850 | `--config-blue-dark` | `#0043ce` |
| `intranet/src/styles/carbon-theme.css` | 1851 | `--config-green` | `#198038` |
| `intranet/src/styles/carbon-theme.css` | 1852 | `--config-red` | `#da1e28` |
| `intranet/src/styles/carbon-theme.css` | 1853 | `--config-yellow` | `#f1c21b` |
| `intranet/src/styles/carbon-theme.css` | 2179 | `--config-border` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 2180 | `--config-border-strong` | `#c6c6c6` |
| `intranet/src/styles/carbon-theme.css` | 2181 | `--config-layer` | `#ffffff` |
| `intranet/src/styles/carbon-theme.css` | 2182 | `--config-layer-alt` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 2183 | `--config-text` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 2184 | `--config-muted` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 2185 | `--config-helper` | `#6f6f6f` |
| `intranet/src/styles/carbon-theme.css` | 2186 | `--config-blue` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 2187 | `--config-blue-dark` | `#0043ce` |
| `intranet/src/styles/carbon-theme.css` | 2597 | `--readable-text` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 2598 | `--readable-muted` | `#393939` |
| `intranet/src/styles/carbon-theme.css` | 2599 | `--readable-helper` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 2600 | `--readable-border` | `#c6c6c6` |
| `intranet/src/styles/carbon-theme.css` | 2656 | `--mat-border` | `#e0e0e0` |
| `intranet/src/styles/carbon-theme.css` | 2657 | `--mat-border-strong` | `#c6c6c6` |
| `intranet/src/styles/carbon-theme.css` | 2658 | `--mat-layer` | `#ffffff` |
| `intranet/src/styles/carbon-theme.css` | 2659 | `--mat-alt` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 2660 | `--mat-text` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 2661 | `--mat-muted` | `#393939` |
| `intranet/src/styles/carbon-theme.css` | 2662 | `--mat-helper` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 2663 | `--mat-blue` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 2664 | `--mat-blue-dark` | `#0043ce` |
| `intranet/src/styles/carbon-theme.css` | 2665 | `--mat-green` | `#198038` |
| `intranet/src/styles/carbon-theme.css` | 2666 | `--mat-red` | `#da1e28` |
| `intranet/src/styles/carbon-theme.css` | 2667 | `--mat-yellow` | `#f1c21b` |
| `intranet/src/styles/carbon-theme.css` | 2783 | `--tw-ring-color` | `rgba(15, 98, 254, 0.30) !important` |
| `intranet/src/styles/carbon-theme.css` | 2998 | `--carbon-page-bg` | `#f4f4f4` |
| `intranet/src/styles/carbon-theme.css` | 2999 | `--carbon-layer` | `#ffffff` |
| `intranet/src/styles/carbon-theme.css` | 3000 | `--carbon-layer-soft` | `#f8f9fb` |
| `intranet/src/styles/carbon-theme.css` | 3001 | `--carbon-border` | `#d9dee7` |
| `intranet/src/styles/carbon-theme.css` | 3002 | `--carbon-border-strong` | `#b9c3d1` |
| `intranet/src/styles/carbon-theme.css` | 3003 | `--carbon-text` | `#161616` |
| `intranet/src/styles/carbon-theme.css` | 3004 | `--carbon-muted` | `#525252` |
| `intranet/src/styles/carbon-theme.css` | 3005 | `--carbon-helper` | `#6f6f6f` |
| `intranet/src/styles/carbon-theme.css` | 3006 | `--carbon-blue` | `#0f62fe` |
| `intranet/src/styles/carbon-theme.css` | 3007 | `--carbon-blue-soft` | `#edf5ff` |

## 6. Colores detectados

| Color | Apariciones | Archivos diferentes |
|---|---:|---:|
| `#ffffff` | 313 | 43 |
| `#161616` | 177 | 27 |
| `#0f62fe` | 166 | 38 |
| `#f4f4f4` | 100 | 17 |
| `#525252` | 100 | 20 |
| `#c6c6c6` | 88 | 18 |
| `#0043ce` | 75 | 28 |
| `#e0e0e0` | 69 | 13 |
| `#6f6f6f` | 61 | 10 |
| `#edf5ff` | 53 | 18 |
| `#393939` | 48 | 18 |
| `#8d8d8d` | 44 | 14 |
| `#a6c8ff` | 33 | 15 |
| `#f8fafc` | 30 | 18 |
| `#64748b` | 25 | 12 |
| `#0e6027` | 24 | 8 |
| `#262626` | 23 | 11 |
| `#da1e28` | 22 | 10 |
| `#cbd5e1` | 22 | 10 |
| `#f1c21b` | 20 | 9 |
| `#ccf32f` | 20 | 5 |
| `#78a9ff` | 19 | 9 |
| `#475569` | 19 | 9 |
| `#24a148` | 18 | 5 |
| `#defbe6` | 18 | 6 |
| `#198038` | 15 | 6 |
| `#0f172a` | 14 | 9 |
| `#fff1f1` | 14 | 8 |
| `#d0e2ff` | 13 | 7 |
| `#d9e2f1` | 13 | 4 |
| `#a7f0ba` | 12 | 5 |
| `rgba(15, 98, 254, 0.12)` | 12 | 9 |
| `#2563eb` | 11 | 3 |
| `#111827` | 11 | 7 |
| `#fddc69` | 11 | 4 |
| `#a2191f` | 11 | 7 |
| `#e2e8f0` | 10 | 6 |
| `#a8a8a8` | 10 | 5 |
| `#d8e0ea` | 10 | 8 |
| `#684e00` | 9 | 5 |
| `#94a3b8` | 9 | 5 |
| `#fcf4d6` | 8 | 6 |
| `#fff8e1` | 8 | 3 |
| `#374151` | 8 | 3 |
| `#002d9c` | 7 | 5 |
| `#f1f5f9` | 7 | 6 |
| `#ffb3b8` | 7 | 5 |
| `#42be65` | 7 | 2 |
| `rgba(15, 23, 42, 0.04)` | 7 | 4 |
| `#ffd7d9` | 6 | 3 |
| `#334155` | 6 | 4 |
| `#4589ff` | 6 | 3 |
| `#8a3ffc` | 5 | 5 |
| `#047857` | 5 | 4 |
| `rgba(22, 22, 22, 0.56)` | 5 | 3 |
| `rgba(0, 0, 0, 0.22)` | 5 | 3 |
| `#eff6ff` | 5 | 4 |
| `rgba(15, 23, 42, 0.07)` | 5 | 4 |
| `#dbe3ec` | 5 | 2 |
| `rgba(15, 23, 42, 0.06)` | 5 | 4 |
| `#020617` | 4 | 1 |
| `#be123c` | 4 | 3 |
| `#8a3800` | 4 | 2 |
| `rgba(0, 0, 0, 0.18)` | 4 | 3 |
| `rgba(22, 22, 22, 0.08)` | 4 | 3 |
| `#c2cedc` | 4 | 3 |
| `#e5e7eb` | 3 | 3 |
| `#fff` | 3 | 1 |
| `#075985` | 3 | 1 |
| `rgba(0, 0, 0, 0.24)` | 3 | 3 |
| `#d0d7de` | 3 | 3 |
| `rgba(15, 23, 42, 0.08)` | 3 | 3 |
| `#bfdbfe` | 3 | 2 |
| `#eef4fb` | 3 | 1 |
| `rgba(36, 161, 72, 0.1)` | 3 | 1 |
| `#f4f7fb` | 3 | 3 |
| `#fecaca` | 3 | 3 |
| `#fde68a` | 3 | 3 |
| `#b42318` | 3 | 2 |
| `#d9dee7` | 3 | 1 |
| `#f8f9fa` | 2 | 2 |
| `#f1f3f5` | 2 | 2 |
| `#e9ecef` | 2 | 2 |
| `#dee2e6` | 2 | 2 |
| `#ced4da` | 2 | 2 |
| `#adb5bd` | 2 | 2 |
| `#6c757d` | 2 | 2 |
| `#495057` | 2 | 2 |
| `#343a40` | 2 | 2 |
| `#212529` | 2 | 2 |
| `#f0f4ff` | 2 | 2 |
| `#dbe4ff` | 2 | 2 |
| `#bac8ff` | 2 | 2 |
| `#91a7ff` | 2 | 2 |
| `#748ffc` | 2 | 2 |
| `#5c7cfa` | 2 | 2 |
| `#4c6ef5` | 2 | 2 |
| `#4263eb` | 2 | 2 |
| `#3b5bdb` | 2 | 2 |
| `#364fc7` | 2 | 2 |
| `rgba(76, 110, 245, 0.1)` | 2 | 2 |
| `#eef1f5` | 2 | 1 |
| `#ff832b` | 2 | 2 |
| `rgba(15, 98, 254, 0.22)` | 2 | 2 |
| `#1f2937` | 2 | 2 |
| `#eef2f7` | 2 | 2 |
| `#4b5563` | 2 | 2 |
| `#eef5ff` | 2 | 2 |
| `#f8fbff` | 2 | 2 |
| `#750e13` | 2 | 1 |
| `rgba(0, 0, 0, 0.28)` | 2 | 2 |
| `rgba(255, 255, 255, 0.72)` | 2 | 2 |
| `#f7fbff` | 2 | 1 |
| `#4d3900` | 2 | 1 |
| `#f1fff4` | 2 | 1 |
| `#f7faff` | 2 | 2 |
| `#a7f3d0` | 2 | 2 |
| `#ecfdf5` | 2 | 2 |
| `#fffbeb` | 2 | 2 |
| `#e5edf5` | 2 | 2 |
| `#c7d3e2` | 2 | 2 |
| `#edf2f7` | 2 | 2 |
| `#aebdcd` | 2 | 1 |
| `rgba(15, 23, 42, 0.05)` | 2 | 1 |
| `#f3b8b8` | 2 | 2 |
| `#bae6fd` | 2 | 1 |
| `#d5dce5` | 2 | 1 |
| `#c5ced9` | 2 | 1 |
| `#cbd3dd` | 2 | 1 |
| `rgba(0, 0, 0, 0.10)` | 2 | 1 |
| `#1a1f2e` | 1 | 1 |
| `#7c8da5` | 1 | 1 |
| `rgba(248, 250, 252, 0.95)` | 1 | 1 |
| `#def7e1` | 1 | 1 |
| `#044317` | 1 | 1 |
| `#1c1b1f` | 1 | 1 |
| `#680006` | 1 | 1 |
| `#f6f2ff` | 1 | 1 |
| `#6929c4` | 1 | 1 |
| `#007d79` | 1 | 1 |
| `#e5f6f5` | 1 | 1 |
| `#005d5d` | 1 | 1 |
| `#d12771` | 1 | 1 |
| `#fff0f7` | 1 | 1 |
| `#9f1853` | 1 | 1 |
| `#b28600` | 1 | 1 |
| `#4f46e5` | 1 | 1 |
| `#039` | 1 | 1 |
| `#b45309` | 1 | 1 |
| `#c2410c` | 1 | 1 |
| `rgba(255,255,255,.62)` | 1 | 1 |
| `rgba(255,255,255,.65)` | 1 | 1 |
| `rgba(15, 98, 254, 0.28)` | 1 | 1 |
| `#5b6574` | 1 | 1 |
| `#243142` | 1 | 1 |
| `#b8c1cc` | 1 | 1 |
| `#aeb8c2` | 1 | 1 |
| `#c5ced8` | 1 | 1 |
| `#d7dee7` | 1 | 1 |
| `rgba(15, 98, 254, 0.65)` | 1 | 1 |
| `rgba(15, 23, 42, 0.35)` | 1 | 1 |
| `rgba(15, 98, 254, 0.2)` | 1 | 1 |
| `rgba(15, 23, 42, 0.4)` | 1 | 1 |
| `#d8e0e8` | 1 | 1 |
| `rgba(15, 98, 254, 0.8)` | 1 | 1 |
| `rgba(15, 23, 42, 0.22)` | 1 | 1 |
| `rgba(15, 98, 254, 0.1)` | 1 | 1 |
| `#fa4d56` | 1 | 1 |
| `#e0b019` | 1 | 1 |
| `rgba(15, 23, 42, 0.09)` | 1 | 1 |
| `rgba(15, 23, 42, 0.14)` | 1 | 1 |
| `#1d4ed8` | 1 | 1 |
| `rgba(22, 22, 22, 0.62)` | 1 | 1 |
| `rgba(22, 22, 22, 0.18)` | 1 | 1 |
| `rgba(255, 255, 255, 0.5)` | 1 | 1 |
| `#8e6a00` | 1 | 1 |
| `#e8faed` | 1 | 1 |
| `#e8e8e8` | 1 | 1 |
| `rgba(0, 0, 0, 0.03)` | 1 | 1 |
| `rgba(15, 98, 254, 0.08)` | 1 | 1 |
| `rgba(22, 22, 22, 0.5)` | 1 | 1 |
| `rgba(36, 161, 72, 0.09)` | 1 | 1 |
| `rgba(22, 22, 22, 0.7)` | 1 | 1 |
| `rgba(22, 22, 22, 0.26)` | 1 | 1 |
| `rgba(22, 22, 22, 0.14)` | 1 | 1 |
| `rgba(22, 22, 22, 0.06)` | 1 | 1 |
| `#f9fbfd` | 1 | 1 |
| `#f7f4ff` | 1 | 1 |
| `#f9fafb` | 1 | 1 |
| `rgba(22, 22, 22, 0.04)` | 1 | 1 |
| `rgba(22, 22, 22, 0.07)` | 1 | 1 |
| `rgba(22, 22, 22, 0.1)` | 1 | 1 |
| `rgba(22, 22, 22, 0.2)` | 1 | 1 |
| `#fff1f2` | 1 | 1 |
| `#dbeafe` | 1 | 1 |
| `#a16207` | 1 | 1 |
| `#92400e` | 1 | 1 |
| `#fef2f2` | 1 | 1 |
| `#b91c1c` | 1 | 1 |
| `rgba(15, 23, 42, 0.28)` | 1 | 1 |
| `rgba(22, 22, 22, 0.28)` | 1 | 1 |
| `rgba(255, 255, 255, 0.85)` | 1 | 1 |
| `rgba(255, 255, 255, 0.9)` | 1 | 1 |
| `rgba(255, 255, 255, 0.65)` | 1 | 1 |
| `#6b7280` | 1 | 1 |
| `#0353e9` | 1 | 1 |
| `#08bdba` | 1 | 1 |
| `#4f3b00` | 1 | 1 |
| `rgba(216, 224, 234, 0.7)` | 1 | 1 |
| `#fff5f5` | 1 | 1 |
| `#24324a` | 1 | 1 |
| `rgba(22, 22, 22, 0.58)` | 1 | 1 |
| `rgba(15, 23, 42, 0.25)` | 1 | 1 |
| `#f0f9ff` | 1 | 1 |
| `#0369a1` | 1 | 1 |
| `rgba(15, 98, 254, 0.16)` | 1 | 1 |
| `#aeb8c4` | 1 | 1 |
| `#e9eef4` | 1 | 1 |
| `#fafbfd` | 1 | 1 |
| `#f6f8fa` | 1 | 1 |
| `#dfe5ec` | 1 | 1 |
| `#667085` | 1 | 1 |
| `#344054` | 1 | 1 |
| `#dde3ea` | 1 | 1 |
| `#b8c2ce` | 1 | 1 |
| `#c8ced7` | 1 | 1 |
| `#7b8491` | 1 | 1 |
| `#8daf00` | 1 | 1 |
| `rgba(15, 98, 254, 0.14)` | 1 | 1 |
| `rgba(100, 116, 139, 0.16)` | 1 | 1 |
| `rgba(0, 0, 0, 0.42)` | 1 | 1 |
| `rgba(255, 255, 255, 0.82)` | 1 | 1 |
| `rgba(255, 255, 255, 0.92)` | 1 | 1 |
| `rgba(204, 243, 47, 0.22)` | 1 | 1 |
| `rgba(128, 153, 18, 0.16)` | 1 | 1 |
| `#009d9a` | 1 | 1 |
| `#e8eefc` | 1 | 1 |
| `#0f3a8a` | 1 | 1 |
| `#f8f9fb` | 1 | 1 |
| `#b9c3d1` | 1 | 1 |
| `rgba(244, 244, 244, 0.96)` | 1 | 1 |
| `rgba(244, 244, 244, 1)` | 1 | 1 |
| `rgba(0, 0, 0, 0.16)` | 1 | 1 |
| `rgba(15, 98, 254, 0.30)` | 1 | 1 |

## 7. Estilos inline detectados

| Archivo | Línea |
|---|---:|
| `intranet/src/layout/AppSidebar.tsx` | 694 |
| `intranet/src/layout/AppSidebar.tsx` | 737 |
| `intranet/src/pages/AsistenciaMobilePage.tsx` | 507 |
| `intranet/src/pages/AsistenciaPage.tsx` | 1026 |
| `intranet/src/pages/AsistenciaPage.tsx` | 1141 |
| `intranet/src/pages/DashboardPage.tsx` | 97 |
| `intranet/src/pages/DashboardPage.tsx` | 220 |
| `intranet/src/pages/MatriculaPage.tsx` | 1925 |
| `intranet/src/pages/ReportesPage.tsx` | 206 |
| `intranet/src/pages/ReportesPage.tsx` | 468 |
| `intranet/src/pages/ReportesPage.tsx` | 536 |
| `intranet/src/pages/TutoriaPage.tsx` | 675 |
| `intranet/src/pages/comunidad/AlumnosPage.tsx` | 2049 |
| `intranet/src/pages/configuracion/CabeceraLibretaTab.tsx` | 434 |
| `intranet/src/pages/configuracion/EscalaTab.tsx` | 316 |
| `intranet/src/pages/configuracion/EscalaTab.tsx` | 318 |
| `intranet/src/pages/configuracion/EscalaTab.tsx` | 321 |
| `intranet/src/pages/configuracion/PlantillasTab.tsx` | 1038 |
| `intranet/src/pages/configuracion/PlantillasTab.tsx` | 1059 |
| `intranet/src/pages/configuracion/PreparacionAnioTab.tsx` | 498 |
| `intranet/src/pages/configuracion/PreparacionAnioTab.tsx` | 513 |
| `intranet/src/pages/configuracion/PreparacionAnioTab.tsx` | 563 |
| `intranet/src/pages/configuracion/SeccionesTab.tsx` | 582 |
| `intranet/src/pages/matricula/RenovacionMatriculaPage.tsx` | 661 |
| `intranet/src/pages/reportes/AsistenciaReportesPage.tsx` | 451 |
| `intranet/src/pages/reportes/AsistenciaReportesPage.tsx` | 525 |
| `intranet/src/pages/reportes/AsistenciaReportesPage.tsx` | 580 |
| `intranet/src/pages/reportes/AsistenciaReportesPage.tsx` | 622 |

## 8. Valores arbitrarios de Tailwind

Se muestran hasta 150 coincidencias para revisión.

| Archivo | Línea | Clase |
|---|---:|---|
| `intranet/src/components/CenteredFormModal.tsx` | 74 | `z-[9999]` |
| `intranet/src/components/CenteredFormModal.tsx` | 91 | `text-[11px]` |
| `intranet/src/components/CenteredFormModal.tsx` | 91 | `tracking-[0.05em]` |
| `intranet/src/components/CenteredFormModal.tsx` | 118 | `max-h-[68vh]` |
| `intranet/src/components/CenteredFormModal.tsx` | 85 | `rounded-[24px]` |
| `intranet/src/components/ConfirmDialog.tsx` | 41 | `z-[12000]` |
| `intranet/src/components/ConfirmDialog.tsx` | 44 | `rounded-[1.75rem]` |
| `intranet/src/components/ConfirmDialog.tsx` | 44 | `shadow-[0_30px_90px_-45px_rgba(15,23,42,0.75)]` |
| `intranet/src/components/ConfirmDialog.tsx` | 50 | `text-[11px]` |
| `intranet/src/components/ConfirmDialog.tsx` | 50 | `tracking-[0.16em]` |
| `intranet/src/components/ConfirmDialog.tsx` | 51 | `tracking-[-0.02em]` |
| `intranet/src/components/ConfirmDialog.tsx` | 63 | `shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)]` |
| `intranet/src/components/ErrorBoundary.tsx` | 46 | `min-h-[calc(100vh-4rem)]` |
| `intranet/src/components/ErrorBoundary.tsx` | 47 | `rounded-[28px]` |
| `intranet/src/components/ErrorBoundary.tsx` | 55 | `tracking-[0.16em]` |
| `intranet/src/components/ErrorBoundary.tsx` | 72 | `text-[11px]` |
| `intranet/src/components/ErrorBoundary.tsx` | 72 | `tracking-[0.14em]` |
| `intranet/src/components/IntranetLayout.tsx` | 10 | `bg-[#1a1f2e]` |
| `intranet/src/components/PageHeader.tsx` | 25 | `rounded-[32px]` |
| `intranet/src/components/PageHeader.tsx` | 51 | `tracking-[0.16em]` |
| `intranet/src/components/community/CommunityDetailModal.tsx` | 33 | `z-[9999]` |
| `intranet/src/components/community/CommunityDetailModal.tsx` | 41 | `text-[11px]` |
| `intranet/src/components/community/CommunityDetailModal.tsx` | 67 | `max-h-[72vh]` |
| `intranet/src/components/community/CommunityDetailModal.tsx` | 69 | `min-h-[260px]` |
| `intranet/src/components/community/CommunityDetailModal.tsx` | 35 | `rounded-[24px]` |
| `intranet/src/components/community/CommunityEditModal.tsx` | 39 | `z-[9999]` |
| `intranet/src/components/community/CommunityEditModal.tsx` | 46 | `text-[11px]` |
| `intranet/src/components/community/CommunityEditModal.tsx` | 46 | `tracking-[0.16em]` |
| `intranet/src/components/community/CommunityEditModal.tsx` | 41 | `max-h-[calc(100vh-2rem)]` |
| `intranet/src/components/community/CommunityEditModal.tsx` | 41 | `rounded-[24px]` |
| `intranet/src/components/community/CommunityLinkedPeople.tsx` | 259 | `min-h-[112px]` |
| `intranet/src/components/community/CommunityTableRows.tsx` | 256 | `xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1.2fr)_minmax(120px,0.45fr)_auto]` |
| `intranet/src/components/community/CommunityTableState.tsx` | 18 | `min-h-[320px]` |
| `intranet/src/components/community/CommunityTableState.tsx` | 34 | `min-h-[320px]` |
| `intranet/src/components/community/CommunityTableState.tsx` | 78 | `text-[11px]` |
| `intranet/src/components/community/CommunityTableState.tsx` | 111 | `text-[11px]` |
| `intranet/src/components/community/CommunityTableState.tsx` | 111 | `tracking-[0.15em]` |
| `intranet/src/components/community/CommunityUI.tsx` | 17 | `text-[10px]` |
| `intranet/src/components/community/CommunityUI.tsx` | 17 | `tracking-[0.15em]` |
| `intranet/src/components/community/CommunityUI.tsx` | 40 | `tracking-[0.15em]` |
| `intranet/src/components/community/CommunityUI.tsx` | 93 | `text-[11px]` |
| `intranet/src/components/community/CommunityUI.tsx` | 93 | `tracking-[0.1em]` |
| `intranet/src/components/community/CommunityUI.tsx` | 104 | `min-h-[96px]` |
| `intranet/src/components/community/CommunityUI.tsx` | 130 | `text-[11px]` |
| `intranet/src/components/community/ContinuidadMatriculaModal.tsx` | 578 | `text-[11px]` |
| `intranet/src/components/community/ContinuidadMatriculaModal.tsx` | 594 | `text-[11px]` |
| `intranet/src/components/community/ContinuidadMatriculaModal.tsx` | 594 | `tracking-[0.1em]` |
| `intranet/src/components/community/ContinuidadMatriculaModal.tsx` | 630 | `text-[11px]` |
| `intranet/src/components/community/ContinuidadMatriculaModal.tsx` | 630 | `tracking-[0.1em]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 84 | `rounded-[30px]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 87 | `tracking-[0.16em]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 118 | `text-[11px]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 118 | `tracking-[0.14em]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 126 | `text-[11px]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 126 | `tracking-[0.14em]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 141 | `text-[11px]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 141 | `tracking-[0.14em]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 151 | `text-[11px]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 151 | `tracking-[0.14em]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 164 | `text-[11px]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 164 | `tracking-[0.14em]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 169 | `text-[11px]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 169 | `tracking-[0.14em]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 175 | `text-[11px]` |
| `intranet/src/components/publico/ReportarPagoModal.tsx` | 175 | `tracking-[0.14em]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 46 | `z-[9999]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 47 | `rounded-[30px]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 70 | `rounded-[26px]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 73 | `tracking-[0.18em]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 85 | `text-[11px]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 85 | `tracking-[0.16em]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 147 | `text-[11px]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 147 | `tracking-[0.14em]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 158 | `text-[11px]` |
| `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 158 | `tracking-[0.14em]` |
| `intranet/src/contexts/ToastContext.tsx` | 134 | `z-[9999]` |
| `intranet/src/contexts/ToastContext.tsx` | 134 | `w-[calc(100vw-3rem)]` |
| `intranet/src/contexts/ToastContext.tsx` | 138 | `rounded-[22px]` |
| `intranet/src/contexts/ToastContext.tsx` | 138 | `${toneClass[toast.type]}` |
| `intranet/src/layout/AppHeader.tsx` | 256 | `max-w-[1600px]` |
| `intranet/src/layout/AppHeader.tsx` | 256 | `rounded-[1.75rem]` |
| `intranet/src/layout/AppHeader.tsx` | 256 | `shadow-[0_18px_55px_-48px_rgba(15,23,42,0.65)]` |
| `intranet/src/layout/AppHeader.tsx` | 275 | `shadow-[0_1px_2px_rgba(15,23,42,0.04)]` |
| `intranet/src/layout/AppHeader.tsx` | 284 | `text-[11px]` |
| `intranet/src/layout/AppHeader.tsx` | 284 | `tracking-[0.18em]` |
| `intranet/src/layout/AppHeader.tsx` | 287 | `max-w-[15rem]` |
| `intranet/src/layout/AppHeader.tsx` | 317 | `z-[1000]` |
| `intranet/src/layout/AppHeader.tsx` | 317 | `w-[21rem]` |
| `intranet/src/layout/AppHeader.tsx` | 317 | `max-w-[calc(100vw-2rem)]` |
| `intranet/src/layout/AppHeader.tsx` | 569 | `z-[1000]` |
| `intranet/src/layout/AppHeader.tsx` | 590 | `text-[11px]` |
| `intranet/src/layout/AppLayout.tsx` | 17 | `bg-[var(--cds-bg)]` |
| `intranet/src/layout/AppSidebar.tsx` | 390 | `left-[calc(100%+12px)]` |
| `intranet/src/layout/AppSidebar.tsx` | 390 | `z-[80]` |
| `intranet/src/layout/AppSidebar.tsx` | 563 | `-left-[17px]` |
| `intranet/src/layout/AppSidebar.tsx` | 624 | `h-[calc(100vh-24px)]` |
| `intranet/src/layout/AppSidebar.tsx` | 624 | `rounded-[1.75rem]` |
| `intranet/src/layout/AppSidebar.tsx` | 624 | `shadow-[0_20px_70px_-55px_rgba(15,23,42,0.65)]` |
| `intranet/src/layout/AppSidebar.tsx` | 699 | `text-[11px]` |
| `intranet/src/layout/AppSidebar.tsx` | 714 | `text-[11px]` |
| `intranet/src/layout/ProfileModal.tsx` | 129 | `max-h-[90vh]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 168 | `bottom-[calc(env(safe-area-inset-bottom)+1rem)]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 168 | `z-[9999]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 649 | `rounded-[24px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 652 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 652 | `tracking-[0.14em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 674 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 674 | `tracking-[0.14em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 696 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 696 | `tracking-[0.14em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 718 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 718 | `tracking-[0.14em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 731 | `rounded-[24px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 734 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 734 | `tracking-[0.16em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 746 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 749 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 752 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 755 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 796 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 796 | `tracking-[0.16em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 805 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 805 | `tracking-[0.16em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 814 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 814 | `tracking-[0.08em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 823 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 823 | `tracking-[0.16em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 833 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 833 | `tracking-[0.14em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 842 | `min-h-[74px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 878 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 884 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 890 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 896 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 907 | `rounded-[24px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 910 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 910 | `tracking-[0.14em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 927 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 927 | `tracking-[0.14em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 942 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 942 | `tracking-[0.16em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 956 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 959 | `text-[11px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 986 | `xl:grid-cols-[minmax(0,1fr)_360px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 999 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 999 | `tracking-[0.16em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 1037 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 1037 | `tracking-[0.16em]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 1049 | `text-[10px]` |
| `intranet/src/pages/AsistenciaPage.tsx` | 1049 | `tracking-[0.16em]` |

## 9. Bloques extensos de clases repetidos

| Apariciones | Fragmento |
|---:|---|
| 5 | `h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slat…` |
| 5 | `h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none tr…` |
| 5 | `h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none tra…` |
| 5 | `h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none tr…` |
| 5 | `flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${ mensaje.type === 'success' ? 'border-e…` |
| 5 | `inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white tra…` |
| 4 | `inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white tra…` |
| 4 | `inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black upp…` |
| 4 | `inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-whi…` |
| 4 | `inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm font-semibold tex…` |
| 4 | `inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 text-sm font-semibold text-white shad…` |
| 3 | `inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-blue-600 px-5 text-sm font-black text-white trans…` |
| 3 | `inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-600 trans…` |
| 3 | `flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-a…` |
| 3 | `h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slat…` |
| 3 | `h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-800 outline-none …` |
| 3 | `h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none tra…` |
| 3 | `h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-800 outline-none tran…` |
| 3 | `h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none tran…` |
| 2 | `inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black …` |
| 2 | `community-view-action inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-xs…` |
| 2 | `inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate…` |
| 2 | `attendance-outline-toggle inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-slate-300 bg…` |
| 2 | `inline-flex h-10 w-10 items-center justify-center rounded-sm border border-slate-300 bg-white text-slate-700 hover…` |
| 2 | `inline-flex w-fit rounded-sm bg-emerald-50/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 ring-1 ring-e…` |
| 2 | `inline-flex w-fit rounded-sm bg-amber-50/50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 ring-1 ring-amber…` |
| 2 | `inline-flex h-9 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-black text-slat…` |
| 2 | `inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white …` |
| 2 | `rounded-3xl border border-dashed border-amber-200 bg-amber-50/80 px-6 py-5 text-sm text-amber-900 shadow-sm animat…` |
| 2 | `inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-4 text-xs font-black text-white …` |
| 2 | `flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all…` |
| 2 | `h-11 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-600 transition-all durat…` |
| 2 | `inline-flex min-w-[3.5rem] items-center justify-center rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums ring-…` |
| 2 | `mb-2 inline-flex rounded-sm bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700 ri…` |
| 2 | `inline-flex h-9 items-center gap-1.5 rounded-xl border border-accent-300 bg-accent-50 px-3 text-xs font-bold text-…` |
| 2 | `inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white sha…` |
| 2 | `h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-…` |
| 2 | `flex items-start gap-3 rounded-3xl border px-4 py-3 text-sm font-semibold ${ mensaje.type === 'success' ? 'border-…` |
| 2 | `h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-medium text-gray-700 outline-non…` |
| 2 | `h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-800 outline-none tran…` |
| 2 | `rounded-2xl border px-3 py-2 text-sm ${mensaje.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald…` |
| 2 | `inline-flex h-5 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text…` |
| 2 | `h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none tra…` |
| 2 | `carbon-config-modal-panel relative w-full max-w-md rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-[0…` |
| 2 | `rounded-2xl border px-3 py-2 text-sm ${ mensaje.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emeral…` |
| 2 | `h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none tran…` |
| 2 | `h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none tran…` |
| 2 | `inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black te…` |
| 2 | `inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text…` |
| 2 | `inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white tra…` |
