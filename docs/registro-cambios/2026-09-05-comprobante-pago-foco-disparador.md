# Cambio: conservación de foco al abrir comprobantes de pago

## Fecha, estado y módulo

2026-09-05. Implementado y validado. Módulo Tesorería / Centro de pagos.

## Motivo

La auditoría de `ComprobantePagoModal` confirmó que el componente ya utiliza
`AccessibleDialog` directamente y no necesita migración.

El hallazgo funcional estaba en `CobranzasPage`: al solicitar un comprobante,
el botón que originaba la apertura quedaba deshabilitado durante la consulta.
Un control enfocado que pasa a `disabled` puede dejar de ser un origen válido
para el retorno de foco cuando posteriormente se monta el diálogo.

## Cambio aplicado

`CobranzasPage` ahora:

- impide iniciar otra consulta mientras existe un comprobante en carga;
- mantiene enfocable el botón que inició la consulta;
- expone `aria-busy` y `aria-disabled` en ese disparador mientras carga;
- deshabilita los demás disparadores de comprobante durante la misma consulta;
- conserva el endpoint, los parámetros de consulta y el comportamiento financiero existentes.

No se modificó `ComprobantePagoModal`.

## Infraestructura modal auditada

`ComprobantePagoModal` ya compone `AccessibleDialog` y conserva:

- foco inicial mediante `initialFocusRef` sobre `Imprimir / guardar PDF`;
- cierre mediante Escape;
- cierre mediante overlay;
- acción Cerrar;
- retorno de foco;
- scroll lock;
- reducción de movimiento;
- estilos específicos para impresión.

## API y datos

La apertura consulta únicamente:

`GET /api/tesoreria/pagos/{id_transaccion}/comprobante`

No se registraron pagos, no se anularon operaciones y no se ejecutaron
mutaciones financieras durante la validación.

## Validación

Se verificó el flujo real en Chrome/Playwright a 1440×900 y 390×844.

Resultados:

- apertura correcta desde `Ver comprobante`;
- foco inicial en `Imprimir / guardar PDF`;
- Tab y Shift+Tab operables;
- Escape, Cerrar y overlay devuelven el foco;
- `window.print` fue sustituido por un stub para comprobar su invocación;
- imprimir no genera solicitudes adicionales;
- en media print el encabezado y pie del diálogo se ocultan;
- el contenido imprimible permanece visible y con overflow permitido;
- scroll lock correcto;
- reduced motion activo;
- sin errores JavaScript de página;
- `npm --prefix intranet run build:check`: correcto;
- `git diff --check`: correcto.

El lint dirigido de `CobranzasPage.tsx` continúa reportando seis diagnósticos
preexistentes de `@typescript-eslint/no-explicit-any`; esta corrección no añade
usos de `any`.

## Deuda independiente

La auditoría histórica sobre textos menores a 12 px continúa vigente: la
comprobación visual detectó etiquetas pequeñas dentro del comprobante. No se
modificaron en esta corrección porque constituyen deuda visual independiente de
la infraestructura modal y del retorno de foco.

## Riesgos y límites

La validación cubre Chrome y los tamaños indicados. El guardado como PDF depende
del diálogo de impresión del navegador y se validó mediante `window.print` y
emulación de media print, sin automatizar la interfaz nativa de impresión.

## Reversión

Revertir la modificación de `CobranzasPage` y esta documentación. No requiere
reversión de datos, backend, esquema ni operaciones financieras.
