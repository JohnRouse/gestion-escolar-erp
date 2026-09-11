# Plan de cierre Gestión Escolar ERP V1

## 1. Objetivo

Terminar una versión 1.0 utilizable de Gestión Escolar ERP priorizando, en este orden, funcionalidad escolar completa, Superadministración SaaS, unificación visual global, campaña E2E y hardening de lanzamiento. Los bloques deben entregar procesos que una institución pueda utilizar, evitando PR dedicados a detalles cosméticos sin impacto funcional.

Inventario estático del 7 de septiembre de 2026 sobre la rama `chore/plan-cierre-v1`. El árbol de trabajo inicial estaba limpio. La fase inicial solo produjo este documento: no modifica aplicación, Prisma, migraciones ni base de datos; no ejecuta build, lint, Playwright, screenshots ni auditorías visuales; no hace commit, push ni cambio de rama.

## 2. Criterio de V1

**Propuesta de alcance de cierre:** operación escolar interna de todos los módulos solicitados, consulta e interacción básica del apoderado aprovechando el portal existente, Tesorería con cobros y conciliación manual trazable, reportes operativos existentes y consola SaaS capaz de dar de alta y operar organizaciones sin editar la base manualmente. No exige automatizar la facturación comercial SaaS ni añadir analítica avanzada.

Un flujo debe tener interfaz conectada, API, persistencia, validaciones, autorización por acción y contexto, estados de carga/vacío/error/éxito y trazabilidad cuando corresponda. Los procesos académicos y financieros conservan historial y usan transacciones donde sean necesarias. Las pruebas transaccionales se realizan en una base aislada.

El alcance `Todos los colegios` significa los colegios autorizados **del tenant activo**; no una mezcla de organizaciones. Un colegio específico limita todos los recursos y operaciones a ese colegio. En consultas consolidadas el año incluye el nombre institucional; en un colegio específico no lo repite. Tutoría se limita al tutor asignado y a administrativos expresamente autorizados.

**P0** es necesario para V1; **P1** es importante después de P0 y no debe impedir el cierre si se aplaza explícitamente; **P2** corresponde a polish/mejora, concentrado aquí en la deuda visual y técnica, sin inventar módulos adicionales. La unificación visual y la accesibilidad funcional sí tienen una puerta de aceptación antes del lanzamiento.

## 3. Estado general

El producto tiene una base escolar amplia y conectada: Matrícula, Comunidad, Docentes, Asistencia, Horario, Tutoría, Tesorería, Configuración académica y Reportes. El principal trabajo no consiste en reconstruir esos módulos. Staff institucional ya tiene flujo operativo real y aceptación dirigida del primer incremento V1. Hay vacíos concretos en Citas internas, Enfermería, bandeja interna de Notificaciones, gestión de identidades/instituciones y operación SaaS.

Super SaaS está en **base estructural**, con entidades y contexto reutilizables; no hay una consola operativa. Tener `Tenant.plan`, roles o un selector de colegio no equivale a disponer de planes, suscripciones y administración global.

El portal Next.js `padres/` contiene páginas reales; su login llama a `/api/auth/login`, que actualmente rechaza roles externos, y `JwtStrategy` también rechaza apoderados. Esto documenta una incompatibilidad de integración observable en código; no se ejecutó el portal ni se verificó un despliegue.

La documentación está por detrás de la implementación: `docs/06-estado-del-proyecto.md` conserva estados de «requiere inventario» y el inventario inicial encontró únicamente `README.md` en `docs/modulos/`; ahora Staff dispone de ficha, escenario y registro de aceptación vigentes. Esto no demuestra ausencia de toda documentación histórica: significa que falta la ficha vigente por módulo. No se recorrió el archivo histórico.

### Método y límites

Se leyeron AGENTS.md y los seis documentos solicitados. Primero se consultó Graphify para páginas, módulos/controladores/servicios, rutas, Prisma e identidad; después se contrastaron los puntos de entrada y contratos relevantes. El grafo consultado tiene 2.986 nodos; sus respuestas amplias se truncaron y no se trataron como inventarios exhaustivos. Se refinó promoción y autenticación. La búsqueda de ruta dirigida `AuthService` → `ColegiosService` no encontró conexión: no se infiere una dependencia entre ambos; se contrastaron sus implementaciones de contexto. No existe `graphify-out/wiki/index.md`.

Fuentes principales de este inventario, todas de solo lectura:

- [Rutas de intranet](../intranet/src/App.tsx), [módulos NestJS registrados](../api/src/app.module.ts) y [configuración montada](../intranet/src/pages/configuracion/ConfiguracionPage.tsx).
- [Esquema Prisma](../api/prisma/schema.prisma) y [migración de base SaaS](../api/prisma/migrations/20260601141055_add_saas_tenant_colegio_base/migration.sql).
- [Académicos: controlador](../api/src/academicos/academicos.controller.ts) y [servicio](../api/src/academicos/academicos.service.ts): matrícula, comunidad, docentes, catálogos, horario y continuidad académica.
- [Finanzas: controlador](../api/src/finanzas/finanzas.controller.ts), [API pública](../api/src/finanzas/finanzas-public.controller.ts) y [servicio](../api/src/finanzas/finanzas.service.ts): cobros, cronogramas, campañas, cartera, referencias e historial.
- [Calificaciones](../api/src/calificaciones/calificaciones.controller.ts), [Asistencia](../api/src/academicos/asistencia/asistencia.controller.ts), [Tutoría](../api/src/tutoria/tutoria.service.ts) y [guard de Tutoría](../api/src/tutoria/tutoria-access.guard.ts).
- [Dashboard](../api/src/dashboard/dashboard.service.ts), [Analíticas](../api/src/analiticas/analiticas.controller.ts), [panel de reportes](../intranet/src/pages/ReportesPage.tsx), [asistencia global](../intranet/src/pages/reportes/AsistenciaReportesPage.tsx) y [libretas](../intranet/src/pages/TutoriaPage.tsx).
- [Citas](../api/src/citas/citas.service.ts), [Notificaciones](../api/src/notificaciones/notificaciones.controller.ts), [Eventos](../api/src/eventos/eventos.controller.ts), [Álbumes](../api/src/albumes/albumes.controller.ts), [login del portal](../padres/src/app/login/page.tsx).
- [Autenticación](../api/src/auth/auth.service.ts), [JWT](../api/src/auth/jwt.strategy.ts), [roles](../api/src/auth/roles.guard.ts), [colegios](../api/src/colegios/colegios.service.ts), [contexto frontend](../intranet/src/contexts/SchoolContext.tsx), [PrismaService](../api/src/prisma/prisma.service.ts).

No se certifica ejecución, seguridad, migraciones aplicadas o integridad de datos de una base real. «Persistencia sí» significa modelo y acceso persistente presentes en el repositorio. «Flujo completo» significa recorrido principal identificable en código, no aceptación E2E. No se convierten observaciones estáticas en fallos reproducidos.

## 4. Matriz de módulos

Estados: **COMPLETO** exige aceptación y documentación suficientes; **CASI COMPLETO** tiene el recorrido principal conectado y resta aceptación/documentación o cierre acotado; **PARCIAL** tiene piezas operativas pero le falta integración, autorización o una etapa relevante; **ESQUELETO** tiene estructura/pantalla/modelo sin recorrido utilizable; **NO INICIADO** no tiene implementación específica identificada.

La última columna conserva las ocho columnas solicitadas e incluye **A** = autorización/multitenancy (`aparente sí`, `revisar`, `faltante`) y **D** = dependencias. `aparente sí` reconoce controles de membresía/alcance identificados; siempre queda sujeto al cierre transversal del tenant activo y a la campaña final. `revisar` señala cobertura incompleta o no demostrada; `faltante` indica ausencia de control específico para el flujo pendiente.

Las filas cuentan capacidades de planificación, no módulos NestJS ni pantallas independientes. Instituciones y Colegios globales comparten implementación futura; Panel general y analíticas comparten pantalla; Libreta vive en Tutoría. No se suman como desarrollos independientes al estimar trabajo.

### Principal

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Dashboard | sí | sí | sí | completo | CASI COMPLETO | P1 | Documentar resumen por rol y contrastar indicadores al cerrar sus fuentes. **A:** aparente sí. **D:** Notas, Asistencia, Tesorería, Eventos. |

### Académico

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Matrícula | sí | sí | sí | completo | CASI COMPLETO | P0 | Cerrar aceptación de registro → revisión → cobro → activación y trazabilidad. **A:** aparente sí. **D:** Alumnos, Apoderados, estructura académica, Tesorería. |
| Renovación / re-matrícula | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar renovación sobre POST matriculas; verificar duplicados, destino y deuda. **A:** aparente sí. **D:** Matrícula, años, secciones, pensiones. |
| Promoción masiva | sí | sí | sí | parcial | PARCIAL | P0 | Cerrar traslado entre colegios, condiciones académicas y reversión transaccional; reutilizar preview, ejecución e historial existentes. **A:** revisar. **D:** Renovación, progresiones de grado, cierres, recuperación, cupos. |
| Historial de matrículas | sí | sí | sí | completo | CASI COMPLETO | P0 | Formalizar consulta histórica, revisión y relación con continuidad. **A:** aparente sí. **D:** Matrícula, años, colegios. |
| Notas | sí | parcial | sí | parcial | PARCIAL | P0 | Conectar actor y asignación autorizada en evaluación/guardado; preservar cierres y reaperturas existentes. **A:** revisar. **D:** Asignaciones docentes, periodos, escalas, tipos, plantillas. |
| Asistencia | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar registro, justificación y consulta; aceptar pertenencia por sección. **A:** aparente sí. **D:** Matrícula, docentes, secciones. |
| Horario | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar programación, edición y conflictos del horario; /horario redirige a /calendario. **A:** aparente sí. **D:** Asignaciones docentes, años, secciones. |
| Calendario de eventos | parcial | parcial | sí | parcial | PARCIAL | P0 | Integrar gestión institucional de eventos; la página Calendario de intranet administra horarios. **A:** revisar. **D:** Años, colegios, Notificaciones, portal de apoderados. |
| Tutoría | sí | sí | sí | completo | CASI COMPLETO | P0 | Formalizar acceso por tutor/sección/año y cierre de libreta; guard y validaciones de recurso ya existen. La asignación es académica, aunque conserva temporalmente campos legacy en Staff. **A:** aparente sí. **D:** Secciones, Docentes, compatibilidad legacy de Staff, Notas, Asistencia, criterios. |
| Cierre académico / recuperación / movimientos | parcial | sí | sí | parcial | PARCIAL | P0 | Completar recorrido operativo para cierre, resultados de recuperación y movimientos; endpoints/modelos ya existen. **A:** revisar. **D:** Notas, Matrícula, progresiones, Promoción masiva. |

### Comunidad

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Alumnos | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar alta, edición, ficha, estado institucional y credenciales. **A:** aparente sí. **D:** Persona, Matrícula, colegios. |
| Apoderados | sí | sí | sí | completo | CASI COMPLETO | P0 | Cerrar aceptación de vínculos, edición y credenciales; separar gestión interna de acceso al portal. **A:** revisar. **D:** Persona, Alumnos, Usuarios. |
| Portal de apoderados | sí | parcial | sí | parcial | PARCIAL | P0 | Habilitar autenticación externa compatible y acceso exclusivamente a hijos vinculados; reutilizar páginas existentes. **A:** revisar. **D:** Autenticación, Apoderados, Notas, Asistencia, Tesorería, Comunicación. |

### Personal

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Docentes | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar CRUD, asignación institucional y administración académica de Tutoría; aceptación de activación y credenciales. Docentes y Tutoría no implican pertenencia a Staff. **A:** aparente sí. **D:** Persona, Usuarios, colegios, cursos, secciones. |
| Staff | sí | sí | sí | completo | COMPLETO | P0 | Incremento institucional, pulido visual y separación funcional V1 aceptados: solo cargos institucionales legítimos; reutiliza Persona cuando también es Docente y no muestra ni administra Tutoría. [Contrato y límites](modulos/staff.md), [aceptación funcional](registro-cambios/2026-09-07-staff-identidad-v1.md), [aceptación UX](registro-cambios/2026-09-09-staff-ux-v1.md), [separación Docentes/Staff](registro-cambios/2026-09-09-separacion-docentes-staff-v1.md). **A:** validada en alcance dirigido. **D:** Persona, Usuarios, colegios, compatibilidad académica legacy. |
| Citas | parcial | parcial | sí | parcial | PARCIAL | P0 | Construir agenda interna, estados/acuerdos y autorización de participante; conectar solicitud del portal. **A:** revisar. **D:** Staff, Apoderados, Notificaciones, autenticación externa. |

### Bienestar

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Enfermería | parcial | no | no | faltante | ESQUELETO | P0 | Implementar ficha, atenciones, alertas, autorización de medicación y avisos; solo hay página pendiente. **A:** faltante. **D:** Alumnos, Apoderados, Staff, Notificaciones. |

### Comunicación

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Circulares | sí | sí | sí | completo | CASI COMPLETO | P0 | Cerrar aceptación de destinatarios, publicación y adjuntos; documentar contrato institucional. **A:** revisar. **D:** Colegios, niveles, secciones, Usuarios, Notificaciones. |
| Notificaciones | parcial | parcial | sí | parcial | PARCIAL | P0 | Construir bandeja interna y asegurar propiedad al marcar leída; completar integración de avisos. **A:** revisar. **D:** Usuarios, Circulares, pagos, matrícula, citas. |
| Galería / álbumes | sí | parcial | sí | parcial | PARCIAL | P1 | Reutilizar lectura, comentarios y reacciones del portal; cerrar gestión/publicación y autorización si entra después de P0. **A:** revisar. **D:** Portal de apoderados, secciones, almacenamiento. |

### Tesorería

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Centro de pagos | sí | sí | sí | completo | CASI COMPLETO | P0 | Cerrar aceptación cobro → aplicación → saldo/comprobante; no reconstruir caja existente. **A:** aparente sí. **D:** Matrícula, Conceptos, Datos para cobrar. |
| Cobranzas / cartera de deudas | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar filtros de cartera y registro de gestión sobre deuda. **A:** aparente sí. **D:** Cronogramas, Apoderados, pagos. |
| Agenda de cobranzas | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar seguimiento e historial de gestiones. **A:** aparente sí. **D:** Cobranzas, CobranzaGestion. |
| Estado de cuenta | sí | sí | sí | completo | CASI COMPLETO | P0 | Conciliar deuda, descuentos, pagos y saldo por matrícula. **A:** aparente sí. **D:** Matrícula, CronogramaPagos, pagos. |
| Validación de pagos | sí | sí | sí | completo | CASI COMPLETO | P0 | Cerrar aceptación identificación → registro → aplicación, rechazo y duplicados. **A:** aparente sí. **D:** Referencias, Pagos recibidos, Estado de cuenta. |
| Pagos recibidos | sí | sí | sí | completo | CASI COMPLETO | P0 | Conciliar cambios de estado, historial y efecto contable; conservar evidencia. **A:** aparente sí. **D:** Validación, PagoRecibidoHistorial, comprobantes. |
| Configuración de pensiones | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar planes, generación, publicación mensual, campañas y descuentos. **A:** aparente sí. **D:** Matrícula, años, Conceptos. |
| Pagos extraordinarios | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar generación por destinatarios y efecto en estado de cuenta. **A:** aparente sí. **D:** Matrícula, Conceptos, cronogramas. |
| Datos para cobrar | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar configuración y exposición institucional de medios de cobro. **A:** aparente sí. **D:** Colegios, DatosCobroColegio. |
| Consulta y reporte público de pagos | sí | sí | sí | parcial | PARCIAL | P0 | Cerrar acceso seguro a consulta por DNI/referencia y evidencia; enlazar validación sin exponer datos innecesarios. **A:** revisar. **D:** Datos para cobrar, referencias, Pagos recibidos. |

### Reportes

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Panel general | sí | sí | sí | completo | CASI COMPLETO | P1 | Documentar panel conectado a seis consultas analíticas; aceptar filtros y errores parciales. **A:** aparente sí. **D:** Analíticas académicas, financieras y operativas. |
| Asistencia global | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar filtros institucionales y consistencia con registros diarios. **A:** aparente sí. **D:** Asistencia, Matrícula, años. |
| Analíticas financieras | sí | sí | sí | completo | CASI COMPLETO | P1 | Documentar ingresos, morosidad y cumplimiento dentro de /reportes; no es otra pantalla. **A:** aparente sí. **D:** Tesorería, Matrícula. |
| Analíticas académicas / operativas / alertas | sí | sí | sí | completo | CASI COMPLETO | P1 | Documentar capacidad, tendencia de matrícula, carga docente y alertas ya consultables en /reportes. **A:** aparente sí. **D:** Notas, Asistencia, Matrícula, docentes, Circulares. |
| Libreta y exportación PDF | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar consistencia de libreta individual y exportación por salón ya invocadas desde Tutoría. **A:** aparente sí. **D:** Tutoría, Notas, Asistencia, cabecera de libreta. |

### Configuración

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Instituciones | parcial | parcial | sí | parcial | PARCIAL | P0 | Crear administración de datos institucionales y ciclo de vida; listado/contexto y logos no equivalen a CRUD completo. **A:** revisar. **D:** Tenant, Colegio, membresías. |
| Años lectivos | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar creación/edición y preparación del año por institución. **A:** revisar. **D:** Instituciones. |
| Niveles | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar catálogo y habilitación por colegio. **A:** aparente sí. **D:** Instituciones, ColegioNivel. |
| Grados | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar catálogo, asignación institucional y progresión. **A:** aparente sí. **D:** Niveles, ColegioGrado. |
| Secciones | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar cupos, tutor y configuración anual; tutor es una función académica de Docentes. **A:** aparente sí. **D:** Grados, años, Docentes, compatibilidad legacy de Staff. |
| Cursos | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar CRUD y pertenencia de área/colegio en mutaciones. **A:** revisar. **D:** Áreas curriculares, colegios. |
| Áreas curriculares | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar CRUD integrado en Cursos y comprobar alcance de mutaciones. **A:** revisar. **D:** Instituciones. |
| Escalas | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar edición y coherencia con notas/libreta por institución. **A:** revisar. **D:** Instituciones, Notas. |
| Tipos de evaluación | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar CRUD y pertenencia en edición/eliminación. **A:** revisar. **D:** Instituciones, Notas. |
| Plantillas | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar creación, cobertura y aplicación por alcance; reutilizar previsualización. **A:** revisar. **D:** Cursos, tipos, periodos, asignaciones. |
| Conceptos de pago | sí | parcial | sí | parcial | PARCIAL | P0 | Incorporar validación de actor/alcance a edición por ID; CRUD y modelo existentes. **A:** revisar. **D:** Instituciones, años, Tesorería. |
| Usuarios | parcial | parcial | sí | parcial | PARCIAL | P0 | Construir administración central de usuarios internos, membresías y estado; hay perfil y credenciales desde comunidad/docentes. **A:** revisar. **D:** Persona, Rol, UsuarioTenant, UsuarioColegio. |
| Roles y permisos | parcial | parcial | parcial | parcial | PARCIAL | P0 | Cerrar permisos por acción/contexto y administración; Rol y permisos calculados no forman un gestor completo. **A:** revisar. **D:** Usuarios, membresías, autenticación. |
| Periodos y unidades | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar generación, fechas, apertura/cierre y relación con notas. **A:** aparente sí. **D:** Años, Notas. |
| Asignaciones docentes | sí | sí | sí | completo | CASI COMPLETO | P0 | Aceptar alta/baja y relación docente–curso–sección–año. **A:** aparente sí. **D:** Docentes, Cursos, Secciones, años. |
| Criterios de Tutoría / cabecera de libreta | sí | sí | sí | completo | CASI COMPLETO | P0 | Documentar configuración existente y su aplicación a la libreta. **A:** aparente sí. **D:** Instituciones, Tutoría. |

### Plataforma SaaS

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Superadministración SaaS | no | parcial | parcial | faltante | ESQUELETO | P0 | Crear consola y API de plataforma; reutilizar identidad/modelos, sin confundir Admin escolar con operador SaaS. **A:** faltante. **D:** Autenticación, Tenants, colegios, Usuarios, auditoría. |
| Tenants | parcial | parcial | sí | faltante | ESQUELETO | P0 | Crear alta, edición, listado global y asignación del administrador; hoy se muestra contexto del tenant. **A:** revisar. **D:** Tenant, UsuarioTenant, consola SaaS. |
| Colegios (operación global) | parcial | parcial | sí | parcial | PARCIAL | P0 | Crear aprovisionamiento por tenant y gestión global; compartir servicio con Instituciones. **A:** revisar. **D:** Tenants, UsuarioColegio, Instituciones. |
| Planes SaaS | no | no | parcial | faltante | ESQUELETO | P0 | Definir catálogo y límites aplicables; Tenant.plan es solo texto, PlanPensiones pertenece a Tesorería. **A:** faltante. **D:** Tenants, módulos habilitados. |
| Suscripciones | no | no | no | faltante | NO INICIADO | P0 | Crear vigencia, plan, estado e historial; operación manual inicial, sin exigir cobro SaaS automático. **A:** faltante. **D:** Tenants, Planes SaaS. |
| Administración global de usuarios | no | parcial | sí | faltante | ESQUELETO | P0 | Crear gestión global con membresías y privilegio de plataforma explícito; reutilizar Usuario. **A:** faltante. **D:** Usuarios, Roles, Tenants, Colegios. |
| Módulos habilitados por tenant | no | no | no | faltante | NO INICIADO | P0 | Persistir habilitaciones y aplicar restricciones en API y navegación; permisos por rol no son licencias. **A:** faltante. **D:** Planes SaaS, Suscripciones, autorización. |
| Branding / configuración | parcial | parcial | sí | parcial | PARCIAL | P1 | Completar edición global de identidad del tenant/colegio reutilizando logos y StorageService. **A:** revisar. **D:** Tenants, Colegios, almacenamiento. |
| Activación / suspensión | no | parcial | parcial | faltante | ESQUELETO | P0 | Aplicar estados de tenant/colegio/membresía a sesiones y peticiones; registrar suspensión y reactivación. **A:** faltante. **D:** Suscripciones, autenticación, auditoría. |
| Soporte | no | no | no | faltante | NO INICIADO | P0 | Crear expediente mínimo de solicitud, tenant, responsable, estado e historial; sin suplantación en V1. **A:** faltante. **D:** Tenants, Usuarios, auditoría. |
| Auditoría global | no | no | parcial | faltante | ESQUELETO | P0 | Crear registro consultable de acciones de plataforma; historiales de negocio son reutilizables, no una auditoría global. **A:** faltante. **D:** Usuarios, Tenants, Colegios, operaciones SaaS. |

### Base transversal

| Módulo | Frontend | Backend | Persistencia | Flujo | Estado | Prioridad | Falta principal |
|---|---|---|---|---|---|---|---|
| Autenticación y selección de tenant/colegio | sí | parcial | sí | parcial | PARCIAL | P0 | Cerrar selección explícita de tenant, consolidado dentro de él, rol contextual y acceso externo separado. **A:** revisar. **D:** Usuario, Rol, UsuarioTenant, UsuarioColegio. |
| Registro NFC | no | parcial | sí | parcial | PARCIAL | P1 | Conservar base RegistroNFC/API; integración física y experiencia de operación quedan después de P0. **A:** revisar. **D:** Alumnos, Asistencia, dispositivos. |

**Recuento:** 65 capacidades: COMPLETO: 1, CASI COMPLETO: 37, PARCIAL: 17, ESQUELETO: 7, NO INICIADO: 3. No se asignan porcentajes de avance. La única reclasificación posterior al inventario es Staff: aceptación dirigida y documentación suficientes para su primer incremento institucional. No se reauditaron las otras 64 capacidades ni se certifica la campaña E2E integral.

## 5. Bloqueadores P0

Los P0 se agrupan por resultado. Las 58 filas P0 de la matriz incluyen capacidades ya conectadas que deben aceptarse, no 58 módulos que haya que construir desde cero.

1. **Identidad y alcance confiables para operar:** administración de usuarios/membresías, roles por contexto, tenant activo explícito y validación de pertenencia en las operaciones modificadas. El consolidado actual puede reunir membresías de diferentes tenants; debe limitarse al seleccionado. La distinción operador SaaS/administrador escolar y la suspensión efectiva son requisitos funcionales de plataforma.
2. **Cerrar el año escolar:** completar las etapas operativas de cierre, recuperación y movimientos; aceptar matrícula/renovación, promoción entre colegios del mismo tenant y reversión sobre base aislada. Ya hay modelos, endpoints y transacciones de promoción: no crear un motor paralelo.
3. **Notas autorizadas y continuidad con Tutoría:** asegurar que el actor pueda operar la asignación, unidad y alumno recibidos; mantener cierres, reaperturas, conducta/comentarios y libreta existentes. No confundir un guard de rol general con permiso sobre una asignación.
4. **Completar módulos escolares pendientes:** agenda institucional de Citas, Enfermería, bandeja de Notificaciones y gestión de eventos. Integrar avisos y acceso por institución; conservar trazabilidad de salud y acuerdos según su sensibilidad.
5. **Conectar el apoderado con los flujos escolares:** resolver acceso externo y autorización por vínculo sin abrir indiscriminadamente la intranet. Aprovechar el portal existente para consulta académica, comunicaciones, solicitud de citas y pagos. Es una propuesta explícita de alcance V1, necesaria para completar estos recorridos, no una reescritura del portal.
6. **Tesorería de extremo a extremo:** aceptar generación/publicación de obligaciones, cobro manual, identificación/validación/aplicación de pagos, ajustes de estado, saldo, comprobante e historial. Completar autorización en operaciones antiguas por ID, en particular edición de conceptos, y acceso a consulta/reporte público. No se exige una pasarela externa ni un webhook bancario automático para V1.
7. **Configuración utilizable sin SQL manual:** instituciones, usuarios y permisos; enlazar catálogos, periodos, asignaciones y conceptos ya existentes con el alta y preparación del año. Aceptar Asistencia global y Libreta como salidas operativas; los paneles analíticos existentes pueden documentarse después de P0.
8. **Consola Super SaaS:** alta de tenant/colegios/administrador, planes, suscripciones manuales, módulos habilitados, activación/suspensión, administración global de usuarios, soporte mínimo y auditoría global.

### Evidencia puntual que justifica el cierre de autorización

Estas observaciones provienen de contratos y código; no son resultados de un ensayo de explotación ni de una auditoría de pantalla:

- `CalificacionesController.saveNotasMasivo` pasa `0` como docente y varias operaciones de evaluación/guardado no reciben al actor. El servicio valida estados de unidad y relaciones, pero esos contratos no demuestran autorización del solicitante sobre la asignación. Debe cerrarse en el bloque académico.
- `FinanzasController.updateConcepto` invoca `updateConcepto(id, body)` sin contexto de usuario/colegio. Es una brecha concreta de cobertura que debe resolverse con el flujo de configuración financiera.
- `CitasController.cambiarEstado` y su servicio actualizan por ID sin recibir al actor; la solicitud no valida completamente pertenencia institucional. Además, su recorrido de apoderado depende de una autenticación externa hoy rechazada.
- `NotificacionesController.marcarLeida` pasa solo el ID; el listado sí filtra por usuario. Completar propiedad del destinatario al construir la bandeja.
- Los resolutores de alcance de Finanzas y otros servicios parten de membresías activas de colegio, pero el consolidado reúne todos sus IDs y usa un tenant principal. Deben separar explícitamente el tenant activo cuando el usuario pertenece a varias organizaciones.

La revisión futura se dirige a esos contratos y a los flujos modificados. No justifica revisar todos los componentes antes de avanzar. Los fallos de autorización de un flujo se corrigen con ese bloque; no se aplazan al hardening final.

## 6. Superadministración SaaS

### Qué ya existe y se debe reutilizar

| Base | Evidencia y capacidad actual | Límite real |
|---|---|---|
| Tenant | `Tenant` contiene nombre, slug único, RUC, logo, estado, plan textual y relaciones. | No hay CRUD/console global ni catálogo comercial de planes. |
| Colegio | `Colegio` pertenece a Tenant; tiene identidad, estado, color, logo y relaciones académicas/financieras. | No hay aprovisionamiento global completo; sigue siendo el modelo institucional vigente. |
| UsuarioTenant | Clave compuesta usuario/tenant, rol textual y estado. | La membresía no equivale a una política completa de permisos por contexto. |
| UsuarioColegio | Clave compuesta usuario/colegio, rol, estado y colegio principal. | Falta operación central de estas membresías y uso coherente del rol contextual. |
| Autenticación | JWT, bcrypt, perfil, cambio de contraseña y verificación del usuario activo. | No representa por sí sola selección de tenant ni autorización SaaS; el acceso externo está rechazado. |
| Contexto | `AuthService.getSaasContext`, `ColegiosService.getMisColegios`, `AuthContext` y `SchoolContext` exponen tenant, colegios y consolidado. | El tenant se obtiene como principal/primer acceso; no hay cambio explícito de tenant de extremo a extremo. |
| API de colegios | `GET colegios/mis-colegios`, carga y eliminación de logo con validación de acceso. | No son endpoints de administración global de tenants/colegios. |
| Alcance en servicios | Académicos, Finanzas, Dashboard, Analíticas y Tutoría contienen resolutores/controles propios. | Cobertura distribuida; no hay garantía universal por tener columnas tenant/colegio. |
| Branding y almacenamiento | Logos, color principal, datos institucionales, cabecera de libreta y `StorageService`. | Gestión global de branding pendiente; no hace falta reemplazar el sistema de archivos. |
| Historiales | Pagos recibidos, estados de estudiante, situación de matrícula, movimientos y ejecución/reversión de promoción. | Son historiales de negocio; falta auditoría de plataforma con antes/después, actor y motivo. |
| Migraciones | Base SaaS `20260601141055_add_saas_tenant_colegio_base`; posteriores de configuración por colegio, datos de cobro y Tutoría; ejecuciones/backfill de promoción de julio. | Existencia de SQL no prueba aplicación en una base real. Algunas relaciones tenant/colegio son opcionales; no se inspeccionaron datos. |
| Seed | Funciones `ensureUsuarioTenant` y `ensureUsuarioColegio`, identificadas por Graphify. | Un seed no es un onboarding utilizable por un operador SaaS. No se ejecutó. |

La migración base crea `Tenant`, `Colegio`, `UsuarioTenant`, `UsuarioColegio` y `ColegioNivel`, y agrega claves institucionales a entidades existentes. El esquema actual agrega, entre otras, `ColegioGrado`. Se deben preservar estas relaciones y planificar cualquier backfill en base aislada. No se propone renombrar `Colegio` a `Institución` para cerrar V1.

`PrismaService` normaliza escrituras; no inyecta aislamiento universal por tenant. `JwtStrategy.validate` devuelve usuario/rol sin un contexto activo validado y no comprueba por sí sola suspensión de tenant/colegio. `RolesGuard` normaliza ciertos nombres de superadministrador como `admin`: no hay una frontera SaaS separada demostrada por esa normalización.

`ActividadInterceptor` actualiza `ultima_conexion`; `ActividadService` compone actividad de un alumno. Ninguno constituye una bitácora global de auditoría de acciones SaaS.

### Qué falta para una consola funcional

1. **Frontera de plataforma:** rutas y API exclusivas, privilegio SaaS explícito y verificado en backend; un Admin de colegio no obtiene acceso global. Registro de acciones sensibles desde el primer endpoint de plataforma.
2. **Onboarding transaccional:** crear tenant, colegio inicial, administrador y membresías; entregar acceso utilizable y gestionar errores sin entidades huérfanas. Reutilizar configuración académica para preparar su primer año.
3. **Operación global:** buscar/listar/editar tenants y colegios, gestionar usuarios y membresías, ver contexto y estado de cada organización. Las vistas globales deben requerir privilegio SaaS, no `scope=all` escolar.
4. **Planes y suscripciones:** catálogo mínimo de planes, vigencia, cambios e historial de suscripción; registrar manualmente alta/renovación/cancelación en V1. `PlanPensiones` no debe reutilizarse: representa pensiones de alumnos.
5. **Habilitación de módulos:** guardar capacidades por tenant, relacionarlas con el plan o excepciones explícitas y comprobarlas en cada API afectada y en navegación. `modulos_dashboard` y los permisos calculados por rol no son habilitaciones comerciales persistidas.
6. **Activación/suspensión efectiva:** estados y motivos, bloqueo de acceso/operación según política central, aplicación a tokens/sesiones vigentes y reactivación conservando información. No basta con editar `Tenant.estado`.
7. **Soporte mínimo:** registrar solicitud vinculada al tenant, asignar responsable, mantener estado e historial y consultar contexto permitido. No requiere impersonación, chat en tiempo real ni integración externa para V1.
8. **Auditoría global:** consulta por tenant, institución, usuario, fecha y acción; registro de resultado, motivo y valores anterior/posterior cuando aplique, sin credenciales ni secretos.

**Resultado mínimo demostrable:** un operador crea una organización y un colegio, asigna administrador/plan/vigencia/módulos; el administrador accede únicamente a su organización y prepara el año; el operador suspende y reactiva con efecto real y deja una traza consultable. El soporte puede registrar y resolver una solicitud de esa organización.

## 7. Orden de implementación

El orden respeta funcionalidad escolar → SaaS → visual → E2E → hardening. Las dependencias de identidad y configuración se atienden dentro del bloque funcional que las necesita; no se posponen hasta Super SaaS.

| Bloque | Trabajo agrupado | Resultado visible y utilizable | Dependencias / salida |
|---|---|---|---|
| **1 — Cerrar operación escolar crítica** | Usuarios y membresías institucionales mínimos; permisos y alcance de los recorridos afectados; Staff, Citas, Enfermería, Notificaciones y eventos; acceso externo; cierre/recuperación/promoción; cerrar actor/asignación en Notas. Reutilizar Matrícula, Asistencia, Horario y Tutoría existentes. | Una institución puede registrar/asignar personal, matricular/renovar, operar clases, publicar información, atender citas/salud y cerrar/promover alumnos; el apoderado consulta sus hijos y recibe los avisos definidos. | Configuración académica existente; transacciones en base aislada y pruebas dirigidas por flujo. Tesorería existente se consume sin ampliar aún su alcance. |
| **2 — Cerrar Tesorería** | Conceptos y autorización, cronogramas/campañas, cobros, reporte público, validación/aplicación, estado de cuenta, cobranzas y comprobantes/historial. | Secretaría/Tesorería registra un pago, lo valida y aplica; ve saldo correcto, evidencia e historial; sigue deudas desde cartera/agenda. | Matrículas y membresías del bloque 1. Conciliación e idempotencia con datos aislados. |
| **3 — Cerrar Configuración y salidas operativas** | Completar administración institucional, preparación del año y permisos; aceptar Asistencia global, libretas y coherencia de reportes existentes. Documentar capacidades conectadas aún sin ficha. | Administrador prepara el siguiente año sin SQL; dirección obtiene asistencia, libretas y reportes coherentes con la operación. | Bloques 1–2. Reutiliza catálogos/plantillas; los P1 analíticos se cierran solo sin retrasar P0. |
| **4 — Superadministración SaaS** | Consola/API, onboarding, operación global, planes/suscripciones manuales, módulos, suspensión, soporte y auditoría. | Operador da de alta y administra una organización completa sin intervención de desarrollo, con acceso aislado y suspensión efectiva. | Identidad/contexto y configuración de bloques 1–3. Branding avanzado sigue siendo P1. |
| **5 — Unificación visual global** | Tokens y patrones compartidos en navegación, formularios, filtros, tablas, diálogos y mensajes; accesibilidad y responsive de procesos. | Intranet, consola y recorridos V1 del portal tienen interacción consistente y legible. | Flujos funcionales estables. Trabajo por patrones compartidos, sin volver al inventario de cada componente. |
| **6 — Campaña E2E completa** | Ejecutar recorridos del apartado 9, corregir regresiones y repetir las áreas afectadas hasta aceptación. | Candidato de versión con evidencia de los procesos completos por rol, tenant y colegio. | Bloques 1–5; entorno y base aislados. |
| **7 — Hardening y lanzamiento V1** | Seguridad/operación final, migraciones, recuperación, observabilidad, despliegue y documentación de versión. | Release desplegable, recuperable y operable con criterios de salida cumplidos. | E2E aceptado; repetir pruebas afectadas por cambios de hardening y smoke del candidato final. |

**Primer incremento del bloque 1 — Staff COMPLETO:** listado, búsqueda, alta/edición institucional, disponibilidad de citas y creación/asociación de credenciales con membresías mínimas, reutilizando Persona/Usuario/Staff. La aceptación funcional dirigida inicial aprobó 20/20 pruebas backend en MySQL aislado, builds y ESLint dirigidos, y Playwright de escritorio/móvil, permisos y accesibilidad funcional. El incremento UX posterior completó la puerta visual V1 con lista tabular en escritorio, fichas estructuradas en pantallas angostas, filtros compactos y formulario agrupado; se revisaron 1440×900, 1280×800, 768×900, 390×844 y zoom equivalente al 200 %, sin desbordamiento ni pérdida de acciones. El cierre de separación funcional añade `es_miembro_staff`: ser Docente o Tutor no basta para aparecer en Staff; una Persona con ambos dominios conserva una sola identidad y cada módulo muestra su función. Tutoría sigue operando con `es_tutor`/`id_seccion` como compatibilidad técnica hasta su migración académica. Ficha y registros reflejan los tres cierres. `permite_citas` no es activación laboral: Staff no tiene estado laboral. Ciclo laboral, traslados, edición central de identidad compartida, clasificación asistida de históricos, migración de la relación académica de Tutoría y administración/reactivación general de membresías quedan fuera de este incremento; la auditoría operativa depende de retención de logs y su persistencia se atiende en el cierre transversal. Esto no declara completo Usuarios/Roles ni el bloque 1. **Siguiente incremento recomendado:** agenda institucional de Citas conectada a Staff, con autorización de participantes; continuar después con Notificaciones y acceso externo según las dependencias del bloque.

Cada bloque termina con demostración funcional, pruebas proporcionales y documentación vigente del resultado. Los PR pueden dividir un bloque grande en funcionalidades completas, sin esperar un único PR gigantesco ni abrir un PR por ajuste minúsculo.

### Reglas de ejecución para evitar rendimientos decrecientes

- No auditar componentes individualmente salvo bug que afecte un flujo real.
- No bloquear funcionalidad por deuda cosmética.
- No arreglar lint histórico dentro de otra tarea.
- Ejecutar build al finalizar bloques relevantes, no cada microcambio.
- Usar Playwright dirigido durante desarrollo solo para los flujos modificados.
- Ejecutar la suite E2E completa al final.
- Mantener documentación proporcional al cambio y simultánea a la implementación.
- Los PR deben cerrar funcionalidades o bloques, no detalles minúsculos.
- No convertir incertidumbre estática en un bug confirmado: reproducir al trabajar el flujo.
- Corregir autorización, pérdida de información o incoherencia financiera con el flujo afectado; nunca tratarlas como polish.
- No ampliar alcance a automatizaciones, rediseños arquitectónicos o integraciones no necesarias para el resultado V1.

Las reglas de ejecución son para la implementación futura. En este inventario no se ejecutan build ni Playwright y solo se modifica este documento; no se actualizan otros índices, fichas o registros.

## 8. Unificación visual posterior

**D — Deuda visual aplazada hasta el bloque 5.** Trabajar el sistema global inspirado en Carbon con React, Tailwind y Lucide, sin introducir otra biblioteca visual ni rediseñar cada módulo por separado.

Aplicar una fuente compartida de tokens para tipografía, espaciado, color, estados, densidad, foco y movimiento. Reutilizar la infraestructura existente de encabezados, formularios, tablas y diálogos. Resolver inconsistencias por patrón compartido y verificar pantallas representativas de flujos completos. No se abre aquí un inventario de CSS ni se afirma que una clase pequeña sea un defecto real.

En ese bloque se revisan móvil, tablet y escritorio, zoom aumentado, teclado, foco visible, reducción de movimiento y legibilidad para usuarios no técnicos. Cada cambio visual registra el patrón aplicado, componente compartido y resultado de las comprobaciones pertinentes. Los problemas que impidan operar un flujo se atienden cuando aparezcan; el resto espera a este bloque.

## 9. Campaña E2E final

**E — Verificación final pendiente.** Esta campaña está planificada, no ejecutada. Los tests de diálogo y los archivos de pruebas NestJS existentes no acreditan cobertura integral de negocio; no se ejecutaron ni se revisaron componente por componente.

Preparar base aislada con dos tenants, varios colegios en uno de ellos, un usuario con acceso a más de un tenant, años de origen/destino, docentes con y sin tutoría y apoderados con hijos distintos. No usar la base original para pruebas destructivas/transaccionales.

| Recorrido | Criterio de aceptación |
|---|---|
| Login, tenant y colegio | Rol contextual correcto, selección válida, usuario/membresía inactivos rechazados; el consolidado no cruza tenant. |
| Onboarding SaaS | Crear tenant/colegio/admin, asignar plan/vigencia/módulos y operar el colegio sin edición manual de base. |
| Configuración → matrícula → renovación | Preparar año/estructura, vincular alumno/apoderado, registrar/revisar/activar matrícula y renovar sin duplicados. |
| Notas → cierre → Tutoría → libreta | Guardar solo asignaciones permitidas, cerrar/reabrir con rol autorizado, comentarios/conducta y PDF coherentes. |
| Asistencia → justificación → reporte | Registro por sección, evidencia de justificación y totales coincidentes con Asistencia global y libreta. |
| Cierre / recuperación / promoción | Preview, conflictos, cupos, ejecución e historial; traslado autorizado, reintento sin duplicados y reversión validada. |
| Staff → Citas → Notificaciones | Solicitud, disponibilidad, confirmación/cancelación/acuerdos y avisos solo a participantes autorizados. |
| Enfermería | Acceso restringido a ficha/atención, registro del responsable y comunicación autorizada al apoderado. |
| Circulares / eventos → portal | Destinatarios correctos, publicación y lectura; el apoderado solo ve información permitida de sus hijos. |
| Pensiones → cobro → validación → saldo | Generación/publicación, reporte de pago, identificación, aplicación única, comprobante y saldo conciliado. |
| Cobranzas / cambios de estado | Seguimiento de deuda, historial completo y efecto financiero consistente al cambiar estados. |
| Suspensión / módulos / soporte / auditoría | API y navegación aplican restricciones, sesiones vigentes no eluden suspensión; reactivación y operaciones quedan trazadas. |
| Denegaciones y errores | Peticiones directas con IDs ajenos, rol insuficiente, fallos de red, vacíos y reintentos no filtran datos ni duplican operaciones. |

Ejecutar recorridos en colegio específico y consolidado autorizado donde aplique; probar denegación de consolidado para roles sin permiso. Las operaciones de creación con destino institucional requieren destino inequívoco aunque se inicien desde una vista consolidada.

El criterio de salida es evidencia de aprobación de todos los flujos P0, cero fallos bloqueantes y registro explícito de P1/P2 aplazados. Las correcciones de la campaña repiten el recorrido afectado y sus dependencias; no reinician una auditoría visual por componente.

## 10. Hardening

El bloque final verifica la preparación de la versión completa. No sustituye las validaciones/autorización que cada módulo debe incorporar al implementarse.

- **Seguridad y sesiones:** configuración obligatoria de secretos (existe fallback de JWT en el código consultado), revocación/expiración, separación de portal/intranet/plataforma, protección de consultas públicas, archivos y operaciones sensibles. Confirmar que no haya acceso cruzado por tenant, institución o vínculo.
- **Integridad y migraciones:** ensayar instalación limpia y actualización de una copia aislada representativa; revisar nulos institucionales y backfills, consistencia entre esquema/migraciones y unicidad; no ejecutar migraciones sobre la base original durante pruebas.
- **Concurrencia:** aceptación de idempotencia de pagos/promoción, cupos y agenda; no perder historial ni producir registros financieros duplicados ante reintentos.
- **Operación:** logs sin secretos, alertas de error, health checks, almacenamiento persistente, tareas programadas y tratamiento de fallos de notificación.
- **Rendimiento:** consultas reales de matrículas, deudas y reportes con volumen representativo; paginación/índices donde haya necesidad demostrada. Evitar optimización especulativa.
- **Recuperación y despliegue:** respaldo y restauración ensayados, procedimiento de despliegue y reversión, variables de entorno y accesos operativos documentados; smoke del candidato final.
- **Calidad de entrega:** builds de aplicaciones afectadas al cerrar bloques/candidato y comprobaciones dirigidas; no convertir todo el lint histórico en una condición nueva de V1. Los errores de compilación del candidato sí bloquean lanzamiento.

Las operaciones sensibles deben conservar actor, fecha, tenant/colegio, acción, motivo y valores antes/después cuando corresponda. El historial académico/financiero se conserva mediante estados. Cualquier corrección del hardening con efecto funcional repite las pruebas afectadas antes de la liberación.

## 11. Deuda explícitamente aplazada

| Categoría | Tratamiento |
|---|---|
| **A — Funcionalidad realmente faltante** | Citas internas, Enfermería, bandeja interna, gestión de eventos completa, administración institucional/usuarios y consola SaaS. Son trabajo de cierre P0; no deuda cosmética ni motivo para reescribir módulos conectados. |
| **B — Implementación sin documentación vigente suficiente** | Renovación, promoción con preview/ejecución/reversión, historial de pagos, cartera/agenda, pensiones/campañas, Tutoría/libreta/PDF, catálogos/plantillas, Dashboard y Analíticas. Actualizar fichas y reglas al cerrar cada bloque; no afirmar que carecen de toda referencia histórica. |
| **C — Deuda técnica no bloqueante** | Lint histórico, tipados amplios sin fallo de flujo demostrado, reorganización de archivos, descomposición de servicios grandes y limpieza general. Solo atender lo necesario para mantener/cerrar la funcionalidad modificada. |
| **D — Deuda visual** | Ajustes cosméticos, densidad y variaciones de CSS se concentran en bloque 5 por patrones globales; no producen PR individuales salvo fallo de uso real. |
| **E — E2E integral** | Campaña completa al final; durante implementación, pruebas funcionales/transaccionales y Playwright dirigidos a lo cambiado. |

Quedan fuera del mínimo V1: facturación automática SaaS/pasarela comercial, webhooks bancarios como requisito de cobro manual, BI avanzado, nuevas familias de reportes sin necesidad definida, integración física NFC completa, ampliación de Galería, impersonación de soporte y renombrado estructural `Colegio` → `Institución`. Branding avanzado y paneles analíticos P1 no deben desplazar P0. Las capacidades P1 ya presentes se conservan; no se prometen como flujos aceptados mientras dependan de trabajo pendiente.

No se aplazan al backlog cosmético el aislamiento, autorización de recursos, trazabilidad sensible, pérdida de datos, cálculo financiero ni errores que impidan finalizar un proceso P0.

## 12. Definición de “proyecto terminado”

La versión 1.0 está terminada cuando:

1. Todos los recorridos P0 de esta planificación son utilizables por sus roles autorizados y no dependen de cambios manuales de datos para la operación cotidiana.
2. Una organización puede ser aprovisionada y administrada desde Super SaaS, con planes/suscripciones, módulos, usuarios, suspensión/reactivación, soporte y auditoría efectivos.
3. El tenant/colegio activo y los vínculos del usuario se respetan en frontend y backend, incluidos consolidado, peticiones directas y sesiones ya iniciadas.
4. Los datos académicos/financieros persisten con integridad, historial y reversión controlada donde corresponda; los escenarios transaccionales se han aprobado en base aislada.
5. La experiencia global es consistente, responsiva, legible y operable con teclado; no quedan bloqueos de interacción en los recorridos V1.
6. La campaña E2E P0 está aprobada y el candidato final compila; no quedan errores bloqueantes de funcionamiento, seguridad o datos.
7. Las fichas de módulos, reglas transversales afectadas, registros de cambio, escenarios y estado del proyecto reflejan la implementación real, con documentación proporcional a cada bloque.
8. Existen procedimientos comprobados de despliegue, respaldo, restauración y reversión, y responsables operativos pueden usarlos.
9. La deuda P1/P2 excluida está enumerada sin presentar propuestas futuras como funcionalidades implementadas.

El inventario queda entregado al producir únicamente este plan y ejecutar las validaciones autorizadas: `git diff --check`, `graphify update .`, `git status --short`, `git diff --stat` y `git diff -- docs/plan-cierre-v1.md`. Un archivo nuevo sin seguimiento no aparece en el diff/stat normal de Git hasta incorporarlo al índice; se debe informar esa limitación sin hacer staging, commit ni push por este inventario.

### Resultado de validación del inventario inicial (histórico)

- `git diff --check`: sin salida ni errores; al estar este documento sin seguimiento, el comando no comprueba su contenido como diff de un archivo versionado.
- `graphify update .`: finalizó con código 0, sin LLM; reconstruyó 3.016 nodos, 6.301 relaciones y 220 comunidades. Actualizó sus artefactos locales sin cambios adicionales visibles en Git. La actualización AST no incorpora semánticamente este plan.
- Graphify informó 48 archivos SQL no extraídos por faltar `tree_sitter_sql` y extracción parcial de `web/src/app/layout.tsx` por sintaxis. También reasignó nombres de 31 comunidades. No se instalaron dependencias ni se corrigieron esos archivos: son límites del grafo, no resultados de build ni fallos de producto reproducidos. La base SaaS se contrastó leyendo esquema y migración directamente.
- `git status --short`: únicamente `?? docs/plan-cierre-v1.md`.
- `git diff --stat` y `git diff -- docs/plan-cierre-v1.md`: sin salida porque el documento es nuevo y no está en el índice. No se hizo staging.
- No se ejecutaron build, ESLint, Playwright ni auditorías visuales; no hubo commit, push, cambio de rama ni acceso a la base de datos.
