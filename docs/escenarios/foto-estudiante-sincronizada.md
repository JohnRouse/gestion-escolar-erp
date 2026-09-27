# Foto del estudiante sincronizada ERP ↔ Portal

## Estado

En pruebas. Código y pruebas dirigidas implementados; validación humana cruzada
en navegador pendiente.

## Situación inicial

El estudiante puede aparecer en el Portal de Padres y en la ficha de Alumnos de
la intranet. Ambos productos deben representar una sola fotografía institucional
sin crear avatares por canal.

## Actores y permisos

- Apoderado, Padre o Madre con JWT de `portal-padres` y vínculo persistido
  `ApoderadoEstudiante` con el estudiante.
- Admin, Director o Secretaria con JWT de intranet, tenant activo, membresía de
  colegio activa y `rol_colegio` efectivo autorizado.
- Profesor no puede reemplazar libremente la fotografía institucional.

## Datos necesarios

`Usuario`, `Apoderado`, `ApoderadoEstudiante`, `Estudiante.avatar_url`,
`Matricula`, `UsuarioTenant` y `UsuarioColegio`. No hay tabla nueva ni migración.

## Flujo Portal

1. Perfil > Hijos muestra `PortalAvatar`, nombre, grado y Agregar/Cambiar foto.
2. El navegador abre `Editar foto`, permite pan, zoom y gesto de pinza, muestra
   preview cuadrado/circular y produce un WEBP cuadrado de 512×512, o JPEG como
   fallback de navegador, respetando la orientación que el navegador decodifica
   desde EXIF. La fuente de edición usa `data:` y no una object URL revocable.
   El canvas del editor, los previews y el archivo subido usan la misma
   geometría canónica y el mismo resultado codificado.
3. Al confirmar envía `multipart/form-data` con el campo `foto`; no fija el
   `Content-Type`, por lo que conserva el boundary.
4. `jwt-portal` obtiene Usuario y Persona/Apoderado reales desde el token y DB.
5. El servicio comprueba el vínculo antes de persistir el archivo.
6. `StorageService` valida JPG/JPEG, PNG o WEBP, máximo 5 MB, MIME y firma binaria, y
   genera un nombre opaco.
7. El backend revalida el vínculo, actualiza `Estudiante.avatar_url` y registra
   metadatos mínimos de auditoría.
8. `SelectedChildContext` actualiza `hijos[]`, `selectedChild` y almacenamiento
   local; Header, BottomNav, selector y Perfil reflejan la foto sin recarga.

## Flujo Intranet

1. Alumnos muestra foto o iniciales y Agregar/Cambiar foto.
2. Antes de subir, el mismo patrón de crop cuadrado permite mover, zoom/pinch y
   muestra exactamente el recorte que se guardará. Intranet reexporta la misma
   implementación del Portal y conserva el `File` final mostrado para subir ese
   objeto, sin regenerar el crop.
3. `POST /academicos/alumnos/:id/avatar` recibe el mismo campo multipart.
4. El backend relee rol global, tenant, colegio y `rol_colegio`; filtra al
   estudiante por matrículas del alcance autorizado antes y después de guardar.
5. Se actualiza la misma columna `Estudiante.avatar_url` y la ficha cambia de
   inmediato. El Portal recibe ese valor en el próximo GET de hijos.

Tabla, ficha, vínculos, Tutoría y visor ampliado utilizan el mismo archivo
cuadrado con `cover center`. El visor ampliado usa `contain center` exclusivamente
para mostrar completo ese cuadrado oficial; no vuelve a la foto original ni
decide un encuadre alternativo.

## Quitar foto

El Portal presenta una confirmación con foco, Escape, acción explícita y retorno
de foco. `DELETE /academicos/padres/hijos/:id/avatar` repite la comprobación del
vínculo y establece `avatar_url = NULL`. Ambas interfaces vuelven a iniciales al
consultar el registro. El archivo anterior puede quedar huérfano porque no hay
un borrado físico fiable en `StorageService`; no se improvisa su eliminación.

## Validaciones y denegaciones

- Token interno en endpoint Portal: 401 por canal.
- ID ajeno: 404 y ninguna escritura de archivo o DB.
- MIME no permitido, SVG, firma incompatible o archivo inicial mayor de 5 MB:
  rechazo. El resultado confirmado es significativamente menor y uniforme.
- Rol global o rol efectivo Profesor: rechazo en intranet.
- Colegio o tenant fuera del alcance activo: el alumno no se encuentra.
- Sin foto: inicial del primer nombre + inicial del último apellido visible.

## Trazabilidad

El log estructurado `StudentAvatarAudit` incluye usuario, estudiante, acción,
canal y fecha. No registra bytes, nombre original, DNI ni contenido de la foto.

## Reversión

Revertir controladores, servicio, UI, helpers, pruebas y documentación. No hay
migración. Las referencias modificadas durante una prueba manual deben
restaurarse explícitamente; los archivos cargados requieren la limpieza técnica
posterior definida por la política de almacenamiento.
