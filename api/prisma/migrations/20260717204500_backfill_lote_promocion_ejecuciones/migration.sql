-- Backfill idempotente del historial de promociones
-- ejecutadas antes de crear LotePromocionEjecucion.

INSERT INTO `LotePromocionEjecucion` (
  `id_lote`,
  `numero_ejecucion`,
  `etapa`,
  `estado`,
  `fecha_ejecucion`,
  `id_usuario_ejecucion`,
  `total_evaluados`,
  `total_procesados`,
  `total_pendientes`,
  `total_omitidos`,
  `total_bloqueados`,
  `observacion`,
  `fecha_reversion`,
  `id_usuario_reversion`,
  `motivo_reversion`,
  `created_at`,
  `updated_at`
)
SELECT
  l.`id_lote`,
  1,
  'Ordinaria',
  CASE
    WHEN l.`estado` = 'Revertido'
      THEN 'Revertida'
    ELSE 'Ejecutada'
  END,
  COALESCE(
    l.`fecha_ejecucion`,
    l.`updated_at`,
    l.`created_at`
  ),
  l.`id_usuario_ejecucion`,
  (
    SELECT COUNT(*)
    FROM `LotePromocionDetalle` d
    WHERE d.`id_lote` = l.`id_lote`
  ),
  (
    SELECT COUNT(*)
    FROM `LotePromocionDetalle` d
    WHERE d.`id_lote` = l.`id_lote`
      AND (
        d.`estado_resultado` IN (
          'PROCESADO',
          'REVERTIDO'
        )
        OR d.`id_matricula_generada`
          IS NOT NULL
      )
  ),
  (
    SELECT COUNT(*)
    FROM `LotePromocionDetalle` d
    WHERE d.`id_lote` = l.`id_lote`
      AND d.`estado_resultado` IN (
        'PENDIENTE',
        'PENDIENTE_RECUPERACION'
      )
  ),
  (
    SELECT COUNT(*)
    FROM `LotePromocionDetalle` d
    WHERE d.`id_lote` = l.`id_lote`
      AND d.`estado_resultado` = 'OMITIDO'
  ),
  (
    SELECT COUNT(*)
    FROM `LotePromocionDetalle` d
    WHERE d.`id_lote` = l.`id_lote`
      AND d.`estado_resultado` = 'BLOQUEADO'
  ),
  'Backfill de ejecución histórica.',
  CASE
    WHEN l.`estado` = 'Revertido'
      THEN l.`fecha_reversion`
    ELSE NULL
  END,
  CASE
    WHEN l.`estado` = 'Revertido'
      THEN l.`id_usuario_reversion`
    ELSE NULL
  END,
  CASE
    WHEN l.`estado` = 'Revertido'
      THEN l.`motivo_reversion`
    ELSE NULL
  END,
  COALESCE(
    l.`fecha_ejecucion`,
    l.`updated_at`,
    l.`created_at`
  ),
  COALESCE(
    l.`fecha_reversion`,
    l.`updated_at`,
    l.`fecha_ejecucion`,
    l.`created_at`
  )
FROM `LotePromocion` l
WHERE l.`estado` IN (
  'Ejecutado',
  'Revertido',
  'En proceso'
)
  AND l.`fecha_ejecucion` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `LotePromocionEjecucion` e
    WHERE e.`id_lote` = l.`id_lote`
      AND e.`numero_ejecucion` = 1
  );

INSERT INTO `LotePromocionEjecucionDetalle` (
  `id_ejecucion`,
  `id_detalle`,
  `id_matricula_generada`,
  `accion`,
  `estado_resultado`,
  `snapshot_json`,
  `created_at`
)
SELECT
  e.`id_ejecucion`,
  d.`id_detalle`,
  d.`id_matricula_generada`,
  d.`accion`,
  CASE
    WHEN e.`estado` = 'Revertida'
      THEN 'REVERTIDO'
    ELSE 'PROCESADO'
  END,
  d.`snapshot_json`,
  COALESCE(
    d.`fecha_procesado`,
    e.`fecha_ejecucion`
  )
FROM `LotePromocionEjecucion` e
INNER JOIN `LotePromocionDetalle` d
  ON d.`id_lote` = e.`id_lote`
WHERE e.`numero_ejecucion` = 1
  AND (
    d.`estado_resultado` IN (
      'PROCESADO',
      'REVERTIDO'
    )
    OR d.`id_matricula_generada`
      IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `LotePromocionEjecucionDetalle` ed
    WHERE ed.`id_ejecucion`
      = e.`id_ejecucion`
      AND ed.`id_detalle`
        = d.`id_detalle`
  );
