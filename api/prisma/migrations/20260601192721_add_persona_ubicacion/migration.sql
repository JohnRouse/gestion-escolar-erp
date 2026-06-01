/*
  Warnings:

  - You are about to drop the column `created_at` on the `Persona` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Persona` DROP COLUMN `created_at`,
    MODIFY `dni` VARCHAR(8) NOT NULL,
    MODIFY `fecha_nacimiento` DATETIME(3) NOT NULL;
