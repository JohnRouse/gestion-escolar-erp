/*
  Warnings:

  - A unique constraint covering the columns `[id_matricula,id_concepto]` on the table `CronogramaPagos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `CronogramaPagos_id_matricula_id_concepto_key` ON `CronogramaPagos`(`id_matricula`, `id_concepto`);
