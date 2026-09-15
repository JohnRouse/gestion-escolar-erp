# Enfermería

## 1. Estado y finalidad

Estado: **EN PRUEBAS para V1**. El código, la migración aditiva, la API, la
pantalla de intranet y las pruebas dirigidas están implementados. La migración
`20260914120000_enfermeria_v1` no se ha aplicado y falta prueba humana con datos
locales; por ello el módulo no se declara completo ni aceptado.

Enfermería registra bienestar y atención escolar. No es una historia clínica
hospitalaria, no diagnostica, no prescribe, no recomienda tratamientos y no
sustituye atención profesional. Toda información de salud se presenta como
**información declarada por la familia**.

## 2. Actores y permisos

- Admin: lectura y operación completa únicamente en colegios donde mantiene una
  membresía efectiva Admin o Director.
- Director: lectura y operación completa únicamente en colegios donde mantiene
  una membresía efectiva Admin o Director.
- Secretaria y Profesor: sin acceso al módulo ni a la ficha completa.
- Apoderado y Alumno: sin acceso a `/enfermeria` de intranet.

La API exige JWT activo, tenant activo, membresía activa y rol global e
institucional autorizado. No se infiere autoridad desde `Staff.cargo`,
`Staff.area` ni otro texto libre. Un rol dedicado de Enfermería queda como deuda
futura y no se añadió al rol global V1.

## 3. Alcance institucional

En colegio específico, toda lista, ID directo y mutación se limita a ese
colegio. En `Todos los colegios`, solo se consultan las instituciones
autorizadas del tenant activo. La matrícula seleccionada determina un único
tenant y colegio al abrir la atención; no se acepta un colegio escrito por el
cliente.

La ficha persiste entre años dentro del mismo colegio. En consolidado se exige
el colegio de ficha inequívoco, derivado de la matrícula elegida. El backend
comprueba que estudiante, matrícula, ficha, autorización, atención y apoderado
mantengan el mismo contexto autorizado.

## 4. Datos y conceptos separados

### Ficha de salud declarada

`FichaSalud` es única por `id_colegio + id_estudiante` y guarda tenant,
estudiante, grupo sanguíneo opcional, alergias/condiciones/medicación habitual
declaradas, seguro o centro, contacto y teléfono de emergencia, observaciones,
fecha y usuario actualizador. Una ficha vacía no bloquea una atención.

### Autorización de medicación

`AutorizacionMedicacion` pertenece a una ficha y a un apoderado realmente
vinculado por `ApoderadoEstudiante`. Registra medicamento, dosis/instrucción
declarada, vía opcional, vigencia, observaciones, actor y estados `activa`,
`vencida` efectivo o `revocada`. V1 no guarda firma ficticia, adjunto ni
evidencia documental. No se elimina: la revocación conserva actor, fecha y
motivo.

### Atención escolar

`AtencionEnfermeria` pertenece a tenant, colegio y matrícula. Registra ingreso,
motivo de atención, observación o síntomas reportados, acciones y cuidados,
responsable, autorización de medicación utilizada, administración, cierre y
destino. `Motivo de atención` describe el motivo o los síntomas observados y no
constituye un diagnóstico. Estados: `abierta` y `cerrada`. Destinos:

- Regresa al aula.
- Retiro por apoderado.
- Derivación externa.
- Permanece en observación.

No existe endpoint DELETE. Una atención cerrada solo admite corrección de
observaciones/acciones con motivo y movimiento; no se sobrescribe
silenciosamente.

## 5. Matrícula y búsqueda

La búsqueda incremental consulta base de datos con límite 25 y una fila por
matrícula. Busca nombres, apellidos, DNI, código de estudiante y código de
matrícula. Muestra alumno, grado/sección, institución y código de matrícula.

Para búsqueda y apertura solo son operativas `Activo`, `Matriculado` y
`Pre-matriculado`; `Inactivo` y `Reserva` se excluyen. Una atención histórica
continúa visible por su relación persistida aunque la matrícula cambie después.

Cada matrícula puede mantener una sola atención con estado `abierta`. La
búsqueda devuelve `atencion_abierta_id`; al seleccionar una matrícula con ese
valor, la intranet bloquea una nueva apertura, explica que debe continuarse el
registro y abre el detalle real mediante `Ver atención abierta`.

La apertura vuelve a comprobar la regla dentro de la transacción. Ante una
apertura concurrente, `POST /enfermeria/atenciones` responde HTTP 409 con
`code = ENFERMERIA_ATENCION_ABIERTA`, `atencion_abierta_id` y mensaje
orientativo. No se crea otra atención ni un movimiento de apertura en conflicto.

## 6. Medicación durante una atención

La acción exige seleccionar `id_autorizacion`; no existe medicamento libre en
la atención. El backend vuelve a comprobar que la autorización esté `activa`,
vigente, sea del mismo estudiante y colegio y que la atención permanezca
abierta. Sin autorización válida puede registrarse la atención, pero
`medicacion_administrada` permanece en falso.

El detalle diferencia tres estados: medicación administrada, no administrada
con autorización vigente disponible y no administrada sin autorización vigente.
En el primer estado muestra únicamente el registro estructurado real:
autorización/medicamento utilizado, dosis o instrucción declarada, fecha/hora y
actor. En los otros estados explica si existe o no consentimiento/instrucción
vigente de la familia; no usa el texto ambiguo anterior.

Para habilitar la acción, la intranet exige estado `activa` y que la fecha actual
esté entre `fecha_inicio` y `fecha_fin`. Las autorizaciones provienen de la ficha
del mismo alumno/colegio y el backend vuelve a comprobar ese contexto. Crear o
revocar una autorización desde la ficha incrementa una clave de refetch simple:
al volver al detalle, el bloque y el botón ya reflejan el resultado sin recargar
manualmente la página completa.

`Acciones y cuidados realizados` es texto libre para documentar la atención. No
se analiza por palabras ni permite inferir administración de medicamentos. La
única fuente estructurada para esa afirmación es la acción de medicación con una
autorización vigente seleccionada.

## 7. Contacto y notificaciones

`EnfermeriaContacto` guarda solo un apoderado vinculado, fecha/hora, medio
(`telefono`, `presencial`, `otro`), observación breve, actor y si emitió aviso.
El operador decide `Notificar al apoderado` durante el contacto o al cierre; no
se avisa automáticamente cada atención menor.

Cuando se decide avisar, se deduplican cuentas por `id_usuario` y se crea una
notificación con tenant/colegio, origen `enfermeria`, canal `portal` y referencia
estructurada. No se inventa una URL del portal. El título y mensaje son mínimos:
no incluyen alergias, diagnósticos, síntomas, dosis, medicamento ni observación
de contacto. Las filas históricas con canal `padres` siguen siendo legibles por
compatibilidad de Notificaciones V1.

Retiro, derivación externa o medicación hacen recomendable registrar contacto,
pero V1 no inventa un protocolo clínico automático ni bloquea el cierre por una
regla médica inexistente.

## 8. Trazabilidad y privacidad

`EnfermeriaMovimiento` conserva tenant/colegio, tipo e ID de entidad, acción,
actor, fecha, motivo y datos estructurados. Registra como mínimo creación y
actualización de ficha, autorización/revocación, apertura/actualización/
corrección/cierre de atención, contacto, notificación y medicación administrada.
Los cambios de ficha conservan valores anterior/posterior dentro del mismo
almacén sensible; los otros eventos evitan duplicar detalles médicos completos.

No se registran contraseñas, tokens ni detalles médicos en logs. La respuesta a
un ID ajeno es 404 y no revela su existencia. Los modelos usan relaciones
restrictivas y no hard delete.

## 9. API V1

| Método y ruta | Finalidad |
|---|---|
| `GET /enfermeria/atenciones` | Lista, filtros, paginación y resumen |
| `GET /enfermeria/atenciones/:id` | Detalle e historial autorizado |
| `POST /enfermeria/atenciones` | Apertura única desde matrícula operativa; conflicto duplicado con 409 tipado |
| `PATCH /enfermeria/atenciones/:id` | Actualización/corrección trazable |
| `POST /enfermeria/atenciones/:id/contactos` | Contacto y aviso opcional |
| `POST /enfermeria/atenciones/:id/medicacion` | Administración por autorización |
| `POST /enfermeria/atenciones/:id/cerrar` | Cierre y destino |
| `GET /enfermeria/alumnos/buscar` | Búsqueda incremental operativa |
| `GET /enfermeria/alumnos/:id/ficha` | Ficha, alertas, autorizaciones e historial |
| `PUT /enfermeria/alumnos/:id/ficha` | Alta/actualización de ficha declarada |
| `POST /enfermeria/alumnos/:id/autorizaciones` | Nueva autorización vinculada |
| `PATCH /enfermeria/autorizaciones/:id/revocar` | Revocación con motivo y actor |

Los DTO usan whitelist estricta. No existe endpoint de borrado.

## 10. Interfaz y estados

`/enfermeria` reutiliza `PageHeader`, `AccessibleDialog`, Toast, Lucide,
Tailwind y patrones de tabla/formulario existentes. Incluye resumen compacto,
búsqueda/fecha/estado/sección/institución, paginación, carga, vacío, error,
reintento, bloqueo y éxito. El alta busca antes de cargar información sensible;
después de elegir matrícula muestra alertas declaradas y autorizaciones activas.

El detalle separa observación, acciones, medicación, contacto, cierre e
historial. La ficha separa Información declarada, Alertas, Autorizaciones e
Historial de atenciones. Es desktop/laptop first, conserva scroll horizontal o
reflow funcional, labels, foco visible, teclado de `AccessibleDialog` y
`motion-reduce`; no añade animaciones ni biblioteca visual.

El resumen muestra `Atenciones abiertas` y conserva el cálculo del backend sobre
`estado = 'abierta'`. El historial operativo presenta etiquetas legibles como
`Apertura`, `Actualización`, `Contacto registrado`, `Medicación administrada` y
`Cierre`, sin cambiar los valores persistidos.

`Autorización de medicación` significa el consentimiento y la instrucción
declarados por la familia. `Medicación administrada` significa la acción
efectivamente registrada durante esa atención. La selección para administrar no
ofrece un campo libre ni incluye autorizaciones futuras, vencidas o revocadas.

## 11. Base de datos e índices

La migración aditiva crea `FichaSalud`, `AutorizacionMedicacion`,
`AtencionEnfermeria`, `EnfermeriaContacto` y `EnfermeriaMovimiento`. Índices:
unicidad ficha colegio/alumno; atenciones colegio/ingreso,
matrícula/ingreso y estado/ingreso; autorizaciones ficha/estado/fin; contactos
atención/fecha; movimientos entidad/fecha y contexto/fecha.

No se ejecutó `migrate`, `db push`, `reset` ni `seed`.

## 12. Pruebas, reversión y pendientes

La prueba Jest dirigida cubre roles, tenants/colegios, cinco estados de
matrícula, ficha única, apoderado ajeno, autorización revocada/vencida/ausente,
apertura única y conflicto concurrente, cierre, corrección cerrada, contacto,
deduplicación, privacidad, ID ajeno y actor (29 casos). Notificaciones conserva
su suite dirigida.

La clasificación frontend de medicación tiene una prueba unitaria dirigida con
Node (6/6): sin autorización, vigente, administración registrada, revocada,
vencida y futura. El retorno desde ficha al detalle queda como comprobación
manual de integración de diálogos, respaldada por el refetch compilado.

API build, intranet `build:check`, ESLint dirigido sin `--fix` y Prisma
format/validate/generate aprobaron. El build real con respuestas simuladas no
sensibles se revisó en 1440×900, 1366×768 y smoke 390×844: sin overflow ni
errores de consola, con acción principal visible, diálogo operable por teclado,
foco visible y reducción de movimiento. El reflow 720×450 equivalente a zoom
aproximado 200 % conservó la acción y el diálogo dentro del viewport. No se
añadieron animaciones; se reutilizaron las transiciones específicas y
`motion-reduce` existentes. El ajuste final del aviso de atención abierta y sus
copys aprobó build y lint; su comprobación visual 1440×900 queda incluida en la
prueba manual final porque no había navegador automatizado disponible en este
workspace. La aceptación humana con datos reales sigue pendiente.

Reversión de código: patch inverso. Si la migración se aplica en una base
aislada y debe revertirse, primero exportar/conservar todo dato sensible y
eliminar FKs/tablas en orden inverso solo con procedimiento revisado; no se
autoriza pérdida de historial.

Fuera de V1: rol dedicado Enfermería, firma/adjunto, portal de salud,
telemedicina, diagnóstico, prescripción, receta, historia hospitalaria,
integración MINSA/SIS, documentos médicos complejos, FCM y protocolos
automáticos.

## 13. Historial de cambios

- [Enfermería V1](../registro-cambios/2026-09-14-enfermeria-v1.md).
