/*
  Warnings:

  - Added the required column `updated_at` to the `ComentarioBimestral` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ComentarioBimestral` DROP FOREIGN KEY `ComentarioBimestral_id_docente_fkey`;

-- AlterTable
ALTER TABLE `ComentarioBimestral` ADD COLUMN `id_usuario_registro` INTEGER NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `id_docente` INTEGER NULL;

-- CreateTable
CREATE TABLE `CriterioTutoria` (
    `id_criterio` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NULL,
    `id_colegio` INTEGER NULL,
    `tipo` VARCHAR(40) NOT NULL,
    `descripcion` VARCHAR(250) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 1,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CriterioTutoria_id_tenant_idx`(`id_tenant`),
    INDEX `CriterioTutoria_id_colegio_idx`(`id_colegio`),
    INDEX `CriterioTutoria_tipo_idx`(`tipo`),
    INDEX `CriterioTutoria_activo_idx`(`activo`),
    PRIMARY KEY (`id_criterio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalificacionTutoria` (
    `id_calificacion_tutoria` INTEGER NOT NULL AUTO_INCREMENT,
    `id_matricula` INTEGER NOT NULL,
    `id_bimestre` INTEGER NOT NULL,
    `id_criterio` INTEGER NOT NULL,
    `valor` VARCHAR(5) NULL,
    `observacion` VARCHAR(500) NULL,
    `id_usuario_registro` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CalificacionTutoria_id_matricula_idx`(`id_matricula`),
    INDEX `CalificacionTutoria_id_bimestre_idx`(`id_bimestre`),
    INDEX `CalificacionTutoria_id_criterio_idx`(`id_criterio`),
    INDEX `CalificacionTutoria_id_usuario_registro_idx`(`id_usuario_registro`),
    UNIQUE INDEX `CalificacionTutoria_id_matricula_id_bimestre_id_criterio_key`(`id_matricula`, `id_bimestre`, `id_criterio`),
    PRIMARY KEY (`id_calificacion_tutoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ComentarioBimestral_id_usuario_registro_idx` ON `ComentarioBimestral`(`id_usuario_registro`);

-- AddForeignKey
ALTER TABLE `ComentarioBimestral` ADD CONSTRAINT `ComentarioBimestral_id_docente_fkey` FOREIGN KEY (`id_docente`) REFERENCES `Docente`(`id_persona`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComentarioBimestral` ADD CONSTRAINT `ComentarioBimestral_id_usuario_registro_fkey` FOREIGN KEY (`id_usuario_registro`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CriterioTutoria` ADD CONSTRAINT `CriterioTutoria_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CriterioTutoria` ADD CONSTRAINT `CriterioTutoria_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalificacionTutoria` ADD CONSTRAINT `CalificacionTutoria_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalificacionTutoria` ADD CONSTRAINT `CalificacionTutoria_id_bimestre_fkey` FOREIGN KEY (`id_bimestre`) REFERENCES `Bimestre`(`id_bimestre`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalificacionTutoria` ADD CONSTRAINT `CalificacionTutoria_id_criterio_fkey` FOREIGN KEY (`id_criterio`) REFERENCES `CriterioTutoria`(`id_criterio`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalificacionTutoria` ADD CONSTRAINT `CalificacionTutoria_id_usuario_registro_fkey` FOREIGN KEY (`id_usuario_registro`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
