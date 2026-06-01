/*
  Warnings:

  - You are about to alter the column `categoria` on the `Circular` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `estado` on the `Cita` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(30)`.
  - You are about to alter the column `tipo` on the `Notificacion` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `tipo` on the `RegistroNFC` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(30)`.
  - You are about to alter the column `estado_conexion` on the `Usuario` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(30)`.

*/
-- AlterTable
ALTER TABLE `Album` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `AnioLectivo` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `AsignacionDocente` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `Aula` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `Circular` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL,
    MODIFY `categoria` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `Cita` MODIFY `estado` VARCHAR(30) NOT NULL DEFAULT 'pendiente';

-- AlterTable
ALTER TABLE `ConceptoPago` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `Evento` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `Matricula` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `Notificacion` MODIFY `tipo` VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE `PlantillaEvaluacion` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `RegistroNFC` MODIFY `tipo` VARCHAR(30) NOT NULL DEFAULT 'entrada';

-- AlterTable
ALTER TABLE `Seccion` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `Staff` ADD COLUMN `id_colegio` INTEGER NULL,
    ADD COLUMN `id_tenant` INTEGER NULL;

-- AlterTable
ALTER TABLE `Usuario` MODIFY `estado_conexion` VARCHAR(30) NOT NULL DEFAULT 'desconectado';

-- CreateTable
CREATE TABLE `Tenant` (
    `id_tenant` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `ruc` VARCHAR(20) NULL,
    `logo_url` VARCHAR(500) NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activo',
    `plan` VARCHAR(30) NOT NULL DEFAULT 'basic',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    PRIMARY KEY (`id_tenant`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Colegio` (
    `id_colegio` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tenant` INTEGER NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `nombre_corto` VARCHAR(50) NULL,
    `codigo` VARCHAR(30) NULL,
    `direccion` VARCHAR(255) NULL,
    `telefono` VARCHAR(30) NULL,
    `logo_url` VARCHAR(500) NULL,
    `color_principal` VARCHAR(20) NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activo',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Colegio_id_tenant_idx`(`id_tenant`),
    UNIQUE INDEX `Colegio_id_tenant_codigo_key`(`id_tenant`, `codigo`),
    PRIMARY KEY (`id_colegio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsuarioTenant` (
    `id_usuario` INTEGER NOT NULL,
    `id_tenant` INTEGER NOT NULL,
    `rol_tenant` VARCHAR(50) NOT NULL DEFAULT 'Miembro',
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activo',

    INDEX `UsuarioTenant_id_tenant_idx`(`id_tenant`),
    PRIMARY KEY (`id_usuario`, `id_tenant`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsuarioColegio` (
    `id_usuario` INTEGER NOT NULL,
    `id_colegio` INTEGER NOT NULL,
    `rol_colegio` VARCHAR(50) NOT NULL,
    `es_principal` BOOLEAN NOT NULL DEFAULT false,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activo',

    INDEX `UsuarioColegio_id_colegio_idx`(`id_colegio`),
    PRIMARY KEY (`id_usuario`, `id_colegio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ColegioNivel` (
    `id_colegio` INTEGER NOT NULL,
    `id_nivel` INTEGER NOT NULL,

    PRIMARY KEY (`id_colegio`, `id_nivel`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Album_id_tenant_idx` ON `Album`(`id_tenant`);

-- CreateIndex
CREATE INDEX `Album_id_colegio_idx` ON `Album`(`id_colegio`);

-- CreateIndex
CREATE INDEX `AnioLectivo_id_tenant_idx` ON `AnioLectivo`(`id_tenant`);

-- CreateIndex
CREATE INDEX `AnioLectivo_id_colegio_idx` ON `AnioLectivo`(`id_colegio`);

-- CreateIndex
CREATE INDEX `AsignacionDocente_id_tenant_idx` ON `AsignacionDocente`(`id_tenant`);

-- CreateIndex
CREATE INDEX `AsignacionDocente_id_colegio_idx` ON `AsignacionDocente`(`id_colegio`);

-- CreateIndex
CREATE INDEX `Aula_id_tenant_idx` ON `Aula`(`id_tenant`);

-- CreateIndex
CREATE INDEX `Aula_id_colegio_idx` ON `Aula`(`id_colegio`);

-- CreateIndex
CREATE INDEX `Circular_id_tenant_idx` ON `Circular`(`id_tenant`);

-- CreateIndex
CREATE INDEX `Circular_id_colegio_idx` ON `Circular`(`id_colegio`);

-- CreateIndex
CREATE INDEX `Cita_fecha_idx` ON `Cita`(`fecha`);

-- CreateIndex
CREATE INDEX `ConceptoPago_id_tenant_idx` ON `ConceptoPago`(`id_tenant`);

-- CreateIndex
CREATE INDEX `ConceptoPago_id_colegio_idx` ON `ConceptoPago`(`id_colegio`);

-- CreateIndex
CREATE INDEX `Evento_id_tenant_idx` ON `Evento`(`id_tenant`);

-- CreateIndex
CREATE INDEX `Evento_id_colegio_idx` ON `Evento`(`id_colegio`);

-- CreateIndex
CREATE INDEX `Evento_fecha_idx` ON `Evento`(`fecha`);

-- CreateIndex
CREATE INDEX `Matricula_id_tenant_idx` ON `Matricula`(`id_tenant`);

-- CreateIndex
CREATE INDEX `Matricula_id_colegio_idx` ON `Matricula`(`id_colegio`);

-- CreateIndex
CREATE INDEX `Notificacion_fecha_creacion_idx` ON `Notificacion`(`fecha_creacion`);

-- CreateIndex
CREATE INDEX `PlantillaEvaluacion_id_tenant_idx` ON `PlantillaEvaluacion`(`id_tenant`);

-- CreateIndex
CREATE INDEX `PlantillaEvaluacion_id_colegio_idx` ON `PlantillaEvaluacion`(`id_colegio`);

-- CreateIndex
CREATE INDEX `RegistroNFC_fecha_idx` ON `RegistroNFC`(`fecha`);

-- CreateIndex
CREATE INDEX `Seccion_id_tenant_idx` ON `Seccion`(`id_tenant`);

-- CreateIndex
CREATE INDEX `Seccion_id_colegio_idx` ON `Seccion`(`id_colegio`);

-- CreateIndex
CREATE INDEX `Staff_id_tenant_idx` ON `Staff`(`id_tenant`);

-- CreateIndex
CREATE INDEX `Staff_id_colegio_idx` ON `Staff`(`id_colegio`);

-- AddForeignKey
ALTER TABLE `Colegio` ADD CONSTRAINT `Colegio_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioTenant` ADD CONSTRAINT `UsuarioTenant_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioTenant` ADD CONSTRAINT `UsuarioTenant_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioColegio` ADD CONSTRAINT `UsuarioColegio_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioColegio` ADD CONSTRAINT `UsuarioColegio_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ColegioNivel` ADD CONSTRAINT `ColegioNivel_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ColegioNivel` ADD CONSTRAINT `ColegioNivel_id_nivel_fkey` FOREIGN KEY (`id_nivel`) REFERENCES `Nivel`(`id_nivel`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aula` ADD CONSTRAINT `Aula_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aula` ADD CONSTRAINT `Aula_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seccion` ADD CONSTRAINT `Seccion_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seccion` ADD CONSTRAINT `Seccion_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnioLectivo` ADD CONSTRAINT `AnioLectivo_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnioLectivo` ADD CONSTRAINT `AnioLectivo_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsignacionDocente` ADD CONSTRAINT `AsignacionDocente_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsignacionDocente` ADD CONSTRAINT `AsignacionDocente_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConceptoPago` ADD CONSTRAINT `ConceptoPago_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConceptoPago` ADD CONSTRAINT `ConceptoPago_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Circular` ADD CONSTRAINT `Circular_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Circular` ADD CONSTRAINT `Circular_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evento` ADD CONSTRAINT `Evento_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evento` ADD CONSTRAINT `Evento_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Album` ADD CONSTRAINT `Album_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Album` ADD CONSTRAINT `Album_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlantillaEvaluacion` ADD CONSTRAINT `PlantillaEvaluacion_id_tenant_fkey` FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlantillaEvaluacion` ADD CONSTRAINT `PlantillaEvaluacion_id_colegio_fkey` FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Adjunto` RENAME INDEX `Adjunto_id_circular_fkey` TO `Adjunto_id_circular_idx`;

-- RenameIndex
ALTER TABLE `Album` RENAME INDEX `Album_id_docente_fkey` TO `Album_id_docente_idx`;

-- RenameIndex
ALTER TABLE `Album` RENAME INDEX `Album_id_seccion_fkey` TO `Album_id_seccion_idx`;

-- RenameIndex
ALTER TABLE `AsignacionDocente` RENAME INDEX `AsignacionDocente_id_curso_fkey` TO `AsignacionDocente_id_curso_idx`;

-- RenameIndex
ALTER TABLE `AsignacionDocente` RENAME INDEX `AsignacionDocente_id_seccion_fkey` TO `AsignacionDocente_id_seccion_idx`;

-- RenameIndex
ALTER TABLE `Bimestre` RENAME INDEX `Bimestre_id_anio_fkey` TO `Bimestre_id_anio_idx`;

-- RenameIndex
ALTER TABLE `Circular` RENAME INDEX `Circular_remitente_id_usuario_fkey` TO `Circular_remitente_id_usuario_idx`;

-- RenameIndex
ALTER TABLE `CircularDestinatario` RENAME INDEX `CircularDestinatario_id_circular_fkey` TO `CircularDestinatario_id_circular_idx`;

-- RenameIndex
ALTER TABLE `CircularDestinatario` RENAME INDEX `CircularDestinatario_id_nivel_fkey` TO `CircularDestinatario_id_nivel_idx`;

-- RenameIndex
ALTER TABLE `CircularDestinatario` RENAME INDEX `CircularDestinatario_id_seccion_fkey` TO `CircularDestinatario_id_seccion_idx`;

-- RenameIndex
ALTER TABLE `Cita` RENAME INDEX `Cita_id_apoderado_fkey` TO `Cita_id_apoderado_idx`;

-- RenameIndex
ALTER TABLE `Cita` RENAME INDEX `Cita_id_staff_fkey` TO `Cita_id_staff_idx`;

-- RenameIndex
ALTER TABLE `ComentarioBimestral` RENAME INDEX `ComentarioBimestral_id_bimestre_fkey` TO `ComentarioBimestral_id_bimestre_idx`;

-- RenameIndex
ALTER TABLE `ComentarioBimestral` RENAME INDEX `ComentarioBimestral_id_docente_fkey` TO `ComentarioBimestral_id_docente_idx`;

-- RenameIndex
ALTER TABLE `ComentarioFoto` RENAME INDEX `ComentarioFoto_id_apoderado_fkey` TO `ComentarioFoto_id_apoderado_idx`;

-- RenameIndex
ALTER TABLE `ComentarioFoto` RENAME INDEX `ComentarioFoto_id_foto_fkey` TO `ComentarioFoto_id_foto_idx`;

-- RenameIndex
ALTER TABLE `ConceptoPago` RENAME INDEX `ConceptoPago_id_anio_fkey` TO `ConceptoPago_id_anio_idx`;

-- RenameIndex
ALTER TABLE `CronogramaPagos` RENAME INDEX `CronogramaPagos_id_concepto_fkey` TO `CronogramaPagos_id_concepto_idx`;

-- RenameIndex
ALTER TABLE `Curso` RENAME INDEX `Curso_id_area_fkey` TO `Curso_id_area_idx`;

-- RenameIndex
ALTER TABLE `EvaluacionDetalle` RENAME INDEX `EvaluacionDetalle_id_asignacion_fkey` TO `EvaluacionDetalle_id_asignacion_idx`;

-- RenameIndex
ALTER TABLE `EvaluacionDetalle` RENAME INDEX `EvaluacionDetalle_id_tipo_eval_fkey` TO `EvaluacionDetalle_id_tipo_eval_idx`;

-- RenameIndex
ALTER TABLE `EvaluacionDetalle` RENAME INDEX `EvaluacionDetalle_id_unidad_fkey` TO `EvaluacionDetalle_id_unidad_idx`;

-- RenameIndex
ALTER TABLE `Evento` RENAME INDEX `Evento_id_anio_fkey` TO `Evento_id_anio_idx`;

-- RenameIndex
ALTER TABLE `Foto` RENAME INDEX `Foto_id_album_fkey` TO `Foto_id_album_idx`;

-- RenameIndex
ALTER TABLE `Horario` RENAME INDEX `Horario_id_curso_fkey` TO `Horario_id_curso_idx`;

-- RenameIndex
ALTER TABLE `Horario` RENAME INDEX `Horario_id_docente_fkey` TO `Horario_id_docente_idx`;

-- RenameIndex
ALTER TABLE `Horario` RENAME INDEX `Horario_id_seccion_fkey` TO `Horario_id_seccion_idx`;

-- RenameIndex
ALTER TABLE `Matricula` RENAME INDEX `Matricula_id_anio_fkey` TO `Matricula_id_anio_idx`;

-- RenameIndex
ALTER TABLE `NotaAlumno` RENAME INDEX `NotaAlumno_id_evaluacion_det_fkey` TO `NotaAlumno_id_evaluacion_det_idx`;

-- RenameIndex
ALTER TABLE `Notificacion` RENAME INDEX `Notificacion_id_usuario_fkey` TO `Notificacion_id_usuario_idx`;

-- RenameIndex
ALTER TABLE `PagoTransaccion` RENAME INDEX `PagoTransaccion_id_apoderado_fkey` TO `PagoTransaccion_id_apoderado_idx`;

-- RenameIndex
ALTER TABLE `PagoTransaccion` RENAME INDEX `PagoTransaccion_id_usuario_cajero_fkey` TO `PagoTransaccion_id_usuario_cajero_idx`;

-- RenameIndex
ALTER TABLE `PlantillaEvaluacion` RENAME INDEX `PlantillaEvaluacion_id_curso_fkey` TO `PlantillaEvaluacion_id_curso_idx`;

-- RenameIndex
ALTER TABLE `PlantillaEvaluacion` RENAME INDEX `PlantillaEvaluacion_id_nivel_fkey` TO `PlantillaEvaluacion_id_nivel_idx`;

-- RenameIndex
ALTER TABLE `PlantillaEvaluacionDetalle` RENAME INDEX `PlantillaEvaluacionDetalle_id_plantilla_fkey` TO `PlantillaEvaluacionDetalle_id_plantilla_idx`;

-- RenameIndex
ALTER TABLE `PlantillaEvaluacionDetalle` RENAME INDEX `PlantillaEvaluacionDetalle_id_tipo_eval_fkey` TO `PlantillaEvaluacionDetalle_id_tipo_eval_idx`;

-- RenameIndex
ALTER TABLE `ReaccionFoto` RENAME INDEX `ReaccionFoto_id_apoderado_fkey` TO `ReaccionFoto_id_apoderado_idx`;

-- RenameIndex
ALTER TABLE `RegistroNFC` RENAME INDEX `RegistroNFC_id_estudiante_fkey` TO `RegistroNFC_id_estudiante_idx`;

-- RenameIndex
ALTER TABLE `Seccion` RENAME INDEX `Seccion_id_aula_fkey` TO `Seccion_id_aula_idx`;

-- RenameIndex
ALTER TABLE `Seccion` RENAME INDEX `Seccion_id_grado_fkey` TO `Seccion_id_grado_idx`;

-- RenameIndex
ALTER TABLE `Staff` RENAME INDEX `Staff_id_seccion_fkey` TO `Staff_id_seccion_idx`;

-- RenameIndex
ALTER TABLE `Unidad` RENAME INDEX `Unidad_id_bimestre_fkey` TO `Unidad_id_bimestre_idx`;
