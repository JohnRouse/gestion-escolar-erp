-- Eventos V1 agrega gestión, audiencia relacional y trazabilidad sin eliminar
-- eventos históricos. La columna `hora` se conserva como compatibilidad legacy.
ALTER TABLE `Evento`
    ADD COLUMN `hora_inicio` VARCHAR(5) NULL,
    ADD COLUMN `hora_fin` VARCHAR(5) NULL,
    ADD COLUMN `estado` VARCHAR(20) NOT NULL DEFAULT 'programado',
    ADD COLUMN `ubicacion` VARCHAR(200) NULL,
    ADD COLUMN `id_usuario_creador` INTEGER NULL,
    ADD COLUMN `id_usuario_actualizador` INTEGER NULL,
    ADD COLUMN `motivo_cancelacion` VARCHAR(1000) NULL,
    ADD COLUMN `cancelado_en` DATETIME(3) NULL,
    ADD COLUMN `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `actualizado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `Evento`
SET `hora_inicio` = `hora`
WHERE `hora_inicio` IS NULL AND `hora` IS NOT NULL;

CREATE TABLE `EventoDestinatario` (
    `id_destinatario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_evento` INTEGER NOT NULL,
    `tipo_destino` VARCHAR(20) NOT NULL,
    `id_nivel` INTEGER NULL,
    `id_grado` INTEGER NULL,
    `id_seccion` INTEGER NULL,

    UNIQUE INDEX `EventoDestinatario_evento_tipo_objetivo_key`(`id_evento`, `tipo_destino`, `id_nivel`, `id_grado`, `id_seccion`),
    INDEX `EventoDestinatario_id_evento_tipo_destino_idx`(`id_evento`, `tipo_destino`),
    INDEX `EventoDestinatario_id_nivel_idx`(`id_nivel`),
    INDEX `EventoDestinatario_id_grado_idx`(`id_grado`),
    INDEX `EventoDestinatario_id_seccion_idx`(`id_seccion`),
    PRIMARY KEY (`id_destinatario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EventoMovimiento` (
    `id_movimiento` INTEGER NOT NULL AUTO_INCREMENT,
    `id_evento` INTEGER NOT NULL,
    `id_tenant` INTEGER NOT NULL,
    `id_colegio` INTEGER NOT NULL,
    `id_usuario_actor` INTEGER NOT NULL,
    `accion` VARCHAR(40) NOT NULL,
    `motivo` VARCHAR(1000) NULL,
    `datos` JSON NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventoMovimiento_id_evento_creado_en_idx`(`id_evento`, `creado_en`),
    INDEX `EventoMovimiento_id_tenant_id_colegio_creado_en_idx`(`id_tenant`, `id_colegio`, `creado_en`),
    INDEX `EventoMovimiento_id_usuario_actor_idx`(`id_usuario_actor`),
    PRIMARY KEY (`id_movimiento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Evento`
    ADD INDEX `Evento_id_tenant_id_colegio_fecha_idx`(`id_tenant`, `id_colegio`, `fecha`),
    ADD INDEX `Evento_id_anio_fecha_idx`(`id_anio`, `fecha`),
    ADD INDEX `Evento_estado_fecha_idx`(`estado`, `fecha`),
    ADD INDEX `Evento_tipo_fecha_idx`(`tipo`, `fecha`),
    ADD INDEX `Evento_id_usuario_creador_idx`(`id_usuario_creador`),
    ADD CONSTRAINT `Evento_id_usuario_creador_fkey` FOREIGN KEY (`id_usuario_creador`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `Evento_id_usuario_actualizador_fkey` FOREIGN KEY (`id_usuario_actualizador`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EventoDestinatario`
    ADD CONSTRAINT `EventoDestinatario_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `Evento`(`id_evento`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EventoDestinatario_id_nivel_fkey` FOREIGN KEY (`id_nivel`) REFERENCES `Nivel`(`id_nivel`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EventoDestinatario_id_grado_fkey` FOREIGN KEY (`id_grado`) REFERENCES `Grado`(`id_grado`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EventoDestinatario_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `EventoMovimiento`
    ADD CONSTRAINT `EventoMovimiento_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `Evento`(`id_evento`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EventoMovimiento_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EventoMovimiento_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EventoMovimiento_id_usuario_actor_fkey` FOREIGN KEY (`id_usuario_actor`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
