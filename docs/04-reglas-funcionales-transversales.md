# Reglas funcionales transversales

## 1. Presentación del año lectivo

Cuando el alcance sea `Todos los colegios`:

`Año Escolar 2027 · I.E.P. Santa María Victoria`

Cuando se seleccione un colegio específico:

`Año Escolar 2027`

Esta lógica debe centralizarse en una función o componente reutilizable.

## 2. Año lectivo

- Todo registro académico debe asociarse al año correspondiente.
- No deben mezclarse años sin solicitud expresa.
- Los selectores deben mostrar únicamente años autorizados.
- Un año debe identificar su institución cuando el alcance sea consolidado.

## 3. Grados y secciones

Una sección se relaciona con:

- Tenant.
- Institución.
- Año lectivo.
- Nivel.
- Grado.
- Letra.
- Capacidad.
- Estado.

Denominaciones recomendadas:

- Inicial · 5 años · Sección A.
- Primaria · 5.º grado · Sección A.
- Secundaria · 1.º grado · Sección B.

## 4. Tutoría

Cada sección puede tener un tutor asignado durante un año lectivo.

Ser Docente o Tutor no convierte a una Persona en miembro de Staff. Una Persona
puede pertenecer a ambos dominios cuando ejerce adicionalmente un cargo
institucional no docente. La tutoría se presenta y administra desde Docentes o
desde el dominio académico correspondiente, nunca desde la gestión de Staff.

Solo deben acceder:

- Tutor asignado.
- Administrador autorizado.
- Director autorizado.

## 5. Matrícula

El sistema debe distinguir:

- Matrícula nueva.
- Renovación.
- Promoción.
- Permanencia.
- Traslado interno.
- Traslado externo.
- Retiro.
- Egreso.
- Recuperación.

Las matrículas deben conservar historial.

## 6. Procesos masivos

Todo proceso masivo debe incluir:

- Configuración.
- Vista previa.
- Resumen.
- Conflictos.
- Confirmación.
- Ejecución transaccional.
- Usuario ejecutor.
- Fecha.
- Historial.
- Validación antes de reversión.
- Protección contra duplicados.

## 7. Traslados entre instituciones del grupo

Estado actual: en análisis e implementación parcial.

La promoción entre instituciones del mismo tenant debe validar:

- Institución de origen.
- Institución de destino.
- Año de origen.
- Año de destino.
- Grado receptor.
- Sección receptora.
- Cupos.
- Continuidad.
- Tipo de ingreso.
- Trazabilidad.
- Reversión.

No debe marcarse como implementada hasta completar pruebas transaccionales.

## 8. Tesorería

Los pagos, anulaciones y validaciones deben conservar:

- Usuario.
- Fecha.
- Motivo.
- Estado anterior.
- Estado posterior.
- Institución.
- Estudiante o responsable.
- Evidencia cuando corresponda.

## 9. Eliminación

La información académica y financiera no debe eliminarse físicamente cuando se requiera trazabilidad.

Deben utilizarse estados como:

- Anulado.
- Inactivo.
- Revertido.
- Cerrado.
- Cancelado.

## 10. Persona compartida y credenciales internas

- Persona conserva una identidad canónica para Staff, Docentes, Usuarios y los
  demás dominios que la referencian.
- Corregir Persona desde Staff actualiza el mismo registro solo cuando Admin o
  Director tiene autoridad sobre todos sus contextos institucionales conocidos.
- DNI tiene exactamente ocho dígitos, es único y una colisión se rechaza sin
  crear otra Persona.
- Username, rol, restablecimiento de contraseña y estado de acceso son acciones
  sensibles y requieren motivo explícito.
- Director no puede crear/elevar a Admin ni operar una cuenta Admin. Ninguna
  acción de Staff concede privilegios de Superadministración SaaS.
- Una contraseña se reemplaza mediante bcrypt; nunca se consulta, recupera,
  muestra ni registra en auditoría.

## 11. Citas institucionales

- La agenda admite `individual` y `seccion`. Una cita individual pertenece a
  tenant, colegio, matrícula activa, estudiante vinculado y apoderado comprobado.
  Una reunión pertenece a tenant, colegio y sección, con matrícula/apoderado
  individual nulos. Exactamente un responsable es Staff o Docente en ambos casos.
- Tutor se cita como Docente. Persona dual conserva contextos Docente/Tutor y
  Staff separados, sin duplicar Persona ni inferirlos mediante strings.
- Staff solo es elegible con `es_miembro_staff=true` y `permite_citas=true`;
  Docente/Tutor debe estar relacionado con la sección y año de la matrícula.
- Profesor convoca solo secciones con asignación académica real o su sección de
  Tutoría; Admin, Director y Secretaria usan únicamente colegios donde su rol
  efectivo les da autoridad. Una sección recibida siempre se revalida en backend.
- La audiencia grupal se deriva de sección, matrículas activas, estudiantes y
  vínculos de apoderados; no se copian IDs familiares dentro de `Cita`.
- La búsqueda individual se ejecuta en base de datos, con debounce y límite, y
  contempla nombres/apellidos/DNI de estudiante y apoderado, código de matrícula
  y código de estudiante sin cargar el padrón al abrir. Su unidad de resultado
  es la matrícula: cada `id_matricula` aparece una sola vez e incluye todos sus
  vínculos reales `ApoderadoEstudiante`. Si la coincidencia familiar identifica
  un único apoderado, puede preseleccionarlo; la elección continúa siendo un
  campo separado y obligatorio.
- Al crear una cita individual, el backend vuelve a comprobar que el
  `id_apoderado` elegido pertenece a los vínculos del estudiante de la
  `id_matricula`; una combinación manipulada se rechaza sin persistir.
- El horario académico no representa disponibilidad de atención. Se propone un
  horario y pendientes/confirmadas bloquean solapamientos.
- Estados válidos: pendiente a confirmada/rechazada/cancelada; confirmada a
  realizada/cancelada. Rechazada solo aplica a individual. Reprogramar
  pendiente/confirmada devuelve a pendiente.
- Creación, estados, reprogramación y acuerdos se anexan a historial persistente
  con actor y valores antes/después. Citas y movimientos no se eliminan.

## 12. Notificaciones

- Notificaciones es una bandeja personal de eventos del sistema; Comunicados
  conserva la comunicación institucional formal (modelo interno `Circular`).
- Los orígenes estructurados V1 son citas, pagos, matricula, academico, eventos,
  enfermeria y sistema. La existencia de un origen no implica que todos sus eventos estén
  integrados.
- Las acciones solo aceptan rutas internas permitidas y separadas para intranet
  y portal de familias.
- La lectura conserva `fecha_lectura`; volver a no leída la limpia. No existe
  borrado físico en V1.
- Todo helper que derive familias desde matrículas incluye Activo, Matriculado y
  Pre-matriculado, y excluye Inactivo y Reserva.

## 13. Enfermería escolar

- La información de salud se denomina declarada por la familia y no equivale a
  diagnóstico, prescripción ni historia clínica hospitalaria.
- Búsqueda y apertura usan matrículas `Activo`, `Matriculado` y
  `Pre-matriculado`; los históricos continúan disponibles tras un cambio de
  estado.
- Cada matrícula puede tener una sola atención con estado `abierta`. La búsqueda
  informa su ID y la interfaz debe continuar sobre esa atención. Si una apertura
  concurrente llega al backend, responde 409 con código
  `ENFERMERIA_ATENCION_ABIERTA` sin crear atención ni movimiento duplicados.
- `Motivo de atención` describe el motivo o los síntomas observados y no
  equivale a un diagnóstico.
- Solo se registra medicación administrada seleccionando una autorización
  activa, vigente y vinculada al mismo estudiante/colegio.
- El texto libre de `Acciones y cuidados realizados` no se analiza ni permite
  afirmar que se administró medicación.
- Contactos y autorizaciones admiten únicamente apoderados persistidos en
  `ApoderadoEstudiante`.
- No se eliminan físicamente fichas, autorizaciones, atenciones, contactos ni
  movimientos. Corregir una atención cerrada exige motivo e historial.
- El aviso familiar es opcional y mínimo; nunca contiene alergias, diagnóstico,
  síntomas detallados, medicamento ni dosis.
- La métrica visual `Atenciones abiertas` cuenta directamente atenciones con
  estado `abierta`.

## 14. Eventos institucionales

- Evento calendariza una actividad; Comunicado comunica formalmente,
  Notificación avisa de forma personal y Horario programa clases semanales.
- Cada evento V1 usa una audiencia relacional única: todo el colegio, uno o
  varios niveles, grados o secciones del mismo colegio y año.
- El catálogo de niveles, grados y secciones se deriva exclusivamente de
  `SeccionAnio` activa del tenant, colegio y año seleccionados, recorriendo
  `SeccionAnio → Seccion → Grado → Nivel`; no usa catálogos globales ni la
  estructura de otro año.
- Para crear se ofrecen únicamente años operables según la convención vigente:
  Abierto, En curso, Activo, Matrícula abierta o Planificación. Se prefiere un
  año abierto/en curso/activo y, si no existe, uno en Planificación. Los años
  históricos cerrados continúan visibles en consultas.
- La fecha de creación o edición debe estar entre `fecha_inicio` y `fecha_fin`
  inclusive del año lectivo del evento; el backend rechaza cualquier cruce de
  año con el mensaje funcional establecido.
- Todo el colegio se resuelve filtrando matrículas por tenant/colegio/año; no
  expandiendo el catálogo global de niveles.
- Familias se derivan de ApoderadoEstudiante y matrículas `Activo`,
  `Matriculado` o `Pre-matriculado`; `Inactivo` y `Reserva` se excluyen. Un
  Usuario se deduplica aunque varios hijos coincidan.
- Estados: programado, cancelado y realizado. No hay borrado físico ni cambio
  automático por fecha en V1.
- Cancelar exige motivo y avisa a la audiencia. Realizar conserva historial y
  no envía un mensaje masivo automático.
- Solo cambios de fecha, hora o audiencia emiten aviso de actualización; una
  edición meramente descriptiva no re-notifica indiscriminadamente.

## 15. Comunicados institucionales

- Admin, Director y Secretaria publican con rol global y `rol_colegio` efectivo
  de gestión; Profesor no publica.
- Audiencia V1: todo el colegio, niveles o secciones. Los destinos específicos
  se derivan de `SeccionAnio` activa del año operativo. Todo el colegio se
  representa mediante una única fila NULL/NULL y no consulta niveles globales.
- `CircularEstadoApoderado` es la única fuente de lectura y confirmación del
  portal. Ausencia de fila significa no leído/no confirmado; las columnas
  equivalentes de `CircularDestinatario` son legacy.
- El estado se comparte por Apoderado canónico y audita la cuenta Usuario que
  ejecutó cada primera acción.
- La confirmación V1 es acuse personal, no firma digital certificada.
- Familias y notificaciones usan matrículas `Activo`, `Matriculado` y
  `Pre-matriculado`, excluyen `Inactivo`/`Reserva` y deduplican por Usuario.
