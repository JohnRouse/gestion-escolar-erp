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
| Horario (`/calendario`) | Implementación amplia; requiere aceptación dirigida |
| Eventos (`/eventos`) | En pruebas; migración aplicada localmente, corrección final de catálogo/año/fecha validada en código y pendiente de prueba manual final |
| Comunicados (`/comunicados`) | En pruebas; contexto anual V1 implementado en código con selector, audiencia, portal y notificaciones acotados por año; migración aditiva anual preparada y no aplicada, pendiente revisión/aplicación manual y nueva aceptación humana |
| Tutoría | Implementación parcial; permisos pendientes de auditoría |
| Auth/portal de apoderados | En pruebas; canal `jwt-portal`, vínculo familiar, contratos P0 y smoke de API local aprobados; pendiente aceptación humana en navegador |
| Citas | Citas individuales y reuniones de sección en pruebas; canal externo implementado, pendiente aceptación humana del portal |
| Enfermería | En pruebas; código y migración aditiva creados, pendiente aplicación local y aceptación humana |
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
