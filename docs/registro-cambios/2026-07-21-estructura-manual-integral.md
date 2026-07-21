# Cambio: estructura inicial del manual integral

## Fecha

2026-07-21

## Estado

Implementado.

## Módulo

Documentación general del proyecto.

## Motivo

Evitar que las reglas, decisiones, flujos y avances de Gestión Escolar ERP dependan únicamente de conversaciones o de la memoria de una persona.

## Problema anterior

La documentación existente establecía reglas generales, pero todavía no contaba con una estructura completa para documentar todos los módulos, escenarios, procesos operativos y cambios futuros.

## Comportamiento nuevo

El repositorio dispone de una estructura oficial para:

- Manual general imprimible.
- Documentación individual por módulo.
- Casos y escenarios transversales.
- Procedimientos operativos.
- Registro funcional de cambios.
- Plantillas obligatorias.
- Documentación simultánea con cada implementación.

## Reglas afectadas

- La documentación forma parte de la definición de terminado.
- Todo cambio funcional o técnico debe documentarse en el mismo avance.
- No debe conservarse información esencial únicamente en conversaciones.
- Debe diferenciarse entre implementación real, implementación parcial y visión futura.

## Roles afectados

Todos los participantes del proyecto:

- Propietario del producto.
- Desarrolladores.
- Soporte.
- Administradores técnicos.
- Asistentes de desarrollo.
- Futuros colaboradores.

## Alcance institucional

Aplica a todo el SaaS y a todos los tenants e instituciones.

## Archivos modificados

- AGENTS.md
- docs/00-indice.md
- docs/07-protocolo-documentacion-continua.md
- docs/manual/00-portada-e-indice.md
- docs/modulos/README.md
- docs/operacion/README.md
- docs/escenarios/README.md
- docs/registro-cambios/README.md
- docs/plantillas/plantilla-modulo.md
- docs/plantillas/plantilla-cambio.md
- Este registro funcional.

## Base de datos

Sin cambios.

## Casos contemplados

- Inicio de una nueva conversación.
- Incorporación de un nuevo desarrollador.
- Implementación mediante bloques de terminal.
- Corrección de una función existente.
- Adición de un nuevo módulo.
- Cambio visual transversal.
- Migración de base de datos.
- Reversión de una funcionalidad.
- Preparación del manual para impresión.

## Validaciones

- Los nuevos documentos están enlazados desde el índice oficial.
- AGENTS.md obliga a leer el protocolo documental.
- La definición de terminado exige documentación del módulo y registro funcional del cambio.
- La estructura separa módulos, escenarios, operación y cambios.

## Pruebas realizadas

- Validación de formato mediante `git diff --check`.
- Verificación de existencia y tamaño de archivos.
- Revisión de la rama activa.
- Revisión de archivos modificados.

## Resultado

La estructura documental quedó preparada para iniciar el inventario completo del proyecto.

## Riesgos

La existencia de la estructura no garantiza por sí sola que todos los módulos estén documentados. Se requiere revisar cada módulo contra el código real.

## Compatibilidad

No modifica código, base de datos ni comportamiento funcional.

## Reversión

Los archivos pueden retirarse mediante la reversión del commit documental correspondiente.

## Documentación actualizada

- Guía obligatoria del proyecto.
- Índice oficial.
- Protocolo de documentación continua.
- Manual integral.
- Inventario de módulos.
- Escenarios.
- Plantillas.
- Registro de cambios.

## Referencia

- Issue de seguimiento: #2.
- Rama: docs/manual-integral-proyecto.
