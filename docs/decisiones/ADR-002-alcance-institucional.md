# ADR-002: Alcance institucional activo

## Estado

Aceptado.

## Contexto

Un usuario puede trabajar con una institución específica o consultar varias instituciones del mismo tenant.

## Decisión

El encabezado mantiene el alcance institucional activo.

Los valores permitidos son:

- Todos los colegios.
- Colegio específico.

Toda consulta y operación debe respetar este alcance.

Cuando el alcance sea `Todos los colegios`, los datos ambiguos deben incluir la institución.

Ejemplo:

`Año Escolar 2027 · I.E.P. Santa María Victoria`

Cuando se seleccione un colegio específico:

`Año Escolar 2027`

## Seguridad

El alcance visual no reemplaza la autorización.

El backend debe validar que el usuario tenga acceso a las instituciones involucradas.

## Consecuencias

- Los selectores deben utilizar funciones compartidas.
- No deben codificarse nombres de instituciones.
- Los flujos entre instituciones requieren validación específica.
