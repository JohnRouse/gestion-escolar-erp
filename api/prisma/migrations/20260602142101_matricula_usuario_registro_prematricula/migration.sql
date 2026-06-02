/*
  Warnings:

  - You are about to drop the column `id_usuario_registro` on the `Matricula` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Matricula` DROP FOREIGN KEY `Matricula_id_usuario_registro_fkey`;

-- DropIndex
DROP INDEX `Matricula_id_usuario_registro_idx` ON `Matricula`;

-- AlterTable
ALTER TABLE `Matricula` DROP COLUMN `id_usuario_registro`,
    MODIFY `estado_matricula` VARCHAR(20) NOT NULL DEFAULT 'Activo';

-- AlterTable
ALTER TABLE `Persona` MODIFY `pais` VARCHAR(80) NULL DEFAULT 'Peru';
