# Cambio: inicio de auditoría integral del repositorio

## Fecha

2026-07-21

## Estado

En desarrollo.

## Módulo

Documentación general.

## Motivo

Iniciar la revisión completa del proyecto antes de redactar el manual definitivo.

## Comportamiento anterior

Existía la estructura documental, pero no un inventario automático y verificable del código real.

## Comportamiento nuevo

Se dispone de inventarios iniciales de:

- Frontend.
- Rutas.
- Páginas.
- Componentes.
- Backend.
- Controladores.
- Operaciones HTTP.
- Modelos Prisma.
- Tecnologías.
- Cobertura documental.

## Base de datos

Sin modificaciones.

## Validaciones previstas

- Revisión de formato.
- Comparación contra el repositorio.
- Revisión manual de cada módulo.
- Clasificación del estado real.

## Riesgos

Los inventarios automáticos pueden no interpretar rutas o decoradores construidos dinámicamente. Por ello deben complementarse con revisión manual.

## Reversión

Revertir el futuro commit documental correspondiente.

## Referencia

- Issue #2.
- Rama `docs/auditoria-integral-proyecto`.
