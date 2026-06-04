-- AlterTable
ALTER TABLE `ConceptoPago` ADD COLUMN `tipo_concepto` VARCHAR(30) NOT NULL DEFAULT 'PENSION';

-- CreateIndex
CREATE INDEX `ConceptoPago_tipo_concepto_idx` ON `ConceptoPago`(`tipo_concepto`);

-- CreateIndex
CREATE INDEX `ConceptoPago_id_anio_id_colegio_tipo_concepto_idx` ON `ConceptoPago`(`id_anio`, `id_colegio`, `tipo_concepto`);
