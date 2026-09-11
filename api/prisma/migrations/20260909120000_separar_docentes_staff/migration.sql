-- Agrega una clasificación explícita sin inferirla desde cargo ni Tutoría.
-- MySQL asigna true a los registros existentes: no se reclasifican datos
-- históricos ambiguos ni se oculta personal institucional legítimo.
ALTER TABLE `Staff`
    ADD COLUMN `es_miembro_staff` BOOLEAN NOT NULL DEFAULT true;
