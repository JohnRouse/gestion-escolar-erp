-- AlterTable
ALTER TABLE `EvaluacionDetalle` ADD COLUMN `orden` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `RegistroNotasUnidad` (
    `id_registro_notas` INTEGER NOT NULL AUTO_INCREMENT,
    `id_asignacion` INTEGER NOT NULL,
    `id_unidad` INTEGER NOT NULL,
    `cerrado` BOOLEAN NOT NULL DEFAULT false,
    `cerrado_por` INTEGER NULL,
    `fecha_cierre` DATETIME(3) NULL,
    `reabierto_por` INTEGER NULL,
    `fecha_reapertura` DATETIME(3) NULL,
    `motivo_reapertura` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RegistroNotasUnidad_id_asignacion_idx`(`id_asignacion`),
    INDEX `RegistroNotasUnidad_id_unidad_idx`(`id_unidad`),
    UNIQUE INDEX `RegistroNotasUnidad_id_asignacion_id_unidad_key`(`id_asignacion`, `id_unidad`),
    PRIMARY KEY (`id_registro_notas`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RegistroNotasUnidad` ADD CONSTRAINT `RegistroNotasUnidad_id_asignacion_fkey` FOREIGN KEY (`id_asignacion`) REFERENCES `AsignacionDocente`(`id_asignacion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistroNotasUnidad` ADD CONSTRAINT `RegistroNotasUnidad_id_unidad_fkey` FOREIGN KEY (`id_unidad`) REFERENCES `Unidad`(`id_unidad`) ON DELETE CASCADE ON UPDATE CASCADE;
