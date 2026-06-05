-- AlterTable
ALTER TABLE `CronogramaPagos` ADD COLUMN `estado_publicacion` VARCHAR(20) NOT NULL DEFAULT 'Publicado',
    ADD COLUMN `fecha_publicacion` DATE NULL,
    ADD COLUMN `fecha_publicado` DATETIME(3) NULL,
    ADD COLUMN `id_campana_descuento` INTEGER NULL,
    ADD COLUMN `id_plan_pension_detalle` INTEGER NULL,
    ADD COLUMN `visible_apoderado` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `PlanPensiones` (
    `id_plan_pension` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NULL,
    `id_colegio` INTEGER NOT NULL,
    `id_anio` INTEGER NOT NULL,
    `nombre` VARCHAR(120) NOT NULL,
    `monto_mensual` DECIMAL(10, 2) NOT NULL,
    `mes_inicio` TINYINT NOT NULL DEFAULT 3,
    `mes_fin` TINYINT NOT NULL DEFAULT 12,
    `dia_publicacion` TINYINT NOT NULL DEFAULT 1,
    `dia_vencimiento` TINYINT NOT NULL DEFAULT 5,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activo',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlanPensiones_id_tenant_idx`(`id_tenant`),
    INDEX `PlanPensiones_id_colegio_idx`(`id_colegio`),
    INDEX `PlanPensiones_id_anio_idx`(`id_anio`),
    INDEX `PlanPensiones_estado_idx`(`estado`),
    PRIMARY KEY (`id_plan_pension`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanPensionesDetalle` (
    `id_plan_detalle` INTEGER NOT NULL AUTO_INCREMENT,
    `id_plan_pension` INTEGER NOT NULL,
    `id_concepto` INTEGER NOT NULL,
    `mes` TINYINT NOT NULL,
    `nombre_mes` VARCHAR(20) NOT NULL,
    `fecha_publicacion` DATE NOT NULL,
    `fecha_vencimiento` DATE NOT NULL,
    `monto_base` DECIMAL(10, 2) NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Programado',

    INDEX `PlanPensionesDetalle_id_plan_pension_idx`(`id_plan_pension`),
    INDEX `PlanPensionesDetalle_id_concepto_idx`(`id_concepto`),
    INDEX `PlanPensionesDetalle_mes_idx`(`mes`),
    UNIQUE INDEX `PlanPensionesDetalle_id_plan_pension_mes_key`(`id_plan_pension`, `mes`),
    PRIMARY KEY (`id_plan_detalle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampanaDescuento` (
    `id_campana_descuento` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NULL,
    `id_colegio` INTEGER NULL,
    `id_anio` INTEGER NULL,
    `nombre` VARCHAR(120) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `tipo_concepto_aplica` VARCHAR(30) NULL,
    `tipo_ingreso_aplica` VARCHAR(160) NULL,
    `monto_promocional` DECIMAL(10, 2) NULL,
    `descuento_monto` DECIMAL(10, 2) NULL,
    `descuento_porcentaje` DECIMAL(5, 2) NULL,
    `solo_alumnos_vigentes` BOOLEAN NOT NULL DEFAULT false,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activo',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CampanaDescuento_id_tenant_idx`(`id_tenant`),
    INDEX `CampanaDescuento_id_colegio_idx`(`id_colegio`),
    INDEX `CampanaDescuento_id_anio_idx`(`id_anio`),
    INDEX `CampanaDescuento_tipo_concepto_aplica_idx`(`tipo_concepto_aplica`),
    INDEX `CampanaDescuento_estado_fecha_inicio_fecha_fin_idx`(`estado`, `fecha_inicio`, `fecha_fin`),
    PRIMARY KEY (`id_campana_descuento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CronogramaPagos_id_plan_pension_detalle_idx` ON `CronogramaPagos`(`id_plan_pension_detalle`);

-- CreateIndex
CREATE INDEX `CronogramaPagos_id_campana_descuento_idx` ON `CronogramaPagos`(`id_campana_descuento`);

-- CreateIndex
CREATE INDEX `CronogramaPagos_estado_publicacion_fecha_publicacion_visible_idx` ON `CronogramaPagos`(`estado_publicacion`, `fecha_publicacion`, `visible_apoderado`);

-- AddForeignKey
ALTER TABLE `PlanPensiones` ADD CONSTRAINT `PlanPensiones_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanPensiones` ADD CONSTRAINT `PlanPensiones_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanPensiones` ADD CONSTRAINT `PlanPensiones_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanPensionesDetalle` ADD CONSTRAINT `PlanPensionesDetalle_id_plan_pension_fkey` FOREIGN KEY (`id_plan_pension`) REFERENCES `PlanPensiones`(`id_plan_pension`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanPensionesDetalle` ADD CONSTRAINT `PlanPensionesDetalle_id_concepto_fkey` FOREIGN KEY (`id_concepto`) REFERENCES `ConceptoPago`(`id_concepto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampanaDescuento` ADD CONSTRAINT `CampanaDescuento_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampanaDescuento` ADD CONSTRAINT `CampanaDescuento_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampanaDescuento` ADD CONSTRAINT `CampanaDescuento_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaPagos` ADD CONSTRAINT `CronogramaPagos_id_plan_pension_detalle_fkey` FOREIGN KEY (`id_plan_pension_detalle`) REFERENCES `PlanPensionesDetalle`(`id_plan_detalle`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaPagos` ADD CONSTRAINT `CronogramaPagos_id_campana_descuento_fkey` FOREIGN KEY (`id_campana_descuento`) REFERENCES `CampanaDescuento`(`id_campana_descuento`) ON DELETE SET NULL ON UPDATE CASCADE;
