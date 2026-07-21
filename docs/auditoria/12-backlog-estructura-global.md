# Backlog de estructura global

## 1. Propósito

Priorizar la revisión visual de elementos transversales antes de corregir páginas individuales.

## 2. Principio

Una corrección en un componente compartido puede resolver varias inconsistencias simultáneamente.

Antes de modificar una página debe comprobarse si el patrón incorrecto proviene de:

- Layout.
- Header.
- Sidebar.
- Componente compartido.
- Clase CSS global.
- Token.

## 3. Candidatos priorizados

| Prioridad estática | Archivo | Señales |
|---:|---|---|
| 29 | `intranet/src/layout/AppHeader.tsx` | controles sin foco local detectado; texto menor de 12 px; uso de transition-all; keyframes sin reducción local |
| 26 | `intranet/src/components/publico/ReportarPagoModal.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 17 | `intranet/src/layout/AppSidebar.tsx` | controles sin foco local detectado; texto menor de 12 px; uso de transition-all; estilos inline |
| 14 | `intranet/src/components/community/ContinuidadMatriculaModal.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 14 | `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 11 | `intranet/src/components/community/CommunityTableState.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 9 | `intranet/src/components/community/CommunityUI.tsx` | texto menor de 12 px |
| 8 | `intranet/src/components/CenteredFormModal.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 8 | `intranet/src/components/ConfirmDialog.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 8 | `intranet/src/components/ErrorBoundary.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 8 | `intranet/src/components/community/CommunityDetailModal.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 8 | `intranet/src/components/community/CommunityEditModal.tsx` | controles sin foco local detectado; texto menor de 12 px |
| 5 | `intranet/src/components/AccessCredentialsCard.tsx` | controles sin foco local detectado |
| 5 | `intranet/src/components/LocationSelects.tsx` | controles sin foco local detectado |
| 5 | `intranet/src/components/Sidebar.tsx` | controles sin foco local detectado |
| 5 | `intranet/src/components/Topbar.tsx` | controles sin foco local detectado |
| 5 | `intranet/src/components/community/CommunityLinkedPeople.tsx` | controles sin foco local detectado |
| 5 | `intranet/src/components/header/HeaderGlobalSearch.tsx` | controles sin foco local detectado |
| 5 | `intranet/src/layout/ProfileModal.tsx` | controles sin foco local detectado |

## 4. Orden de revisión recomendado

1. `AppLayout.tsx`.
2. `AppHeader.tsx`.
3. `AppSidebar.tsx`.
4. `Backdrop.tsx`.
5. Buscador global.
6. Componentes de campos.
7. Componentes de botones.
8. Componentes de modales.
9. Componentes de tablas.
10. Estados de carga, vacío y error.

## 5. Validaciones necesarias

- 360 × 800.
- 768 × 1024.
- 1024 × 768.
- 1366 × 768.
- 1920 × 1080.
- 2560 × 1440.
- Zoom al 125 %.
- Zoom al 150 %.
- Navegación por teclado.
- Escape en menús y modales.
- Foco visible.
- Reducción de movimiento.
- Scroll principal.
- Scroll de sidebar.
- Scroll de dropdowns.

## 6. Estados permitidos para cada candidato

- Pendiente de revisión visual.
- Error confirmado.
- Inconsistencia confirmada.
- Mejora recomendada.
- Comportamiento válido.
- Excepción justificada.
- Falso positivo.
- Corregido.
- Validado.

## 7. Regla de implementación

No se realizarán correcciones masivas hasta identificar el componente o token que debe convertirse en la fuente oficial del patrón.

## 8. Clasificación posterior a la revisión semántica

### Errores confirmados

- `ConfirmDialog.tsx`: semántica y gestión de foco incompletas.
- `ReportarPagoModal.tsx`: semántica modal, foco, Escape y scroll incompletos.
- Texto funcional menor de 12 px en componentes compartidos.

### Implementación parcialmente correcta

- `CenteredFormModal.tsx`: posee portal, semántica, Escape y bloqueo de scroll, pero carece de focus trap y retorno del foco.

### Deuda estructural confirmada

- `AppHeader.tsx`: estilos internos, animaciones locales, `transition-all` y responsabilidades acumuladas.
- `AppSidebar.tsx`: navegación, flyouts, tooltips, permisos y posicionamiento concentrados.
- Carga global de 49 de los 50 archivos CSS detectados.

### Pendiente de revisión visual

- Comportamiento responsive.
- Truncado.
- Scroll.
- Orden de capas.
- Zoom.
- Navegación completa por teclado.
