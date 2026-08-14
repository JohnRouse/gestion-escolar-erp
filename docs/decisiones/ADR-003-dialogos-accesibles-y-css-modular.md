# ADR-003: diálogos accesibles y CSS modular

## Estado

Aceptado.

Aceptado el 14 de agosto de 2026 después de comprobar que la decisión ya se
encuentra aplicada en la arquitectura vigente de diálogos.

## Contexto

El frontend contiene múltiples implementaciones independientes de modales y diálogos.

Algunas incluyen semántica parcial, bloqueo de scroll o Escape, mientras otras no poseen estas capacidades.

La mayoría de los archivos CSS participan en una cadena de carga amplia, lo que incrementa el acoplamiento mediante cascada, orden y especificidad.

## Problema

Mantener cada modal de forma independiente produce:

- Comportamientos de foco diferentes.
- Accesibilidad incompleta.
- Cierres inconsistentes.
- Estilos duplicados.
- Capas arbitrarias.
- Animaciones diferentes.
- Mayor riesgo responsive.
- Mayor costo de mantenimiento.

Cargar estilos específicos de módulos de manera global produce:

- Posibles colisiones.
- Dependencia del orden.
- Sobrescrituras.
- Dificultad para retirar estilos antiguos.
- Dificultad para determinar la fuente de un patrón.

## Decisión propuesta

Crear una primitiva compartida para diálogos accesibles.

La primitiva concentrará:

- Semántica.
- Foco.
- Escape.
- Retorno del foco.
- Scroll.
- Overlay.
- Capas.
- Animación.
- Reducción de movimiento.
- Layout responsive.

Los componentes funcionales compondrán esta primitiva.

Mantener globalmente solo:

- Tokens.
- Reset.
- Layout.
- Accesibilidad.
- Animaciones compartidas.
- Patrones transversales.

Los estilos específicos de módulos deberán aproximarse progresivamente a sus consumidores.

## Compatibilidad

Las interfaces públicas de los modales existentes deben mantenerse durante la migración.

No se modificará comportamiento de negocio en la primera fase.

## Consecuencias positivas

- Accesibilidad uniforme.
- Menos duplicación.
- Validación centralizada.
- Menor riesgo responsive.
- Animaciones coherentes.
- Mantenimiento más simple.
- Correcciones globales reutilizables.

## Consecuencias negativas

- Migración gradual.
- Riesgo de regresión visual.
- Necesidad de pruebas de teclado.
- Convivencia temporal entre patrones antiguos y nuevos.
- Revisión cuidadosa de estilos heredados.

## Alternativas descartadas

### Corregir cada modal individualmente

Descartada porque reproduce lógica y aumenta divergencias futuras.

### Incorporar inmediatamente una biblioteca completa

Descartada porque el proyecto ya posee componentes, Tailwind y CSS.

Una biblioteca nueva requeriría otro ADR y análisis de bundle, mantenimiento y compatibilidad.

### Reorganizar todos los CSS en una sola operación

Descartada por riesgo elevado de regresiones y dependencia del orden actual.

## Plan

1. Crear el diálogo base.
2. Migrar ConfirmDialog.
3. Migrar CenteredFormModal.
4. Migrar ReportarPagoModal.
5. Migrar los demás diálogos.
6. Separar CSS global y modular por fases.
7. Cambiar el ADR a aceptado después de validar la primera implementación.

## Reversión

Mantener commits pequeños y conservar temporalmente las implementaciones anteriores hasta validar cada migración.

## Evidencia de adopción

La decisión dejó de ser únicamente una propuesta.

Actualmente:

- `AccessibleDialog.tsx` actúa como primitiva transversal.
- `ConfirmDialog.tsx` compone la primitiva.
- `CenteredFormModal.tsx` compone la primitiva.
- `CommunityDetailModal.tsx` compone la primitiva.
- `CommunityEditModal.tsx` reutiliza `CenteredFormModal`.
- La migración del resto de diálogos continúa de manera gradual.

La aceptación del ADR no significa que todos los modales hayan sido migrados.

`ReportarPagoModal.tsx` permanece como uno de los principales consumidores
pendientes de unificación.

La parte de CSS modular incluida en esta decisión continúa siendo una
migración progresiva y no debe interpretarse como finalizada.
