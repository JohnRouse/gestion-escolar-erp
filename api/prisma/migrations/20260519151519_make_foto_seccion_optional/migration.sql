-- DropForeignKey
ALTER TABLE `Foto` DROP FOREIGN KEY `Foto_id_seccion_fkey`;

-- DropIndex
DROP INDEX `Foto_id_seccion_fkey` ON `Foto`;

-- AlterTable
ALTER TABLE `Foto` MODIFY `id_seccion` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Foto` ADD CONSTRAINT `Foto_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE SET NULL ON UPDATE CASCADE;
