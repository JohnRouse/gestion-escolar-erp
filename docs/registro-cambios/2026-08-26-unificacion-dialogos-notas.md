# Unificación de diálogos de Registro de Notas

Fecha: 2026-08-26

## Objetivo

Retirar la infraestructura modal local de `NotasPage` y reutilizar las
primitivas oficiales sin cambiar reglas académicas, permisos, contratos de API
ni persistencia.

## Cambios implementados

- La gestión por lote de evaluaciones compone `AccessibleDialog` y conserva su
  contenido, creación, reordenamiento y guardado.
- El cierre del registro compone `ConfirmDialog` y conserva título,
  descripción, acción y estado de procesamiento.
- La reapertura compone `AccessibleDialog`, conserva el motivo opcional y dirige
  el foco inicial al textarea etiquetado.
- El cierre por Escape, overlay, botón o cancelación queda bloqueado durante
  `guardandoModal` o `procesandoRegistro`.
- Se retiraron `isClosing`, los keyframes y las clases de entrada/salida locales.
- El retorno del foco al elemento previamente enfocado queda proporcionado por
  `AccessibleDialog`, también cuando se utiliza mediante `ConfirmDialog`.
- El input de descripción utiliza `initialFocusRef`; se retiró su `autoFocus`
  nativo porque este se ejecutaba antes de que `AccessibleDialog` capturara el
  foco externo. La primitiva compartida no se modificó en este cambio.

## Alcance preservado

No se modificaron endpoints, payloads, permisos, cálculo de promedios, lógica de
notas, backend, Prisma ni base de datos. Las pruebas no confirmaron operaciones
de cierre, reapertura, creación, eliminación ni reordenamiento.

## Validaciones

- `git diff --check`: correcto.
- `npm --prefix intranet run build:check`: correcto; permanece el aviso conocido
  de tamaño de chunks de Vite.
- ESLint dirigido: 11 errores y 1 warning preexistentes, ninguno en las líneas
  migradas.
- Playwright, 1440 × 900: gestión por lote y confirmación de cierre renderizadas;
  Escape y Cancelar devolvieron el foco. El overlay cerró el diálogo, pero su
  `mousedown` dejó después el foco en `body`; la corrección general queda fuera
  de este cambio local.
- Playwright, 390 × 844: ambos diálogos caben en el viewport, mantienen header,
  contenido desplazable, acciones accesibles y retorno de foco.
- `prefers-reduced-motion: reduce`: animación del diálogo desactivada.
- Consola: dos respuestas 401 de `/api/auth/perfil` previas al inicio de sesión;
  sin errores durante los flujos autenticados.
- Red: solicitudes autenticadas de Notas respondieron 200; no se observaron
  fallos del módulo.

La base local de demostración no contenía un registro cerrado disponible. El
diálogo de reapertura quedó validado estáticamente y por build, pero no pudo
probarse visualmente sin modificar datos persistentes.

## Reversión

Revertir los cambios de `NotasPage.tsx` y retirar estas actualizaciones
documentales. No existe reversión de datos porque no se modificaron datos ni
esquema.

## Estado

En pruebas, pendiente de validación visual del diálogo de reapertura con un
registro cerrado disponible.
