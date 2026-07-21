# Visión y arquitectura del producto

## 1. Descripción

Gestión Escolar ERP es una plataforma SaaS de gestión educativa multi-tenant.

Debe permitir administrar:

- Una institución educativa independiente.
- Varias instituciones pertenecientes al mismo grupo.
- Colegios.
- Academias.
- Institutos.
- Otros centros educativos con procesos equivalentes.

Cada organización contratante representa un tenant.

Un tenant puede contener una o varias instituciones. Cada institución conserva su propia información académica, administrativa, financiera y de configuración.

Los usuarios autorizados pueden acceder a información consolidada del tenant.

## 2. Estado del modelo institucional

### Visión objetivo

El producto debe manejar un concepto general de institución educativa.

Los tipos previstos incluyen:

- Colegio.
- Academia.
- Instituto.
- Centro educativo equivalente.

### Implementación actual

El modelo principal existente utiliza la entidad `Colegio`.

No se deben renombrar tablas o relaciones de forma aislada.

La evolución de `Colegio` hacia una entidad general `Institución` requiere:

- Análisis.
- ADR.
- Migración.
- Actualización de relaciones.
- Pruebas.
- Compatibilidad con datos históricos.

## 3. Objetivos

El sistema debe:

- Centralizar la gestión académica.
- Centralizar la gestión administrativa.
- Centralizar la gestión financiera.
- Administrar varias instituciones desde una misma cuenta.
- Mantener separación entre tenants.
- Permitir consultas consolidadas autorizadas.
- Reducir procesos manuales.
- Ser comprensible para usuarios no técnicos.
- Conservar trazabilidad.
- Permitir crecimiento modular.

## 4. Atributos de calidad

### Escalabilidad

Debe soportar el crecimiento de:

- Tenants.
- Instituciones.
- Usuarios.
- Estudiantes.
- Matrículas.
- Registros académicos.
- Operaciones financieras.
- Archivos.
- Consultas.
- Reportes.

### Trazabilidad

Las operaciones importantes deben identificar:

- Usuario.
- Tenant.
- Institución.
- Fecha y hora.
- Acción.
- Registro afectado.
- Valor anterior.
- Valor posterior.
- Motivo.

### Mantenibilidad

El código debe separar:

- Presentación.
- Lógica de negocio.
- Validación.
- Autorización.
- Persistencia.
- Integraciones.

Las reglas no deben duplicarse entre controladores, servicios y pantallas.

### Seguridad

Toda operación debe validar:

- Autenticación.
- Tenant.
- Institución.
- Rol.
- Permiso.
- Estado activo del usuario.
- Estado activo de la institución.
- Pertenencia del recurso solicitado.

### Rendimiento

Las consultas extensas deben utilizar:

- Filtros en la base de datos.
- Paginación.
- Ordenamiento.
- Índices.
- Selección de campos necesarios.
- Carga progresiva cuando corresponda.

### Disponibilidad

La solución debe permitir recuperación ante:

- Fallos de aplicación.
- Errores de despliegue.
- Fallos de base de datos.
- Eliminaciones accidentales.
- Errores de configuración.

## 5. Tecnología

### Frontend

- React.
- TypeScript.
- Vite.
- React Router.
- Axios.
- Tailwind CSS.
- Lucide React.

### Backend

- NestJS.
- TypeScript.
- Prisma ORM.
- MySQL.
- JWT.
- Passport.
- Bcrypt.
- Class Validator.

### Infraestructura prevista

- Google Cloud Workstations para desarrollo.
- Google Cloud SQL para base de datos.
- Google Cloud Run para despliegue.
- Google Cloud Storage para archivos.

Los secretos, credenciales y archivos privados no deben almacenarse en GitHub.

## 6. Módulos identificados

### Principal

- Dashboard.

### Gestión académica

- Registro de matrícula.
- Renovación individual.
- Promoción masiva.
- Historial de matrículas.
- Registro de notas.
- Asistencia.
- Calendario.
- Horario.
- Tutoría.

### Comunidad escolar

- Alumnos.
- Apoderados.

### Personal

- Docentes.
- Staff.
- Citas.

### Bienestar

- Enfermería.

### Comunicación

- Circulares.
- Notificaciones.

### Finanzas

- Centro de pagos.
- Agenda de cobranzas.
- Estado de cuenta.
- Validación de pagos.
- Pagos recibidos.
- Configuración de pensiones.
- Pagos extraordinarios.
- Datos para cobrar.

### Reportes

- Panel general.
- Asistencia global.
- Reportes académicos.
- Reportes administrativos.
- Reportes financieros.

### Configuración

- Instituciones.
- Años lectivos.
- Niveles.
- Grados.
- Secciones.
- Cursos.
- Áreas curriculares.
- Escalas de calificación.
- Tipos de evaluación.
- Plantillas.
- Conceptos de pago.
- Usuarios.
- Roles.
- Permisos.

## 7. Principio de simplicidad

El ERP debe diseñarse para personas que pueden tener cero conocimiento de sistemas.

El usuario no debe necesitar conocer conceptos técnicos para completar una tarea cotidiana.
