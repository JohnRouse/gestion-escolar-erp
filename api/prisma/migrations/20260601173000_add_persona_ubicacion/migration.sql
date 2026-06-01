ALTER TABLE `Persona`
  ADD COLUMN `pais` VARCHAR(80) NULL DEFAULT 'Perú' AFTER `direccion`,
  ADD COLUMN `departamento` VARCHAR(80) NULL AFTER `pais`,
  ADD COLUMN `provincia` VARCHAR(80) NULL AFTER `departamento`,
  ADD COLUMN `distrito` VARCHAR(80) NULL AFTER `provincia`;

CREATE INDEX `Persona_distrito_idx` ON `Persona`(`distrito`);
CREATE INDEX `Persona_departamento_distrito_idx` ON `Persona`(`departamento`, `distrito`);
