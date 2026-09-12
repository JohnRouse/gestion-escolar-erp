# Staff institucional

## Estado y propósito

Gestión institucional V1 de Staff en `/staff`, con listado, búsqueda, alta,
edición y cuentas de acceso al ERP. Reutiliza Persona, Usuario, Rol, Staff,
UsuarioTenant y UsuarioColegio. La función y su incremento visual responsive
están implementados y aceptados mediante validaciones dirigidas; resultados en
los registros de cambio.

**Regla funcional V1:** Ser Docente o Tutor no convierte a una Persona en
miembro de Staff. Una Persona puede pertenecer a ambos dominios cuando ejerce
adicionalmente un cargo institucional no docente. En ese caso se reutiliza la
misma Persona, Docentes presenta su función académica y Staff presenta únicamente
su cargo institucional.

## Roles y alcance

Admin y Director pueden listar, crear y editar, como establece la navegación
vigente de Personal y el CRUD de Docentes. Secretaría y Profesor no tienen
gestión de Staff. Solo Admin puede crear/asociar una cuenta con rol Admin.
Admin puede administrar cuentas institucionales permitidas dentro de todo su
alcance. Director no puede crear o elevar una cuenta a Admin ni modificar,
restablecer o desactivar una cuenta Admin. Los roles no institucionales y las
futuras cuentas Super SaaS se rechazan en backend. No se conceden privilegios de
plataforma desde Staff.

Cada petición exige `tenant_id` y **una** modalidad: `scope=all` o `colegio_id`.
El backend vuelve a consultar usuario activo, tenant activo, UsuarioTenant activo,
colegios activos y UsuarioColegio activo con rol Admin/Director. El rol global
también debe autorizar la gestión y la jerarquía sensible usa el `rol_colegio`
efectivo de la institución afectada. Una membresía de tenant por sí sola no abre
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
   (obligatorios actuales); teléfono, correo, dirección, departamento, provincia y
   distrito son opcionales. DNI: ocho dígitos, único. La fecha no puede ser futura.
   Correo es contacto, no identificador de login ni columna única; no se inventa
   una restricción por email. El domicilio reutiliza las columnas vigentes de
   Persona y `LocationSelects`; no necesita otra migración.
4. Una Persona sin vínculos institucionales, vinculada mediante un usuario o
   vinculada como Docente a colegios del alcance puede reutilizarse. No se
   divulgan identidades vinculadas exclusivamente a otra institución. Si ya es
   miembro institucional de Staff, se debe editar ese registro:
   `Staff.id_persona` es único. Durante el alta, los datos de una Persona
   reutilizada se conservan para no sobrescribirla como efecto secundario de la
   vinculación.
   Un registro técnico de Tutoría solo habilita esa reutilización cuando su
   tenant y colegio, directo o derivado de la sección, están dentro del alcance
   activo; fuera de ese contexto el lookup por DNI no divulga la Persona.
5. Elegir colegio, cargo institucional no puramente docente (por ejemplo,
   Dirección, Secretaría, Tesorería, Coordinación académica, Psicología,
   Administración o Soporte), área y disponibilidad de citas. Profesor,
   Docente, Docente tutor o Tutor de aula no justifican por sí solos un alta en
   Staff.
6. Opcionalmente elegir **Dar acceso al ERP** para crear/asociar una cuenta de
   usuario con username y rol existente permitido:
   Admin, Director, Secretaria o Profesor. Username se normaliza a minúsculas,
   es único y admite entre 3 y 50 caracteres. Para una cuenta nueva se requiere
   contraseña inicial de al menos 8 caracteres y como máximo 72 bytes UTF-8;
   se almacena con bcrypt, coste 10, siguiendo el patrón vigente. Esta operación
   sensible exige un motivo explícito por el acceso y rol concedidos.
7. Al asociar inicialmente una cuenta se exige la misma Persona y rol. No se
   cambia username, contraseña, rol global ni estado como efecto implícito de la
   asociación. No se crea otra cuenta de la misma Persona y rol con un username
   distinto. No se recuperan ni muestran contraseñas.
8. Asegurar membresía tenant (`Miembro`) y colegio (rol de la cuenta). Se crean
   solo las ausentes, conservando roles/estados/principal existentes. La primera
   membresía de colegio es principal si no había otra. Una cuenta o membresía
   inactiva bloquea la asociación; no se reactiva implícitamente.
9. Guardar. Persona + Staff + Usuario + ambas membresías se escriben en una
   transacción serializable. Un conflicto de DNI/username o concurrencia produce
   409 sin altas parciales. Se muestra error recuperable conservando el formulario.
10. Editar nombres, ambos apellidos, fecha de nacimiento, teléfono, correo,
    dirección, departamento, provincia, distrito y DNI sobre la Persona canónica
    existente; no se crea otra Persona. DNI mantiene exactamente ocho dígitos y
    unicidad. Antes de escribir, el servicio reúne los contextos conocidos de
    Staff, Usuario, Docente, Estudiante y Apoderado. Otro tenant o un colegio que
    el actor no administra produce 403 y ninguna escritura. Que la Persona sea
    también Docente o Usuario dentro del mismo alcance no bloquea la corrección:
    esos módulos leen los mismos datos actualizados.
11. Editar cargo, área y disponibilidad de citas sin escribir una justificación
    para esos cambios rutinarios. La edición de Persona tampoco pide motivo; la
    auditoría genera uno automáticamente.
12. En una cuenta existente, **Editar acceso** permite cambiar un solo dato
    sensible por operación: username normalizado y único, rol controlado o estado
    en el colegio del Staff. **Restablecer contraseña** exige nueva contraseña y
    confirmación, usa el mínimo vigente de 8 caracteres y máximo de 72 bytes, y
    guarda únicamente bcrypt. Toda operación exige motivo explícito.
13. Desactivar afecta la membresía del colegio administrado, no las membresías
    ajenas. Activar asegura Usuario, UsuarioTenant y la membresía de ese colegio,
    pero solo después de comprobar que la cuenta no tiene tenants o colegios
    fuera de la autoridad del actor. Cambiar rol sincroniza el rol global vigente
    y las membresías del mismo tenant porque la autenticación actual depende de
    `Usuario.id_rol`; si esa operación tendría efecto fuera del alcance se rechaza.
    Staff no muestra ni permite editar tutoría o sección académica. Las columnas
    legacy se conservan sin cambios y las citas históricas permanecen asociadas.

## Estados, compatibilidad y dependencias

Staff **no tiene columna de estado**. No hay activar/inactivar Staff ni borrar.
`permite_citas` controla exclusivamente disponibilidad de citas, no login ni baja
laboral. Los estados de Usuario y membresías son independientes.

`es_miembro_staff` separa la pertenencia institucional de la asignación técnica
legacy de Tutoría. El alta de Staff lo establece en `true`; una asignación de
tutor que necesita conservar temporalmente `Staff.es_tutor` e `id_seccion` crea
el registro técnico con `false`. El listado, detalle y edición de Staff exigen
`true`. Si una Persona con asignación técnica asume después un cargo institucional,
se actualiza el mismo registro y la misma Persona, sin duplicarlas y conservando
la asignación académica. Si ambos roles corresponden a colegios distintos dentro
del alcance autorizado, `Staff.id_colegio` conserva el cargo institucional y la
Tutoría deriva su colegio desde `Staff.id_seccion`; ninguno pisa al otro.

Se conservan IDs y relaciones existentes. Staff antiguo con tenant nulo se
admite si su colegio demuestra pertenencia; si no tiene colegio, puede deducirse
por su sección. Una edición completa tenant/colegio con esa pertenencia probada.
Staff sin colegio ni sección demostrable no se expone globalmente: queda pendiente
su regularización con evidencia institucional. No se asigna arbitrariamente.

AuthService y Dashboard solo presentan cargo/contexto Staff cuando
`es_miembro_staff=true`, pero siguen derivando Tutoría desde los campos legacy.
Docentes muestra allí la condición de tutor y sigue usando sus propios datos y
credenciales. El directorio del portal, Citas, TutoriaService,
TutoriaAccessGuard, AuthService, DashboardService y la configuración académica
de Secciones aún consumen `Staff.es_tutor` o `id_seccion`; por eso esas columnas
no se eliminan ni se renombran en este incremento.

La regularización técnica futura debe mover la asignación de tutor a una relación
académica explícita por sección y año, migrar con evidencia todos esos consumidores
y clasificar los registros históricos. La migración aditiva de este incremento
deja los registros existentes con `es_miembro_staff=true`: no intenta inferir su
función desde `cargo`, no filtra por textos y no borra ni reclasifica datos
históricos automáticamente. El seed conocido de Juan Carlos Ríos Mendoza sí se
marca explícitamente como asignación técnica de Tutoría y deja de aparecer en
Staff. Citas, Enfermería y Notificaciones no se implementan en este incremento.

## API

Rutas backend; intranet usa el prefijo proxy `/api`.

| Método y ruta              | Finalidad                                                              |
| -------------------------- | ---------------------------------------------------------------------- |
| `GET /staff`               | Listado paginado; `q`, `citas=si/no`, `page`, `limit`                  |
| `GET /staff/:id`           | Detalle y resumen de accesos pertinentes, sin hashes                   |
| `GET /staff/personas/:dni` | Comprobar documento/reutilizar Persona autorizada; `null` si no existe |
| `POST /staff`              | Alta institucional y acceso opcional                                   |
| `PUT /staff/:id`           | Editar campos institucionales y acceso opcional                        |
| `PATCH /staff/:id/accesos/:usuarioId` | Username, rol, reset de contraseña o estado de una cuenta existente |

Todas exigen el contexto y JWT. DTOs con ValidationPipe local rechazan campos
extra, tipos incorrectos, longitudes e identificadores inválidos. Las escrituras
usan `id_colegio`, `cargo`, `area`, `permite_citas`; alta añade `persona` con el
domicilio opcional ya existente. `acceso: {username, rol, password?}` y `motivo`
son opcionales como bloque funcional, pero el backend exige `motivo` cuando hay
`acceso`. Edición acepta `persona` y actualiza por `id_persona`; nunca hace alta
de Persona en ese caso. El PATCH sensible recibe `accion`, un único dato acorde
a esa acción y `motivo`; rechaza campos adicionales o combinaciones ambiguas.
`es_tutor`, `id_seccion` y `es_miembro_staff` no forman parte del contrato de
escritura de Staff y son rechazados si el cliente intenta administrarlos.
No hay endpoint de eliminación, cambio de estado de Staff ni recuperación.

## Trazabilidad y errores

Después de confirmar la transacción se emite un evento JSON `StaffAudit` con
acción, usuario, fecha, tenant, colegio, motivo, anterior/posterior y resumen del
acceso creado/asociado. En operaciones rutinarias el sistema registra
automáticamente `Alta rutinaria de Staff` o `Actualización rutinaria de Staff`;
la edición de Persona, incluido DNI, queda dentro de ese before/after. Al dar o
administrar acceso conserva el motivo explícito y emite acciones específicas de
username, rol, contraseña o estado. El reset solo registra que ocurrió; no
registra contraseña ni hash. Son logs operativos:
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
No se muestran etiquetas de tutor, secciones de tutoría ni otros atributos
académicos de Docentes.

El formulario reutiliza AccessibleDialog con encabezado y pie estables, scroll
interno y tres grupos: identidad personal (incluido domicilio mediante
`LocationSelects`), asignación institucional y acceso al ERP. La sección de
acceso explica que Staff y Usuario son conceptos independientes; si existe cuenta
muestra usuario, rol, estado, **Editar acceso** y **Restablecer contraseña**. Las
acciones abren diálogos secundarios `AccessibleDialog`, evitando alargar la ficha
principal. Solo ofrece **Dar acceso al ERP** cuando no hay una vinculada.
PageHeader, Toast y skeletons compartidos se mantienen. Staff no
repite `Todos los colegios` en su cabecera porque el selector institucional global
ya comunica el alcance; en consolidado cada fila conserva la institución. Los controles
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
- Cierre proporcional de separación Staff/Docente: builds API/intranet, Prisma
  validate/generate, 14/14 pruebas unitarias dirigidas y ESLint del módulo
  aprobaron. Las pruebas cubren los cuatro contextos funcionales y el aislamiento
  del lookup de una Persona con registro técnico de Tutoría. Chrome
  revisó directorio, alta, edición, domicilio, acceso ERP y ausencia de Tutor en
  1440×900, 390×844 y zoom equivalente al 200 %. La suite transaccional y la
  aplicación real de la migración quedan pendientes: `mysqldump --no-data`
  obtuvo la estructura local, pero el usuario de MySQL no puede crear una base
  `*_test` y no existe otra aislada autorizada. La base original no se modificó y
  no se ejecutó `prisma db push`.
- Cierre funcional de septiembre de 2026: Jest unitario dirigido cubre edición
  canónica por Admin/Director, colegio fuera de alcance, DNI duplicado, identidad
  Docente+Staff única, username duplicado, bcrypt sin secretos en log, jerarquía
  Director/Admin, rol y activación/desactivación. Académicos prueba tutor y no
  tutor desde `tutorias_resumen`. Chrome sintético no persistente revisa Docentes,
  Persona, tarjeta de acceso y ambos diálogos en 1440×900 y 390×844.
- Pendientes reales: ciclo laboral activo/inactivo de Staff (requiere decisión de
  modelo), traslados con historial, regularización académica de
  `es_tutor`/`id_seccion`, clasificación asistida de Staff histórico, Staff sin
  pertenencia demostrable, consola general de Usuarios/Roles y auditoría
  persistente. Staff administra solo la cuenta y membresía ligadas a su colegio;
no reemplaza la administración global.

En el directorio de Docentes, la relación académica ya resumida como
`tutorias_resumen` controla una etiqueta discreta **Tutor** junto al nombre. Se
mantiene el texto `Tutor de <sección>` y un docente sin asignación no recibe la
etiqueta. No se consulta ni se interpreta el cargo de Staff.

## Historial

[Primer incremento V1](../registro-cambios/2026-09-07-staff-identidad-v1.md).
[Experiencia visual y responsive V1](../registro-cambios/2026-09-09-staff-ux-v1.md).
[Separación funcional entre Docentes y Staff](../registro-cambios/2026-09-09-separacion-docentes-staff-v1.md).
[Cierre funcional de identidad y accesos](../registro-cambios/2026-09-11-staff-identidad-accesos-cierre.md).
