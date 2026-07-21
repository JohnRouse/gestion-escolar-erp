# Metodología de la auditoría integral

## Objetivo

Revisar el repositorio real antes de redactar el manual definitivo de Gestión Escolar ERP.

La auditoría evita:

- Documentar funciones inexistentes.
- Confundir ideas antiguas con implementaciones actuales.
- Omitir módulos presentes en el código.
- Perder reglas que solo quedaron en conversaciones.
- Declarar como finalizado un flujo incompleto.

## Fuentes que se revisarán

1. Navegación y rutas del frontend.
2. Páginas y componentes.
3. Controladores y servicios del backend.
4. DTO y validaciones.
5. Guards, roles y permisos.
6. Esquema Prisma y migraciones.
7. Archivos de configuración.
8. Documentación existente.
9. Historial de commits y pull requests relevantes.
10. Pruebas funcionales realizadas.

## Estados documentales

Cada función debe clasificarse como:

- Implementada y comprobada.
- Implementada parcialmente.
- En pruebas.
- Proyectada.
- Pendiente de decisión.
- Obsoleta.
- Documento antiguo pendiente de verificación.

## Orden de documentación

### Fase 1

- Forma de entrega de bloques.
- Uso de Bash y Python.
- Respaldos.
- Validaciones.
- Git y pull requests.

### Fase 2

- Tokens visuales.
- Campos y botones.
- Animaciones.
- Responsive.
- Accesibilidad.

### Fase 3

- Arquitectura.
- Roles.
- Alcance institucional.
- Dashboard y navegación.

### Fase 4

- Todos los módulos y submódulos.

### Fase 5

- Escenarios transversales.
- Operación técnica.
- Manual unificado para impresión.

## Regla de verificación

El código actual es la fuente para determinar qué está implementado.

La visión del producto es la fuente para determinar hacia dónde debe evolucionar.

Ambas deben documentarse por separado.
