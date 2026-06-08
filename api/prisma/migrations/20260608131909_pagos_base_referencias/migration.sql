/*
  Warnings:

  - A unique constraint covering the columns `[referencia_pago]` on the table `CronogramaPagos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `CronogramaPagos` ADD COLUMN `referencia_pago` VARCHAR(40) NULL;

-- CreateTable
CREATE TABLE `OrdenPago` (
    `id_orden_pago` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo_orden` VARCHAR(40) NOT NULL,
    `id_tenant` INTEGER NULL,
    `id_colegio` INTEGER NULL,
    `id_cronograma` INTEGER NOT NULL,
    `id_matricula` INTEGER NOT NULL,
    `id_estudiante` INTEGER NOT NULL,
    `id_apoderado` INTEGER NULL,
    `proveedor` VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    `metodo` VARCHAR(30) NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `moneda` VARCHAR(3) NOT NULL DEFAULT 'PEN',
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Creada',
    `checkout_url` VARCHAR(500) NULL,
    `qr_url` VARCHAR(500) NULL,
    `provider_order_id` VARCHAR(120) NULL,
    `provider_payment_id` VARCHAR(120) NULL,
    `provider_response` JSON NULL,
    `metadata_json` JSON NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_expiracion` DATETIME(3) NULL,
    `fecha_pago` DATETIME(3) NULL,

    UNIQUE INDEX `OrdenPago_codigo_orden_key`(`codigo_orden`),
    INDEX `OrdenPago_id_cronograma_idx`(`id_cronograma`),
    INDEX `OrdenPago_id_matricula_idx`(`id_matricula`),
    INDEX `OrdenPago_id_estudiante_idx`(`id_estudiante`),
    INDEX `OrdenPago_id_apoderado_idx`(`id_apoderado`),
    INDEX `OrdenPago_estado_idx`(`estado`),
    INDEX `OrdenPago_provider_order_id_idx`(`provider_order_id`),
    PRIMARY KEY (`id_orden_pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PagoRecibido` (
    `id_pago_recibido` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NULL,
    `id_colegio` INTEGER NULL,
    `medio_pago` VARCHAR(30) NOT NULL DEFAULT 'Yape',
    `monto_recibido` DECIMAL(10, 2) NOT NULL,
    `fecha_pago_reportada` DATETIME(3) NOT NULL,
    `nombre_pagador` VARCHAR(160) NULL,
    `telefono_pagador` VARCHAR(30) NULL,
    `numero_operacion` VARCHAR(80) NULL,
    `referencia_escrita` VARCHAR(80) NULL,
    `captura_url` VARCHAR(500) NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    `id_cronograma` INTEGER NULL,
    `id_matricula` INTEGER NULL,
    `id_estudiante` INTEGER NULL,
    `id_apoderado` INTEGER NULL,
    `observacion` VARCHAR(600) NULL,
    `id_usuario_registro` INTEGER NOT NULL,
    `id_usuario_validacion` INTEGER NULL,
    `fecha_validacion` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PagoRecibido_id_colegio_estado_idx`(`id_colegio`, `estado`),
    INDEX `PagoRecibido_referencia_escrita_idx`(`referencia_escrita`),
    INDEX `PagoRecibido_numero_operacion_idx`(`numero_operacion`),
    INDEX `PagoRecibido_id_cronograma_idx`(`id_cronograma`),
    INDEX `PagoRecibido_id_matricula_idx`(`id_matricula`),
    INDEX `PagoRecibido_id_estudiante_idx`(`id_estudiante`),
    INDEX `PagoRecibido_id_apoderado_idx`(`id_apoderado`),
    PRIMARY KEY (`id_pago_recibido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `CronogramaPagos_referencia_pago_key` ON `CronogramaPagos`(`referencia_pago`);

-- AddForeignKey
ALTER TABLE `OrdenPago` ADD CONSTRAINT `OrdenPago_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenPago` ADD CONSTRAINT `OrdenPago_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenPago` ADD CONSTRAINT `OrdenPago_id_cronograma_fkey` FOREIGN KEY (`id_cronograma`) REFERENCES `CronogramaPagos`(`id_cronograma`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenPago` ADD CONSTRAINT `OrdenPago_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenPago` ADD CONSTRAINT `OrdenPago_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdenPago` ADD CONSTRAINT `OrdenPago_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_cronograma_fkey` FOREIGN KEY (`id_cronograma`) REFERENCES `CronogramaPagos`(`id_cronograma`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante`(`id_persona`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_usuario_registro_fkey` FOREIGN KEY (`id_usuario_registro`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoRecibido` ADD CONSTRAINT `PagoRecibido_id_usuario_validacion_fkey` FOREIGN KEY (`id_usuario_validacion`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
