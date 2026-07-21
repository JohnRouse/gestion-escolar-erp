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
