-- CreateTable
CREATE TABLE `DatosCobroColegio` (
    `id_datos_cobro` INTEGER NOT NULL AUTO_INCREMENT,
    `id_colegio` INTEGER NOT NULL,
    `nombre_destinatario` VARCHAR(160) NOT NULL,
    `numero_yape` VARCHAR(30) NULL,
    `numero_plin` VARCHAR(30) NULL,
    `banco_1` VARCHAR(80) NULL,
    `cuenta_1` VARCHAR(80) NULL,
    `cci_1` VARCHAR(80) NULL,
    `banco_2` VARCHAR(80) NULL,
    `cuenta_2` VARCHAR(80) NULL,
    `cci_2` VARCHAR(80) NULL,
    `qr_yape_url` VARCHAR(500) NULL,
    `qr_plin_url` VARCHAR(500) NULL,
    `instrucciones` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DatosCobroColegio_id_colegio_key`(`id_colegio`),
    INDEX `DatosCobroColegio_activo_idx`(`activo`),
    PRIMARY KEY (`id_datos_cobro`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DatosCobroColegio` ADD CONSTRAINT `DatosCobroColegio_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE CASCADE ON UPDATE CASCADE;
