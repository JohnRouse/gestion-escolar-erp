-- CreateTable
CREATE TABLE `Horario` (
    `id_horario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_seccion` INTEGER NOT NULL,
    `id_curso` INTEGER NOT NULL,
    `id_docente` INTEGER NOT NULL,
    `dia_semana` INTEGER NOT NULL,
    `hora_inicio` VARCHAR(5) NOT NULL,
    `hora_fin` VARCHAR(5) NOT NULL,

    PRIMARY KEY (`id_horario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_id_curso_fkey` FOREIGN KEY (`id_curso`) REFERENCES `Curso`(`id_curso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_id_docente_fkey` FOREIGN KEY (`id_docente`) REFERENCES `Docente`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;
