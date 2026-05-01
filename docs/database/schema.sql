-- =====================================================================
-- SISTEMA DE GESTIÓN ESCOLAR ERP - MODELO DE DATOS OPTIMIZADO
-- =====================================================================
CREATE DATABASE IF NOT EXISTS gestion_escolar_erp;
USE gestion_escolar_erp;

-- ==========================================================
-- 1. MÓDULO DE IDENTIDAD Y ACCESO (RBAC)
-- ==========================================================

CREATE TABLE rol (
    id_rol TINYINT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE persona (
    id_persona INT AUTO_INCREMENT PRIMARY KEY,
    dni CHAR(8) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero ENUM('M', 'F'),
    direccion VARCHAR(255),
    telefono VARCHAR(20),
    correo VARCHAR(150) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_persona INT NOT NULL,
    id_rol TINYINT NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_persona) REFERENCES persona(id_persona),
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

-- ==========================================================
-- 2. MÓDULO ACADÉMICO (ESTRUCTURA)
-- ==========================================================

CREATE TABLE nivel (
    id_nivel TINYINT AUTO_INCREMENT PRIMARY KEY,
    nombre_nivel VARCHAR(50) NOT NULL
);

CREATE TABLE grado (
    id_grado INT AUTO_INCREMENT PRIMARY KEY,
    nombre_grado VARCHAR(50) NOT NULL,
    id_nivel TINYINT NOT NULL,
    FOREIGN KEY (id_nivel) REFERENCES nivel(id_nivel)
);

CREATE TABLE aula (
    id_aula INT AUTO_INCREMENT PRIMARY KEY,
    nombre_aula VARCHAR(50) NOT NULL,
    capacidad TINYINT NOT NULL
);

CREATE TABLE seccion (
    id_seccion INT AUTO_INCREMENT PRIMARY KEY,
    letra CHAR(1) NOT NULL,
    id_grado INT NOT NULL,
    id_aula INT NOT NULL,
    FOREIGN KEY (id_grado) REFERENCES grado(id_grado),
    FOREIGN KEY (id_aula) REFERENCES aula(id_aula)
);

CREATE TABLE area_curricular (
    id_area INT AUTO_INCREMENT PRIMARY KEY,
    nombre_area VARCHAR(100) NOT NULL
);

CREATE TABLE curso (
    id_curso INT AUTO_INCREMENT PRIMARY KEY,
    nombre_curso VARCHAR(100) NOT NULL,
    id_area INT NOT NULL,
    FOREIGN KEY (id_area) REFERENCES area_curricular(id_area)
);

-- ==========================================================
-- 3. MÓDULO DE TIEMPO (AÑO, BIMESTRES, UNIDADES)
-- ==========================================================

CREATE TABLE anio_lectivo (
    id_anio INT AUTO_INCREMENT PRIMARY KEY,
    nombre_anio VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('Cerrado', 'Abierto', 'Planificación') DEFAULT 'Planificación'
);

CREATE TABLE bimestre (
    id_bimestre INT AUTO_INCREMENT PRIMARY KEY,
    numero TINYINT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    id_anio INT NOT NULL,
    FOREIGN KEY (id_anio) REFERENCES anio_lectivo(id_anio)
);

CREATE TABLE unidad (
    id_unidad INT AUTO_INCREMENT PRIMARY KEY,
    numero TINYINT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    id_bimestre INT NOT NULL,
    estado_abierto BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_bimestre) REFERENCES bimestre(id_bimestre)
);

-- ==========================================================
-- 4. ACTORES ESPECÍFICOS (HERENCIA DE PERSONA)
-- ==========================================================

CREATE TABLE apoderado (
    id_persona INT PRIMARY KEY,
    ocupacion VARCHAR(100),
    FOREIGN KEY (id_persona) REFERENCES persona(id_persona)
);

CREATE TABLE docente (
    id_persona INT PRIMARY KEY,
    fecha_ingreso DATE,
    FOREIGN KEY (id_persona) REFERENCES persona(id_persona)
);

CREATE TABLE estudiante (
    id_persona INT PRIMARY KEY,
    codigo_estudiante VARCHAR(20) UNIQUE NOT NULL,
    FOREIGN KEY (id_persona) REFERENCES persona(id_persona)
);

-- Relación N:M entre Apoderado y Estudiante
CREATE TABLE apoderado_estudiante (
    id_apoderado INT NOT NULL,
    id_estudiante INT NOT NULL,
    parentesco VARCHAR(30) NOT NULL,
    PRIMARY KEY (id_apoderado, id_estudiante),
    FOREIGN KEY (id_apoderado) REFERENCES apoderado(id_persona),
    FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_persona)
);

-- Especialidad del docente (áreas que puede enseñar)
CREATE TABLE docente_especialidad (
    id_docente INT NOT NULL,
    id_area INT NOT NULL,
    PRIMARY KEY (id_docente, id_area),
    FOREIGN KEY (id_docente) REFERENCES docente(id_persona),
    FOREIGN KEY (id_area) REFERENCES area_curricular(id_area)
);

-- ==========================================================
-- 5. MATRÍCULA
-- ==========================================================

CREATE TABLE matricula (
    id_matricula INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_seccion INT NOT NULL,
    id_anio INT NOT NULL,
    fecha_matricula DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado_matricula ENUM('Activo', 'Retirado', 'Trasladado') DEFAULT 'Activo',
    FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_persona),
    FOREIGN KEY (id_seccion) REFERENCES seccion(id_seccion),
    FOREIGN KEY (id_anio) REFERENCES anio_lectivo(id_anio)
);

-- ==========================================================
-- 6. ASIGNACIÓN DOCENTE Y EVALUACIONES
-- ==========================================================

CREATE TABLE asignacion_docente (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_docente INT NOT NULL,
    id_curso INT NOT NULL,
    id_seccion INT NOT NULL,
    id_anio INT NOT NULL,
    FOREIGN KEY (id_docente) REFERENCES docente(id_persona),
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso),
    FOREIGN KEY (id_seccion) REFERENCES seccion(id_seccion),
    FOREIGN KEY (id_anio) REFERENCES anio_lectivo(id_anio)
);

CREATE TABLE tipo_evaluacion (
    id_tipo_eval TINYINT AUTO_INCREMENT PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL
);

CREATE TABLE evaluacion_detalle (
    id_evaluacion_det INT AUTO_INCREMENT PRIMARY KEY,
    id_asignacion INT NOT NULL,
    id_unidad INT NOT NULL,
    id_tipo_eval TINYINT NOT NULL,
    descripcion_actividad VARCHAR(100),
    fecha_evaluacion DATE,
    FOREIGN KEY (id_asignacion) REFERENCES asignacion_docente(id_asignacion),
    FOREIGN KEY (id_unidad) REFERENCES unidad(id_unidad),
    FOREIGN KEY (id_tipo_eval) REFERENCES tipo_evaluacion(id_tipo_eval)
);

-- Configuración de escala de calificación
CREATE TABLE escala_calificacion (
    id_escala INT AUTO_INCREMENT PRIMARY KEY,
    nombre_escala VARCHAR(50) NOT NULL,
    nota_minima DECIMAL(4,2) NOT NULL,
    nota_maxima DECIMAL(4,2) NOT NULL,
    nota_aprobatoria DECIMAL(4,2) NOT NULL,
    tipo_calificacion ENUM('Numérica', 'Literal', 'Logro') DEFAULT 'Numérica'
);

CREATE TABLE nota_alumno (
    id_nota INT AUTO_INCREMENT PRIMARY KEY,
    id_matricula INT NOT NULL,
    id_evaluacion_det INT NOT NULL,
    valor_nota DECIMAL(4,2) NOT NULL,
    comentario TEXT,
    FOREIGN KEY (id_matricula) REFERENCES matricula(id_matricula),
    FOREIGN KEY (id_evaluacion_det) REFERENCES evaluacion_detalle(id_evaluacion_det)
);

-- ==========================================================
-- 7. ASISTENCIA
-- ==========================================================

CREATE TABLE asistencia (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_matricula INT NOT NULL,
    fecha DATE NOT NULL,
    estado ENUM('Presente', 'Ausente', 'Tardanza', 'Justificado') NOT NULL,
    FOREIGN KEY (id_matricula) REFERENCES matricula(id_matricula),
    UNIQUE KEY unique_asistencia (id_matricula, fecha)
);

-- ==========================================================
-- 8. MÓDULO ADMINISTRATIVO (PAGOS)
-- ==========================================================

CREATE TABLE concepto_pago (
    id_concepto INT AUTO_INCREMENT PRIMARY KEY,
    nombre_concepto VARCHAR(100) NOT NULL,
    monto_base DECIMAL(10,2) NOT NULL,
    id_anio INT NOT NULL,
    es_pension BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_anio) REFERENCES anio_lectivo(id_anio)
);

CREATE TABLE cronograma_pagos (
    id_cronograma INT AUTO_INCREMENT PRIMARY KEY,
    id_matricula INT NOT NULL,
    id_concepto INT NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado_pago ENUM('Pendiente', 'Pagado', 'Vencido') DEFAULT 'Pendiente',
    FOREIGN KEY (id_matricula) REFERENCES matricula(id_matricula),
    FOREIGN KEY (id_concepto) REFERENCES concepto_pago(id_concepto)
);

CREATE TABLE pago_transaccion (
    id_transaccion INT AUTO_INCREMENT PRIMARY KEY,
    id_cronograma INT NOT NULL,
    id_apoderado INT NOT NULL,
    id_usuario_cajero INT NOT NULL,
    monto_pagado DECIMAL(10,2) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('Efectivo', 'Transferencia', 'Tarjeta'),
    nro_operacion VARCHAR(50),
    FOREIGN KEY (id_cronograma) REFERENCES cronograma_pagos(id_cronograma),
    FOREIGN KEY (id_apoderado) REFERENCES apoderado(id_persona),
    FOREIGN KEY (id_usuario_cajero) REFERENCES usuario(id_usuario)
);

-- ==========================================================
-- 9. COMUNICACIONES (CIRCULARES)
-- ==========================================================

CREATE TABLE circular (
    id_circular INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    remitente_id_usuario INT NOT NULL,
    FOREIGN KEY (remitente_id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE circular_destinatario (
    id_circular INT NOT NULL,
    id_nivel TINYINT,
    id_seccion INT,
    FOREIGN KEY (id_circular) REFERENCES circular(id_circular),
    FOREIGN KEY (id_nivel) REFERENCES nivel(id_nivel),
    FOREIGN KEY (id_seccion) REFERENCES seccion(id_seccion)
);

-- ==========================================================
-- 10. ÍNDICES DE OPTIMIZACIÓN
-- ==========================================================
CREATE INDEX idx_matricula_estudiante ON matricula(id_estudiante, id_anio);
CREATE INDEX idx_matricula_seccion ON matricula(id_seccion);
CREATE INDEX idx_notas_matricula ON nota_alumno(id_matricula);
CREATE INDEX idx_cronograma_vencimiento ON cronograma_pagos(fecha_vencimiento, estado_pago);
CREATE INDEX idx_asignacion_docente_anio ON asignacion_docente(id_docente, id_anio);
CREATE INDEX idx_asistencia_fecha ON asistencia(fecha);
CREATE INDEX idx_circular_fecha ON circular(fecha_creacion);