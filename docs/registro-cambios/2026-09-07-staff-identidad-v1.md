# Staff e identidad institucional — primer incremento V1

Fecha: 2026-09-07. Rama: `feat/v1-bloque1-identidad-staff`.
Estado: implementado y aceptado para el primer incremento institucional V1.
Commit previsto: `feat(staff): completa gestion institucional e identidad`.
No creado: el entorno de cierre monta `.git` en solo lectura e impide `git add`
(`index.lock`: Read-only file system). Sin push ni merge.

Antes, `/staff` mostraba ModuloPendientePage. Ahora tiene listado/alta/edición
con API y persistencia, membresías mínimas y autorización por institución.
[Flujo, reglas, campos y límites](../modulos/staff.md).

Reutiliza Prisma, JWT/RolesGuard, bcrypt y los componentes oficiales de UI.
Admin/Director gestionan sus colegios; Secretaría/Profesor se rechazan. Las
escrituras requieren destino inequívoco, validan membresías activas y usan una
transacción serializable. No se migra el esquema: Staff no tiene estado laboral;
no se confunde con disponibilidad de citas ni estado de credenciales.

Archivos: módulo `api/src/staff/`, registro en AppModule, fixture/servidor de
pruebas `api/test/staff-*`, página/formulario/cliente `intranet/src/pages/staff/`,
ruta App, regla central de acceso, pruebas `intranet/tests/staff/` y documentación.

Validaciones en MySQL nuevo bajo `/tmp/staff-v1-mysql`, puerto 33316, base
`staff_v1_test`; API temporal 33317, Vite temporal 33318. La base original no se
utilizó para CRUD, login ni consultas de prueba. Todos los datos son sintéticos.
No se ejecutó seed general ni megasuite.

Resultados aprobados antes de esta revisión de cierre y conservados sin repetir
las ejecuciones costosas (no se modificó código funcional durante el cierre):

- Backend: 20/20 pruebas de integración PASS sobre MySQL aislado; roles,
  tenant/colegio, identidad, membresías, rollback, concurrencia y auditoría.
- API: build y ESLint dirigido PASS. Intranet: build:check y ESLint dirigido PASS.
- Playwright: PASS en 1440×900 y 390×844; login, listado, búsqueda, validación,
  alta con credenciales, edición y `permite_citas` off/on; Profesor redirigido
  desde `/staff` y escritura API 403. Sin errores de consola.
- Teclado, foco, Escape/restauración, reflow 768/1280 y reducción de movimiento:
  PASS. Equivalente de zoom 200% mediante viewport CSS 720×450; no CSS zoom artificial.
- Confirmación estática del script final: «No permite citas» se busca únicamente
  dentro del `li` que contiene la acción de edición del Staff probado.
- Patrones/componentes compartidos: PageHeader, AccessibleDialog, Toast,
  `.card`, `.btn`, `.input` y skeletons; sin CSS ni animaciones propias nuevas.
  Se sustituye la pantalla pendiente por el flujo institucional operativo.
- `git diff --check`: PASS previo al cierre. MySQL/API/Vite temporales cerrados.

La revisión final se limitó al diff del incremento y a coherencia documental,
sin bloqueadores funcionales detectados. Comprobaciones de enlaces locales,
estados de las demás capacidades conservados y sintaxis de `flow.cjs`: PASS.
Staff se clasifica COMPLETO en el plan por aceptación y documentación suficientes
para este alcance; no cierra Usuarios/Roles globales ni la campaña E2E integral.

Reversión: retirar los archivos nuevos y las referencias de ruta/módulo/regla
mediante un patch inverso revisado. No requiere migración inversa; conservar
Persona/Usuario/Staff y sus membresías creadas en uso real. No borrar registros
para revertir la UI. La base temporal es descartable y no contiene datos originales.

Riesgos: los eventos StaffAudit dependen de la retención de logs, sin outbox SQL.
No se reasignan colegios de Staff histórico ni se modifica identidad compartida.
No se verifican módulos ajenos con una campaña completa; se preservan sus contratos.
