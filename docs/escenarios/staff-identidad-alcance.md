# Alta y edición de Staff con identidad institucional

Actores: Admin/Director con UsuarioTenant y UsuarioColegio activos y rol
institucional de gestión. Situación: hay un colegio autorizado y una Persona
nueva o reutilizable. Flujo implementado: seleccionar alcance, comprobar DNI,
elegir destino, completar datos institucionales y opcionalmente credenciales,
guardar y editar. [Contrato completo](../modulos/staff.md).

| Situación | Resultado esperado y probado en DB aislada |
|---|---|
| Consolidado con destino autorizado | Crea solo en el colegio elegido |
| Sin destino o contexto ambiguo | 400, no persiste |
| Profesor/Secretaría por URL/API | Ruta protegida / API 403 |
| Tenant ajeno o colegio sin membresía activa | Rechazo, sin alta |
| ID Staff de otra institución | 404 sin revelar datos |
| Persona existente reutilizable | Conserva identidad; no duplica DNI |
| Usuario existente | Asocia sin cambiar contraseña/rol global |
| Cuenta o membresía inactiva | Bloquea, no reactiva |
| Falla después de escribir membresías | Rollback de las cinco entidades |
| DNI duplicado concurrente | Una alta; conflicto recuperable en la otra |
| Cambiar disponibilidad de citas | Conserva sección, tutor y Persona |

Errores aparecen en el formulario y Toast; permiten corregir/reintentar. El
éxito emite StaffAudit con motivo y antes/después. Revertir datos se hace mediante
edición autorizada con un nuevo motivo; no hay eliminación de Staff.
