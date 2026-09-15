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

- Notificaciones es una bandeja personal de eventos del sistema; Circulares
  conserva la comunicación institucional masiva.
- Los orígenes estructurados V1 son citas, pagos, matricula, academico, eventos
  y sistema. La existencia de un origen no implica que todos sus eventos estén
  integrados.
- Las acciones solo aceptan rutas internas permitidas y separadas para intranet
  y portal de familias.
- La lectura conserva `fecha_lectura`; volver a no leída la limpia. No existe
  borrado físico en V1.
- Todo helper que derive familias desde matrículas incluye Activo, Matriculado y
  Pre-matriculado, y excluye Inactivo y Reserva.
