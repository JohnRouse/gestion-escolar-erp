-- Enfermería V1 agrega información declarada, autorizaciones, atenciones,
-- contactos e historial. Es una migración aditiva y no elimina datos previos.
CREATE TABLE `FichaSalud` (
    `id_ficha` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NOT NULL,
    `id_colegio` INTEGER NOT NULL,
    `id_estudiante` INTEGER NOT NULL,
    `grupo_sanguineo` VARCHAR(10) NULL,
    `alergias_declaradas` TEXT NULL,
    `condiciones_declaradas` TEXT NULL,
    `medicacion_habitual_declarada` TEXT NULL,
    `seguro_centro_atencion` VARCHAR(255) NULL,
    `contacto_emergencia` VARCHAR(150) NULL,
    `telefono_emergencia` VARCHAR(30) NULL,
    `observaciones_relevantes` TEXT NULL,
    `id_usuario_actualizo` INTEGER NOT NULL,
    `fecha_actualizacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FichaSalud_id_colegio_id_estudiante_key`(`id_colegio`, `id_estudiante`),
    INDEX `FichaSalud_id_tenant_id_colegio_idx`(`id_tenant`, `id_colegio`),
    PRIMARY KEY (`id_ficha`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AutorizacionMedicacion` (
    `id_autorizacion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ficha` INTEGER NOT NULL,
    `id_apoderado` INTEGER NOT NULL,
    `medicamento` VARCHAR(200) NOT NULL,
    `dosis_instruccion` TEXT NOT NULL,
    `via` VARCHAR(80) NULL,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `observaciones` TEXT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'activa',
    `id_usuario_registro` INTEGER NOT NULL,
    `id_usuario_revocacion` INTEGER NULL,
    `fecha_revocacion` DATETIME(3) NULL,
    `motivo_revocacion` VARCHAR(500) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AutorizacionMedicacion_id_ficha_estado_fecha_fin_idx`(`id_ficha`, `estado`, `fecha_fin`),
    INDEX `AutorizacionMedicacion_id_apoderado_idx`(`id_apoderado`),
    PRIMARY KEY (`id_autorizacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AtencionEnfermeria` (
    `id_atencion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NOT NULL,
    `id_colegio` INTEGER NOT NULL,
    `id_matricula` INTEGER NOT NULL,
    `fecha_hora_ingreso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `motivo` VARCHAR(500) NOT NULL,
    `observacion_reportada` TEXT NULL,
    `acciones_realizadas` TEXT NULL,
    `id_autorizacion_medicacion` INTEGER NULL,
    `medicacion_administrada` BOOLEAN NOT NULL DEFAULT false,
    `fecha_medicacion` DATETIME(3) NULL,
    `id_usuario_medicacion` INTEGER NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'abierta',
    `destino` VARCHAR(40) NULL,
    `fecha_hora_cierre` DATETIME(3) NULL,
    `id_usuario_responsable` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AtencionEnfermeria_id_colegio_fecha_hora_ingreso_idx`(`id_colegio`, `fecha_hora_ingreso`),
    INDEX `AtencionEnfermeria_id_matricula_fecha_hora_ingreso_idx`(`id_matricula`, `fecha_hora_ingreso`),
    INDEX `AtencionEnfermeria_estado_fecha_hora_ingreso_idx`(`estado`, `fecha_hora_ingreso`),
    PRIMARY KEY (`id_atencion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EnfermeriaContacto` (
    `id_contacto` INTEGER NOT NULL AUTO_INCREMENT,
    `id_atencion` INTEGER NOT NULL,
    `id_apoderado` INTEGER NOT NULL,
    `fecha_hora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `medio` VARCHAR(20) NOT NULL,
    `observacion` VARCHAR(1000) NULL,
    `notificacion_enviada` BOOLEAN NOT NULL DEFAULT false,
    `id_usuario_actor` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EnfermeriaContacto_id_atencion_fecha_hora_idx`(`id_atencion`, `fecha_hora`),
    INDEX `EnfermeriaContacto_id_apoderado_idx`(`id_apoderado`),
    PRIMARY KEY (`id_contacto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EnfermeriaMovimiento` (
    `id_movimiento` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NOT NULL,
    `id_colegio` INTEGER NOT NULL,
    `tipo_entidad` VARCHAR(30) NOT NULL,
    `id_entidad` INTEGER NOT NULL,
    `accion` VARCHAR(50) NOT NULL,
    `id_usuario_actor` INTEGER NOT NULL,
    `motivo` VARCHAR(1000) NULL,
    `datos` JSON NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EnfermeriaMovimiento_tipo_entidad_id_entidad_creado_en_idx`(`tipo_entidad`, `id_entidad`, `creado_en`),
    INDEX `EnfermeriaMovimiento_id_tenant_id_colegio_creado_en_idx`(`id_tenant`, `id_colegio`, `creado_en`),
    PRIMARY KEY (`id_movimiento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FichaSalud`
    ADD CONSTRAINT `FichaSalud_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `FichaSalud_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `FichaSalud_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `FichaSalud_id_usuario_actualizo_fkey` FOREIGN KEY (`id_usuario_actualizo`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AutorizacionMedicacion`
    ADD CONSTRAINT `AutorizacionMedicacion_id_ficha_fkey` FOREIGN KEY (`id_ficha`) REFERENCES `FichaSalud`(`id_ficha`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `AutorizacionMedicacion_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `AutorizacionMedicacion_id_usuario_registro_fkey` FOREIGN KEY (`id_usuario_registro`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `AutorizacionMedicacion_id_usuario_revocacion_fkey` FOREIGN KEY (`id_usuario_revocacion`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AtencionEnfermeria`
    ADD CONSTRAINT `AtencionEnfermeria_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `AtencionEnfermeria_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `AtencionEnfermeria_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `AtencionEnfermeria_id_autorizacion_medicacion_fkey` FOREIGN KEY (`id_autorizacion_medicacion`) REFERENCES `AutorizacionMedicacion`(`id_autorizacion`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `AtencionEnfermeria_id_usuario_responsable_fkey` FOREIGN KEY (`id_usuario_responsable`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `AtencionEnfermeria_id_usuario_medicacion_fkey` FOREIGN KEY (`id_usuario_medicacion`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EnfermeriaContacto`
    ADD CONSTRAINT `EnfermeriaContacto_id_atencion_fkey` FOREIGN KEY (`id_atencion`) REFERENCES `AtencionEnfermeria`(`id_atencion`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EnfermeriaContacto_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EnfermeriaContacto_id_usuario_actor_fkey` FOREIGN KEY (`id_usuario_actor`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `EnfermeriaMovimiento`
    ADD CONSTRAINT `EnfermeriaMovimiento_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EnfermeriaMovimiento_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `EnfermeriaMovimiento_id_usuario_actor_fkey` FOREIGN KEY (`id_usuario_actor`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
