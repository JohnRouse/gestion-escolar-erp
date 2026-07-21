# Estándares de desarrollo

## 1. Principios

El código debe favorecer:

- Claridad.
- Mantenibilidad.
- Seguridad.
- Trazabilidad.
- Reutilización.
- Pruebas.
- Compatibilidad multi-tenant.

## 2. Backend

- Los controladores reciben solicitudes y delegan.
- Los servicios contienen reglas de negocio.
- Los DTO validan entradas.
- Los guards validan autenticación y roles.
- Los servicios validan tenant, institución y permiso.
- Las respuestas no deben exponer secretos.
- Las operaciones relacionadas deben utilizar transacciones.
- Los errores deben explicar causa y solución.
- Las reglas críticas no deben depender del frontend.

## 3. Frontend

- Los componentes visuales no deben concentrar toda la lógica.
- Las llamadas a API deben organizarse por responsabilidad.
- Los estados de carga, vacío y error son obligatorios.
- Los permisos visuales deben derivarse de una fuente central.
- El selector institucional es la fuente del alcance activo.
- No se deben codificar nombres de instituciones o años.
- Se deben reutilizar componentes compartidos.
- Los componentes extensos deben dividirse.

## 4. Base de datos

- Toda relación debe respetar el tenant.
- Las reglas reales deben reflejarse mediante restricciones cuando corresponda.
- Las consultas frecuentes deben contar con índices.
- Los cambios de esquema deben utilizar migraciones.
- No deben editarse migraciones aplicadas.
- La información histórica no debe sobrescribirse.
- Las anulaciones deben conservar evidencia.

## 5. Rendimiento

- Filtrar en la base de datos.
- Paginar.
- Evitar consultas repetitivas.
- Seleccionar únicamente campos necesarios.
- Evitar cargar listas completas.
- Utilizar carga progresiva.

## 6. Respaldos y pruebas

Antes de cambios sensibles:

- Crear respaldo de código.
- Crear respaldo de datos cuando corresponda.
- Probar en un entorno aislado.
- Verificar que la base original no fue modificada.

## 7. Validación obligatoria

Antes de commit:

    git diff --check
    npm run build
    git status --short
    git diff --stat

También deben ejecutarse las pruebas específicas del módulo.

## 8. Documentación

Una regla nueva debe documentarse dentro del mismo cambio.

Los comentarios de código no reemplazan la documentación funcional.

## 9. Secretos

No deben almacenarse en GitHub:

- Archivos `.env`.
- Credenciales.
- Llaves privadas.
- Respaldos.
- Tokens.
- Datos personales exportados.
- Archivos subidos por usuarios.
