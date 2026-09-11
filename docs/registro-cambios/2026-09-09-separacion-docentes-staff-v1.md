# Separación funcional entre Docentes y Staff V1

Fecha: 2026-09-09.
Estado: implementado con validación proporcional; prueba MySQL completa pendiente.
Commit o pull request: no creado; `.git` está disponible solo para lectura en
este entorno. No se realizó merge.

## Motivo y problema detectado

Staff y Docentes estaban mezclados porque la asignación académica de Tutoría
utiliza temporalmente `Staff.es_tutor` e `id_seccion`. Esto hacía que una Persona
registrada únicamente como Docente tutor pudiera aparecer en el directorio de
Staff, mostrar la etiqueta **Tutor asignado** y recibir una ayuda académica en el
formulario de Staff. El seed reproducía el problema con Juan Carlos Ríos Mendoza
y el cargo `Docente tutor`.

## Regla funcional

Ser Docente o Tutor no convierte a una Persona en miembro de Staff. Una Persona
puede pertenecer a ambos dominios cuando ejerce adicionalmente un cargo
institucional no docente.

- Docentes presenta la función académica y la condición de tutor.
- Staff presenta exclusivamente el cargo administrativo, directivo o de soporte.
- Una Persona con ambas funciones conserva un solo registro Persona.
- Los textos del cargo no se utilizan para inferir pertenencia a Staff.

## Comportamiento implementado

Se añadió `Staff.es_miembro_staff`, con valor predeterminado `true`, mediante una
migración aditiva. El CRUD de Staff solo lista, abre y edita registros con ese
valor. Toda alta desde Staff lo establece en `true`. Una asignación de Tutoría
que necesita la estructura legacy crea su registro técnico con `false`; si la
Persona asume después un cargo Staff legítimo, el mismo registro y la misma
Persona se actualizan a `true`, conservando la tutoría.

Auth y Dashboard ya no presentan cargo ni contexto Staff para un registro
exclusivamente académico, pero continúan derivando el acceso a Tutoría de
`es_tutor` e `id_seccion`. El listado de Docentes obtiene de esa compatibilidad
la tutoría asignada y la presenta como función académica. La gestión continúa en
Configuración académica > Secciones.

Cuando una Persona ya es Staff y además recibe una Tutoría, Académicos conserva
el tenant y colegio del cargo institucional y cambia solo los campos académicos
legacy. Auth, Dashboard y Docentes derivan el colegio de Tutoría desde la sección,
no desde el cargo Staff. Esto permite que ambas funciones mantengan contextos
distintos sin duplicar Persona ni sobrescribirse.

La UI de Staff retiró la etiqueta **Tutor asignado** y el texto «Tutoría y sección
asignada se conservan. Su gestión se realiza en el módulo académico». El contrato
TypeScript de Staff tampoco expone `es_tutor` ni `id_seccion` como atributos de
pantalla. El backend rechaza esos campos si se intentan enviar al CRUD de Staff.

El seed marca explícitamente la asignación de Juan Carlos Ríos Mendoza como
técnica (`es_miembro_staff=false`), por lo que conserva el ejemplo de Tutoría y
Docentes sin aparecer como Staff. No se codificó un filtro por nombre o cargo.

El formulario conecta también el domicilio vigente de Persona: dirección,
departamento, provincia y distrito atraviesan cliente, DTO, selección y creación
backend. Se reutiliza `LocationSelects` y no se agrega ninguna columna ni migración
para estos datos porque ya existían en Persona.

La sección ahora se denomina **Acceso al ERP** y explica que pertenecer a Staff no
equivale a tener una cuenta de Usuario. Cuando existe una cuenta muestra por
separado usuario, rol y estado; cuando no existe ofrece **Dar acceso al ERP**.
Los cambios rutinarios de cargo, área o citas ya no exigen texto libre: StaffAudit
genera un motivo automático. Crear o asociar acceso y asignar su rol sí requiere
un motivo explícito y el backend vuelve a validarlo.

## Roles, alcance y trazabilidad

Admin y Director conservan la gestión de Staff. Profesor y Secretaría siguen
sin acceso. Las consultas y escrituras mantienen tenant, colegio y membresías
activas como límites. La reutilización de una Persona Docente solo se permite
cuando su usuario, especialidad o asignación demuestra pertenencia a uno de los
colegios autorizados.

Un registro técnico de Tutoría también puede justificar la reutilización solo
cuando su tenant y colegio (directo o derivado de la sección) pertenecen al
alcance autorizado. Fuera de ese contexto, la consulta por DNI no devuelve los
datos de la Persona. La ausencia de `es_miembro_staff` no convierte una Persona
en «sin vínculos».

La conversión de una asignación técnica en Staff real ocurre dentro de la misma
transacción serializable y el evento `StaffAudit` conserva el valor anterior, el
posterior, actor, fecha, tenant, colegio y motivo automático o explícito. No
registra credenciales.

## Base de datos y compatibilidad histórica

La migración solo agrega `es_miembro_staff BOOLEAN NOT NULL DEFAULT true`. No
elimina ni renombra columnas, relaciones o datos. Los registros históricos
quedan en `true` por defecto: no se borran, ocultan ni reclasifican mediante
heurísticas. Si fueron usados indebidamente para representar Docentes, requieren
una revisión y regularización asistida posterior. Antes de promover el cambio a
un entorno con históricos, se deben identificar candidatos y decidir cada caso
con evidencia institucional; `es_tutor`, `id_seccion` o el texto de `cargo` no
son evidencia suficiente porque una Persona puede tener doble función.

Siguen dependiendo de los campos legacy:

- `AcademicosService`, incluida la asignación y consulta de tutor por sección.
- `AuthService` y `DashboardService`, para el contexto de Tutoría.
- `TutoriaService` y `TutoriaAccessGuard`, para autorización por sección.
- El directorio del portal y Citas, que todavía consumen IDs de Staff.

La regularización futura deberá crear una relación académica explícita de tutor
por sección y año, migrar esos consumidores y solo entonces retirar los campos
legacy. Esta decisión futura no se presenta como implementada.

## Interfaz y auditoría visual

Se conserva el patrón existente de PageHeader, listado híbrido y
AccessibleDialog. Se retiraron dos elementos académicos; no se añadieron tokens,
transiciones ni animaciones. Cargo, área, institución y citas son los únicos
atributos funcionales del Staff mostrados en el directorio. El metadato de alcance
se retiró de la cabecera Staff porque duplicaba el selector institucional global;
la institución continúa visible en cada fila del consolidado.

- Patrón/token: superficies, bordes, foco y tipografía ya vigentes en Staff.
- Componentes compartidos: PageHeader, AccessibleDialog y LocationSelects. Este
  último recibió asociaciones `label`/`htmlFor` explícitas para que los tres
  selectores conserven nombre accesible.
- Resoluciones: Chrome revisado en 1440×900 y 390×844; reflow sin desbordamiento.
- Zoom aumentado: diálogo dentro del viewport en 720×450, equivalente de reflow
  al 200 % sobre escritorio de 1440 px.
- Teclado y foco visible: trampa de foco, foco visible, Escape y retorno aprobados.
- Reducción de movimiento: aprobada; no se añadió animación nueva.
- Hallazgo corregido: mezcla conceptual de Tutoría dentro de Staff.

## Archivos afectados

- Modelo/migración y seed en `api/prisma/`.
- Servicios de Staff, Académicos, Auth y Dashboard.
- Fixture y suite de integración aislada de Staff.
- `StaffPage`, `StaffForm` y contrato de cliente Staff.
- Reglas transversales, arquitectura, ficha de módulo, escenario, plan V1 y
  registros funcionales relacionados.

## Pruebas

Validación proporcional del 10 de septiembre de 2026:

- `npx prisma generate` y `npx prisma validate`: aprobados; no se ejecutó
  `prisma db push`.
- API `npm run build`: aprobado.
- Intranet `npm run build:check`: aprobado, con la advertencia preexistente de
  bundle mayor de 500 kB.
- Jest dirigido en Staff, Auth/Dashboard y Académicos: 14/14 pruebas aprobadas.
  Verifica filtros de listado/detalle, motivo rutinario/sensible, no divulgación de
  una Persona con Tutoría técnica fuera del alcance y los contextos A/B/C/D de
  Docente puro, Tutor académico, Staff puro y Directora + Docente en Auth y
  Dashboard. También prueba que asignar Tutoría no sobrescribe el alcance de un
  Staff con doble función y sí actualiza el alcance de un registro técnico puro.
- ESLint sin `--fix`: aprobado para Staff backend, fixture, Staff frontend y
  `LocationSelects`. La pasada adicional sobre los servicios legacy completos de
  Académicos/Auth/Dashboard sigue fallando por deuda basal masiva de formato y
  tipos fuera de las líneas de este incremento; sus cambios sí compilan en el
  build de API.
- Chrome con API sintética no persistente: aprobó directorio, edición, alta,
  domicilio, cuenta con usuario/rol/estado, acción **Dar acceso al ERP**, ausencia
  de Tutor en Staff, foco, reducción de movimiento, 1440×900, 390×844 y zoom
  equivalente al 200 %. Las capturas quedaron únicamente en `/tmp`.
- Comprobación estática: Staff usa `es_miembro_staff`, los registros técnicos de
  Tutoría usan `false`, Docentes conserva su resumen académico, los campos legacy
  permanecen y no existe filtro nuevo por texto de cargo.
- `git diff --check`: aprobado antes de la actualización final del grafo.

Pendiente no bloqueante: la suite `staff.integration.spec.ts` y la ejecución real
de la migración sobre MySQL aislado. Se intentó la vía rápida indicada: la base
local responde, no contiene aún la columna y `mysqldump --no-data` obtuvo su
estructura en memoria (77 `CREATE TABLE`, incluida la tabla interna de
migraciones), pero el usuario `erp_local` no puede crear una base `*_test`
(`ERROR 1044`) y no existe otra base de prueba autorizada. La restauración no
llegó a iniciarse ni se creó o escribió otra base; la original no se modificó.
No se recurrió a `prisma db push` ni a reconstruir las 76 tablas. La suite quedó actualizada para
domicilio, motivo sensible, separación Staff/Docente y preservación transaccional.

## Riesgos y reversión

La columna aditiva debe desplegarse antes del código que la consulta. El valor
predeterminado evita ocultar históricos, pero también conserva visibles los
registros históricos mal clasificados hasta su revisión asistida. La relación de
Tutoría continúa técnicamente acoplada a Staff y sigue siendo deuda explícita.

Para revertir la conducta se aplica el patch inverso del código y la UI. La
columna puede permanecer sin uso; no debe eliminarse automáticamente como parte
de una reversión urgente. El registro demo puede volver a `true` solo en una base
aislada si se desea reproducir el comportamiento anterior. No se deben eliminar
Personas, Staff ni asignaciones de Tutoría.
