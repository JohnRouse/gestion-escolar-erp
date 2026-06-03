-- AlterTable
ALTER TABLE `Matricula` ADD COLUMN `codigo_modular_procedencia` VARCHAR(30) NULL,
    ADD COLUMN `colegio_procedencia` VARCHAR(150) NULL,
    ADD COLUMN `estado_revision` VARCHAR(30) NOT NULL DEFAULT 'Por revisar',
    ADD COLUMN `fecha_revision` DATETIME(3) NULL,
    ADD COLUMN `grado_procedencia` VARCHAR(80) NULL,
    ADD COLUMN `id_usuario_revision` INTEGER NULL,
    ADD COLUMN `observacion_procedencia` VARCHAR(500) NULL,
    ADD COLUMN `observacion_revision` VARCHAR(500) NULL,
    ADD COLUMN `tipo_ingreso` VARCHAR(30) NOT NULL DEFAULT 'Nuevo';

-- CreateIndex
CREATE INDEX `Matricula_estado_revision_idx` ON `Matricula`(`estado_revision`);

-- CreateIndex
CREATE INDEX `Matricula_tipo_ingreso_idx` ON `Matricula`(`tipo_ingreso`);

-- CreateIndex
CREATE INDEX `Matricula_id_usuario_revision_idx` ON `Matricula`(`id_usuario_revision`);

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_id_usuario_revision_fkey` FOREIGN KEY (`id_usuario_revision`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
