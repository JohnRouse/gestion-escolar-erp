-- CreateTable
CREATE TABLE `CobranzaGestion` (
    `id_gestion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cronograma` INTEGER NOT NULL,
    `id_usuario` INTEGER NULL,
    `canal` VARCHAR(30) NOT NULL DEFAULT 'WhatsApp',
    `estado_contacto` VARCHAR(40) NOT NULL DEFAULT 'Mensaje enviado',
    `telefono` VARCHAR(30) NULL,
    `mensaje` TEXT NULL,
    `observacion` VARCHAR(600) NULL,
    `fecha_programada` DATETIME(3) NULL,
    `fecha_gestion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CobranzaGestion_id_cronograma_fecha_gestion_idx`(`id_cronograma`, `fecha_gestion`),
    INDEX `CobranzaGestion_id_usuario_idx`(`id_usuario`),
    INDEX `CobranzaGestion_estado_contacto_idx`(`estado_contacto`),
    INDEX `CobranzaGestion_fecha_programada_idx`(`fecha_programada`),
    PRIMARY KEY (`id_gestion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CobranzaGestion` ADD CONSTRAINT `CobranzaGestion_id_cronograma_fkey` FOREIGN KEY (`id_cronograma`) REFERENCES `CronogramaPagos`(`id_cronograma`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CobranzaGestion` ADD CONSTRAINT `CobranzaGestion_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
