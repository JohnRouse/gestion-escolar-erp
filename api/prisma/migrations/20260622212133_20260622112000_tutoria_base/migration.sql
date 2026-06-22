/*
  Warnings:

  - You are about to drop the column `id_usuario_registro` on the `ComentarioBimestral` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `ComentarioBimestral` table. All the data in the column will be lost.
  - You are about to drop the `CalificacionTutoria` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CriterioTutoria` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `id_docente` on table `ComentarioBimestral` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `CalificacionTutoria` DROP FOREIGN KEY `CalificacionTutoria_id_bimestre_fkey`;

-- DropForeignKey
ALTER TABLE `CalificacionTutoria` DROP FOREIGN KEY `CalificacionTutoria_id_criterio_fkey`;

-- DropForeignKey
ALTER TABLE `CalificacionTutoria` DROP FOREIGN KEY `CalificacionTutoria_id_matricula_fkey`;

-- DropForeignKey
ALTER TABLE `CalificacionTutoria` DROP FOREIGN KEY `CalificacionTutoria_id_usuario_registro_fkey`;

-- DropForeignKey
ALTER TABLE `ComentarioBimestral` DROP FOREIGN KEY `ComentarioBimestral_id_docente_fkey`;

-- DropForeignKey
ALTER TABLE `ComentarioBimestral` DROP FOREIGN KEY `ComentarioBimestral_id_usuario_registro_fkey`;

-- DropForeignKey
ALTER TABLE `CriterioTutoria` DROP FOREIGN KEY `CriterioTutoria_id_colegio_fkey`;

-- DropForeignKey
ALTER TABLE `CriterioTutoria` DROP FOREIGN KEY `CriterioTutoria_id_tenant_fkey`;

-- DropIndex
DROP INDEX `ComentarioBimestral_id_usuario_registro_idx` ON `ComentarioBimestral`;

-- AlterTable
ALTER TABLE `ComentarioBimestral` DROP COLUMN `id_usuario_registro`,
    DROP COLUMN `updated_at`,
    MODIFY `id_docente` INTEGER NOT NULL;

-- DropTable
DROP TABLE `CalificacionTutoria`;

-- DropTable
DROP TABLE `CriterioTutoria`;

-- AddForeignKey
ALTER TABLE `ComentarioBimestral` ADD CONSTRAINT `ComentarioBimestral_id_docente_fkey` FOREIGN KEY (`id_docente`) REFERENCES `Docente`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;
