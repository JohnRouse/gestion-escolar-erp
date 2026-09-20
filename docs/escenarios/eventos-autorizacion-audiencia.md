# Eventos: autorización, audiencia y familias

## Estado

En pruebas. Migración aplicada en la base local, contrato y pruebas dirigidas
implementados; prueba manual final con datos persistidos pendiente.

## Situación inicial

Un tenant tiene dos colegios. Admin/Director/Secretaria poseen membresías
activas para uno o ambos; Profesor tiene asignaciones por año. Un apoderado está
vinculado a uno o varios estudiantes con matrículas de estados distintos.

## Actores y permisos

- Admin, Director y Secretaria gestionan solo donde coinciden rol global y
  `rol_colegio` efectivo de gestión.
- Profesor solo consulta eventos de todo el colegio o que intersectan sus
  niveles, grados o secciones asignadas del año.
- Apoderado consulta únicamente eventos que intersectan al menos una matrícula
  operativa de un hijo vinculado.

## Datos necesarios

Tenant y colegio activos, UsuarioTenant/UsuarioColegio activos, año del mismo
colegio, `SeccionAnio` activa con tenant/colegio/año coincidentes cuando la
audiencia es específica, audiencia relacional y, para familias, matrícula y
ApoderadoEstudiante persistidos.

## Flujo

1. El gestor elige un colegio inequívoco incluso desde consolidado.
2. Al crear, recibe solo años operables y se preselecciona primero el abierto,
   en curso o activo; Planificación es la alternativa posterior.
3. Nivel, grado y sección se derivan de la estructura `SeccionAnio` activa del
   colegio/año; cambiar uno de esos contextos limpia los destinos elegidos.
4. El backend revalida tenant, colegio, año, rango de fecha y cada destino.
5. Evento, audiencia y movimiento se escriben en una transacción.
6. Se consultan matrículas del mismo tenant/colegio/año en estados `Activo`,
   `Matriculado` o `Pre-matriculado`.
7. Se recorren vínculos reales de apoderados y se deduplican Usuarios.
8. El portal vuelve a derivar los eventos desde esos vínculos; recibir una
   notificación no concede acceso al calendario.
9. Una notificación nueva abre el año/mes del deep link. El calendario
   selecciona el día de `evento_id` solo cuando el evento existe en la respuesta
   autorizada de `GET /eventos/padres`; si no existe, presenta la vista normal.

## Validaciones y denegaciones

- Tenant, colegio, año, nivel, grado, sección o evento ajeno: rechazo seguro.
- Una sección global existente pero ausente/inactiva en `SeccionAnio` para el
  contexto seleccionado se rechaza.
- Año Cerrado/Archivado/Finalizado: no se ofrece ni admite para crear; sus
  eventos históricos siguen consultables.
- Año en Planificación: admite Todo el colegio y audiencias específicas solo si
  ya existe estructura anual activa.
- Fecha fuera de los límites inclusivos del año: rechazo 400 estable.
- `Todos los colegios`: solo colegios autorizados del tenant activo.
- Todo el colegio: no consulta niveles globales; filtra matrículas directamente
  por tenant/colegio/año.
- `Inactivo` y `Reserva`: no reciben aviso ni habilitan eventos en el portal.
- Dos hijos o destinos coincidentes: una notificación por Usuario.
- Evento cancelado: permanece visible y no genera recordatorio.
- `evento_id` manipulado o ya no accesible: no habilita una consulta por ID ni
  muestra información fuera de la audiencia.
- Cancelación sin motivo: rechazo sin cambiar el estado.

## Resultado esperado

Solo la audiencia real del colegio recibe/consulta el evento. La gestión queda
trazada con actor, fecha, acción, motivo y datos mínimos. No se crea Circular,
no se modifica Horario y no existe borrado físico.

## Mensajes

Los errores indican si falta seleccionar institución/año/audiencia o si el rol
no permite la acción. Para el cruce fecha/año se muestra `La fecha del evento no
corresponde al año lectivo seleccionado.` Los recursos ajenos se responden como
no encontrados para no revelar existencia.

## Trazabilidad

Creación, edición, cambio de audiencia, cancelación y realización generan
movimientos. La cancelación registra además su motivo y fecha en Evento.

## Reversión

La migración aplicada no forma parte de esta corrección. Para revertirla, aplicar
el patch inverso del código y la documentación; no revertir esquema ni eliminar
eventos, destinatarios o movimientos.
