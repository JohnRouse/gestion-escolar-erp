# Enfermería: privacidad, autorización y alcance

## Estado

En pruebas. Requiere migración local aplicada y aceptación humana antes de
considerarse aceptado.

## Situación y actores

Un Admin o Director atiende a un alumno matriculado en uno de sus colegios. El
tenant también contiene otro colegio y existe otro tenant. Hay apoderados
vinculados y personas ajenas, y autorizaciones activas, vencidas y revocadas.

Secretaria, Profesor, Apoderado y Alumno no pueden abrir la intranet de
Enfermería. `cargo` o `area` de Staff no cambian esa decisión.

## Flujo esperado

1. El actor selecciona colegio o consolidado autorizado y busca al alumno.
2. Solo aparecen matrículas `Activo`, `Matriculado` o `Pre-matriculado`, una vez
   por matrícula, con institución, sección y `atencion_abierta_id` cuando
   corresponde.
3. Si la matrícula ya tiene una atención abierta, la interfaz muestra el aviso
   orientativo, impide una segunda apertura y `Ver atención abierta` lleva al
   detalle real para continuar el registro.
4. Al seleccionar se muestran solo alertas declaradas del alumno/colegio. Una
   ficha vacía no bloquea la apertura.
5. La atención guarda matrícula, tenant/colegio derivados y usuario responsable.
   `Motivo de atención` describe el motivo o síntomas observados y no equivale a
   un diagnóstico.
6. Un contacto acepta únicamente un apoderado vinculado.
7. La medicación solo acepta una autorización activa y vigente de esa ficha. El
   texto libre de acciones y cuidados no se analiza ni permite inferir que hubo
   medicación.
8. Sin autorización vigente, el detalle indica que no se administró medicación,
   explica la condición familiar y mantiene deshabilitada la acción. Con una
   autorización activa cuya vigencia incluye la fecha actual, mantiene el mismo
   estado de no administración, informa la disponibilidad y habilita la acción.
9. Si desde el detalle se abre la ficha y se crea o revoca una autorización, el
   detalle vuelve a consultar la ficha y actualiza bloque, opciones y botón sin
   una recarga manual de toda la página.
10. Tras administrar, el detalle muestra medicamento/autorización, dosis o
    instrucción declarada, fecha/hora y actor desde el registro estructurado, y
    conserva el movimiento de historial.
11. El operador decide si envía aviso. La notificación deduplica `id_usuario`,
   usa origen `enfermeria`, canal `portal`, referencia estructurada, no inventa
   ruta y no expone detalle sensible.
12. El cierre guarda destino, fecha y movimiento. Una corrección posterior exige
   motivo y deja historial.
13. El resumen presenta `Atenciones abiertas`, calculada directamente con
    `estado = 'abierta'`.

## Denegaciones

- Rol global o institucional distinto de Admin/Director: 403.
- Tenant sin membresía activa: 403.
- Colegio, estudiante, matrícula, ficha, autorización o atención ajena por ID:
  404 seguro.
- Apoderado no vinculado: 400 sin persistir contacto/autorización.
- Autorización revocada, vencida, futura o de otro alumno/colegio: 400.
- Una autorización revocada, vencida o futura tampoco habilita la acción de
  administración en intranet.
- Medicación o cierre repetidos: 409.
- Apertura repetida o concurrente: 409
  `ENFERMERIA_ATENCION_ABIERTA`, con `atencion_abierta_id`; no crea una segunda
  atención ni movimiento.
- Atención cerrada editada sin motivo: 409.

## Privacidad y trazabilidad

No se escribe información médica en logs ni bandejas generales. La ficha y el
detalle solo se cargan tras autorización contextual. No hay hard delete. Cada
creación, cambio sensible, autorización/revocación, atención, contacto, aviso,
medicación y cierre registra actor, fecha y contexto; la ficha conserva el
antes/después en el almacén sensible.

## Reversión

El código se revierte con patch inverso. Una base con la migración aplicada debe
exportar y conservar el historial antes de cualquier reversión de esquema; este
incremento no autoriza eliminar datos de Enfermería.
