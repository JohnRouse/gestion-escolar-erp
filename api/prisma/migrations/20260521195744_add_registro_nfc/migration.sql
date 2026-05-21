-- CreateTable
CREATE TABLE `RegistroNFC` (
    `id_registro` INTEGER NOT NULL AUTO_INCREMENT,
    `id_estudiante` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'entrada',

    PRIMARY KEY (`id_registro`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RegistroNFC` ADD CONSTRAINT `RegistroNFC_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;
