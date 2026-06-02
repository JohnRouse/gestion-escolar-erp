CREATE TABLE `EstudianteCodigoColegio` (
  `id_estudiante` INT NOT NULL,
  `id_colegio` INT NOT NULL,
  `codigo` VARCHAR(30) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id_estudiante`, `id_colegio`),
  UNIQUE KEY `EstudianteCodigoColegio_id_colegio_codigo_key` (`id_colegio`, `codigo`),
  KEY `EstudianteCodigoColegio_codigo_idx` (`codigo`),

  CONSTRAINT `EstudianteCodigoColegio_id_estudiante_fkey`
    FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante`(`id_persona`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `EstudianteCodigoColegio_id_colegio_fkey`
    FOREIGN KEY (`id_colegio`) REFERENCES `Colegio`(`id_colegio`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
