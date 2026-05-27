-- CreateTable
CREATE TABLE `PlantillaEvaluacion` (
    `id_plantilla` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(200) NOT NULL,
    `id_nivel` INTEGER NULL,
    `id_curso` INTEGER NULL,

    PRIMARY KEY (`id_plantilla`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlantillaEvaluacionDetalle` (
    `id_detalle` INTEGER NOT NULL AUTO_INCREMENT,
    `id_plantilla` INTEGER NOT NULL,
    `id_tipo_eval` INTEGER NOT NULL,
    `descripcion` VARCHAR(200) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id_detalle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlantillaEvaluacion` ADD CONSTRAINT `PlantillaEvaluacion_id_nivel_fkey` FOREIGN KEY (`id_nivel`) REFERENCES `Nivel`(`id_nivel`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlantillaEvaluacion` ADD CONSTRAINT `PlantillaEvaluacion_id_curso_fkey` FOREIGN KEY (`id_curso`) REFERENCES `Curso`(`id_curso`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlantillaEvaluacionDetalle` ADD CONSTRAINT `PlantillaEvaluacionDetalle_id_plantilla_fkey` FOREIGN KEY (`id_plantilla`) REFERENCES `PlantillaEvaluacion`(`id_plantilla`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlantillaEvaluacionDetalle` ADD CONSTRAINT `PlantillaEvaluacionDetalle_id_tipo_eval_fkey` FOREIGN KEY (`id_tipo_eval`) REFERENCES `TipoEvaluacion`(`id_tipo_eval`) ON DELETE RESTRICT ON UPDATE CASCADE;
