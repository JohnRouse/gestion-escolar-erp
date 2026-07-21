# ADR-001: Diseño inspirado en Carbon

## Estado

Aceptado.

## Contexto

El ERP necesita una interfaz uniforme, minimalista y comprensible para usuarios con distintos niveles de experiencia tecnológica.

El frontend actual utiliza React, TypeScript, Tailwind CSS y Lucide.

## Decisión

Se adoptan los principios de Carbon Design System como referencia de:

- Jerarquía.
- Espaciado.
- Claridad.
- Estados.
- Accesibilidad.
- Formularios.
- Tablas.
- Modales.

No se establece por ahora una dependencia obligatoria de los componentes oficiales de Carbon.

La interfaz continuará utilizando componentes compartidos propios.

## Consecuencias

- Debe existir una sola identidad visual.
- No se deben mezclar librerías visuales sin evaluación.
- Los patrones compartidos tienen prioridad.
- Una futura adopción directa de Carbon requerirá otro ADR.
