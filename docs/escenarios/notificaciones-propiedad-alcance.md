# Notificaciones: propiedad y alcance activo

## Situación inicial

Un Usuario posee notificaciones propias y membresías activas en uno o varios
colegios de un tenant. Puede existir otro Usuario con notificaciones cuyos IDs
sean conocidos y pueden existir filas legacy sin contexto institucional.

## Actores

- Admin, Director, Secretaria o Profesor en intranet.
- Apoderado externo autenticado, sujeto a la deuda vigente de autenticación del
  portal.

## Flujo y validaciones

1. El actor selecciona tenant y alcance institucional en intranet.
2. La API verifica Usuario activo, membresía activa de tenant y colegios.
3. El listado y count agregan siempre `id_usuario=actor.userId`.
4. Colegio específico combina sus avisos con los globales del mismo tenant.
5. Todos los colegios limita resultados a colegios autorizados del tenant.
6. Marcar por ID repite exactamente el filtro de propiedad y scope.
7. Si el ID pertenece a otro usuario o scope, la API devuelve 404 sin revelar
   existencia.
8. Marcar todas solo cambia no leídas del actor y scope.

## Casos de borde

- Tenant ajeno o colegio sin membresía: 404 seguro.
- Usuario interno sin scope: 400, debe seleccionar alcance.
- Portal con varios tenants y sin tenant explícito: 400.
- Legacy sin tenant/colegio: visible únicamente con un tenant activo; excluido
  si hay ambigüedad multi-tenant.
- URL externa, protocol-relative o perteneciente al canal opuesto: rechazada al
  crear y descartada por el cliente antes de navegar.

## Resultado y trazabilidad

La bandeja nunca funciona como consola global. Lectura registra
`fecha_lectura`; volver a no leída limpia esa fecha. No se permite borrado
físico. Estado: **en pruebas**, pendiente de aplicar la migración en entorno
aislado y aceptar con datos reales.
