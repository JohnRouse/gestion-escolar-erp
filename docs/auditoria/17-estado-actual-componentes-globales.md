# Estado actual de componentes globales

## 1. Propósito

Este documento representa el estado operativo vigente de la unificación de
componentes transversales de la intranet.

Las auditorías `10` a `16` conservan el diagnóstico, las métricas y el plan
original. Algunas de sus mediciones corresponden a versiones anteriores del
frontend.

Cuando una auditoría histórica contradiga el código actual, este documento y
el código vigente tienen prioridad para determinar el estado de implementación.

## 2. Principio de trabajo

La unificación se realiza con el siguiente ciclo:

1. auditar el patrón existente;
2. localizar duplicaciones e inconsistencias;
3. decidir la fuente oficial;
4. implementar o mejorar el componente compartido;
5. migrar consumidores de forma gradual;
6. validar comportamiento y accesibilidad;
7. actualizar la documentación;
8. continuar con el siguiente patrón.

No se deben crear variantes nuevas sin revisar primero los componentes
compartidos existentes.

## 3. Infraestructura de diálogos

### `AccessibleDialog`

Estado: **implementado**.

Responsabilidades actuales:

- portal a `document.body`;
- overlay;
- `role="dialog"`;
- `aria-modal`;
- asociación de título y descripción;
- focus trap;
- foco inicial;
- Escape configurable;
- cierre por overlay configurable;
- bloqueo de cierre durante operaciones;
- retorno del foco;
- bloqueo de scroll del documento;
- botón de cierre accesible;
- scroll interno;
- header, body y footer estructurados;
- alto máximo basado en viewport;
- reducción de movimiento.

La revisión transversal del 28 de agosto de 2026 corrigió el retorno de foco
cuando un consumidor usa `autoFocus` nativo y cuando el cierre ocurre mediante
el `mousedown` del overlay. La primitiva conserva el último foco externo por
instancia y el overlay previene su acción predeterminada antes del cierre.
`initialFocusRef` sigue siendo el contrato recomendado para un destino inicial
explícito; `autoFocus` se conserva como compatibilidad.

Es la fuente oficial para nuevas implementaciones de diálogo.

La corrección del 5 de septiembre de 2026 centraliza Escape y Tab/Shift+Tab
para que solo los procese el diálogo superior, incluso si este bloquea su cierre.
Mantiene retorno de foco y scroll anidado, incluyendo desmontajes y StrictMode.
La validación se realizó con Playwright sobre la primitiva y sus wrappers en
una fixture sin API. [Diseño, resultados y límites](../registro-cambios/2026-09-05-accessible-dialog-teclado-anidado.md).

### `ConfirmDialog`

Estado: **migrado**.

Compone `AccessibleDialog`.

No crear una segunda implementación de confirmación cuando este componente
cubra el caso de uso.

### `CenteredFormModal`

Estado: **migrado**.

Compone `AccessibleDialog`.

Es el patrón compartido para formularios modales que requieran encabezado,
contenido, mensajes y acciones de guardar/cancelar.

### Modales de Comunidad

`CommunityDetailModal` compone directamente `AccessibleDialog`.

`CommunityEditModal` compone `CenteredFormModal`.

Estos componentes ya participan de la infraestructura oficial.

## 4. Diálogos pendientes

### `ReportarPagoModal`

Estado: **migrado**.

El componente utiliza `AccessibleDialog` como infraestructura oficial.

La migración:

- eliminó el overlay y panel modal propios;
- eliminó los tipos `any` locales;
- incorporó semántica, focus trap, Escape, overlay y retorno de foco mediante
  la primitiva compartida;
- impide cerrar el diálogo mientras se envía el comprobante;
- normalizó las etiquetas funcionales a un mínimo de 12 px;
- mejoró la interacción accesible del selector de archivos;
- mantiene las validaciones funcionales existentes;
- conserva creación y corrección de reportes;
- mantiene el callback `onSuccess`.

Durante la auditoría se confirmó además un defecto funcional previo:

`onSuccess` se ejecutaba inmediatamente después del envío, provocando que el
padre refrescara la consulta y desmontara el modal antes de que el usuario
pudiera percibir correctamente el estado de éxito.

El comportamiento vigente muestra primero la confirmación de envío y ejecuta
el refresco cuando la confirmación se cierra manualmente o mediante el
autocierre de 1200 ms que ya existía en el flujo anterior.

### Otros diálogos

`NotasPage` migró sus diálogos de gestión por lote, cierre y reapertura a la
infraestructura oficial:

- la gestión de evaluaciones y la reapertura componen `AccessibleDialog`;
- el cierre del registro compone `ConfirmDialog`;
- se preservaron creación, reordenamiento, guardado, cierre, reapertura y motivo
  opcional;
- los diálogos no pueden cerrarse mientras sus operaciones están activas;
- se validaron en 1440 × 900 y 390 × 844, con teclado, foco visible, Escape,
  overlay, scroll bloqueado y reducción de movimiento;
- la gestión de evaluaciones dirige el foco inicial mediante `initialFocusRef`;
- la corrección transversal de `AccessibleDialog` confirmó retorno de foco por
  Escape, Cancelar, botón de cierre y overlay;
- la base local de demostración no contenía un registro cerrado, por lo que el
  formulario de reapertura no pudo abrirse sin alterar datos persistentes.

`ContinuidadMatriculaModal` fue revisado y no requiere migración: ya compone
transitivamente la infraestructura oficial mediante `CommunityEditModal` →
`CenteredFormModal` → `AccessibleDialog`.

Pendientes de revisión individual antes de modificarse:

- `ComprobantePagoModal`;
- otros overlays locales detectados durante la auditoría por página.

No debe asumirse que todos necesitan refactorización hasta comparar su
implementación vigente con `AccessibleDialog`.

## 5. Header global

Estado: **refactorizado parcialmente**.

El PR #16 separó responsabilidades que antes estaban concentradas en
`AppHeader`.

Actualmente existen componentes dedicados para, entre otros:

- selector institucional;
- menú de usuario.

Debe continuar la revisión de:

- buscador global;
- responsive;
- navegación por teclado;
- foco;
- truncado;
- animaciones;
- reducción de movimiento.

## 6. Sidebar global

Estado: **refactorizado parcialmente**.

El PR #16 extrajo:

- configuración de navegación;
- representación de ítems;
- flyout del modo contraído.

También fueron retiradas implementaciones heredadas que ya no deben utilizarse.

La revisión futura debe centrarse en comportamiento vigente, no en restaurar
la estructura anterior.

## 7. Implementaciones heredadas retiradas

Después de la unificación del shell dejaron de formar parte del frontend
vigente:

- `intranet/src/components/IntranetLayout.tsx`;
- `intranet/src/components/Sidebar.tsx`;
- `intranet/src/components/Topbar.tsx`.

Las referencias a estos archivos dentro de auditorías antiguas son históricas.

## 8. Componentes compartidos todavía relevantes

Además de los diálogos y el shell, el inventario conserva como candidatos
transversales:

- `PageHeader`;
- `AccessCredentialsCard`;
- `Breadcrumb`;
- `ErrorBoundary`;
- `InstitutionMark`;
- `LocationSelects`;
- `PersonAvatar`;
- componentes de tablas y estados de Comunidad;
- `HeaderGlobalSearch`;
- componentes compartidos de Tesorería.

Cada uno debe evaluarse cuando llegue su fase correspondiente.

## 9. Deuda técnica conocida que no bloquea esta fase

`MatriculaPage.tsx` conserva diagnósticos de hooks relacionados con
`set-state-in-effect` y `exhaustive-deps`.

Esta deuda quedó deliberadamente separada de la unificación visual para evitar
cambios de comportamiento no revisados.

Debe abordarse durante la auditoría funcional del módulo Matrícula.

## 10. Próxima tarea

Auditar los diálogos todavía pendientes antes de seleccionar la siguiente
migración.

Los candidatos inmediatos son:

- `ComprobantePagoModal`;
- overlays locales que continúen implementando infraestructura modal propia.

La siguiente elección debe basarse en el código vigente y no únicamente en el
backlog histórico.

Para cada candidato se debe comprobar:

- consumidores reales;
- infraestructura modal utilizada;
- accesibilidad;
- comportamiento de cierre;
- estado de carga;
- responsive;
- duplicación visual;
- deuda TypeScript/ESLint;
- reglas funcionales que deban preservarse.
