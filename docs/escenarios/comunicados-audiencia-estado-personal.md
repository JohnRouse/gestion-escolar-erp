# Comunicados: audiencia y estado personal del apoderado

## Estado

En pruebas; código, schema y migración anual aditiva preparados, sin aplicar la
nueva migración. Pruebas dirigidas y builds aprobados. Aceptación humana en
navegador pendiente después de la revisión y aplicación manual.

## Situación inicial y actores

Un tenant contiene varios colegios. Admin, Director o Secretaria posee una
membresía activa de gestión en uno de ellos. Dos Apoderados están vinculados a
estudiantes de secciones distintas y uno de ellos tiene dos cuentas Usuario
sobre la misma Persona canónica.

## Flujo

1. El gestor elige colegio y año en selectores visibles, además del contenido y
   una audiencia válida derivada de la estructura activa de ese año.
2. El backend revalida tenant, colegio, año permitido y cada ID, crea el
   comunicado con `Circular.id_anio` y su audiencia; todo el colegio usa una
   fila NULL/NULL.
3. Se consultan matrículas del mismo año en estado `Activo`, `Matriculado` o
   `Pre-matriculado`, se excluyen `Inactivo` y `Reserva`, y se deduplica por
   Usuario al notificar.
4. Cada Apoderado obtiene su lista volviendo a derivar hijos, matrículas y
   audiencia; una URL o notificación no concede acceso.
5. Abrir detalle hace upsert de `CircularEstadoApoderado` por
   `(id_circular,id_apoderado)` y registra el Usuario actor.
6. Si se requiere, `Confirmar recepción` registra confirmación personal y
   asegura la lectura. Repetir cualquiera de las acciones no cambia la primera
   marca ni crea otra fila.

## Validaciones y resultados

- Colegio, nivel o sección ajenos: rechazo sin persistencia.
- Año de otro colegio o en estado Cerrado/Archivado/Finalizado: rechazo.
- La misma sección o nivel en otro año no concede acceso ni notificación.
- Todo el colegio se limita al año de `Circular`; puede publicarse sin
  `SeccionAnio` si el año está permitido.
- Cambiar año limpia destinos y recarga únicamente su `SeccionAnio` activa.
- Profesor o JWT de portal en controller interno: rechazo por guard/rol.
- JWT interno en controller del portal: rechazo por estrategia de canal.
- Comunicado ajeno, ID manipulado o legacy ambiguo: no encontrado/lista normal.
- Dos Apoderados: filas de estado independientes.
- Dos cuentas de un mismo Apoderado: estado compartido y Usuario ejecutor
  auditado.
- Sin fila personal: no leído/no confirmado, aunque las columnas legacy de
  `CircularDestinatario` indiquen otra cosa.
- Sin requisito de autorización: la confirmación responde error funcional.
- Los comunicados legacy con `id_anio = NULL` conservan tratamiento restrictivo
  y no se atribuyen a un año sin evidencia.

## Trazabilidad y reversión

Lectura y confirmación conservan fecha y Usuario y solo se permiten después de
revalidar también el año. La migración de estado ya aplicada no forma parte de
una reversión de código. La migración anual todavía no aplicada puede retirarse
junto con el patch antes de su ejecución; después requerirá un plan explícito
sin borrar estados personales ni reinterpretar históricos.
