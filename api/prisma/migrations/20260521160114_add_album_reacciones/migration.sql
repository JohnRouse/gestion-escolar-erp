/*
  Warnings:

  - You are about to drop the column `id_docente` on the `Foto` table. All the data in the column will be lost.
  - You are about to drop the column `id_seccion` on the `Foto` table. All the data in the column will be lost.
  - Added the required column `id_album` to the `Foto` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Foto` DROP FOREIGN KEY `Foto_id_docente_fkey`;

-- DropForeignKey
ALTER TABLE `Foto` DROP FOREIGN KEY `Foto_id_seccion_fkey`;

-- DropIndex
DROP INDEX `Foto_id_docente_fkey` ON `Foto`;

-- DropIndex
DROP INDEX `Foto_id_seccion_fkey` ON `Foto`;

-- AlterTable
ALTER TABLE `Foto` DROP COLUMN `id_docente`,
    DROP COLUMN `id_seccion`,
    ADD COLUMN `id_album` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Album` (
    `id_album` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(200) NOT NULL,
    `descripcion` TEXT NULL,
    `fecha` DATE NOT NULL,
    `id_seccion` INTEGER NOT NULL,
    `id_docente` INTEGER NOT NULL,
    `portada_url` VARCHAR(500) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_album`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComentarioFoto` (
    `id_comentario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_foto` INTEGER NOT NULL,
    `id_apoderado` INTEGER NOT NULL,
    `texto` TEXT NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_comentario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReaccionFoto` (
    `id_reaccion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_foto` INTEGER NOT NULL,
    `id_apoderado` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ReaccionFoto_id_foto_id_apoderado_key`(`id_foto`, `id_apoderado`),
    PRIMARY KEY (`id_reaccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Album` ADD CONSTRAINT `Album_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Album` ADD CONSTRAINT `Album_id_docente_fkey` FOREIGN KEY (`id_docente`) REFERENCES `Docente`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Foto` ADD CONSTRAINT `Foto_id_album_fkey` FOREIGN KEY (`id_album`) REFERENCES `Album`(`id_album`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComentarioFoto` ADD CONSTRAINT `ComentarioFoto_id_foto_fkey` FOREIGN KEY (`id_foto`) REFERENCES `Foto`(`id_foto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComentarioFoto` ADD CONSTRAINT `ComentarioFoto_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReaccionFoto` ADD CONSTRAINT `ReaccionFoto_id_foto_fkey` FOREIGN KEY (`id_foto`) REFERENCES `Foto`(`id_foto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReaccionFoto` ADD CONSTRAINT `ReaccionFoto_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;
