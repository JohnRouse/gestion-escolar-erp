-- AlterTable
ALTER TABLE `Matricula` ADD COLUMN `id_usuario_registro` INTEGER NULL,
    MODIFY `estado_matricula` VARCHAR(20) NOT NULL DEFAULT 'Pre-matriculado';

-- CreateIndex
CREATE INDEX `Matricula_id_usuario_registro_idx` ON `Matricula`(`id_usuario_registro`);

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_id_usuario_registro_fkey` FOREIGN KEY (`id_usuario_registro`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
