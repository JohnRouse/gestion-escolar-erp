# Protocolo de documentación continua

## 1. Propósito

Garantizar que ningún avance, cambio, corrección, decisión o regla de Gestión Escolar ERP dependa únicamente de una conversación, una persona o la memoria del equipo.

La documentación del repositorio es la fuente oficial del proyecto.

## 2. Regla obligatoria

Todo cambio funcional o técnico debe actualizar la documentación al mismo tiempo que el código.

Esto incluye:

- Nuevas funcionalidades.
- Correcciones.
- Cambios visuales.
- Cambios de flujo.
- Nuevas validaciones.
- Cambios de permisos.
- Nuevos estados.
- Migraciones.
- Cambios de base de datos.
- Optimizaciones.
- Integraciones.
- Eliminaciones.
- Reversiones.
- Decisiones arquitectónicas.

La documentación forma parte de la definición de terminado.

## 3. Información mínima de cada cambio

Cada cambio debe registrar:

1. Fecha.
2. Módulo.
3. Motivo.
4. Problema detectado.
5. Comportamiento anterior.
6. Comportamiento nuevo.
7. Reglas afectadas.
8. Roles afectados.
9. Alcance institucional afectado.
10. Archivos modificados.
11. Base de datos o migraciones involucradas.
12. Casos contemplados.
13. Validaciones agregadas.
14. Riesgos.
15. Compatibilidad con datos históricos.
16. Pruebas realizadas.
17. Resultado de las pruebas.
18. Procedimiento de reversión.
19. Estado final.
20. Commit o pull request relacionado.

## 4. Documentos que deben revisarse

Dependiendo del cambio se deberá actualizar uno o varios de los siguientes:

- Manual general.
- Documento del módulo.
- Escenario transversal.
- Regla funcional.
- Sistema de diseño.
- Roles y permisos.
- Arquitectura.
- ADR.
- Estado del proyecto.
- Registro de cambios.
- Procedimiento operativo.

## 5. Estado de una funcionalidad

Solo se permiten los siguientes estados:

- No iniciada.
- En análisis.
- En desarrollo.
- Implementada parcialmente.
- En pruebas.
- Implementada.
- Bloqueada.
- Obsoleta.

No debe utilizarse el estado `Implementada` si falta alguna parte esencial.

## 6. Trabajo mediante bloques de terminal

Cuando los cambios sean aplicados mediante bloques enviados para ejecutar, el bloque deberá:

- Crear respaldo cuando corresponda.
- Modificar el código.
- Actualizar la documentación.
- Actualizar el registro de cambios.
- Ejecutar validaciones.
- Mostrar los archivos afectados.
- No realizar commit automáticamente salvo aprobación expresa.

## 7. Pull requests

Todo pull request funcional deberá explicar:

- Qué problema resuelve.
- Qué comportamiento cambia.
- Qué reglas se aplican.
- Qué escenarios fueron probados.
- Qué documentos se actualizaron.
- Qué riesgos permanecen.
- Cómo puede revertirse.

## 8. Prohibiciones

No se debe:

- Implementar una regla nueva sin documentarla.
- Marcar como finalizada una función sin pruebas.
- Borrar una decisión histórica sin explicar su reemplazo.
- Documentar como existente una función aún no desarrollada.
- Mantener información importante únicamente en un chat.
- Crear documentación que contradiga el código sin marcar la diferencia.
