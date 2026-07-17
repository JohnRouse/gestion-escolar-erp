-- CreateTable
CREATE TABLE `LotePromocionEjecucion` (
    `id_ejecucion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lote` INTEGER NOT NULL,
    `numero_ejecucion` INTEGER NOT NULL,
    `etapa` VARCHAR(30) NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Ejecutada',
    `fecha_ejecucion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_usuario_ejecucion` INTEGER NULL,
    `total_evaluados` INTEGER NOT NULL DEFAULT 0,
    `total_procesados` INTEGER NOT NULL DEFAULT 0,
    `total_pendientes` INTEGER NOT NULL DEFAULT 0,
    `total_omitidos` INTEGER NOT NULL DEFAULT 0,
    `total_bloqueados` INTEGER NOT NULL DEFAULT 0,
    `observacion` VARCHAR(500) NULL,
    `snapshot_json` JSON NULL,
    `fecha_reversion` DATETIME(3) NULL,
    `id_usuario_reversion` INTEGER NULL,
    `motivo_reversion` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LotePromocionEjecucion_id_lote_fecha_ejecucion_idx`(`id_lote`, `fecha_ejecucion`),
    INDEX `LotePromocionEjecucion_etapa_idx`(`etapa`),
    INDEX `LotePromocionEjecucion_estado_idx`(`estado`),
    INDEX `LotePromocionEjecucion_id_usuario_ejecucion_idx`(`id_usuario_ejecucion`),
    INDEX `LotePromocionEjecucion_id_usuario_reversion_idx`(`id_usuario_reversion`),
    UNIQUE INDEX `LotePromocionEjecucion_id_lote_numero_ejecucion_key`(`id_lote`, `numero_ejecucion`),
    PRIMARY KEY (`id_ejecucion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LotePromocionEjecucionDetalle` (
    `id_ejecucion_detalle` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ejecucion` INTEGER NOT NULL,
    `id_detalle` INTEGER NOT NULL,
    `id_matricula_generada` INTEGER NULL,
    `accion` VARCHAR(30) NOT NULL,
    `estado_resultado` VARCHAR(30) NOT NULL,
    `snapshot_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LotePromocionEjecucionDetalle_id_detalle_idx`(`id_detalle`),
    INDEX `LotePromocionEjecucionDetalle_id_matricula_generada_idx`(`id_matricula_generada`),
    INDEX `LotePromocionEjecucionDetalle_estado_resultado_idx`(`estado_resultado`),
    UNIQUE INDEX `LotePromocionEjecucionDetalle_id_ejecucion_id_detalle_key`(`id_ejecucion`, `id_detalle`),
    PRIMARY KEY (`id_ejecucion_detalle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LotePromocionEjecucion` ADD CONSTRAINT `LotePromocionEjecucion_id_lote_fkey` FOREIGN KEY (`id_lote`) REFERENCES `LotePromocion`(`id_lote`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LotePromocionEjecucion` ADD CONSTRAINT `LotePromocionEjecucion_id_usuario_ejecucion_fkey` FOREIGN KEY (`id_usuario_ejecucion`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LotePromocionEjecucion` ADD CONSTRAINT `LotePromocionEjecucion_id_usuario_reversion_fkey` FOREIGN KEY (`id_usuario_reversion`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LotePromocionEjecucionDetalle` ADD CONSTRAINT `LotePromocionEjecucionDetalle_id_ejecucion_fkey` FOREIGN KEY (`id_ejecucion`) REFERENCES `LotePromocionEjecucion`(`id_ejecucion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LotePromocionEjecucionDetalle` ADD CONSTRAINT `LotePromocionEjecucionDetalle_id_detalle_fkey` FOREIGN KEY (`id_detalle`) REFERENCES `LotePromocionDetalle`(`id_detalle`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LotePromocionEjecucionDetalle` ADD CONSTRAINT `LotePromocionEjecucionDetalle_id_matricula_generada_fkey` FOREIGN KEY (`id_matricula_generada`) REFERENCES `Matricula`(`id_matricula`) ON DELETE SET NULL ON UPDATE CASCADE;

