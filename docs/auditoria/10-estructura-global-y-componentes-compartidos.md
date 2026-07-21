# Auditoría de estructura global y componentes compartidos

## 1. Objetivo

Revisar la estructura visual que afecta transversalmente a las páginas del ERP.

Esta fase analiza:

- Layout principal.
- Header.
- Sidebar.
- Backdrop.
- Componentes compartidos.
- Estilos CSS globales.
- Tokens CSS existentes.
- Configuración visual del frontend.

## 2. Alcance

- Archivos de layout revisados: 5.
- Componentes compartidos revisados: 24.
- Archivos CSS globales revisados: 49.
- Archivos de configuración revisados: 2.
- Total de archivos considerados: 80.

## 3. Advertencia

Las señales estáticas son candidatos.

No se consideran errores confirmados hasta revisar el comportamiento en ejecución.

## 4. Archivos de estructura global

| Archivo | Líneas | Controles | Foco | Responsive | Transiciones | transition-all | Animaciones | Texto menor de 12 px | Dimensiones px | Inline | Keyframes | Movimiento reducido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `intranet/src/layout/AppHeader.tsx` | 660 | 13 | 0 | 8 | 18 | 7 | 1 | 2 | 1 | 0 | 2 | 0 |
| `intranet/src/layout/AppLayout.tsx` | 35 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `intranet/src/layout/AppSidebar.tsx` | 882 | 10 | 0 | 1 | 5 | 2 | 0 | 2 | 0 | 2 | 0 | 0 |
| `intranet/src/layout/Backdrop.tsx` | 14 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `intranet/src/layout/ProfileModal.tsx` | 370 | 17 | 0 | 1 | 4 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |

## 5. Comportamientos que deben comprobarse visualmente

### Layout principal

- Altura completa de la aplicación.
- Scroll del contenido principal.
- Reinicio del scroll al cambiar de ruta.
- Padding en diferentes resoluciones.
- Entrada y salida visual de las rutas.
- Estabilidad del header y sidebar.
- Ausencia de scroll doble.

### Header

- Selector institucional.
- Buscador global.
- Acciones de usuario.
- Menús desplegables.
- Cierre mediante Escape.
- Foco y retorno del foco.
- Comportamiento móvil.
- Textos truncados.
- Animaciones de apertura y cierre.

### Sidebar

- Estado expandido.
- Estado contraído.
- Menús anidados.
- Flyouts.
- Tooltips.
- Scroll interno.
- Navegación por teclado.
- Estado activo.
- Apertura móvil.
- Reducción de movimiento.

### Backdrop

- Cobertura completa.
- Orden de capas.
- Cierre del sidebar.
- Bloqueo de interacción con el fondo.
- Transición.

## 6. Sistema CSS global

- Variables CSS detectadas: 299.
- Valores de color distintos en CSS global: 221.
- Reglas globales de prefers-reduced-motion: 5.

## 7. Variables CSS detectadas

| Variable | Valor |
|---|---|
| `--color-gray-50` | `#f8f9fa` |
| `--color-gray-100` | `#f1f3f5` |
| `--color-gray-200` | `#e9ecef` |
| `--color-gray-300` | `#dee2e6` |
| `--color-gray-400` | `#ced4da` |
| `--color-gray-500` | `#adb5bd` |
| `--color-gray-600` | `#6c757d` |
| `--color-gray-700` | `#495057` |
| `--color-gray-800` | `#343a40` |
| `--color-gray-900` | `#212529` |
| `--color-accent-50` | `#f0f4ff` |
| `--color-accent-100` | `#dbe4ff` |
| `--color-accent-200` | `#bac8ff` |
| `--color-accent-300` | `#91a7ff` |
| `--color-accent-400` | `#748ffc` |
| `--color-accent-500` | `#5c7cfa` |
| `--color-accent-600` | `#4c6ef5` |
| `--color-accent-700` | `#4263eb` |
| `--color-accent-800` | `#3b5bdb` |
| `--color-accent-900` | `#364fc7` |
| `--color-gray-50` | `#f8f9fa` |
| `--color-gray-100` | `#f1f3f5` |
| `--color-gray-200` | `#e9ecef` |
| `--color-gray-300` | `#dee2e6` |
| `--color-gray-400` | `#ced4da` |
| `--color-gray-500` | `#adb5bd` |
| `--color-gray-600` | `#6c757d` |
| `--color-gray-700` | `#495057` |
| `--color-gray-800` | `#343a40` |
| `--color-gray-900` | `#212529` |
| `--color-accent-50` | `#f0f4ff` |
| `--color-accent-100` | `#dbe4ff` |
| `--color-accent-200` | `#bac8ff` |
| `--color-accent-300` | `#91a7ff` |
| `--color-accent-400` | `#748ffc` |
| `--color-accent-500` | `#5c7cfa` |
| `--color-accent-600` | `#4c6ef5` |
| `--color-accent-700` | `#4263eb` |
| `--color-accent-800` | `#3b5bdb` |
| `--color-accent-900` | `#364fc7` |
| `--erp-carbon-blue-60` | `#0f62fe` |
| `--erp-carbon-blue-70` | `#0043ce` |
| `--erp-carbon-blue-80` | `#002d9c` |
| `--erp-carbon-blue-10` | `#d0e2ff` |
| `--erp-carbon-gray-10` | `#f4f4f4` |
| `--erp-carbon-gray-20` | `#e0e0e0` |
| `--erp-carbon-gray-30` | `#c6c6c6` |
| `--erp-carbon-gray-40` | `#a8a8a8` |
| `--erp-carbon-gray-50` | `#8d8d8d` |
| `--erp-carbon-gray-60` | `#6f6f6f` |
| `--erp-carbon-gray-70` | `#525252` |
| `--erp-carbon-gray-80` | `#393939` |
| `--erp-carbon-gray-90` | `#262626` |
| `--erp-carbon-gray-100` | `#161616` |
| `--erp-carbon-green-60` | `#198038` |
| `--erp-carbon-red-60` | `#da1e28` |
| `--erp-carbon-yellow-30` | `#f1c21b` |
| `--erp-carbon-orange-40` | `#ff832b` |
| `--erp-carbon-bg` | `#f4f4f4` |
| `--erp-carbon-layer` | `#ffffff` |
| `--erp-carbon-layer-alt` | `#f4f4f4` |
| `--erp-carbon-border` | `#e0e0e0` |
| `--erp-carbon-border-strong` | `#c6c6c6` |
| `--erp-carbon-border-input` | `#8d8d8d` |
| `--erp-carbon-text` | `#161616` |
| `--erp-carbon-text-secondary` | `#393939` |
| `--erp-carbon-text-helper` | `#525252` |
| `--erp-carbon-text-placeholder` | `#6f6f6f` |
| `--erp-carbon-radius-xs` | `2px` |
| `--erp-carbon-radius-sm` | `4px` |
| `--erp-carbon-radius-md` | `8px` |
| `--erp-carbon-focus` | `#0f62fe` |
| `--erp-carbon-transition` | `110ms cubic-bezier(0.2, 0, 0.38, 0.9)` |
| `--tw-ring-color` | `rgba(15, 98, 254, 0.22) !important` |
| `--tw-ring-color` | `rgba(15, 98, 254, 0.28) !important` |
| `--erp-carbon-text-strong` | `#111827` |
| `--erp-carbon-text` | `#1f2937` |
| `--erp-carbon-text-soft` | `#5b6574` |
| `--erp-carbon-border-2` | `#d8e0ea` |
| `--erp-carbon-bg-card` | `#ffffff` |
| `--erp-carbon-bg-soft` | `#f8fafc` |
| `--erp-carbon-primary-strong` | `#0f62fe` |
| `--erp-carbon-chip-text` | `#243142` |
| `--erp-readable-title` | `#161616` |
| `--erp-readable-text` | `#262626` |
| `--erp-readable-muted` | `#393939` |
| `--erp-readable-helper` | `#525252` |
| `--erp-readable-black` | `#161616` |
| `--erp-readable-text` | `#262626` |
| `--erp-readable-muted` | `#393939` |
| `--erp-readable-soft` | `#525252` |
| `--erp-border-carbon` | `#d0d7de` |
| `--erp-panel-carbon` | `#ffffff` |
| `--erp-bg-carbon` | `#f4f4f4` |
| `--erp-blue-carbon` | `#0f62fe` |
| `--community-blue` | `#0f62fe` |
| `--community-blue-dark` | `#0043ce` |
| `--community-header` | `#262626` |
| `--community-border` | `#c5ced8` |
| `--community-row-border` | `#d7dee7` |
| `--community-muted` | `#475569` |
| `--danger` | `hover { border-color: #da1e28 !important` |
| `--matricula-blue` | `#0f62fe` |
| `--matricula-blue-dark` | `#0043ce` |
| `--matricula-border` | `#c6c6c6` |
| `--matricula-border-soft` | `#e0e0e0` |
| `--matricula-text` | `#161616` |
| `--matricula-muted` | `#525252` |
| `--matricula-background` | `#f4f4f4` |
| `--selected` | `hover { border-color: #198038 !important` |
| `--active` | `hover { border-color: #0043ce` |
| `--active` | `hover { border-color: #0043ce !important` |
| `--action` | `hover:not(:disabled) { border-color: #0f62fe !important` |
| `--action` | `focus-visible { outline: 2px solid #0f62fe` |
| `--action` | `disabled { cursor: not-allowed` |
| `--action` | `disabled small { color: #6f6f6f` |
| `--hc-text` | `#161616` |
| `--hc-muted` | `#525252` |
| `--hc-border` | `#d0d7de` |
| `--hc-border-soft` | `#e5e7eb` |
| `--hc-bg` | `#ffffff` |
| `--hc-surface` | `#f4f4f4` |
| `--hc-input` | `#f1f5f9` |
| `--hc-blue` | `#0f62fe` |
| `--hc-blue-hover` | `#0353e9` |
| `--erp-cohesion-border` | `#d8e0ea` |
| `--erp-cohesion-border-soft` | `#e5edf5` |
| `--erp-cohesion-soft` | `#f8fafc` |
| `--erp-cohesion-blue` | `#2563eb` |
| `--erp-cohesion-shadow` | `0 1px 2px rgba(15, 23, 42, 0.06)` |
| `--erp-cohesion-shadow-hover` | `0 8px 24px rgba(15, 23, 42, 0.08)` |
| `--tw-ring-color` | `transparent !important` |
| `--tw-ring-color` | `transparent !important` |
| `--erp-polish-border` | `#d8e0ea` |
| `--erp-polish-soft-border` | `#e5edf5` |
| `--erp-polish-bg` | `#ffffff` |
| `--erp-polish-soft` | `#f8fafc` |
| `--erp-polish-track` | `#edf2f7` |
| `--erp-polish-shadow` | `0 1px 2px rgba(15, 23, 42, 0.06)` |
| `--erp-polish-shadow-hover` | `0 8px 24px rgba(15, 23, 42, 0.08)` |
| `--erp-final-page` | `#f4f4f4` |
| `--erp-final-layer` | `#ffffff` |
| `--erp-final-soft` | `#f8fafc` |
| `--erp-final-border` | `#d8e0ea` |
| `--erp-final-border-strong` | `#c2cedc` |
| `--erp-final-text` | `#111827` |
| `--erp-final-muted` | `#475569` |
| `--erp-final-helper` | `#64748b` |
| `--erp-final-blue` | `#0f62fe` |
| `--erp-final-black` | `#161616` |
| `--agenda-border` | `#d8e0ea` |
| `--agenda-border-strong` | `#c2cedc` |
| `--agenda-layer` | `#ffffff` |
| `--agenda-soft` | `#f8fafc` |
| `--agenda-text` | `#111827` |
| `--agenda-muted` | `#475569` |
| `--agenda-helper` | `#64748b` |
| `--agenda-blue` | `#0f62fe` |
| `--agenda-black` | `#161616` |
| `--agenda-danger` | `#b42318` |
| `--centro-border` | `#d8e0ea` |
| `--centro-border-strong` | `#c2cedc` |
| `--centro-soft` | `#f8fafc` |
| `--centro-text` | `#111827` |
| `--centro-muted` | `#475569` |
| `--centro-helper` | `#64748b` |
| `--centro-blue` | `#0f62fe` |
| `--centro-black` | `#161616` |
| `--centro-danger` | `#b42318` |
| `--erp-readable-900` | `#161616` |
| `--erp-readable-800` | `#262626` |
| `--erp-readable-700` | `#374151` |
| `--erp-readable-600` | `#4b5563` |
| `--erp-line` | `#d5dce5` |
| `--erp-line-strong` | `#aeb8c4` |
| `--erp-header-bg` | `#e9eef4` |
| `--erp-row-alt` | `#fafbfd` |
| `--erp-focus` | `#0f62fe` |
| `--tw-ring-color` | `#dfe5ec !important` |
| `--tw-ring-color` | `transparent !important` |
| `--tw-ring-color` | `#cbd3dd !important` |
| `--cds-blue-60` | `#0f62fe` |
| `--cds-blue-70` | `#0043ce` |
| `--cds-blue-50` | `#4589ff` |
| `--cds-blue-20` | `#a6c8ff` |
| `--cds-blue-10` | `#d0e2ff` |
| `--cds-gray-10` | `#f4f4f4` |
| `--cds-gray-20` | `#e0e0e0` |
| `--cds-gray-30` | `#c6c6c6` |
| `--cds-gray-40` | `#a8a8a8` |
| `--cds-gray-50` | `#8d8d8d` |
| `--cds-gray-60` | `#6f6f6f` |
| `--cds-gray-70` | `#525252` |
| `--cds-gray-80` | `#393939` |
| `--cds-gray-90` | `#262626` |
| `--cds-gray-100` | `#161616` |
| `--cds-green-60` | `#198038` |
| `--cds-red-60` | `#da1e28` |
| `--cds-yellow-30` | `#f1c21b` |
| `--cds-cyan-60` | `#009d9a` |
| `--cds-purple-60` | `#8a3ffc` |
| `--cds-bg` | `#f4f4f4` |
| `--cds-layer` | `#ffffff` |
| `--cds-layer-alt` | `#f4f4f4` |
| `--cds-border-subtle` | `#e0e0e0` |
| `--cds-border-strong` | `#8d8d8d` |
| `--cds-text-primary` | `#161616` |
| `--cds-text-secondary` | `#525252` |
| `--cds-text-helper` | `#6f6f6f` |
| `--cds-focus` | `#0f62fe` |
| `--cds-radius-sm` | `2px` |
| `--cds-radius-md` | `4px` |
| `--cds-radius-lg` | `8px` |
| `--cds-transition` | `110ms cubic-bezier(0.2, 0, 0.38, 0.9)` |
| `--dashboard-accent` | `#0f62fe` |
| `--dashboard-border` | `#e0e0e0` |
| `--dashboard-muted` | `#525252` |
| `--dashboard-soft` | `#f4f4f4` |
| `--tw-ring-color` | `#e0e0e0 !important` |
| `--community-border` | `#e0e0e0` |
| `--community-muted` | `#525252` |
| `--community-soft` | `#f4f4f4` |
| `--community-blue` | `#0f62fe` |
| `--carbon-line` | `#e0e0e0` |
| `--carbon-line-strong` | `#c6c6c6` |
| `--carbon-layer` | `#ffffff` |
| `--carbon-layer-alt` | `#f4f4f4` |
| `--carbon-text` | `#161616` |
| `--carbon-muted` | `#525252` |
| `--carbon-blue` | `#0f62fe` |
| `--teso-border` | `#e0e0e0` |
| `--teso-border-strong` | `#c6c6c6` |
| `--teso-bg` | `#f4f4f4` |
| `--teso-layer` | `#ffffff` |
| `--teso-text` | `#161616` |
| `--teso-muted` | `#525252` |
| `--teso-blue` | `#0f62fe` |
| `--report-border` | `#e0e0e0` |
| `--report-border-strong` | `#c6c6c6` |
| `--report-bg` | `#f4f4f4` |
| `--report-layer` | `#ffffff` |
| `--report-layer-alt` | `#f4f4f4` |
| `--report-text` | `#161616` |
| `--report-muted` | `#525252` |
| `--report-helper` | `#6f6f6f` |
| `--report-blue` | `#0f62fe` |
| `--report-blue-dark` | `#0043ce` |
| `--report-green` | `#198038` |
| `--report-red` | `#da1e28` |
| `--report-yellow` | `#f1c21b` |
| `--config-border` | `#e0e0e0` |
| `--config-border-strong` | `#c6c6c6` |
| `--config-bg` | `#f4f4f4` |
| `--config-layer` | `#ffffff` |
| `--config-layer-alt` | `#f4f4f4` |
| `--config-text` | `#161616` |
| `--config-muted` | `#525252` |
| `--config-helper` | `#6f6f6f` |
| `--config-blue` | `#0f62fe` |
| `--config-blue-dark` | `#0043ce` |
| `--config-green` | `#198038` |
| `--config-red` | `#da1e28` |
| `--config-yellow` | `#f1c21b` |
| `--config-border` | `#e0e0e0` |
| `--config-border-strong` | `#c6c6c6` |
| `--config-layer` | `#ffffff` |
| `--config-layer-alt` | `#f4f4f4` |
| `--config-text` | `#161616` |
| `--config-muted` | `#525252` |
| `--config-helper` | `#6f6f6f` |
| `--config-blue` | `#0f62fe` |
| `--config-blue-dark` | `#0043ce` |
| `--readable-text` | `#161616` |
| `--readable-muted` | `#393939` |
| `--readable-helper` | `#525252` |
| `--readable-border` | `#c6c6c6` |
| `--mat-border` | `#e0e0e0` |
| `--mat-border-strong` | `#c6c6c6` |
| `--mat-layer` | `#ffffff` |
| `--mat-alt` | `#f4f4f4` |
| `--mat-text` | `#161616` |
| `--mat-muted` | `#393939` |
| `--mat-helper` | `#525252` |
| `--mat-blue` | `#0f62fe` |
| `--mat-blue-dark` | `#0043ce` |
| `--mat-green` | `#198038` |
| `--mat-red` | `#da1e28` |
| `--mat-yellow` | `#f1c21b` |
| `--tw-ring-color` | `rgba(15, 98, 254, 0.30) !important` |
| `--carbon-page-bg` | `#f4f4f4` |
| `--carbon-layer` | `#ffffff` |
| `--carbon-layer-soft` | `#f8f9fb` |
| `--carbon-border` | `#d9dee7` |
| `--carbon-border-strong` | `#b9c3d1` |
| `--carbon-text` | `#161616` |
| `--carbon-muted` | `#525252` |
| `--carbon-helper` | `#6f6f6f` |
| `--carbon-blue` | `#0f62fe` |
| `--carbon-blue-soft` | `#edf5ff` |

## 8. Colores más frecuentes en CSS global

| Color | Apariciones |
|---|---:|
| `#ffffff` | 310 |
| `#161616` | 177 |
| `#0f62fe` | 126 |
| `#f4f4f4` | 99 |
| `#525252` | 99 |
| `#c6c6c6` | 88 |
| `#e0e0e0` | 68 |
| `#0043ce` | 65 |
| `#6f6f6f` | 61 |
| `#edf5ff` | 51 |
| `#393939` | 48 |
| `#8d8d8d` | 44 |
| `#a6c8ff` | 33 |
| `#f8fafc` | 28 |
| `#262626` | 23 |
| `#0e6027` | 23 |
| `#da1e28` | 21 |
| `#ccf32f` | 20 |
| `#f1c21b` | 19 |
| `#defbe6` | 17 |
| `#24a148` | 17 |
| `#64748b` | 16 |
| `#78a9ff` | 15 |
| `#198038` | 14 |
| `#fff1f1` | 14 |
| `#d0e2ff` | 13 |
| `#d9e2f1` | 13 |
| `#0f172a` | 12 |
| `#a7f0ba` | 12 |
| `#475569` | 12 |
| `rgba(15, 98, 254, 0.12)` | 12 |
| `#fddc69` | 11 |
| `#a2191f` | 11 |
| `#a8a8a8` | 10 |
| `#d8e0ea` | 10 |
| `#cbd5e1` | 10 |
| `#111827` | 9 |
| `#e2e8f0` | 8 |
| `#684e00` | 8 |
| `#374151` | 8 |
| `#fcf4d6` | 7 |
| `#ffb3b8` | 7 |
| `#42be65` | 7 |
| `#fff8e1` | 7 |
| `rgba(15, 23, 42, 0.04)` | 7 |
| `#002d9c` | 6 |
| `#4589ff` | 6 |
| `#94a3b8` | 6 |
| `#ffd7d9` | 5 |
| `#eff6ff` | 5 |
| `#dbe3ec` | 5 |
| `rgba(22, 22, 22, 0.56)` | 5 |
| `rgba(0, 0, 0, 0.22)` | 5 |
| `rgba(15, 23, 42, 0.07)` | 5 |
| `rgba(15, 23, 42, 0.06)` | 5 |
| `#8a3800` | 4 |
| `#8a3ffc` | 4 |
| `#f1f5f9` | 4 |
| `#c2cedc` | 4 |
| `rgba(0, 0, 0, 0.18)` | 4 |

## 9. Archivos CSS incluidos

- `intranet/src/index.css`
- `intranet/src/App.css`
- `intranet/src/styles/carbon/00-tokens.css`
- `intranet/src/styles/carbon/01-accessibility.css`
- `intranet/src/styles/carbon/02-components.css`
- `intranet/src/styles/carbon/03-modals.css`
- `intranet/src/styles/carbon/04-page-scopes.css`
- `intranet/src/styles/carbon/05-pending-polish.css`
- `intranet/src/styles/carbon/06-final-visual-polish.css`
- `intranet/src/styles/carbon/06-usabilidad-final.css`
- `intranet/src/styles/carbon/07-ux-legibility-profile-header.css`
- `intranet/src/styles/carbon/08-pageheader-consistency.css`
- `intranet/src/styles/carbon/09-pageheader-profile-icons-final.css`
- `intranet/src/styles/carbon/10-tesoreria-comunidad-legibilidad.css`
- `intranet/src/styles/carbon/100-comunidad-login-final.css`
- `intranet/src/styles/carbon/101-configuracion-ux.css`
- `intranet/src/styles/carbon/102-operacion-matricula-tesoreria.css`
- `intranet/src/styles/carbon/103-selecciones-sidebar-y-cabeceras.css`
- `intranet/src/styles/carbon/104-matricula-modales-selecciones.css`
- `intranet/src/styles/carbon/105-pensiones-carbon-ui.css`
- `intranet/src/styles/carbon/106-sidebar-hover-ultimos-registros.css`
- `intranet/src/styles/carbon/107-asistencia-mobile-carbon.css`
- `intranet/src/styles/carbon/108-calendario-horario-ux.css`
- `intranet/src/styles/carbon/109-header-selector-busqueda-global.css`
- `intranet/src/styles/carbon/11-modal-header-search-flicker-fix.css`
- `intranet/src/styles/carbon/110-sidebar-branding-institucional.css`
- `intranet/src/styles/carbon/111-matricula-flujo-compacto.css`
- `intranet/src/styles/carbon/112-renovacion-historial-tabs.css`
- `intranet/src/styles/carbon/113-historial-filtros-revision.css`
- `intranet/src/styles/carbon/114-asistencia-desktop-mobile-ux.css`
- `intranet/src/styles/carbon/115-calendario-docentes-interaccion.css`
- `intranet/src/styles/carbon/116-calendario-programacion-rapida.css`
- `intranet/src/styles/carbon/116-comunidad-listados-filtros.css`
- `intranet/src/styles/carbon/117-comunidad-tablas-credenciales.css`
- `intranet/src/styles/carbon/118-matricula-persona-modales.css`
- `intranet/src/styles/carbon/12-contexto-sidebar-selector-legibilidad.css`
- `intranet/src/styles/carbon/13-institution-mark.css`
- `intranet/src/styles/carbon/14-error-boundary.css`
- `intranet/src/styles/carbon/15-docentes-crud.css`
- `intranet/src/styles/carbon/16-location-selects.css`
- `intranet/src/styles/carbon/17-horario-academico.css`
- `intranet/src/styles/carbon/18-reportes-dashboard-cohesion.css`
- `intranet/src/styles/carbon/19-reportes-dashboard-polish.css`
- `intranet/src/styles/carbon/20-dashboard-reportes-final.css`
- `intranet/src/styles/carbon/21-agenda-cobranzas-polish.css`
- `intranet/src/styles/carbon/22-centro-pagos-agrupado.css`
- `intranet/src/styles/carbon/99-legibilidad-y-tablas.css`
- `intranet/src/styles/carbon/carbon-refactor.css`
- `intranet/src/styles/carbon-theme.css`

## 10. Archivos de configuración incluidos

- `intranet/package.json`
- `intranet/vite.config.ts`
