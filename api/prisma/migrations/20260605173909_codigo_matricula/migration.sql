/*
  Warnings:

  - A unique constraint covering the columns `[codigo_matricula]` on the table `Matricula` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Matricula` ADD COLUMN `codigo_matricula` VARCHAR(40) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Matricula_codigo_matricula_key` ON `Matricula`(`codigo_matricula`);
