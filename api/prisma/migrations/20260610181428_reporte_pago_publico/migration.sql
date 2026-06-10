-- DropForeignKey
ALTER TABLE `PagoRecibido` DROP FOREIGN KEY `PagoRecibido_id_usuario_registro_fkey`;

-- DropIndex
DROP INDEX `PagoRecibido_id_usuario_registro_fkey` ON `PagoRecibido`;

-- AlterTable
ALTER TABLE `PagoRecibido` ADD COLUMN `banco_destino` VARCHAR(80) NULL,
    ADD COLUMN `origen_reporte` VARCHAR(50) NULL DEFAULT 'Interno',
    MODIFY `id_usuario_registro` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_usuario_registro_fkey` FOREIGN KEY (`id_usuario_registro`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
