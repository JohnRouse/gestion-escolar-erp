# Migración de ReportarPagoModal a diálogo accesible

Fecha: 2026-08-14

## 1. Objetivo

Migrar el reporte público de comprobantes de pago a la infraestructura
compartida `AccessibleDialog`, eliminando la implementación modal duplicada y
corrigiendo los defectos confirmados durante la auditoría.

## 2. Archivo funcional principal

- `intranet/src/components/publico/ReportarPagoModal.tsx`

## 3. Comportamiento anterior

El componente:

- implementaba manualmente overlay y panel;
- no utilizaba la primitiva accesible compartida;
- contenía tipos `any` para pago, alumno y errores;
- utilizaba etiquetas funcionales de 11 px;
- permitía una implementación de cierre independiente del resto del sistema.

Además existía un defecto en el flujo posterior al envío.

Después de registrar correctamente el comprobante, el modal ejecutaba
`onSuccess` inmediatamente.

El consumidor respondía refrescando la consulta pública, que temporalmente
establecía `data` en `null`.

Como el render del modal dependía de esa información, podía desmontarse antes
de que el usuario percibiera correctamente el mensaje de éxito.

## 4. Comportamiento nuevo

El componente:

- compone `AccessibleDialog`;
- utiliza tipos explícitos para pago y alumno;
- trata errores Axios desde `unknown`;
- hereda semántica de diálogo, focus trap, Escape, overlay, scroll lock y
  retorno de foco;
- bloquea el cierre durante el envío;
- utiliza etiquetas funcionales de al menos 12 px;
- mantiene accesible el selector de comprobante;
- mantiene las validaciones existentes del formulario;
- mantiene creación y corrección de reportes.

Después de un envío correcto:

1. se muestra el estado de éxito;
2. el diálogo permanece visible;
3. el usuario puede leer la confirmación;
4. al cerrar o pulsar `Entendido`, se cierra el modal;
5. después se ejecuta `onSuccess`;
6. el consumidor refresca el estado de pagos.

## 5. Reglas funcionales preservadas

Se mantienen:

- colegio;
- DNI;
- cronograma;
- referencia de pago;
- medio de pago;
- banco para transferencias;
- monto;
- número de operación;
- nombre del pagador;
- comprobante obligatorio;
- modos de reporte inicial y corrección;
- observación previa del colegio.

No se modificó:

- API;
- backend;
- base de datos;
- reglas financieras.

## 6. Accesibilidad

La migración reutiliza las capacidades ya validadas de `AccessibleDialog`:

- `role="dialog"`;
- `aria-modal`;
- título y descripción asociados;
- foco inicial;
- focus trap;
- Escape;
- cierre por overlay;
- retorno del foco;
- bloqueo de scroll;
- reducción de movimiento.

Los mensajes de error utilizan `role="alert"` y el estado de éxito utiliza
`role="status"`.

## 7. Validaciones técnicas

Resultados obtenidos antes del commit:

- `git diff --check`: correcto;
- ESLint dirigido: correcto;
- `@typescript-eslint/no-explicit-any`: correcto;
- `npm --prefix intranet run build:check`: correcto;
- no quedan `text-[11px]` en `ReportarPagoModal`;
- no quedan usos explícitos de `any` en el componente.

Vite conserva el aviso existente de bundle superior a 500 kB. Este aviso no
fue introducido ni se aborda en esta migración.

## 8. Alcance pendiente

La siguiente fase debe auditar los diálogos restantes, incluyendo:

- `ComprobantePagoModal`;
- `ContinuidadMatriculaModal`;
- overlays locales todavía no migrados.

La selección debe realizarse después de revisar su implementación actual.
