# Multi-tenant, roles y seguridad

## 1. Tenant

El tenant representa a la organización contratante.

Ejemplos:

- Grupo educativo.
- Colegio independiente.
- Grupo de academias.
- Instituto.

## 2. Instituciones

Un tenant puede contener una o varias instituciones.

Cada institución mantiene:

- Configuración.
- Años lectivos.
- Estructura académica.
- Matrículas.
- Personal.
- Operaciones financieras.
- Archivos.
- Historial.

## 3. Alcance activo

El alcance puede ser:

- Todos los colegios.
- Un colegio específico.

Toda consulta debe respetar el alcance activo.

El alcance visual no reemplaza la autorización del backend.

## 4. Aislamiento

Un usuario no puede consultar ni modificar datos de otro tenant.

Las relaciones entre registros deben validar:

- Tenant.
- Institución.
- Permiso.
- Pertenencia.
- Estado activo.

## 5. Asociación de usuarios

Un usuario puede:

- Pertenecer a uno o varios tenants.
- Acceder a uno o varios colegios.
- Tener roles diferentes según la institución.
- Tener un colegio principal.
- Estar activo o inactivo en cada contexto.

## 6. Roles actuales

### Superadministrador SaaS

Administra:

- Tenants.
- Planes.
- Suscripciones.
- Configuración global.
- Soporte.
- Operaciones de plataforma.

### Administrador

Administra la configuración y operación de las instituciones autorizadas.

### Director

Supervisa información académica, administrativa y de reportes.

### Secretaría

Gestiona principalmente:

- Matrículas.
- Estudiantes.
- Apoderados.
- Calendario.
- Circulares.
- Citas.
- Operaciones administrativas.
- Operaciones financieras autorizadas.

### Docente o profesor

Accede a información asociada a sus asignaciones.

Puede utilizar, según corresponda:

- Notas.
- Asistencia.
- Horario.
- Tutoría cuando sea tutor.

### Apoderado

Consulta únicamente información de estudiantes con los que mantiene una relación válida.

## 7. Acciones de autorización

Los permisos deben evaluarse por acción:

- Ver.
- Crear.
- Editar.
- Anular.
- Eliminar cuando esté permitido.
- Aprobar.
- Cerrar.
- Reabrir.
- Exportar.
- Administrar configuración.

## 8. Regla de backend

El frontend puede ocultar opciones no autorizadas.

El backend siempre debe volver a validar el permiso.

Un usuario no debe obtener acceso modificando una URL o enviando directamente una solicitud a la API.

## 9. Tutoría

Pueden acceder al módulo de Tutoría:

- Tutor asignado a la sección.
- Administrador autorizado.
- Director autorizado.

Un docente sin asignación de tutor no debe acceder únicamente por tener el rol de profesor.

## 10. Auditoría

Las operaciones sensibles deben registrar:

- Usuario.
- Tenant.
- Institución.
- Fecha.
- Acción.
- Registro.
- Valor anterior.
- Valor posterior.
- Motivo.
