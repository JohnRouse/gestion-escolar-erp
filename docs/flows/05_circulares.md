# Flujo: publicación y consulta de Comunicados

El nombre visible actual es **Comunicados**. `Circular` y `/circulares` se
conservan únicamente como nombres internos compatibles. El contrato completo y
su estado están en [el documento del módulo](../modulos/comunicados.md).

## Publicación interna

1. Admin, Director o Secretaria abre `/comunicados`.
2. Selecciona institución, título, contenido, categoría, urgencia,
   confirmación, audiencia y adjuntos opcionales.
3. El backend revalida rol efectivo, tenant/colegio y estructura del año
   operativo.
4. Todo el colegio usa un destino NULL/NULL; niveles y secciones se guardan sin
   consultar catálogos globales.
5. Se publica y se avisa una vez por Usuario familiar derivado de matrículas
   operativas y vínculos persistidos.

No existe DELETE, edición, correo/SMS ni push certificado en esta V1.

## Consulta familiar

1. Apoderado abre `/dashboard/comunicados` con `jwt-portal`.
2. El backend deriva hijos y matrículas `Activo`, `Matriculado` o
   `Pre-matriculado`.
3. Solo devuelve comunicados cuya audiencia coincide de forma segura.
4. Abrir detalle registra lectura por Apoderado canónico.
5. Cuando aplica, `Confirmar recepción` registra el acuse personal. No es una
   firma digital.

Un `id_circular` en el query o una notificación no concede acceso. Las rutas
legacy redirigen a las rutas canónicas conservando query params.

## API vigente

| Método | Ruta | Finalidad |
|---|---|---|
| GET | `/api/circulares` | Listado interno autorizado |
| GET | `/api/circulares/opciones` | Catálogo anual de audiencia |
| GET | `/api/circulares/:id` | Detalle interno autorizado |
| POST | `/api/circulares` | Publicar |
| POST | `/api/circulares/:id/adjuntos` | Asociar adjuntos |
| GET | `/api/circulares/padres` | Listado familiar autorizado |
| PUT | `/api/circulares/:id/leida` | Lectura personal |
| POST | `/api/circulares/:id/confirmar` | Confirmación personal |
