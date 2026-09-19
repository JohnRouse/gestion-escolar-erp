# Eventos

## 1. Estado

**En pruebas.** La gestión V1 está implementada en código y la migración aditiva
`20260915120000_eventos_v1` ya fue aplicada correctamente en la base local. La
corrección final de catálogo anual, años de creación y coherencia fecha/año
cuenta con pruebas dirigidas y builds aprobados; falta la prueba manual final
con datos persistidos representativos. El
calendario del portal usa el contrato seguro, pero su acceso real continúa
dependiendo de habilitar la autenticación externa ya identificada como deuda
transversal.

## 2. Propósito

Un Evento es una actividad institucional calendarizada: actuación, reunión
general, día no laborable, ceremonia, paseo, evaluación institucional,
celebración o jornada especial.

- Evento registra la actividad y su fecha.
- Circular conserva la comunicación formal y sus adjuntos/autorizaciones.
- Notificación es un aviso personal automático originado por el evento.
- Horario conserva la programación semanal de clases.

Eventos no genera Circulares automáticamente y no implementa entradas,
reservas ni ticketing.

## 3. Usuarios y roles

- Admin, Director y Secretaria: consultar, crear, editar eventos programados,
  cancelar y marcar realizado cuando el rol global y el `rol_colegio` efectivo
  autorizan la gestión en la institución.
- Profesor: consulta de eventos de todo su colegio y de audiencias que coinciden
  con sus asignaciones persistidas del año; no crea ni muta.
- Apoderado: consulta únicamente por el endpoint del portal y solo para hijos
  vinculados mediante `ApoderadoEstudiante` y matrícula operativa.

Los guards son una primera barrera. El servicio vuelve a comprobar actor,
tenant, membresía institucional y pertenencia de cada recurso.

## 4. Alcance institucional

- `Todos los colegios` se limita a membresías activas del tenant activo y solo
  está disponible en V1 para Admin/Director.
- Colegio específico consulta únicamente ese colegio.
- Crear requiere `id_tenant`, `id_colegio` e `id_anio` inequívocos.
- El año, nivel, grado y sección se revalidan contra el mismo colegio y año.
- IDs directos ajenos responden sin revelar el recurso.
- Registros legacy sin contexto institucional seguro no entran en consultas V1.

## 5. Datos principales

- `Evento`: contexto, contenido, fecha/horas, tipo, estado, ubicación, actores y
  marcas temporales. La columna histórica `hora` se conserva y se copia a
  `hora_inicio` durante la migración.
- `EventoDestinatario`: audiencia relacional de tipo colegio, niveles, grados o
  secciones. Un evento usa un único tipo de audiencia V1 y no duplica IDs.
- `EventoMovimiento`: actor, fecha, acción, motivo opcional y datos mínimos.
- `Matricula`, `SeccionAnio`, `Seccion`, `Grado`, `Nivel` y
  `ApoderadoEstudiante`: resuelven destinatarios reales.

## 6. Flujo principal

1. El gestor elige institución y año.
2. Registra título, tipo, descripción, fecha, horas y ubicación.
3. Define todo el colegio o uno/múltiples niveles, grados o secciones.
4. El backend revalida contexto y audiencia dentro de la transacción.
5. Se crea como `programado`, junto con destinatarios y movimiento `creado`.
6. Después de persistir, Notificaciones V1 avisa una vez por Usuario apoderado.

Al crear, el selector excluye años cerrados, archivados o finalizados. Prefiere
Abierto/En curso/Activo/Matrícula abierta y usa Planificación como segunda
opción. Si no existe ninguno, el formulario informa el vacío y bloquea el alta.
Los eventos históricos de años cerrados siguen disponibles en listado y
detalle.

## 7. Flujos alternativos

- Editar: solo un programado; registra campos modificados y, si corresponde,
  un movimiento separado de audiencia. Solo fecha/hora/audiencia activa un
  aviso de actualización.
- Cancelar: exige motivo, cambia a `cancelado`, conserva el registro y notifica.
- Realizar: cambia un programado a `realizado`, registra movimiento y no emite
  mensaje masivo automático.
- Recordatorio: el cron existente procesa eventos programados a dos días,
  conserva contexto/audiencia y evita repetir el mismo aviso a un Usuario.

## 8. Estados

- `programado`: editable, cancelable y marcable como realizado.
- `cancelado`: histórico visible; no genera recordatorios.
- `realizado`: histórico visible; no cambia automáticamente por fecha en V1.

No existe `DELETE /eventos`.

## 9. Reglas de negocio

- Una audiencia V1 es exactamente una de: colegio, niveles, grados o secciones.
- Niveles, grados y secciones disponibles se deduplican desde `SeccionAnio`
  activa del mismo tenant, colegio y año, siguiendo sus relaciones con
  `Seccion`, `Grado` y `Nivel`.
- Un año en Planificación admite eventos de todo el colegio aunque todavía no
  tenga estructura; una audiencia específica exige al menos un destino anual
  válido.
- `Evento.fecha` debe pertenecer al rango inclusivo `fecha_inicio`–`fecha_fin`
  del año lectivo seleccionado.
- Todo el colegio no se expande consultando el catálogo global de niveles.
- Familias: solo matrículas `Activo`, `Matriculado` o `Pre-matriculado`;
  `Inactivo` y `Reserva` quedan excluidas.
- Un Usuario apoderado recibe un aviso aunque varios hijos coincidan.
- El vínculo familiar debe existir en `ApoderadoEstudiante`.
- Crear/actualizar/cancelar notifica con origen `eventos`, canal `padres`,
  referencia `evento + id_evento` y URL `/dashboard/calendario`.
- Circular no se crea desde Eventos; `generar_circular` queda fuera de V1.

## 10. Validaciones

- Título y fecha válidos.
- Año de creación en estado operativo y fecha dentro de su rango; esta regla se
  revalida en backend tanto al crear como al editar.
- Hora fin posterior a inicio; no se admite fin sin inicio.
- Audiencia de colegio sin IDs; otras audiencias con al menos un ID único.
- Institución, año y destinos dentro del mismo tenant/colegio/año.
- Solo un evento programado admite mutaciones.
- DTOs transformados, con whitelist y rechazo de propiedades desconocidas.

## 11. Trazabilidad

Se registran `creado`, `editado`, `audiencia_actualizada`, `cancelado` y
`realizado`. Cada movimiento conserva evento, tenant, colegio, actor, fecha,
motivo cuando aplica y datos mínimos estructurados. No se guardan snapshots
gigantes ni se elimina el historial.

## 12. Errores y bloqueos

- Scope ambiguo: solicita elegir institución/tenant.
- Recurso ajeno: respuesta segura de no encontrado.
- Rol insuficiente: acceso denegado.
- Estado incompatible: conflicto sin modificar datos.
- Estructura del año ausente: audiencia inválida.
- Fecha fuera del año: `La fecha del evento no corresponde al año lectivo
  seleccionado.` y ninguna escritura.
- La entrega push completa y la autenticación externa del portal permanecen
  fuera de este incremento.

## 13. Casos hipotéticos

- Dos hijos del mismo apoderado en secciones convocadas: una notificación.
- Sección de otro colegio manipulada en el body: rechazo y ninguna escritura.
- Evento cancelado dos días antes: el cron no lo selecciona.
- Profesor con sección asignada: ve destino de sección/nivel/grado coincidente;
  otro profesor sin coincidencia no lo ve, salvo evento de todo el colegio.

## 14. Dependencias

Auth/JWT, UsuarioTenant, UsuarioColegio, estructura académica anual, Matrícula,
ApoderadoEstudiante, Notificaciones V1 y el calendario del portal.

## 15. Interfaz

- Intranet `/eventos`: página separada de `/calendario` (Horario), desktop y
  laptop first, lista cronológica, filtros, paginación, formulario, detalle e
  historial. En ancho menor usa fichas, no un calendario gráfico complejo.
- Portal `/dashboard/calendario`: conserva la vista mensual mobile-first y
  muestra estado, horario y ubicación de eventos familiares autorizados.
- Reutiliza `PageHeader`, `AccessibleDialog` y `ConfirmDialog`; los controles
  tienen texto, foco visible, estados de carga/vacío/error/éxito y variantes de
  reducción de movimiento.

## 16. Seguridad

La autorización se aplica por acción y por institución. Las mutaciones vuelven
a comprobar membresía y rol efectivo dentro de la transacción. La consulta de
profesores deriva relevancia de asignaciones; la consulta familiar deriva
audiencia de vínculos y matrículas, no de notificaciones recibidas.

## 17. API

| Método y ruta | Finalidad |
|---|---|
| `GET /eventos` | Lista paginada por scope, fecha, estado, tipo y búsqueda |
| `GET /eventos/opciones` | Años y estructura anual para el formulario autorizado |
| `GET /eventos/padres` | Eventos derivados de hijos vinculados |
| `GET /eventos/:id` | Detalle e historial con autorización contextual |
| `POST /eventos` | Crear programado |
| `PATCH /eventos/:id` | Editar un programado |
| `POST /eventos/:id/cancelar` | Cancelar con motivo |
| `POST /eventos/:id/realizar` | Marcar realizado |

El endpoint productivo `POST /eventos/recordatorios/prueba` fue retirado.

## 18. Base de datos

La migración `20260915120000_eventos_v1` es aditiva: agrega campos a
`Evento`, crea `EventoDestinatario` y `EventoMovimiento`, copia `hora` a
`hora_inicio`, y añade índices/FKs. Fue aplicada correctamente en la base local
antes de esta corrección y no se modificó. Los actores en eventos
legacy quedan nulos porque no se inventa autoría histórica.

## 19. Pruebas

La suite dirigida cubre roles, tenant/colegio/año ajenos, audiencias, profesor,
deduplicación familiar, estados de matrícula, cancelación sin borrado,
recordatorios, ID directo, actor e intersección del portal. Prisma format,
validate/generate, builds, lint dirigido y revisión visual se registran en el
cambio funcional asociado con sus resultados reales.

La corrección final añade cobertura para años cerrados, prioridad del año
abierto, Planificación, fecha dentro/fuera del rango, 2027 con fecha 2026,
catálogo anual por nivel/grado/sección, destinos inactivos o de otro colegio,
limpieza de dependencias al cambiar año y ausencia de estructura.

La revisión visual técnica usó respuestas controladas, sin base de datos, en
1440×900, 1366×768 y 390×844. No hubo desbordamiento horizontal ni errores de
consola. También se comprobó foco visible por teclado, controles con texto y
`prefers-reduced-motion: reduce`. El portal se revisó en 390×844 con un evento
autorizado. Esto no sustituye la prueba manual final con datos persistidos.

## 20. Pendientes y deuda técnica

- Prueba manual final con datos persistidos representativos tras la corrección
  de catálogo, año predeterminado y fecha.
- Habilitar autenticación externa segura para que el portal consuma el contrato.
- Evaluar entrega push real y tolerancia/reintento de avisos; no son parte de V1.
- Reconciliar contexto/autoría de eventos legacy antes de exigir columnas no
  nulas en base de datos.

## 21. Historial de cambios

- [Eventos V1: gestión institucional, audiencia y trazabilidad](../registro-cambios/2026-09-15-eventos-v1.md).
- [Corrección final: catálogo anual, años y fecha](../registro-cambios/2026-09-18-eventos-catalogo-anio-fecha.md).
