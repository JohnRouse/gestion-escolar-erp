-- CreateTable
CREATE TABLE `Rol` (
    `id_rol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_rol` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `Rol_nombre_rol_key`(`nombre_rol`),
    PRIMARY KEY (`id_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Persona` (
    `id_persona` INTEGER NOT NULL AUTO_INCREMENT,
    `dni` CHAR(8) NOT NULL,
    `nombres` VARCHAR(100) NOT NULL,
    `apellido_paterno` VARCHAR(100) NOT NULL,
    `apellido_materno` VARCHAR(100) NOT NULL,
    `fecha_nacimiento` DATE NOT NULL,
    `genero` VARCHAR(1) NULL,
    `direccion` VARCHAR(255) NULL,
    `telefono` VARCHAR(20) NULL,
    `correo` VARCHAR(150) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `Persona_dni_key`(`dni`),
    UNIQUE INDEX `Persona_correo_key`(`correo`),
    PRIMARY KEY (`id_persona`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `id_persona` INTEGER NOT NULL,
    `id_rol` INTEGER NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Usuario_username_key`(`username`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Nivel` (
    `id_nivel` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_nivel` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id_nivel`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grado` (
    `id_grado` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_grado` VARCHAR(50) NOT NULL,
    `id_nivel` INTEGER NOT NULL,

    PRIMARY KEY (`id_grado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Aula` (
    `id_aula` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_aula` VARCHAR(50) NOT NULL,
    `capacidad` TINYINT NOT NULL,

    PRIMARY KEY (`id_aula`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Seccion` (
    `id_seccion` INTEGER NOT NULL AUTO_INCREMENT,
    `letra` CHAR(1) NOT NULL,
    `id_grado` INTEGER NOT NULL,
    `id_aula` INTEGER NOT NULL,

    PRIMARY KEY (`id_seccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AreaCurricular` (
    `id_area` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_area` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id_area`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Curso` (
    `id_curso` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_curso` VARCHAR(100) NOT NULL,
    `id_area` INTEGER NOT NULL,

    PRIMARY KEY (`id_curso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnioLectivo` (
    `id_anio` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_anio` VARCHAR(50) NOT NULL,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Planificación',

    PRIMARY KEY (`id_anio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bimestre` (
    `id_bimestre` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` TINYINT NOT NULL,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `id_anio` INTEGER NOT NULL,

    PRIMARY KEY (`id_bimestre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Unidad` (
    `id_unidad` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` TINYINT NOT NULL,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `id_bimestre` INTEGER NOT NULL,
    `estado_abierto` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id_unidad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Apoderado` (
    `id_persona` INTEGER NOT NULL,
    `ocupacion` VARCHAR(100) NULL,

    PRIMARY KEY (`id_persona`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Docente` (
    `id_persona` INTEGER NOT NULL,
    `fecha_ingreso` DATE NULL,

    PRIMARY KEY (`id_persona`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estudiante` (
    `id_persona` INTEGER NOT NULL,
    `codigo_estudiante` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `Estudiante_codigo_estudiante_key`(`codigo_estudiante`),
    PRIMARY KEY (`id_persona`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApoderadoEstudiante` (
    `id_apoderado` INTEGER NOT NULL,
    `id_estudiante` INTEGER NOT NULL,
    `parentesco` VARCHAR(30) NOT NULL,

    INDEX `ApoderadoEstudiante_id_estudiante_idx`(`id_estudiante`),
    PRIMARY KEY (`id_apoderado`, `id_estudiante`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocenteEspecialidad` (
    `id_docente` INTEGER NOT NULL,
    `id_area` INTEGER NOT NULL,

    PRIMARY KEY (`id_docente`, `id_area`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Matricula` (
    `id_matricula` INTEGER NOT NULL AUTO_INCREMENT,
    `id_estudiante` INTEGER NOT NULL,
    `id_seccion` INTEGER NOT NULL,
    `id_anio` INTEGER NOT NULL,
    `fecha_matricula` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado_matricula` VARCHAR(20) NOT NULL DEFAULT 'Activo',

    INDEX `Matricula_id_estudiante_id_anio_idx`(`id_estudiante`, `id_anio`),
    INDEX `Matricula_id_seccion_idx`(`id_seccion`),
    PRIMARY KEY (`id_matricula`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AsignacionDocente` (
    `id_asignacion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_docente` INTEGER NOT NULL,
    `id_curso` INTEGER NOT NULL,
    `id_seccion` INTEGER NOT NULL,
    `id_anio` INTEGER NOT NULL,

    INDEX `AsignacionDocente_id_docente_id_anio_idx`(`id_docente`, `id_anio`),
    PRIMARY KEY (`id_asignacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipoEvaluacion` (
    `id_tipo_eval` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_tipo` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id_tipo_eval`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EvaluacionDetalle` (
    `id_evaluacion_det` INTEGER NOT NULL AUTO_INCREMENT,
    `id_asignacion` INTEGER NOT NULL,
    `id_unidad` INTEGER NOT NULL,
    `id_tipo_eval` INTEGER NOT NULL,
    `descripcion_actividad` VARCHAR(100) NULL,
    `fecha_evaluacion` DATE NULL,

    PRIMARY KEY (`id_evaluacion_det`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscalaCalificacion` (
    `id_escala` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_escala` VARCHAR(50) NOT NULL,
    `nota_minima` DECIMAL(4, 2) NOT NULL,
    `nota_maxima` DECIMAL(4, 2) NOT NULL,
    `nota_aprobatoria` DECIMAL(4, 2) NOT NULL,
    `tipo_calificacion` VARCHAR(20) NOT NULL DEFAULT 'Numérica',

    PRIMARY KEY (`id_escala`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotaAlumno` (
    `id_nota` INTEGER NOT NULL AUTO_INCREMENT,
    `id_matricula` INTEGER NOT NULL,
    `id_evaluacion_det` INTEGER NOT NULL,
    `valor_nota` DECIMAL(4, 2) NOT NULL,
    `comentario` TEXT NULL,

    INDEX `NotaAlumno_id_matricula_idx`(`id_matricula`),
    PRIMARY KEY (`id_nota`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Asistencia` (
    `id_asistencia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_matricula` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `estado` VARCHAR(20) NOT NULL,

    INDEX `Asistencia_fecha_idx`(`fecha`),
    UNIQUE INDEX `Asistencia_id_matricula_fecha_key`(`id_matricula`, `fecha`),
    PRIMARY KEY (`id_asistencia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConceptoPago` (
    `id_concepto` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_concepto` VARCHAR(100) NOT NULL,
    `monto_base` DECIMAL(10, 2) NOT NULL,
    `id_anio` INTEGER NOT NULL,
    `es_pension` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id_concepto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CronogramaPagos` (
    `id_cronograma` INTEGER NOT NULL AUTO_INCREMENT,
    `id_matricula` INTEGER NOT NULL,
    `id_concepto` INTEGER NOT NULL,
    `fecha_vencimiento` DATE NOT NULL,
    `estado_pago` VARCHAR(20) NOT NULL DEFAULT 'Pendiente',

    INDEX `CronogramaPagos_fecha_vencimiento_estado_pago_idx`(`fecha_vencimiento`, `estado_pago`),
    PRIMARY KEY (`id_cronograma`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PagoTransaccion` (
    `id_transaccion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cronograma` INTEGER NOT NULL,
    `id_apoderado` INTEGER NOT NULL,
    `id_usuario_cajero` INTEGER NOT NULL,
    `monto_pagado` DECIMAL(10, 2) NOT NULL,
    `fecha_pago` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metodo_pago` VARCHAR(20) NULL,
    `nro_operacion` VARCHAR(50) NULL,

    INDEX `PagoTransaccion_id_cronograma_idx`(`id_cronograma`),
    PRIMARY KEY (`id_transaccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Circular` (
    `id_circular` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(150) NOT NULL,
    `contenido` TEXT NOT NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `remitente_id_usuario` INTEGER NOT NULL,

    INDEX `Circular_fecha_creacion_idx`(`fecha_creacion`),
    PRIMARY KEY (`id_circular`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CircularDestinatario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_circular` INTEGER NOT NULL,
    `id_nivel` INTEGER NULL,
    `id_seccion` INTEGER NULL,

    UNIQUE INDEX `CircularDestinatario_id_circular_id_nivel_id_seccion_key`(`id_circular`, `id_nivel`, `id_seccion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_id_persona_fkey` FOREIGN KEY (`id_persona`) REFERENCES `Persona`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_id_rol_fkey` FOREIGN KEY (`id_rol`) REFERENCES `Rol`(`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grado` ADD CONSTRAINT `Grado_id_nivel_fkey` FOREIGN KEY (`id_nivel`) REFERENCES `Nivel`(`id_nivel`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seccion` ADD CONSTRAINT `Seccion_id_grado_fkey` FOREIGN KEY (`id_grado`) REFERENCES `Grado`(`id_grado`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seccion` ADD CONSTRAINT `Seccion_id_aula_fkey` FOREIGN KEY (`id_aula`) REFERENCES `Aula`(`id_aula`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Curso` ADD CONSTRAINT `Curso_id_area_fkey` FOREIGN KEY (`id_area`) REFERENCES `AreaCurricular`(`id_area`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bimestre` ADD CONSTRAINT `Bimestre_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Unidad` ADD CONSTRAINT `Unidad_id_bimestre_fkey` FOREIGN KEY (`id_bimestre`) REFERENCES `Bimestre`(`id_bimestre`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Apoderado` ADD CONSTRAINT `Apoderado_id_persona_fkey` FOREIGN KEY (`id_persona`) REFERENCES `Persona`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Docente` ADD CONSTRAINT `Docente_id_persona_fkey` FOREIGN KEY (`id_persona`) REFERENCES `Persona`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Estudiante` ADD CONSTRAINT `Estudiante_id_persona_fkey` FOREIGN KEY (`id_persona`) REFERENCES `Persona`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApoderadoEstudiante` ADD CONSTRAINT `ApoderadoEstudiante_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApoderadoEstudiante` ADD CONSTRAINT `ApoderadoEstudiante_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocenteEspecialidad` ADD CONSTRAINT `DocenteEspecialidad_id_docente_fkey` FOREIGN KEY (`id_docente`) REFERENCES `Docente`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocenteEspecialidad` ADD CONSTRAINT `DocenteEspecialidad_id_area_fkey` FOREIGN KEY (`id_area`) REFERENCES `AreaCurricular`(`id_area`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `Estudiante`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsignacionDocente` ADD CONSTRAINT `AsignacionDocente_id_docente_fkey` FOREIGN KEY (`id_docente`) REFERENCES `Docente`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsignacionDocente` ADD CONSTRAINT `AsignacionDocente_id_curso_fkey` FOREIGN KEY (`id_curso`) REFERENCES `Curso`(`id_curso`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsignacionDocente` ADD CONSTRAINT `AsignacionDocente_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsignacionDocente` ADD CONSTRAINT `AsignacionDocente_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluacionDetalle` ADD CONSTRAINT `EvaluacionDetalle_id_asignacion_fkey` FOREIGN KEY (`id_asignacion`) REFERENCES `AsignacionDocente`(`id_asignacion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluacionDetalle` ADD CONSTRAINT `EvaluacionDetalle_id_unidad_fkey` FOREIGN KEY (`id_unidad`) REFERENCES `Unidad`(`id_unidad`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluacionDetalle` ADD CONSTRAINT `EvaluacionDetalle_id_tipo_eval_fkey` FOREIGN KEY (`id_tipo_eval`) REFERENCES `TipoEvaluacion`(`id_tipo_eval`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotaAlumno` ADD CONSTRAINT `NotaAlumno_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotaAlumno` ADD CONSTRAINT `NotaAlumno_id_evaluacion_det_fkey` FOREIGN KEY (`id_evaluacion_det`) REFERENCES `EvaluacionDetalle`(`id_evaluacion_det`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConceptoPago` ADD CONSTRAINT `ConceptoPago_id_anio_fkey` FOREIGN KEY (`id_anio`) REFERENCES `AnioLectivo`(`id_anio`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaPagos` ADD CONSTRAINT `CronogramaPagos_id_matricula_fkey` FOREIGN KEY (`id_matricula`) REFERENCES `Matricula`(`id_matricula`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaPagos` ADD CONSTRAINT `CronogramaPagos_id_concepto_fkey` FOREIGN KEY (`id_concepto`) REFERENCES `ConceptoPago`(`id_concepto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoTransaccion` ADD CONSTRAINT `PagoTransaccion_id_cronograma_fkey` FOREIGN KEY (`id_cronograma`) REFERENCES `CronogramaPagos`(`id_cronograma`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoTransaccion` ADD CONSTRAINT `PagoTransaccion_id_apoderado_fkey` FOREIGN KEY (`id_apoderado`) REFERENCES `Apoderado`(`id_persona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoTransaccion` ADD CONSTRAINT `PagoTransaccion_id_usuario_cajero_fkey` FOREIGN KEY (`id_usuario_cajero`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Circular` ADD CONSTRAINT `Circular_remitente_id_usuario_fkey` FOREIGN KEY (`remitente_id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CircularDestinatario` ADD CONSTRAINT `CircularDestinatario_id_circular_fkey` FOREIGN KEY (`id_circular`) REFERENCES `Circular`(`id_circular`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CircularDestinatario` ADD CONSTRAINT `CircularDestinatario_id_nivel_fkey` FOREIGN KEY (`id_nivel`) REFERENCES `Nivel`(`id_nivel`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CircularDestinatario` ADD CONSTRAINT `CircularDestinatario_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `Seccion`(`id_seccion`) ON DELETE SET NULL ON UPDATE CASCADE;
