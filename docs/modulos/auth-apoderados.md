# Autenticación de apoderados

## 1. Estado

En pruebas. El canal externo, sus contratos y el aislamiento dirigido están
implementados y compilados. El smoke de API con cuentas y vínculos persistidos
en la base local aprobó; falta aceptación humana del recorrido en navegador.

## 2. Propósito

Permitir que una persona apoderada ingrese al portal familiar sin convertir su
cuenta en un actor de intranet. El módulo autentica al usuario y entrega su
identidad; cada dominio vuelve a comprobar la relación familiar antes de
entregar un recurso de un estudiante.

## 3. Usuarios y roles

- Portal: roles normalizados `Apoderado`, `Padre` o `Madre`, siempre con
  `Persona` y un registro `Apoderado` real.
- Intranet: conserva sus roles internos. Una cuenta externa no pasa
  `JwtStrategy('jwt')`.
- `Tutor` no es rol del portal: puede representar una función académica y no
  sustituye el vínculo familiar.
- Admin, Director, Profesor y Secretaria no pueden iniciar sesión por el canal
  de apoderados.

## 4. Alcance institucional

El portal no usa el selector de alcance de la intranet. La autoridad nace de
`Usuario.id_persona → Apoderado → ApoderadoEstudiante → Estudiante → Matricula`.
Si existen vínculos reales en varios colegios se muestran esos hijos; cada
recurso conserva el colegio y año de su matrícula. `UsuarioTenant` y
`UsuarioColegio` no conceden por sí solos acceso familiar.

## 5. Datos principales

`Usuario`, `Rol`, `Persona`, `Apoderado`, `ApoderadoEstudiante`, `Estudiante` y
`Matricula`. Para recorridos actuales se consideran operativas las matrículas
`Activo`, `Matriculado` y `Pre-matriculado`; se excluyen `Inactivo` y `Reserva`.

## 6. Flujo principal

1. El portal envía `username` y `password` a `POST /auth/portal/login`.
2. El backend comprueba usuario activo, bcrypt, rol externo, Persona y
   Apoderado real, sin exigir Staff ni Docente.
3. Emite JWT con `sub`, `username`, `rol`, `personaId` y
   `canal: portal-padres`.
4. `jwt-portal` exige el canal y relee Usuario, Rol, estado y Apoderado desde la
   base en cada petición autenticada.
5. El servicio de cada recurso deriva al actor del token y revalida el vínculo
   con el hijo o matrícula solicitados.

## 7. Flujos alternativos

- `/auth/login` comprueba primero la contraseña. Con credenciales externas
  correctas orienta al portal; con contraseña incorrecta responde de forma
  genérica.
- Un 401 en el frontend elimina token, usuario, hijo seleccionado y avatar
  locales, y redirige a `/login`.
- Un JWT anterior, interno o sin la claim esperada se considera incompatible.

## 8. Estados

- Cuenta activa: puede continuar si cumple rol y vínculo.
- Cuenta desactivada: rechazo genérico.
- Matrícula operativa: habilita recorridos actuales y audiencias.
- Matrícula inactiva o reserva: no habilita datos operativos actuales.
- Sesión expirada/incompatible: cierre local y nuevo login.

## 9. Reglas de negocio

- Los tokens interno y portal no son intercambiables aunque compartan secreto.
- El rol textual del payload no es fuente de autoridad; se relee desde DB.
- El cliente nunca decide `id_apoderado` ni el propietario de una
  notificación.
- Conocer un `alumno_id`, `matricula_id`, `cita_id` o notificación no concede
  acceso.
- Notas/libreta conservan el contrato histórico existente; no se rediseñó el
  módulo académico.

## 10. Validaciones

Login externo utiliza `Credenciales inválidas` para usuario inexistente,
contraseña errónea, cuenta desactivada, rol no externo o falta de Apoderado. Los
guards verifican firma, expiración, canal y estado actual. Los servicios
responden 403/404 sin datos cuando el vínculo o propietario no corresponde.

## 11. Trazabilidad

Este incremento no crea una tabla de sesiones ni una migración. Las mutaciones
existentes (citas, lectura de notificaciones y circulares, perfil y contraseña)
conservan la trazabilidad disponible en sus módulos. La auditoría central de
sesiones continúa como deuda de plataforma.

## 12. Errores y bloqueos

- 401: credenciales, token, estado, canal, rol o identidad inválidos.
- 403/404: estudiante, matrícula, cita o mensaje fuera de autoridad.
- Estado vacío: cuenta válida sin hijos o sin recursos de audiencia.
- Error de red: el portal conserva su mensaje de conexión; un 401 sí cierra la
  sesión.

## 13. Casos hipotéticos

- Apoderado con dos hijos en colegios distintos: ve ambos si existen vínculos
  reales, sin selector consolidado de intranet.
- Apoderado cambia `alumno_id`: el servicio consulta `ApoderadoEstudiante` y no
  entrega datos del alumno ajeno.
- Admin usa `/auth/portal/login`: recibe `Credenciales inválidas`.
- Token interno llega a `/eventos/padres`: `jwt-portal` lo rechaza por canal.
- Token portal llega a una ruta interna: `jwt` lo rechaza por canal.

## 14. Dependencias

Auth, Académicos, Citas, Eventos, Notificaciones, Calificaciones, Asistencia,
Horario, Comunicados y Tesorería; además de las relaciones familiares y
matrículas ya existentes.

## 15. Interfaz

El login conserva el patrón visual y mobile-first existente. Se sustituyeron
los falsos controles de recuperación/solicitud por texto institucional. El
formulario permite teclado y envío con Enter, tiene etiquetas, foco visible,
autocompletado y anuncio de error; el splash se omite cuando el sistema solicita
movimiento reducido. Se reutilizan `ScreenHeader`, `BottomNav` y los patrones
actuales. El build valida la estructura, pero 390×844, zoom y lector de pantalla
requieren prueba humana porque no hubo navegador disponible.

## 16. Seguridad

`jwt` exige `canal: intranet` y sigue rechazando Apoderado/Padre/Madre.
`jwt-portal` exige `canal: portal-padres`, rol externo actual y Apoderado real.
Los controllers exclusivos del portal están separados de controllers internos
para evitar guards acumulados o debilitamiento accidental. No se usa
`Staff.es_tutor` como autorización familiar.

## 17. API

Todos estos contratos usan `jwt-portal`, salvo el login:

| Área | Contratos del portal |
|---|---|
| Auth | `POST /auth/portal/login`, `GET/PUT /auth/portal/perfil`, `PUT /auth/portal/cambiar-password` |
| Hijos | `GET /academicos/padres/hijos`, `PUT /academicos/padres/hijos/:id/avatar` |
| Contexto escolar | `GET /academicos/padres/anios`, `GET /academicos/padres/asistencia`, `GET /academicos/padres/horario` |
| Citas | `GET /citas/apoderado`, `GET /hijos`, `GET /destinatarios`, `POST /citas/apoderado`, `PATCH /:id/cancelar` bajo ese prefijo |
| Eventos | `GET /eventos/padres` |
| Notificaciones | `GET /notificaciones/portal`, `GET /notificaciones/portal/count`, `PATCH /notificaciones/portal/:id/leida` |
| Calificaciones | `GET /calificaciones/padres/{notas,comparativa,comentarios,unidades,alertas,libreta}` |
| Comunicados | `GET /circulares/padres`, `PUT /circulares/:id/leida`, `POST /circulares/:id/confirmar` |
| Tesorería | `GET /tesoreria/padres/estado-cuenta` |

Inventario frontend fuera de este cierre: la página de Galería aún contiene
`GET /albumes`, `GET /albumes/:id/fotos`, comentarios
`GET/POST /albumes/fotos/:id/comentarios`, edición/eliminación en
`/albumes/fotos/:fotoId/comentarios/:comentarioId`, reacciones
`GET /albumes/fotos/:id/reacciones` y `POST /albumes/fotos/:id/reaccionar`.
Su entrada fue retirada del menú. Galería es P1 y esos contratos no se migraron
porque `api/src/albumes/**` quedó fuera del alcance autorizado. El portal dejó
de consumir los contratos internos `/actividad`, `/apoderados/perfil`,
`/estudiantes/:id/avatar`, `/academicos/anios` y `/notificaciones`.

## 18. Base de datos

Comunicados agrega la migración aditiva ya aplicada
`20260919190000_comunicados_estado_apoderado`. No duplica Persona, Apoderado ni
Usuario y no realiza backfill. Lectura y confirmación usan estado por Apoderado
canónico y registran el Usuario ejecutor; las columnas legacy compartidas de
`CircularDestinatario` dejaron de ser fuente funcional del portal.

## 19. Pruebas

- Auth dirigido: login interno/portal, error genérico, usuario desactivado,
  identidad sin Apoderado, perfil y aislamiento bidireccional de estrategias.
- Recursos: hijos, notas, asistencia y estado de cuenta propios/ajenos.
- Suites existentes: Citas propias/ajenas y Eventos con audiencia operativa.
- Notificaciones: canal de portal, propiedad, exclusión de intranet y mutación
  ajena.
- Build API y portal, TypeScript del portal, ESLint dirigido y comprobaciones de
  diff forman la puerta técnica; sus resultados se registran en el cambio.

## 20. Pendientes y deuda técnica

- Prueba humana en navegador con `carlos.diaz` o `rosa.pardo`; el smoke de API
  con `carlos.diaz` ya aprobó sobre los datos locales existentes.
- Recuperación automática, auto-registro y refresh tokens no forman parte de V1.
- Galería/Álbumes requiere un cierre de autorización separado.
- Comunicados legacy sin colegio solo son visibles si una sección vinculada
  identifica la institución; destinos generales o solo por nivel sin contexto
  se excluyen para evitar cruces entre colegios.
- Campaña E2E real y revisión 390×844/zoom permanecen pendientes.

## 21. Historial de cambios

- [Auth de apoderados V1](../registro-cambios/2026-09-18-auth-apoderados-v1.md).
