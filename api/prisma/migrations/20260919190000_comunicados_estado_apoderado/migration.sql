-- Comunicados V1 separa el estado personal del apoderado de las filas de
-- audiencia compartidas en CircularDestinatario. La migración es aditiva y no
-- realiza backfill: la ausencia de fila significa no leído y no confirmado.
CREATE TABLE `CircularEstadoApoderado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_circular` INTEGER NOT NULL,
    `id_apoderado` INTEGER NOT NULL,
    `fecha_lectura` DATETIME(3) NULL,
    `fecha_confirmacion` DATETIME(3) NULL,
    `id_usuario_lectura` INTEGER NULL,
    `id_usuario_confirmacion` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CircularEstadoApoderado_id_circular_id_apoderado_key`(`id_circular`, `id_apoderado`),
    INDEX `CircularEstadoApoderado_id_apoderado_idx`(`id_apoderado`),
    INDEX `CircularEstadoApoderado_id_circular_idx`(`id_circular`),
    INDEX `CircularEstadoApoderado_id_usuario_lectura_idx`(`id_usuario_lectura`),
    INDEX `CircularEstadoApoderado_id_usuario_confirmacion_idx`(`id_usuario_confirmacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CircularEstadoApoderado`
    ADD CONSTRAINT `CircularEstadoApoderado_id_circular_fkey` FOREIGN KEY (`id_circular`) REFERENCES `Circular`(`id_circular`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `CircularEstadoApoderado_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `CircularEstadoApoderado_id_usuario_lectura_fkey` FOREIGN KEY (`id_usuario_lectura`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `CircularEstadoApoderado_id_usuario_confirmacion_fkey` FOREIGN KEY (`id_usuario_confirmacion`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
