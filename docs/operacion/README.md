# Operación técnica del proyecto

Esta carpeta documenta los procedimientos necesarios para desarrollar, probar, desplegar, respaldar y recuperar Gestión Escolar ERP.

## Documentos previstos

- Entorno de desarrollo.
- Google Cloud Workstations.
- Variables de entorno.
- Base de datos y Google Cloud SQL.
- Migraciones.
- Respaldos.
- Restauración.
- Pruebas.
- Google Cloud Run.
- Google Cloud Storage.
- Despliegue.
- Monitoreo.
- Manejo de incidentes.
- Recuperación ante fallos.
- Procedimiento de reversión.
- Gestión de secretos.

## Reglas generales

1. Los secretos no deben almacenarse en Git.

2. Antes de cambios sensibles se debe crear un respaldo verificable.

3. Las migraciones deben probarse antes de aplicarse en producción.

4. Las pruebas destructivas deben realizarse en una base aislada.

5. Todo despliegue debe registrar:

   - Fecha.
   - Responsable.
   - Versión.
   - Commit.
   - Servicios modificados.
   - Migraciones aplicadas.
   - Resultado.
   - Procedimiento de reversión.

6. Los procedimientos deben describirse paso a paso y poder ser ejecutados por una persona que no participó en su creación.

## Estado

La estructura operativa está creada.

Los procedimientos específicos deben documentarse después de revisar la configuración real del repositorio y de Google Cloud.
