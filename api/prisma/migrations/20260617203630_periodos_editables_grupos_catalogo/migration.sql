-- AlterTable
ALTER TABLE `Bimestre` ADD COLUMN `nombre` VARCHAR(80) NULL;

-- AlterTable
ALTER TABLE `EvaluacionDetalle` ADD COLUMN `grupo_evaluacion` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `PlantillaEvaluacionDetalle` ADD COLUMN `grupo_evaluacion` VARCHAR(50) NOT NULL DEFAULT 'Trabajo en clase';

-- AlterTable
ALTER TABLE `Unidad` ADD COLUMN `nombre` VARCHAR(80) NULL;

-- CreateTable
CREATE TABLE `ColegioGrado` (
    `id_colegio` INTEGER NOT NULL,
    `id_grado` INTEGER NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activo',

    INDEX `ColegioGrado_id_grado_idx`(`id_grado`),
    PRIMARY KEY (`id_colegio`, `id_grado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ColegioGrado` ADD CONSTRAINT `ColegioGrado_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ColegioGrado` ADD CONSTRAINT `ColegioGrado_id_grado_fkey` FOREIGN KEY (`id_grado`) REFERENCES `Grado`(`id_grado`) ON DELETE CASCADE ON UPDATE CASCADE;
