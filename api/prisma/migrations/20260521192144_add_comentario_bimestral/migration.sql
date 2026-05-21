-- CreateTable
CREATE TABLE `ComentarioBimestral` (
    `id_comentario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_matricula` INTEGER NOT NULL,
    `id_bimestre` INTEGER NOT NULL,
    `id_docente` INTEGER NOT NULL,
    `comentario` TEXT NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ComentarioBimestral_id_matricula_id_bimestre_key`(`id_matricula`, `id_bimestre`),
    PRIMARY KEY (`id_comentario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ComentarioBimestral` ADD CONSTRAINT `ComentarioBimestral_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComentarioBimestral` ADD CONSTRAINT `ComentarioBimestral_id_bimestre_fkey` FOREIGN KEY (`id_bimestre`) REFERENCES `Bimestre`(`id_bimestre`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComentarioBimestral` ADD CONSTRAINT `ComentarioBimestral_id_docente_fkey` FOREIGN KEY (`id_docente`) REFERENCES `Docente`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;
