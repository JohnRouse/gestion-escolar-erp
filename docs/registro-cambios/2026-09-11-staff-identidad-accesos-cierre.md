# Staff — cierre de identidad y accesos existentes

Fecha: 2026-09-11. Rama: `feat/v1-staff-ux`. PR existente: #27.
Estado: implementado y validado de forma estática, unitaria y visual.
No se realizó commit, push ni merge.

## Motivo y problema confirmado

La prueba manual posterior a la aceptación visual encontró tres carencias
funcionales: Docentes describía la sección tutorada pero no identificaba al
tutor de inmediato; Staff impedía corregir la Persona canónica durante una
edición; y las cuentas existentes solo se mostraban, sin administración de
username, rol, contraseña o estado.

Este incremento cierra esos puntos sin rediseñar el directorio ni el formulario
aprobados, sin cambiar `es_miembro_staff`, la separación Staff/Docente, domicilio,
doble función o migración existente.

## Comportamiento implementado

### Tutor en Docentes

Docentes muestra un badge discreto **Tutor** junto al nombre solo cuando
`tutorias_resumen` contiene una asignación académica real. Se conserva `Tutor de
<sección>`. Un docente sin Tutoría no recibe el badge. No se utiliza `cargo`, no
se infieren nombres y Tutor continúa fuera de Staff.

### Persona canónica

En la edición de Staff son editables nombres, apellidos, fecha de nacimiento,
teléfono, correo, dirección, departamento, provincia, distrito y DNI. El DTO
mantiene validación de longitudes, correo y fecha; DNI exige ocho dígitos. La API
actualiza `Persona.id_persona` existente dentro de la misma transacción de Staff:
no crea otra Persona. Los opcionales pueden limpiarse a `null`.

Antes de modificar, el servicio reúne contextos conocidos mediante Staff,
Usuario, Docente, Estudiante y Apoderado. Otro tenant o un colegio que el actor
no administra produce 403 con mensaje explícito. Una Persona que también es
Docente o Usuario dentro del mismo alcance sí se actualiza una sola vez para que
todos los módulos vean la corrección. Una colisión de DNI produce 409.

### Cuenta existente

La tarjeta **Acceso al ERP** conserva Usuario, Rol y Estado, y agrega **Editar
acceso** y **Restablecer contraseña**. Ambos abren `AccessibleDialog` anidados;
StaffForm no se convierte en una secuencia mayor de campos.

- Username: formato de 3–50 caracteres admitidos, normalización a minúsculas y
  unicidad; duplicado devuelve 409.
- Rol: selector de roles institucionales. Como la autenticación actual usa el
  rol global, el cambio sincroniza `Usuario.id_rol` y las membresías del mismo
  tenant, únicamente cuando todas están dentro de la autoridad del actor.
- Contraseña: se pide nueva clave y confirmación; mínimo de 8 caracteres,
  máximo de 72 bytes y bcrypt con coste vigente 10. La actual nunca se consulta,
  muestra o recupera.
- Estado: desactivar actúa sobre `UsuarioColegio` del colegio del Staff; activar
  asegura Usuario, UsuarioTenant y esa membresía autorizada. No modifica o
  reactiva membresías de otro contexto.

Cada operación sensible admite exactamente un dato de acción y exige motivo de
3–300 caracteres tanto en DTO como en servicio.

## Jerarquía y alcance

Admin puede administrar roles institucionales dentro de su tenant/colegios
autorizados, incluido Admin según la política vigente. Director puede operar
Personas y cuentas de sus colegios, pero el backend le impide crear/elevar a
Admin y también modificar, restablecer o desactivar una cuenta Admin. Un rol no
institucional o futuro privilegio Super SaaS se rechaza. Una cuenta con tenant o
colegio fuera de la autoridad del actor no puede sufrir una mutación global
desde Staff. La jerarquía toma el `rol_colegio` efectivo en cada institución
afectada, incluso si el rol global del actor fuera más alto.

## Auditoría

La edición rutinaria de Persona no pide motivo. `StaffAudit` registra actor,
fecha, tenant, colegio y Staff/Persona anterior y posterior; por ello el cambio
de DNI conserva anterior/nuevo. Username, rol, reset y estado emiten eventos
`staff.acceso.*` con motivo explícito y resumen before/after. El reset solo marca
`password_restablecida: true`: nunca registra contraseña, `password_hash` ni
secretos.

La auditoría continúa siendo log operativo posterior al commit de la
transacción, no historial SQL ni outbox persistente. Ese límite transversal no
se oculta ni se amplía en este PR.

## API y base de datos

Se agregó `PATCH /staff/:id/accesos/:usuarioId` con `StaffAccessManageDto`.
`PUT /staff/:id` acepta Persona validada en edición. `GET /staff/:id` expone el
ID de cuenta y estados/rol de la membresía pertinente, nunca hashes.

No se modificó `schema.prisma`, no se creó migración y no se ejecutó `prisma db
push`, seed, reset ni escritura sobre la base local real.

## Interfaz, responsive y accesibilidad

- Patrón/tokens: superficies slate/blanco, azul funcional, verde/neutro de
  estado, borde, tipografía mínima de 12 px y botones de 44 px ya vigentes.
- Compartidos: PageHeader, AccessibleDialog, LocationSelects y Toast; el nuevo
  diálogo específico solo compone esos patrones.
- Animaciones: no se añadió animación; hover/foco conserva transición de color
  de 150 ms y `motion-reduce`; los diálogos heredan 200 ms y reducción de
  movimiento del componente compartido.
- Chrome: 1440×900 y 390×844 para Docentes, Persona, tarjeta de acceso, edición
  de acceso y reset. Reflow equivalente a zoom 200 % en contexto nuevo de
  720×450. Sin overflow horizontal ni errores de consola.
- Teclado/foco: foco visible, Escape exclusivo del diálogo superior y retorno al
  botón disparador. Contraseña usa campos `type=password`; todos tienen label.

Las capturas de revisión son temporales en `/tmp` y no se versionan.

## Pruebas y resultados

- Jest dirigido: 4 suites, 24 pruebas. Cubre Admin y Director sobre Persona,
  colegio fuera de alcance 403, DNI duplicado, Persona Docente+Staff única,
  username duplicado, bcrypt y log sin secreto, cambio de rol, jerarquía
  Director/Admin, activación/desactivación y tutor/no tutor.
- API build: aprobado.
- Intranet `build:check`: aprobado; permanece aviso histórico de chunk mayor de
  500 kB.
- ESLint dirigido sin `--fix`: aprobado.
- `git diff --check`: aprobado en el cierre.
- `graphify update .`: ejecutado al cierre para actualizar el grafo.

La suite transaccional MySQL no se ejecutó porque la instancia aislada del
harness no estaba levantada y la instrucción de este incremento prohíbe
reconstruirlo. Sus expectativas incompatibles con Persona de solo lectura sí se
actualizaron. No se tocó la base local real.

## Archivos y reversión

Los archivos exactos quedan enumerados por `git diff --stat` en el informe del
cierre. La reversión consiste en aplicar el patch inverso de código y
documentación; no requiere rollback de esquema. Para revertir datos operados en
un entorno futuro se usa otra edición autorizada y auditada, nunca eliminación
de Persona, Usuario o membresías.
