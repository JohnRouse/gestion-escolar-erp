-- AlterTable
ALTER TABLE `AreaCurricular` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `Curso` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `EscalaCalificacion` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `TipoEvaluacion` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- CreateIndex
CREATE INDEX `AreaCurricular_id_tenant_idx` ON `AreaCurricular`(`id_tenant`);

-- CreateIndex
CREATE INDEX `AreaCurricular_id_colegio_idx` ON `AreaCurricular`(`id_colegio`);

-- CreateIndex
CREATE INDEX `Curso_id_tenant_idx` ON `Curso`(`id_tenant`);

-- CreateIndex
CREATE INDEX `Curso_id_colegio_idx` ON `Curso`(`id_colegio`);

-- CreateIndex
CREATE INDEX `EscalaCalificacion_id_tenant_idx` ON `EscalaCalificacion`(`id_tenant`);

-- CreateIndex
CREATE INDEX `EscalaCalificacion_id_colegio_idx` ON `EscalaCalificacion`(`id_colegio`);

-- CreateIndex
CREATE INDEX `TipoEvaluacion_id_tenant_idx` ON `TipoEvaluacion`(`id_tenant`);

-- CreateIndex
CREATE INDEX `TipoEvaluacion_id_colegio_idx` ON `TipoEvaluacion`(`id_colegio`);

-- AddForeignKey
ALTER TABLE `AreaCurricular` ADD CONSTRAINT `AreaCurricular_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AreaCurricular` ADD CONSTRAINT `AreaCurricular_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TipoEvaluacion` ADD CONSTRAINT `TipoEvaluacion_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TipoEvaluacion` ADD CONSTRAINT `TipoEvaluacion_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscalaCalificacion` ADD CONSTRAINT `EscalaCalificacion_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscalaCalificacion` ADD CONSTRAINT `EscalaCalificacion_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;
