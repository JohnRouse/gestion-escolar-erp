-- CreateTable
CREATE TABLE `Staff` (
    `id_staff` INTEGER NOT NULL AUTO_INCREMENT,
    `id_persona` INTEGER NOT NULL,
    `cargo` VARCHAR(100) NOT NULL,
    `area` VARCHAR(50) NOT NULL,
    `id_seccion` INTEGER NULL,
    `es_tutor` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Staff_id_persona_key`(`id_persona`),
    PRIMARY KEY (`id_staff`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_id_persona_fkey` FOREIGN KEY (`id_persona`) REFERENCES `Persona`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE SET NULL ON UPDATE CASCADE;
