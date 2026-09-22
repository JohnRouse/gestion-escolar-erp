-- Comunicados V1 incorpora el año lectivo como contexto explícito. La columna
-- permanece nullable únicamente para compatibilidad con registros históricos;
-- no se realiza backfill ni se modifican filas existentes.
ALTER TABLE `Circular`
    ADD COLUMN `id_anio` INTEGER NULL;

CREATE INDEX `Circular_id_anio_idx` ON `Circular`(`id_anio`);

ALTER TABLE `Circular`
    ADD CONSTRAINT `Circular_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE RESTRICT ON UPDATE CASCADE;
