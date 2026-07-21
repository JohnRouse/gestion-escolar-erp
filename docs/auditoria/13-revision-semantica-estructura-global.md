# Revisión semántica de la estructura global

## 1. Objetivo

Refinar la auditoría estática de layout, header, sidebar, buscador y diálogos compartidos.

Esta revisión busca señales verificables en el código relacionadas con:

- Foco.
- Menús desplegables.
- Atributos ARIA.
- Diálogos.
- Tecla Escape.
- Focus trap.
- Retorno del foco.
- Reducción de movimiento.
- Transiciones.
- Texto menor de 12 px.

## 2. Advertencia

La ausencia de una señal local no confirma por sí sola un error.

El comportamiento puede provenir de hooks, utilidades o componentes externos.

## 3. Matriz

| Prioridad | Archivo | Botones | Campos | aria-label | aria-expanded | aria-haspopup | role dialog | aria-modal | Escape | Focus trap | Retorno foco | transition-all | Texto menor 12 px | Keyframes | Movimiento reducido |
|---:|---|---:|---:|---:|---:|---:|---|---|---|---|---|---:|---:|---:|---:|
| 45 | `intranet/src/components/publico/ReportarPagoModal.tsx` | 4 | 6 | 0 | 0 | 0 | No | No | No | No | No | 0 | 7 | 0 | 0 |
| 35 | `intranet/src/components/ConfirmDialog.tsx` | 3 | 0 | 0 | 0 | 0 | No | No | No | No | No | 0 | 1 | 0 | 0 |
| 35 | `intranet/src/components/community/CommunityDetailModal.tsx` | 1 | 0 | 0 | 0 | 0 | No | No | No | No | No | 0 | 1 | 0 | 0 |
| 35 | `intranet/src/components/community/CommunityEditModal.tsx` | 3 | 0 | 0 | 0 | 0 | No | No | No | No | No | 0 | 1 | 0 | 0 |
| 33 | `intranet/src/components/community/ContinuidadMatriculaModal.tsx` | 0 | 2 | 0 | 0 | 0 | No | No | No | No | No | 0 | 3 | 0 | 0 |
| 33 | `intranet/src/components/tesoreria/ComprobantePagoModal.tsx` | 3 | 0 | 0 | 0 | 0 | No | No | No | No | No | 0 | 3 | 0 | 0 |
| 31 | `intranet/src/layout/AppHeader.tsx` | 12 | 1 | 3 | 1 | 0 | No | No | Sí | No | No | 7 | 2 | 2 | 0 |
| 20 | `intranet/src/components/CenteredFormModal.tsx` | 3 | 0 | 2 | 0 | 0 | Sí | Sí | Sí | No | No | 0 | 1 | 0 | 0 |
| 18 | `intranet/src/layout/AppSidebar.tsx` | 10 | 0 | 2 | 0 | 0 | No | No | No | No | No | 2 | 2 | 0 | 0 |
| 9 | `intranet/src/components/community/CommunityUI.tsx` | 0 | 2 | 0 | 0 | 0 | No | No | No | No | No | 0 | 3 | 0 | 0 |
| 6 | `intranet/src/components/community/CommunityTableState.tsx` | 2 | 0 | 0 | 0 | 0 | No | No | No | No | No | 0 | 2 | 0 | 0 |
| 3 | `intranet/src/components/ErrorBoundary.tsx` | 1 | 0 | 0 | 0 | 0 | No | No | No | No | No | 0 | 1 | 0 | 0 |
| 3 | `intranet/src/components/header/HeaderGlobalSearch.tsx` | 5 | 1 | 5 | 1 | 0 | No | No | Sí | No | No | 0 | 0 | 0 | 0 |
| 0 | `intranet/src/layout/AppLayout.tsx` | 0 | 0 | 0 | 0 | 0 | No | No | No | No | No | 0 | 0 | 0 | 0 |
| 0 | `intranet/src/layout/Backdrop.tsx` | 0 | 0 | 0 | 0 | 0 | No | No | No | No | No | 0 | 0 | 0 | 0 |

## 4. Candidatos por archivo

### `intranet/src/components/publico/ReportarPagoModal.tsx`

- Pendiente de comprobar: 7 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: candidato a diálogo sin role=dialog detectado.
- Pendiente de comprobar: candidato a diálogo sin aria-modal detectado.
- Pendiente de comprobar: candidato a diálogo sin cierre Escape detectado.
- Pendiente de comprobar: candidato a diálogo sin señal de focus trap.
- Pendiente de comprobar: sin señal de retorno del foco al disparador.

### `intranet/src/components/ConfirmDialog.tsx`

- Pendiente de comprobar: 1 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: controles desplegables sin aria-expanded detectado.
- Pendiente de comprobar: controles desplegables sin aria-haspopup detectado.
- Pendiente de comprobar: candidato a diálogo sin role=dialog detectado.
- Pendiente de comprobar: candidato a diálogo sin aria-modal detectado.
- Pendiente de comprobar: candidato a diálogo sin cierre Escape detectado.
- Pendiente de comprobar: candidato a diálogo sin señal de focus trap.
- Pendiente de comprobar: sin señal de retorno del foco al disparador.

### `intranet/src/components/community/CommunityDetailModal.tsx`

- Pendiente de comprobar: 1 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: controles desplegables sin aria-expanded detectado.
- Pendiente de comprobar: controles desplegables sin aria-haspopup detectado.
- Pendiente de comprobar: candidato a diálogo sin role=dialog detectado.
- Pendiente de comprobar: candidato a diálogo sin aria-modal detectado.
- Pendiente de comprobar: candidato a diálogo sin cierre Escape detectado.
- Pendiente de comprobar: candidato a diálogo sin señal de focus trap.
- Pendiente de comprobar: sin señal de retorno del foco al disparador.

### `intranet/src/components/community/CommunityEditModal.tsx`

- Pendiente de comprobar: 1 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: controles desplegables sin aria-expanded detectado.
- Pendiente de comprobar: controles desplegables sin aria-haspopup detectado.
- Pendiente de comprobar: candidato a diálogo sin role=dialog detectado.
- Pendiente de comprobar: candidato a diálogo sin aria-modal detectado.
- Pendiente de comprobar: candidato a diálogo sin cierre Escape detectado.
- Pendiente de comprobar: candidato a diálogo sin señal de focus trap.
- Pendiente de comprobar: sin señal de retorno del foco al disparador.

### `intranet/src/components/community/ContinuidadMatriculaModal.tsx`

- Pendiente de comprobar: 3 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: candidato a diálogo sin role=dialog detectado.
- Pendiente de comprobar: candidato a diálogo sin aria-modal detectado.
- Pendiente de comprobar: candidato a diálogo sin cierre Escape detectado.
- Pendiente de comprobar: candidato a diálogo sin señal de focus trap.
- Pendiente de comprobar: sin señal de retorno del foco al disparador.

### `intranet/src/components/tesoreria/ComprobantePagoModal.tsx`

- Pendiente de comprobar: 3 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: candidato a diálogo sin role=dialog detectado.
- Pendiente de comprobar: candidato a diálogo sin aria-modal detectado.
- Pendiente de comprobar: candidato a diálogo sin cierre Escape detectado.
- Pendiente de comprobar: candidato a diálogo sin señal de focus trap.
- Pendiente de comprobar: sin señal de retorno del foco al disparador.

### `intranet/src/layout/AppHeader.tsx`

- Pendiente de comprobar: 7 uso(s) de transition-all.
- Pendiente de comprobar: 2 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: keyframes sin reducción de movimiento local.
- Pendiente de comprobar: estilos CSS declarados dentro del componente.
- Pendiente de comprobar: controles desplegables sin aria-haspopup detectado.

### `intranet/src/components/CenteredFormModal.tsx`

- Pendiente de comprobar: 1 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: controles desplegables sin aria-expanded detectado.
- Pendiente de comprobar: controles desplegables sin aria-haspopup detectado.
- Pendiente de comprobar: candidato a diálogo sin señal de focus trap.
- Pendiente de comprobar: sin señal de retorno del foco al disparador.

### `intranet/src/layout/AppSidebar.tsx`

- Pendiente de comprobar: 2 uso(s) de transition-all.
- Pendiente de comprobar: 2 texto(s) menor(es) de 12 px.
- Pendiente de comprobar: controles desplegables sin aria-expanded detectado.
- Pendiente de comprobar: controles desplegables sin aria-haspopup detectado.

### `intranet/src/components/community/CommunityUI.tsx`

- Pendiente de comprobar: 3 texto(s) menor(es) de 12 px.

### `intranet/src/components/community/CommunityTableState.tsx`

- Pendiente de comprobar: 2 texto(s) menor(es) de 12 px.

### `intranet/src/components/ErrorBoundary.tsx`

- Pendiente de comprobar: 1 texto(s) menor(es) de 12 px.

### `intranet/src/components/header/HeaderGlobalSearch.tsx`

- Pendiente de comprobar: controles desplegables sin aria-haspopup detectado.

### `intranet/src/layout/AppLayout.tsx`

- Sin señales prioritarias en esta comprobación.

### `intranet/src/layout/Backdrop.tsx`

- Sin señales prioritarias en esta comprobación.

## 5. Comprobaciones visuales obligatorias

### Header

- Abrir y cerrar selector institucional.
- Abrir y cerrar menú de usuario.
- Comprobar Escape.
- Comprobar foco visible.
- Comprobar aria-expanded en ejecución.
- Revisar truncado de institución y usuario.
- Revisar 360, 768, 1024 y 1366 px.
- Revisar zoom de 125 % y 150 %.

### Sidebar

- Navegar completamente mediante teclado.
- Expandir y contraer grupos.
- Comprobar flyout del modo contraído.
- Comprobar tooltips con teclado.
- Revisar foco al cambiar de ruta.
- Revisar cierre móvil.
- Revisar scroll interno.

### Diálogos

- Foco inicial.
- Focus trap.
- Cierre mediante Escape.
- Retorno del foco.
- aria-modal.
- Nombre accesible.
- Scroll con contenido largo.
- Altura máxima.
- Vista móvil.

## 6. Regla de corrección

No se corregirá cada modal por separado antes de determinar si debe existir un contenedor compartido de diálogo accesible.
