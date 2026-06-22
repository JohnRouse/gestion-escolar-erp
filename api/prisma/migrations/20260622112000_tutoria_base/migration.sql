-- Tutoría y libreta: criterios, calificaciones y comentarios por usuario.

ALTER TABLE `ComentarioBimestral`
  MODIFY `id_docente` INTEGER NULL;

ALTER TABLE `ComentarioBimestral`
  ADD COLUMN `id_usuario_registro` INTEGER NULL,
  ADD COLUMN `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0);

CREATE INDEX `ComentarioBimestral_id_usuario_registro_idx`
  ON `ComentarioBimestral`(`id_usuario_registro`);

ALTER TABLE `ComentarioBimestral`
  ADD CONSTRAINT `ComentarioBimestral_id_usuario_registro_fkey`
  FOREIGN KEY (`id_usuario_registro`) REFERENCES `Usuario`(`id_usuario`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `CriterioTutoria` (
  `id_criterio` INTEGER NOT NULL AUTO_INCREMENT,
  `id_tenant` INTEGER NULL,
  `id_colegio` INTEGER NULL,
  `tipo` VARCHAR(40) NOT NULL,
  `descripcion` VARCHAR(250) NOT NULL,
  `orden` INTEGER NOT NULL DEFAULT 1,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_criterio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `CriterioTutoria_id_tenant_idx` ON `CriterioTutoria`(`id_tenant`);
CREATE INDEX `CriterioTutoria_id_colegio_idx` ON `CriterioTutoria`(`id_colegio`);
CREATE INDEX `CriterioTutoria_tipo_idx` ON `CriterioTutoria`(`tipo`);
CREATE INDEX `CriterioTutoria_activo_idx` ON `CriterioTutoria`(`activo`);

ALTER TABLE `CriterioTutoria`
  ADD CONSTRAINT `CriterioTutoria_id_tenant_fkey`
  FOREIGN KEY (`id_tenant`) REFERENCES `Tenant`(`id_tenant`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CriterioTutoria`
  ADD CONSTRAINT `CriterioTutoria_id_colegio_fkey`
  FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`)
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `CalificacionTutoria` (
  `id_calificacion_tutoria` INTEGER NOT NULL AUTO_INCREMENT,
  `id_matricula` INTEGER NOT NULL,
  `id_bimestre` INTEGER NOT NULL,
  `id_criterio` INTEGER NOT NULL,
  `valor` VARCHAR(5) NULL,
  `observacion` VARCHAR(500) NULL,
  `id_usuario_registro` INTEGER NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `uq_calificacion_tutoria`(`id_matricula`, `id_bimestre`, `id_criterio`),
  PRIMARY KEY (`id_calificacion_tutoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `CalificacionTutoria_id_matricula_idx` ON `CalificacionTutoria`(`id_matricula`);
CREATE INDEX `CalificacionTutoria_id_bimestre_idx` ON `CalificacionTutoria`(`id_bimestre`);
CREATE INDEX `CalificacionTutoria_id_criterio_idx` ON `CalificacionTutoria`(`id_criterio`);
CREATE INDEX `CalificacionTutoria_id_usuario_registro_idx` ON `CalificacionTutoria`(`id_usuario_registro`);

ALTER TABLE `CalificacionTutoria`
  ADD CONSTRAINT `CalificacionTutoria_id_matricula_fkey`
  FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CalificacionTutoria`
  ADD CONSTRAINT `CalificacionTutoria_id_bimestre_fkey`
  FOREIGN KEY (`id_bimestre`) REFERENCES `Bimestre`(`id_bimestre`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CalificacionTutoria`
  ADD CONSTRAINT `CalificacionTutoria_id_criterio_fkey`
  FOREIGN KEY (`id_criterio`) REFERENCES `CriterioTutoria`(`id_criterio`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CalificacionTutoria`
  ADD CONSTRAINT `CalificacionTutoria_id_usuario_registro_fkey`
  FOREIGN KEY (`id_usuario_registro`) REFERENCES `Usuario`(`id_usuario`)
  ON DELETE SET NULL ON UPDATE CASCADE;
