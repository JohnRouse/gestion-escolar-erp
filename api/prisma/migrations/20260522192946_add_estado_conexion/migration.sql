-- AlterTable
ALTER TABLE `Usuario` ADD COLUMN `estado_conexion` VARCHAR(191) NOT NULL DEFAULT 'desconectado',
    ADD COLUMN `ultima_conexion` DATETIME(3) NULL;
