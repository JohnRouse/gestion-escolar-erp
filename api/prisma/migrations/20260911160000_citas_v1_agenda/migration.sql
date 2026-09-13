-- Citas V1 mantiene las citas históricas de Staff y añade destinatarios
-- Docente, contexto académico/institucional, matrícula e historial persistente.
ALTER TABLE `Cita`
    MODIFY `id_staff` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL,
    ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_docente` INTEGER NULL,
    ADD COLUMN `id_matricula` INTEGER NULL,
    ADD COLUMN `contexto_destinatario` VARCHAR(20) NOT NULL DEFAULT 'staff',
    ADD COLUMN `funcion_destinatario` VARCHAR(150) NULL,
    ADD COLUMN `actualizado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Los registros previos conservan Staff. Solo se completa contexto cuando la
-- pertenencia puede derivarse de relaciones existentes; no se inventan datos.
UPDATE `Cita` AS c
INNER JOIN `Staff` AS s ON s.`id_staff` = c.`id_staff`
LEFT JOIN `Seccion` AS se ON se.`id_seccion` = s.`id_seccion`
LEFT JOIN `Colegio` AS co ON co.`id_colegio` = COALESCE(s.`id_colegio`, se.`id_colegio`)
SET
    c.`id_colegio` = COALESCE(s.`id_colegio`, se.`id_colegio`),
    c.`id_tenant` = COALESCE(s.`id_tenant`, co.`id_tenant`),
    c.`contexto_destinatario` = 'staff',
    c.`funcion_destinatario` = s.`cargo`;

CREATE TABLE `CitaMovimiento` (
    `id_movimiento` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cita` INTEGER NOT NULL,
    `id_usuario_actor` INTEGER NULL,
    `accion` VARCHAR(30) NOT NULL,
    `estado_anterior` VARCHAR(30) NULL,
    `estado_nuevo` VARCHAR(30) NULL,
    `fecha_anterior` DATE NULL,
    `fecha_nueva` DATE NULL,
    `hora_inicio_anterior` VARCHAR(5) NULL,
    `hora_fin_anterior` VARCHAR(5) NULL,
    `hora_inicio_nueva` VARCHAR(5) NULL,
    `hora_fin_nueva` VARCHAR(5) NULL,
    `comentario` TEXT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CitaMovimiento_id_cita_creado_en_idx`(`id_cita`, `creado_en`),
    INDEX `CitaMovimiento_id_usuario_actor_idx`(`id_usuario_actor`),
    PRIMARY KEY (`id_movimiento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Cita_id_tenant_id_colegio_fecha_idx` ON `Cita`(`id_tenant`, `id_colegio`, `fecha`);
CREATE INDEX `Cita_id_staff_fecha_idx` ON `Cita`(`id_staff`, `fecha`);
CREATE INDEX `Cita_id_docente_fecha_idx` ON `Cita`(`id_docente`, `fecha`);
CREATE INDEX `Cita_id_matricula_idx` ON `Cita`(`id_matricula`);
CREATE INDEX `Cita_estado_fecha_idx` ON `Cita`(`estado`, `fecha`);

-- Los índices compuestos anteriores reemplazan los índices simples declarados
-- por el esquema previo y siguen sirviendo como soporte de la FK de Staff.
DROP INDEX `Cita_id_staff_idx` ON `Cita`;
DROP INDEX `Cita_fecha_idx` ON `Cita`;

ALTER TABLE `Cita`
    ADD CONSTRAINT `Cita_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Cita_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Cita_id_docente_fkey` FOREIGN KEY (`id_docente`) REFERENCES `Docente`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Cita_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CitaMovimiento`
    ADD CONSTRAINT `CitaMovimiento_id_cita_fkey` FOREIGN KEY (`id_cita`) REFERENCES `Cita`(`id_cita`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `CitaMovimiento_id_usuario_actor_fkey` FOREIGN KEY (`id_usuario_actor`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
