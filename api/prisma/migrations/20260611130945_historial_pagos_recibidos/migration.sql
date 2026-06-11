-- CreateTable
CREATE TABLE `PagoRecibidoHistorial` (
    `id_historial` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pago_recibido` INTEGER NOT NULL,
    `accion` VARCHAR(40) NOT NULL,
    `estado_anterior` VARCHAR(20) NULL,
    `estado_nuevo` VARCHAR(20) NULL,
    `observacion` VARCHAR(700) NULL,
    `metadata_json` JSON NULL,
    `id_usuario` INTEGER NULL,
    `origen` VARCHAR(50) NOT NULL DEFAULT 'Interno',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PagoRecibidoHistorial_id_pago_recibido_created_at_idx`(`id_pago_recibido`, `created_at`),
    INDEX `PagoRecibidoHistorial_id_usuario_idx`(`id_usuario`),
    INDEX `PagoRecibidoHistorial_accion_idx`(`accion`),
    PRIMARY KEY (`id_historial`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PagoRecibidoHistorial` ADD CONSTRAINT `PagoRecibidoHistorial_id_pago_recibido_fkey` FOREIGN KEY (`id_pago_recibido`) REFERENCES `PagoRecibido`(`id_pago_recibido`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibidoHistorial` ADD CONSTRAINT `PagoRecibidoHistorial_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
