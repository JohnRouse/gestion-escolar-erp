# Staff institucional

## Estado y propósito

Gestión institucional V1 de Staff en `/staff`, con listado, búsqueda, alta,
edición y credenciales internas. Reutiliza Persona, Usuario, Rol, Staff,
UsuarioTenant y UsuarioColegio. La función y su incremento visual responsive
están implementados y aceptados mediante validaciones dirigidas; resultados en
los registros de cambio.

## Roles y alcance

Admin y Director pueden listar, crear y editar, como establece la navegación
vigente de Personal y el CRUD de Docentes. Secretaría y Profesor no tienen
gestión de Staff. Solo Admin puede crear/asociar una cuenta con rol Admin.
No se conceden privilegios de Super SaaS.

Cada petición exige `tenant_id` y **una** modalidad: `scope=all` o `colegio_id`.
El backend vuelve a consultar usuario activo, tenant activo, UsuarioTenant activo,
colegios activos y UsuarioColegio activo con rol Admin/Director. El rol global
también debe autorizar la gestión. Una membresía de tenant por sí sola no abre
todos sus colegios. El consolidado muestra exclusivamente los colegios
administrables de ese tenant. Un colegio específico limita lectura y escritura.
En el alta, incluso en consolidado, `id_colegio` es obligatorio y debe pertenecer
al alcance. Un ID de recurso ajeno no revela su existencia (404); un destino o
tenant no autorizado produce 403. La sesión previa no elude una membresía inactiva.

## Datos y flujo

1. Entrar a Staff, buscar por nombre completo, DNI, cargo o área. Filtrar si
   permite citas; paginación de 20 registros (API admite de 1 a 100).
2. Abrir **Nuevo miembro**, ingresar y comprobar el DNI.
3. Si Persona no existe, completar nombres, ambos apellidos y fecha de nacimiento
   (obligatorios actuales), teléfono y correo opcionales. DNI: ocho dígitos, único.
   La fecha no puede ser futura. Correo es contacto, no identificador de login ni
   columna única; no se inventa una restricción por email.
4. Una Persona sin vínculos institucionales o vinculada mediante un usuario a
   colegios del alcance puede reutilizarse. No se divulgan identidades vinculadas
   exclusivamente a otra institución. Si ya tiene Staff, se debe editar ese
   registro: `Staff.id_persona` es único. Los datos personales reutilizados son
   de solo lectura y el servidor los conserva aunque el cliente envíe otros.
5. Elegir colegio, cargo (100 caracteres), área (50), permite citas y motivo.
6. Opcionalmente crear/asociar acceso con username y rol existente permitido:
   Admin, Director, Secretaria o Profesor. Username se normaliza a minúsculas,
   es único y admite entre 3 y 50 caracteres. Para una cuenta nueva se requiere
   contraseña inicial de al menos 8 caracteres y como máximo 72 bytes UTF-8;
   se almacena con bcrypt, coste 10, siguiendo el patrón vigente.
7. Al asociar una cuenta se exige la misma Persona y rol. No se cambia username,
   contraseña, rol global ni estado. No se crea otra cuenta de la misma Persona
   y rol con un username distinto. No se recuperan ni muestran contraseñas.
8. Asegurar membresía tenant (`Miembro`) y colegio (rol de la cuenta). Se crean
   solo las ausentes, conservando roles/estados/principal existentes. La primera
   membresía de colegio es principal si no había otra. Una cuenta o membresía
   inactiva bloquea la asociación; no se reactiva implícitamente.
9. Guardar. Persona + Staff + Usuario + ambas membresías se escriben en una
   transacción serializable. Un conflicto de DNI/username o concurrencia produce
   409 sin altas parciales. Se muestra error recuperable conservando el formulario.
10. Editar cargo, área, disponibilidad de citas y asociar acceso posteriormente.
    Se conservan Persona, colegio, sección, `es_tutor` y las citas históricas.

## Estados, compatibilidad y dependencias

Staff **no tiene columna de estado**. No hay activar/inactivar Staff ni borrar.
`permite_citas` controla exclusivamente disponibilidad de citas, no login ni baja
laboral. Los estados de Usuario y membresías son independientes. No se creó
migración porque los campos vigentes permiten el flujo solicitado condicional.

Se conservan IDs y relaciones existentes. Staff antiguo con tenant nulo se
admite si su colegio demuestra pertenencia; si no tiene colegio, puede deducirse
por su sección. Una edición completa tenant/colegio con esa pertenencia probada.
Staff sin colegio ni sección demostrable no se expone globalmente: queda pendiente
su regularización con evidencia institucional. No se asigna arbitrariamente.

AuthService sigue leyendo Staff para cargo y contexto. Docentes sigue usando sus
propios datos y credenciales. No se modifica AuthContext ni SchoolContext.
El directorio del portal y Citas siguen consumiendo los mismos campos/IDs.
La asignación de sección/tutor se mantiene en el proceso académico existente;
este formulario no concede Tutoría ni reasigna secciones. Citas, Enfermería y
Notificaciones no se implementan en este incremento.

## API

Rutas backend; intranet usa el prefijo proxy `/api`.

| Método y ruta | Finalidad |
|---|---|
| `GET /staff` | Listado paginado; `q`, `citas=si/no`, `page`, `limit` |
| `GET /staff/:id` | Detalle y resumen de accesos pertinentes, sin hashes |
| `GET /staff/personas/:dni` | Comprobar documento/reutilizar Persona autorizada; `null` si no existe |
| `POST /staff` | Alta institucional y acceso opcional |
| `PUT /staff/:id` | Editar campos institucionales y acceso opcional |

Todas exigen el contexto y JWT. DTOs con ValidationPipe local rechazan campos
extra, tipos incorrectos, longitudes e identificadores inválidos. Las escrituras
usan `id_colegio`, `cargo`, `area`, `permite_citas`, `motivo`; alta añade `persona`
y opcionalmente `acceso: {username, rol, password?}`. Edición rechaza `persona`.
No hay endpoint de eliminación, cambio de estado de Staff ni recuperación.

## Trazabilidad y errores

Después de confirmar la transacción se emite un evento JSON `StaffAudit` con
acción, usuario, fecha, tenant, colegio, motivo, anterior/posterior y resumen del
acceso creado/asociado. No registra contraseña ni hash. Son logs operativos:
**no es un historial SQL transaccional ni una consulta de auditoría en UI**.
La conservación depende de la recolección y retención de logs del despliegue;
una caída entre commit y emisión no queda cubierta por una outbox persistente.
Ese límite permanece explícito para el cierre transversal de auditoría.

La UI incluye carga estructural, vacío diferenciado, error/reintento, recarga
parcial, bloqueo al guardar y Toast de éxito/error. El cambio de alcance descarta
el formulario y resultados del alcance anterior. El directorio usa un patrón
híbrido: lista tabular de densidad administrativa desde escritorio y fichas
estructuradas en tablet/móvil, sin comprimir una tabla. Nombre y DNI forman la
identidad primaria; cargo, área, institución y citas conservan jerarquía secundaria.

El formulario reutiliza AccessibleDialog con encabezado y pie estables, scroll
interno y tres grupos: identidad personal, asignación institucional y acceso al
sistema. PageHeader, Toast y skeletons compartidos se mantienen. Los controles
usan la paleta y estados funcionales vigentes, foco visible y áreas táctiles de
44 px; no se añade CSS, librería ni animación propia. Las transiciones se limitan
a color durante interacción y se eliminan con reducción de movimiento.

## Pruebas y límites

- Backend: suite dirigida `api/src/staff/staff.integration.spec.ts`, con HTTP,
  JWT real, Prisma real y MySQL temporal. Cubre permisos, aislamiento, identidad,
  login, duplicados concurrentes, edición y rollback incluso después de escribir
  las cinco entidades. No usa mocks de persistencia.
- Navegador: `intranet/tests/staff/flow.cjs`, contra servidor/API y DB temporales;
  flujo de Admin, alta/edición, disponibilidad de citas, Profesor rechazado,
  foco, Escape, zoom y errores de consola. Resultado final en registro de cambio.
- [Procedimiento reproducible](../../intranet/tests/staff/README.md).
- Incremento visual V1: build y ESLint dirigidos; revisión Chrome con API
  sintética de solo lectura en 1440×900, 1280×800, 768×900, 390×844 y equivalente
  de zoom 200 % en 720×450. Sin desbordamiento horizontal ni errores de consola;
  diálogo dentro del viewport, scroll interno, foco atrapado, Escape/retorno de
  foco y reducción de movimiento comprobados. Las capturas fueron temporales y
  no se versionan. El E2E transaccional previo no se reconstruyó porque su harness
  exige una instancia MySQL aislada; las reglas y el cliente API no cambiaron.
- Pendientes reales: ciclo laboral activo/inactivo de Staff (requiere decisión de
  modelo), traslados con historial, edición de identidad compartida, regularización
  de Staff sin pertenencia demostrable, administración/reactivación de membresías
  y auditoría persistente. No equivalen a una consola completa de Usuarios/Roles.

## Historial

[Primer incremento V1](../registro-cambios/2026-09-07-staff-identidad-v1.md).
[Experiencia visual y responsive V1](../registro-cambios/2026-09-09-staff-ux-v1.md).
