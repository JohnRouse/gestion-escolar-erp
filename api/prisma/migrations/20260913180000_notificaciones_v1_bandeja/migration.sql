-- Notificaciones V1 conserva todos los registros históricos y agrega contexto
-- opcional. Las filas previas permanecen NULL: no se infiere tenant/colegio a
-- partir de títulos, mensajes, tipos o URLs.
ALTER TABLE `Notificacion`
    ADD COLUMN `id_tenant` INTEGER NULL,
    ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `origen` VARCHAR(30) NULL,
    ADD COLUMN `referencia_tipo` VARCHAR(50) NULL,
    ADD COLUMN `referencia_id` VARCHAR(100) NULL,
    ADD COLUMN `canal` VARCHAR(20) NULL,
    ADD COLUMN `fecha_lectura` DATETIME(3) NULL;

CREATE INDEX `Notificacion_id_usuario_leida_fecha_creacion_idx`
    ON `Notificacion`(`id_usuario`, `leida`, `fecha_creacion`);
CREATE INDEX `Notificacion_id_usuario_id_tenant_id_colegio_fecha_creacion_idx`
    ON `Notificacion`(`id_usuario`, `id_tenant`, `id_colegio`, `fecha_creacion`);
CREATE INDEX `Notificacion_origen_fecha_creacion_idx`
    ON `Notificacion`(`origen`, `fecha_creacion`);

ALTER TABLE `Notificacion`
    ADD CONSTRAINT `Notificacion_id_tenant_fkey`
        FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Notificacion_id_colegio_fkey`
        FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
