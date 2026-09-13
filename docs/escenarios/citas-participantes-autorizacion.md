# Citas y reuniones: participantes, alcance y transiciones

## Situación inicial

Existe una matrícula activa vinculada a un estudiante, su apoderado, colegio,
sección y año. La sección tiene Docentes asignados y puede tener Tutor; el colegio
puede tener Staff institucional que acepta citas.

La agenda distingue una cita individual de una reunión de sección. La primera
usa matrícula/apoderado; la segunda usa la sección como audiencia estructural.

## Actores y permisos

- Admin, Director o Secretaria con rol efectivo equivalente en el colegio:
  consulta, crea y gestiona la agenda y cualquier sección de ese colegio.
- Profesor: crea reuniones solo en secciones donde tiene `AsignacionDocente`.
- Tutor: crea en su sección de Tutoría y en sus demás secciones docentes reales.
- Destinatario interno con acceso a intranet: consulta y gestiona solo sus citas.
- Apoderado autenticado: consulta/cancela solo citas propias y propone una cita
  solo sobre la matrícula activa de un hijo vinculado.

## Flujo esperado

1. Individual busca incrementalmente por nombres, DNI o códigos. La respuesta
   presenta una sola opción por matrícula, incluso si el estudiante tiene varios
   apoderados o si el texto coincide simultáneamente con alumno y familia.
2. El gestor selecciona al estudiante y luego el `Apoderado participante` entre
   sus vínculos reales. Si la búsqueda familiar identifica inequívocamente a uno,
   queda preseleccionado; el usuario puede cambiarlo por otro vínculo real.
3. La API deriva o comprueba colegio/tenant y vuelve a comprobar vínculo o
   asignación de sección.
4. Presenta responsables Docente/Tutor/Staff válidos sin mezclar sus contextos.
5. El actor propone fecha y horas; no se usa el horario de clase como atención.
6. La transacción revalida actor, audiencia, responsable, orden horario y ausencia
   de solapamiento; crea el registro pendiente y su movimiento de creación.
7. En reunión, familias y estudiantes se calculan desde matrículas activas y
   vínculos actuales; no se persiste una lista copiada de IDs.
8. Una acción autorizada sigue la máquina de estados. Reprogramar conserva antes
   y después; acuerdos se anexan al historial. Rechazo no aplica a reunión.

## Validaciones y mensajes

- Colegio, tenant, usuario o recurso ajeno: 403 cuando falla el alcance solicitado
  o 404 cuando no debe revelarse el recurso.
- Apoderado elegido sin vínculo con la matrícula en alta interna: solicitud
  inválida (400), sin crear la cita.
- Vínculo familiar ajeno en el portal o destinatario inválido: recurso no
  disponible sin revelar datos adicionales.
- Sección no asignada al Profesor/Tutor: 403 sin crear la reunión.
- Horas inválidas: “La hora de inicio debe ser anterior a la hora de fin”.
- Solapamiento: “El destinatario ya tiene una cita en ese horario”.
- Transición inválida: se indica el estado origen/destino no permitido.

Una Persona Docente+Staff conserva dos opciones con contexto explícito. Un Tutor
no genera Staff ni se cita mediante `id_staff` por ser Tutor.

## Trazabilidad, reversión y estado

Cada creación, estado, reprogramación y acuerdo guarda actor y fecha; los campos
anteriores/nuevos se conservan cuando aplican. No se elimina información. Una
corrección operativa se realiza mediante otra transición/reprogramación
autorizada. El portal puede listar reuniones por la matrícula activa de un hijo,
pero su aceptación externa continúa bloqueada por autenticación de apoderados.
Estado: en pruebas.
