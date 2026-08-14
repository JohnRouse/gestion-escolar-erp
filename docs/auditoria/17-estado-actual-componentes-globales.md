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

Es la fuente oficial para nuevas implementaciones de diálogo.

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

Estado: **siguiente prioridad**.

Hallazgos vigentes:

- mantiene overlay y panel propios;
- conserva cierre y estructura independientes;
- todavía contiene tipos `any`;
- no consume `AccessibleDialog`;
- duplica decisiones visuales que ya poseen una fuente compartida.

La siguiente fase debe migrarlo sin alterar el flujo de reporte de pagos.

Debe preservarse:

- creación/corrección del reporte;
- validaciones del formulario;
- adjunto de comprobante;
- estado de envío;
- mensaje de éxito;
- callback `onSuccess`;
- cierre posterior al éxito, si tras la revisión sigue considerándose el
  comportamiento correcto.

### Otros diálogos

Pendientes de revisión individual antes de modificarse:

- `ContinuidadMatriculaModal`;
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

Migrar `intranet/src/components/publico/ReportarPagoModal.tsx` a la
infraestructura oficial de diálogos.

Antes de escribir código se debe revisar:

- API pública actual;
- flujo de estados;
- estructura visual;
- cierre tras éxito;
- accesibilidad;
- responsive;
- tipos de `pago` y `alumno`;
- consumidores del componente.

Después de la migración:

- ejecutar TypeScript/build;
- ejecutar ESLint dirigido;
- ejecutar `git diff --check`;
- revisar el diff funcional;
- actualizar este documento y el registro documental correspondiente.
