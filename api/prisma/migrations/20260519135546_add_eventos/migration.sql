-- CreateTable
CREATE TABLE `Evento` (
    `id_evento` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(200) NOT NULL,
    `fecha` DATE NOT NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `descripcion` TEXT NULL,
    `id_anio` INTEGER NOT NULL,

    PRIMARY KEY (`id_evento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Evento` ADD CONSTRAINT `Evento_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE RESTRICT ON UPDATE CASCADE;
