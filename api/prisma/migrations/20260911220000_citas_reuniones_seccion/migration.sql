-- Citas históricas y existentes conservan el tipo individual mediante el
-- valor por defecto. Las reuniones usan la sección como audiencia estructural
-- y no almacenan una matrícula o un apoderado ficticios.
ALTER TABLE `Cita`
    MODIFY `id_apoderado` INTEGER NULL,
    ADD COLUMN `tipo` VARCHAR(20) NOT NULL DEFAULT 'individual',
    ADD COLUMN `id_seccion` INTEGER NULL;

CREATE INDEX `Cita_id_seccion_fecha_idx` ON `Cita`(`id_seccion`, `fecha`);
CREATE INDEX `Cita_tipo_fecha_idx` ON `Cita`(`tipo`, `fecha`);

ALTER TABLE `Cita`
    ADD CONSTRAINT `Cita_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE RESTRICT ON UPDATE CASCADE;
