# Notificaciones

## 1. Estado

**En pruebas para V1.** La bandeja personal, la API segura, la campana de
intranet y el contrato estructurado están implementados en código. La migración
`20260913180000_notificaciones_v1_bandeja` está creada y validada, pero no se ha
aplicado. Enfermería ya emite avisos mínimos opcionales; las integraciones futuras de Matrícula y otros eventos de
Tesorería no forman parte de este incremento.

## 2. Propósito

Notificaciones es la bandeja personal de eventos y avisos operativos del
sistema. No es un editor de mensajes masivos ni reemplaza a Circulares.

## 3. Usuarios y roles

- Intranet: Admin, Director, Secretaria y Profesor pueden abrir la bandeja.
- Portal: una cuenta externa autenticada consume la misma API personal.
- Todos los actores consultan y cambian únicamente registros cuyo
  `id_usuario` coincide con el actor JWT.
- El acceso visual por rol no reemplaza membresías activas ni autorización del
  backend.

## 4. Alcance institucional

- El cliente de intranet envía siempre `tenant_id` y `scope=all` o
  `colegio_id` desde `SchoolContext`.
- Todos los colegios: incluye avisos globales del tenant y avisos de los
  colegios activos autorizados dentro de ese tenant.
- Colegio específico: incluye avisos del colegio y avisos globales del tenant.
- Otro tenant o colegio sin membresía activa devuelve 404 seguro.
- Portal sin selector solo puede omitir `tenant_id` cuando el actor tiene un
  único tenant activo; con varios tenants la API exige seleccionarlo.
- Legacy con `id_tenant=NULL` e `id_colegio=NULL` se muestra solo a un actor con
  un único tenant activo. Se excluye cuando el contexto es ambiguo. Nunca se
  deriva tenant o colegio desde textos, tipos o URLs.

## 5. Datos principales

`Notificacion` conserva `tipo` y agrega campos opcionales:

- `id_tenant`, `id_colegio`;
- `origen`: citas, pagos, matricula, academico, eventos, enfermeria o sistema;
- `referencia_tipo`, `referencia_id`;
- `canal`: intranet, portal o `padres` legacy compatible;
- `fecha_lectura`.

La relación principal continúa siendo `Notificacion.id_usuario → Usuario`.

## 6. Flujo principal

1. Un servicio interno crea un aviso para un Usuario concreto.
2. Si conoce contexto, guarda tenant, colegio, origen, referencia y canal.
3. La bandeja resuelve membresías activas del actor y construye el filtro en
   base de datos.
4. La lista muestra estado, origen, título, resumen, institución en consolidado,
   fecha/hora y acción interna cuando existe.
5. El actor puede marcar una, volverla a no leída o marcar todas las no leídas
   del alcance.

## 7. Estados

- No leída: `leida=false`, `fecha_lectura=NULL`.
- Leída: `leida=true`, `fecha_lectura` registra la última marca de lectura.
- No existe borrado físico, archivo ni ocultamiento en V1.

## 8. Reglas de negocio y seguridad

- Toda lista, conteo y mutación combina actor, tenant y alcance institucional.
- Marcar una notificación usa `id_notif + id_usuario + scope`; un registro
  ajeno o fuera del alcance responde 404.
- Marcar todas usa el mismo filtro y no afecta otros usuarios, tenants o
  colegios.
- `crearNotificacion` es un servicio interno; no existe endpoint público para
  redactar avisos.
- Una URL debe ser relativa, interna y pertenecer a la lista permitida del
  canal. Una ruta de intranet no puede guardarse para el portal y viceversa.
- Los helpers familiares consideran solo matrículas `Activo`, `Matriculado` o
  `Pre-matriculado`; excluyen `Inactivo` y `Reserva`.
- Los destinatarios se deduplican por Usuario y contexto durante cada operación.

## 9. Orígenes e integraciones actuales

- Citas: alta para responsable interno; creación/reprogramación/cancelación de
  reunión y cambios relevantes para familias. Guarda referencia `cita`.
- Eventos: alta y recordatorio para familias con contexto persistido. Un evento
  legacy sin tenant se omite; un evento global con tenant y colegio NULL se
  entrega una sola vez por Usuario como aviso global del tenant.
- Pagos: el flujo existente de nuevo pago pendiente usa origen `pagos` y
  referencia al cronograma.
- Académico/NFC: el aviso existente de asistencia deriva contexto únicamente
  desde matrículas operativas y relaciones persistidas.
- Circulares: sigue siendo el contenido masivo. Su aviso complementario legacy
  se omite mientras el flujo no entregue tenant/colegio explícitos; no se
  difunde por un nivel compartido entre organizaciones.
- Enfermería: aviso opcional al apoderado vinculado, deduplicado por Usuario,
  con contexto/referencia y texto mínimo sin síntomas, alergias ni medicación.
  Usa canal `portal`, no inventa URL y conserva lectura de `padres` históricos.

Pendientes: más eventos de pagos/validación, matrícula, notas y
otros avisos académicos. Se conectarán incrementalmente; su mención como origen
no significa que ya emitan notificaciones.

## 10. API

| Método y ruta | Finalidad |
|---|---|
| `GET /notificaciones` | Lista paginada personal; filtra lectura, origen, búsqueda y scope |
| `GET /notificaciones/count` | Conteo personal de no leídas en el scope |
| `PATCH/PUT /notificaciones/:id/leida` | Marca propia como leída o no leída |
| `PATCH/PUT /notificaciones/marcar-todas-leidas` | Marca las propias no leídas del scope |
| `POST/DELETE /notificaciones/token` | Compatibilidad del registro FCM existente; FCM completo queda fuera de V1 |

## 11. Interfaz

`/notificaciones` reutiliza `PageHeader` y patrones de filtros, resumen, lista,
skeleton, error, vacío y paginación de intranet. Es desktop/laptop first; en
pantalla angosta conserva una columna y todas las acciones. Los controles tienen
texto, foco visible, altura táctil mínima y `motion-reduce`. La campana de
intranet muestra el conteo del alcance activo y navega a la bandeja.

El `NotificationBell` del portal conserva su dropdown mobile-first, consume la
respuesta paginada, usa el conteo personal y vuelve a validar la ruta
`/dashboard/...` antes de navegar. La autenticación externa sigue siendo deuda
separada.

## 12. Pruebas

La suite dirigida cubre propiedad, rechazo de ID ajeno, count, lectura/no
lectura, marcar todas, filtros, búsqueda, aislamiento de tenant/colegio,
deduplicación de Citas, estados de matrícula y política legacy. La aplicación de
la migración y la aceptación con datos reales siguen pendientes. La revisión
visual del build aprobó 1440×900, 1366×768 y smoke test 390×844 sin overflow ni
errores de consola; foco visible y reducción de movimiento también aprobaron.
El reflow 720×450 conservó las tres acciones esenciales.

## 13. Reversión

El código puede revertirse mediante patch inverso. Si la migración llegara a
aplicarse, las columnas son aditivas; antes de retirarlas se debe exportar el
contexto/referencias nuevos, retirar FKs e índices y conservar las filas de
`Notificacion`. No se debe borrar el historial operativo.

## 14. Historial de cambios

- [Notificaciones V1: bandeja personal segura](../registro-cambios/2026-09-13-notificaciones-v1.md).
