# Estado del proyecto

## 1. Estados permitidos

Cada funcionalidad debe marcarse como:

- No iniciada.
- En análisis.
- En desarrollo.
- Implementada parcialmente.
- En pruebas.
- Implementada.
- Bloqueada.
- Obsoleta.

Un elemento visible en el menú no implica que esté implementado completamente.

## 2. Requisitos para marcar una funcionalidad como implementada

Debe contar con:

- Interfaz funcional.
- Backend.
- Persistencia.
- Validaciones.
- Autorización.
- Manejo de errores.
- Estados de carga.
- Diseño responsivo.
- Pruebas.
- Documentación.

## 3. Inventario inicial

| Área | Estado documental inicial |
|---|---|
| Dashboard | Requiere inventario |
| Matrícula | Implementación amplia; requiere documentación por flujo |
| Renovación individual | Requiere inventario |
| Promoción masiva | En desarrollo y pruebas |
| Notas | Requiere inventario |
| Asistencia | Requiere inventario |
| Calendario | Requiere inventario |
| Tutoría | Implementación parcial; permisos pendientes de auditoría |
| Tesorería | Implementación amplia; requiere inventario |
| Reportes | Requiere inventario |
| Configuración | Implementación amplia; requiere inventario |

## 4. Revisión periódica

Después de completar un módulo deben actualizarse:

- Estado.
- Reglas.
- Permisos.
- Endpoints.
- Pruebas.
- Deuda técnica.
- Decisiones tomadas.

## 5. Decisiones arquitectónicas

Debe crearse un ADR cuando una decisión afecte:

- Arquitectura.
- Multi-tenancy.
- Seguridad.
- Roles.
- Diseño global.
- Base de datos.
- Auditoría.
- Almacenamiento.
- Procesos masivos.
- Despliegue.
- Librerías principales.

## 6. Infraestructura transversal de diálogos

La corrección de teclado anidado de AccessibleDialog está implementada y
validada con Playwright sobre componentes reales en una fixture aislada.
No implica una certificación de todos los consumidores ni de sus operaciones
de negocio. [Pruebas y límites](registro-cambios/2026-09-05-accessible-dialog-teclado-anidado.md).
