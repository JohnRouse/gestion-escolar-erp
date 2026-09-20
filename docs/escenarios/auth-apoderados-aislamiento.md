# Auth de apoderados: aislamiento entre portal e intranet

## Estado

En pruebas. Contrato, servicios, pruebas dirigidas y smoke de API con datos
locales aprobados; aceptación humana en navegador pendiente.

## Situación inicial

Existen usuarios internos y externos en la misma tabla `Usuario`. Un apoderado
tiene una Persona, un registro Apoderado y cero o más vínculos
ApoderadoEstudiante. La intranet y el portal comparten API y secreto JWT, pero
son superficies de acceso distintas.

## Actores y permisos

- Apoderado/Padre/Madre: solo canal de portal si existe Apoderado real.
- Admin/Director/Secretaria/Profesor: solo canal interno según sus permisos.
- Tutor académico: no obtiene acceso familiar por esa función.

## Datos necesarios

Usuario activo con contraseña bcrypt, Rol, Persona y, para el portal, Apoderado.
Los datos del hijo exigen ApoderadoEstudiante y el contexto de Matricula
correspondiente. UsuarioTenant/UsuarioColegio no reemplazan esas relaciones.

## Flujo válido

1. El apoderado usa `POST /auth/portal/login`.
2. Auth valida credenciales, rol vigente e identidad Apoderado.
3. El JWT incluye `canal: portal-padres`.
4. `jwt-portal` relee al usuario antes de construir el actor.
5. `/academicos/padres/hijos` deriva el apoderado desde `personaId`; nunca
   recibe `id_apoderado` del cliente.
6. Cada consulta posterior revalida el vínculo y su matrícula/audiencia.
7. Ante 401, el frontend borra la sesión y vuelve al login.

## Validaciones y denegaciones

- Contraseña incorrecta, cuenta desactivada, Admin en portal o Persona externa
  sin Apoderado: 401 `Credenciales inválidas`.
- Credenciales correctas de apoderado en `/auth/login`: rechazo y orientación
  al portal; contraseña errónea no revela el tipo de cuenta.
- JWT interno en ruta portal: 401 por claim de canal.
- JWT portal en ruta interna: 401 por claim de canal.
- Rol alterado o vínculo Apoderado retirado después de emitir el token: 401 al
  releer DB.
- ID de alumno, matrícula, cita o notificación ajenos: 403/404 sin contenido.
- `Inactivo` y `Reserva` no conceden audiencia operativa; `Activo`,
  `Matriculado` y `Pre-matriculado` sí.
- Eventos solo aparecen cuando colegio, año y audiencia intersectan una
  matrícula operativa del hijo.
- Notificaciones se derivan del usuario del token y solo admiten canal
  `portal`/`padres`; una notificación de intranet no aparece.

## Resultado esperado

Un apoderado real inicia sesión y consume exclusivamente recursos de sus hijos
vinculados. No obtiene contexto Staff/Docente ni acceso a rutas internas. Un
usuario interno no puede reutilizar su token en el portal.

## Mensajes

El login portal usa siempre `Credenciales inválidas`. Los recursos ajenos se
ocultan como no encontrados o se rechazan sin revelar datos. El frontend cierra
una sesión inválida sin intentar convertir el token.

## Trazabilidad

Las operaciones de dominio mantienen su traza vigente. No se agregó bitácora de
sesiones en este incremento. No existe eliminación de datos ni migración.

## Reversión

Revertir código y documentación del incremento. No hay migración, seed ni datos
generados que revertir. Los JWT emitidos dejan de ser utilizables al retirar la
estrategia o sus rutas.

## Estado de implementación

Las pruebas dirigidas y builds son evidencia técnica. La API local confirmó
`admin/admin123`, `carlos.diaz/apoderado123`, aislamiento bidireccional de
tokens, perfil, hijos, recursos propios y rechazo de IDs ajenos. Falta la
aceptación humana en navegador antes de la aceptación funcional.
