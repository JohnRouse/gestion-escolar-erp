-- AlterTable
ALTER TABLE `Usuario` ADD COLUMN `avatar_url` VARCHAR(255) NULL,
    ADD COLUMN `notificaciones_activas` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `tema` VARCHAR(10) NOT NULL DEFAULT 'claro';
