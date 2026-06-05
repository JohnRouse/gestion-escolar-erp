ALTER TABLE `CronogramaPagos`
  ADD UNIQUE INDEX `CronogramaPagos_matricula_concepto_key` (`id_matricula`, `id_concepto`);