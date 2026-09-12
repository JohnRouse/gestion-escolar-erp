# Alta y edición de Staff con identidad institucional

Actores: Admin/Director con UsuarioTenant y UsuarioColegio activos y rol
institucional de gestión. Situación: hay un colegio autorizado y una Persona
nueva o reutilizable. Flujo implementado: seleccionar alcance, comprobar DNI,
elegir destino, completar datos institucionales y opcionalmente dar acceso al ERP,
guardar y editar. [Contrato completo](../modulos/staff.md).

| Situación | Resultado esperado |
|---|---|
| Consolidado con destino autorizado | Crea solo en el colegio elegido |
| Sin destino o contexto ambiguo | 400, no persiste |
| Profesor/Secretaría por URL/API | Ruta protegida / API 403 |
| Tenant ajeno o colegio sin membresía activa | Rechazo, sin alta |
| ID Staff de otra institución | 404 sin revelar datos |
| Alta con Persona existente reutilizable | Conserva identidad durante la vinculación; no duplica DNI |
| Edición de Persona por Admin/Director autorizado | Actualiza una sola Persona canónica y los módulos vinculados leen la corrección |
| Persona vinculada a otro tenant o colegio no administrado | 403 con mensaje explícito; no modifica la identidad global |
| Corrección de DNI | Exige ocho dígitos, comprueba unicidad y audita anterior/nuevo |
| Persona nueva con domicilio | Persiste dirección, departamento, provincia y distrito en Persona sin esquema nuevo |
| Persona solo Docente o Tutor | No aparece en Staff por esa función académica |
| Docente que además asume un cargo institucional | Reutiliza Persona y aparece en ambos dominios con funciones separadas |
| Registro técnico legacy de Tutoría | Staff no lo lista ni permite editarlo; Docentes/dominio académico conserva la tutoría |
| Usuario existente | Asocia sin cambiar contraseña/rol global |
| Edición rutinaria sin motivo libre | Guarda y emite motivo automático en StaffAudit |
| Dar acceso al ERP sin motivo | 400, no persiste ninguna entidad |
| Asociación inicial de cuenta o membresía inactiva | Bloquea; no reactiva implícitamente |
| Username de cuenta existente | Normaliza a minúsculas; un duplicado produce 409 |
| Cambio de rol | Exige motivo; sincroniza cuenta y membresías del tenant solo con alcance completo |
| Director intenta elevar a Admin | 403, sin cambios |
| Director intenta operar una cuenta Admin | 403, sin cambios |
| Restablecer contraseña | Nueva clave y confirmación; bcrypt; auditoría sin clave ni hash |
| Desactivar/activar acceso | Exige motivo y solo actúa dentro de la autoridad institucional comprobada |
| Falla después de escribir membresías | Rollback de las cinco entidades |
| DNI duplicado concurrente | Una alta; conflicto recuperable en la otra |
| Cambiar disponibilidad de citas | Conserva Persona y campos académicos legacy sin mostrarlos ni administrarlos |

Errores aparecen en el formulario y Toast; permiten corregir/reintentar. El
éxito emite StaffAudit con motivo automático en cambios rutinarios o explícito
para acceso/rol, además de antes/después. Revertir datos se hace mediante edición
autorizada; no hay eliminación de Staff.
