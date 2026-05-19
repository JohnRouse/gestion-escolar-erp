-- CreateTable
CREATE TABLE `Cita` (
    `id_cita` INTEGER NOT NULL AUTO_INCREMENT,
    `id_staff` INTEGER NOT NULL,
    `id_apoderado` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `hora_inicio` VARCHAR(5) NOT NULL,
    `hora_fin` VARCHAR(5) NOT NULL,
    `motivo` TEXT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'pendiente',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_cita`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cita` ADD CONSTRAINT `Cita_id_staff_fkey` FOREIGN KEY (`id_staff`) REFERENCES `Staff`(`id_staff`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cita` ADD CONSTRAINT `Cita_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;
