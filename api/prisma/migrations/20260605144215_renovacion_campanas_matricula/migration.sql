-- AlterTable
ALTER TABLE `CronogramaPagos` ADD COLUMN `descuento_aplicado` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `id_campana_matricula` INTEGER NULL,
    ADD COLUMN `monto_base_original` DECIMAL(10, 2) NULL,
    ADD COLUMN `monto_programado` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `Matricula` ADD COLUMN `id_anio_origen` INTEGER NULL,
    ADD COLUMN `id_colegio_origen` INTEGER NULL,
    ADD COLUMN `id_matricula_origen` INTEGER NULL,
    ADD COLUMN `tipo_proceso_matricula` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `CampanaMatricula` (
    `id_campana` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NULL,
    `id_colegio` INTEGER NULL,
    `id_anio` INTEGER NOT NULL,
    `nombre` VARCHAR(120) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `monto_promocional` DECIMAL(10, 2) NULL,
    `descuento_monto` DECIMAL(10, 2) NULL,
    `tipo_ingreso_aplica` VARCHAR(160) NULL,
    `solo_alumnos_vigentes` BOOLEAN NOT NULL DEFAULT true,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activo',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CampanaMatricula_id_tenant_idx`(`id_tenant`),
    INDEX `CampanaMatricula_id_colegio_idx`(`id_colegio`),
    INDEX `CampanaMatricula_id_anio_idx`(`id_anio`),
    INDEX `CampanaMatricula_estado_fecha_inicio_fecha_fin_idx`(`estado`, `fecha_inicio`, `fecha_fin`),
    PRIMARY KEY (`id_campana`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CronogramaPagos_id_campana_matricula_idx` ON `CronogramaPagos`(`id_campana_matricula`);

-- CreateIndex
CREATE INDEX `Matricula_id_matricula_origen_idx` ON `Matricula`(`id_matricula_origen`);

-- CreateIndex
CREATE INDEX `Matricula_id_colegio_origen_id_anio_origen_idx` ON `Matricula`(`id_colegio_origen`, `id_anio_origen`);

-- CreateIndex
CREATE INDEX `Matricula_tipo_proceso_matricula_idx` ON `Matricula`(`tipo_proceso_matricula`);

-- AddForeignKey
ALTER TABLE `CampanaMatricula` ADD CONSTRAINT `CampanaMatricula_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampanaMatricula` ADD CONSTRAINT `CampanaMatricula_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampanaMatricula` ADD CONSTRAINT `CampanaMatricula_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaPagos` ADD CONSTRAINT `CronogramaPagos_id_campana_matricula_fkey` FOREIGN KEY (`id_campana_matricula`) REFERENCES `CampanaMatricula`(`id_campana`) ON DELETE SET NULL ON UPDATE CASCADE;
