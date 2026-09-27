# Foto del estudiante sincronizada ERP ↔ Portal

Fecha: 2026-09-25. Actualizado: 2026-09-26. Estado: en pruebas; crop oficial y
foto de apoderado incorporados, aceptación humana cruzada pendiente.

## Motivo y problema anterior

`Estudiante.avatar_url` ya existía y la intranet podía cargar una foto, pero el
Portal conservaba un contrato `PUT` que recibía una URL arbitraria y no tenía
carga de archivo ni retiro. El endpoint interno validaba el rol global, aunque
no el `rol_colegio` efectivo, y publicaba el código del estudiante en el nombre
físico del archivo.

## Comportamiento nuevo

- Fuente única: `Estudiante.avatar_url`, sin Prisma ni migración.
- Portal: `POST /academicos/padres/hijos/:id/avatar`, multipart `foto`, y
  `DELETE` sobre la misma ruta para volver la referencia a `NULL`.
- El vínculo familiar se comprueba antes de guardar y otra vez antes de escribir
  DB. Un ID ajeno responde 404 y no persiste archivo.
- Intranet conserva `POST /academicos/alumnos/:id/avatar`, limitado a Admin,
  Director y Secretaria con rol global, tenant, colegio y `rol_colegio`
  efectivos. Profesor queda excluido.
- `StorageService` comprueba MIME y firma JPG/PNG, limita a 5 MB y genera nombres
  opacos sin nombre, DNI ni código del estudiante.
- Perfil > Hijos incorpora Agregar, Cambiar y Quitar foto. La confirmación de
  retiro admite teclado, Escape y retorno de foco.
- `SelectedChildContext` actualiza lista, selección y almacenamiento local, por
  lo que todos los consumidores de `PortalAvatar` cambian sin recarga.
- Auditoría estructurada mínima: usuario, estudiante, acción, canal y fecha.

## Extensión de encuadre oficial y apoderado — 26 de septiembre

- Portal e Intranet ya no suben el original inmediatamente. Un editor de foto
  permite drag/touch, pan horizontal y vertical, pinch, slider y botones de
  zoom, cancelar y confirmar.
- El área final es 1:1 y presenta preview cuadrado y circular. Canvas genera un
  WEBP de 512×512 con calidad 0.88, con JPEG 0.90 si el navegador no puede
  codificar WEBP; el cuadrado, no una máscara circular, es el archivo
  persistido. `createImageBitmap(..., imageOrientation: from-image)` y
  el fallback nativo respetan la orientación EXIF decodificada.
- No se agregó dependencia: el patrón usa React, Pointer Events y canvas. En el
  Portal se creó `AvatarCropDialog`; Intranet reutiliza `AccessibleDialog` y el
  componente `AvatarCropEditor`.
- Tabla de Alumnos, ficha, vínculos, Tutoría, visor ampliado y todos los
  `PortalAvatar` muestran la fuente cuadrada con `object-fit: cover` y
  `object-position: center center`. Se retiraron `contain`, padding y marco
  vertical que producían un encuadre distinto.
- Perfil > Datos agrega Agregar/Cambiar/Quitar foto propia. La fuente única es
  `Usuario.avatar_url`; `POST/DELETE /auth/portal/perfil/avatar` están aislados
  por `jwt-portal`, no reciben ID y el PUT general dejó de aceptar `avatar_url`.
- Perfil y DashboardHeader actualizan inmediatamente. `localStorage` queda como
  cache visual y GET perfil vuelve a imponer el valor del backend al montar.
- El listado y la ficha ERP de Apoderados proyectan esa misma
  `Usuario.avatar_url` mediante `PersonAvatar`; la respuesta elimina la colección
  interna de Usuarios y solo expone la URL necesaria.
- La validación común admite JPG/JPEG, PNG y WEBP hasta 5 MB, coteja MIME/firma,
  rechaza SVG y mantiene filename opaco. No se incorporó Prisma ni migración.
- `PortalAvatarAudit` registra solo actor, Persona, acción, canal y fecha.

## Corrección WYSIWYG posterior a prueba humana — 26 de septiembre

La prueba humana detectó dos defectos y el bloque permanece **en pruebas**:

- Portal construía la object URL en el inicializador de estado y la revocaba en
  el cleanup de un efecto. El replay de efectos de React StrictMode ejecutaba
  ese cleanup sin recrear la URL guardada, por lo que el `<img>` seguía
  apuntando a un recurso revocado y Chrome emitía `ERR_FILE_NOT_FOUND`.
- Editor y preview representaban el original mediante `object-cover` y
  transforms CSS, mientras el guardado volvía a calcular la transformación en
  un canvas separado. Eran dos renderizadores distintos, y el preview pequeño
  tampoco provenía del Blob final; no existía una garantía WYSIWYG.

La corrección elimina object URLs del pipeline de crop. `FileReader` prepara
una fuente `data:` orientada una sola vez y una implementación canónica
compartida por ambos frontends calcula `cover`, pan limitado, zoom y la inversa
del viewport. El editor es un canvas 512×512 generado por esa función; la guía
circular es únicamente un overlay. El Blob final se genera con la misma función,
su data URL alimenta ambos previews y ese mismo `File` se coloca en FormData.
El visor grande de Intranet muestra completo el cuadrado oficial con `contain`.

## Corrección final del render circular del apoderado — 26 de septiembre

La fotografía real de Carlos persistida en `Usuario.avatar_url` se descargó a
través de `GET /auth/portal/perfil`: es un WEBP 512×512 de 38 606 bytes y llega
visualmente hasta su borde inferior. La media luna blanca no estaba codificada
en el archivo y no justificaba alterar el cropper.

El defecto pertenecía exclusivamente a `DashboardHeader`: el botón medía
46×52,5 px, pero el `PortalAvatar` interno medía 44×44 px. El wrapper era
`inline-flex`, quedaba alineado al baseline de la caja de texto del botón con
`line-height: 22,5px` y dejaba 6,5 px del fondo exterior visibles debajo de la
foto, además del borde. Perfil > Datos ya computaba wrapper e imagen con igual
altura, por eso no reproducía la franja.

`PortalAvatar` centraliza ahora un wrapper `relative flex`, cuadrado, circular,
sin padding y con `overflow-hidden`; su `<img>` es `block`, ocupa ancho y alto
completos y conserva `object-cover object-center`. En el Header el botón queda
sin padding ni fondo interior y el borde se aplica al propio wrapper circular.
Perfil > Datos usa el mismo componente y el nombre corto como fallback, de modo
que Carlos muestra solo `CA` sin fotografía. No se modificaron
`shared/avatar-crop.ts`, la geometría 512×512, zoom, pan ni el pipeline WYSIWYG.

La comprobación real en Chrome cubrió 390×844, 427×952, 440×956 y 768×1024.
Dashboard quedó con botón/wrapper 44×44 y foto 42×42 dentro del borde uniforme
de 1 px; Perfil > Datos conserva wrapper/foto 64×64. Ambos decodificaron la
misma fuente natural 512×512 y el mismo `cover` / `50% 50%`, sin deformación,
recorte adicional ni overflow horizontal. El fallback se probó en ambos lugares
con cero elementos `<img>` simultáneos. Tab alcanzó el disparador, el foco fue
visible con 3 px, `prefers-reduced-motion: reduce` no alteró el resultado y el
equivalente a zoom 200 % de 768×1024 no produjo overflow. No se cambiaron
animaciones ni transiciones.

## Roles, alcance y seguridad

Portal deriva al Apoderado de `req.user`; el cliente no envía `id_apoderado`.
Intranet relee membresías activas de tenant y colegio y filtra la matrícula del
alumno al alcance autorizado. El endpoint legacy `/estudiantes/:id/avatar`, que
aceptaba `avatar_url` por body, se retiró del módulo.

## Interfaz y patrones visuales

Se reutilizan `PortalAvatar`, `SelectedChildContext`, botones y tokens premium
del Portal, y `PersonAvatar`, `CommunityDetailModal` y el flujo de ajuste ya
existente en Alumnos. Foto circular/redondeada con `object-cover`, borde sutil,
acciones textuales y áreas táctiles mínimas de 44 px. No se agrega biblioteca ni
animación; loaders existentes respetan `prefers-reduced-motion`.

La revisión humana específica de esta superficie en 360, 390, 440, 768, 1024 y
1440 px, zoom aumentado, recorrido completo por teclado, foco visible y
reducción de movimiento queda pendiente. El código implementa diálogo con
semántica accesible, trampa de Tab, cierre con Escape y retorno de foco.

## Base de datos y almacenamiento

No hay cambio de esquema. Reemplazar o quitar modifica únicamente
`Estudiante.avatar_url` o `Usuario.avatar_url`, según la persona.
`StorageService` no dispone de borrado físico fiable; por ello el archivo
anterior puede quedar huérfano para una limpieza técnica posterior, mientras
la referencia DB se limpia de inmediato.

## Pruebas y resultados

- Cierre del render circular del apoderado: 9/9 pruebas frontend dirigidas,
  `npx tsc --noEmit`, ESLint dirigido sin `--fix`, `npm run build` y
  `git diff --check` aprobados. Next mantuvo únicamente el aviso conocido de
  múltiples lockfiles.
- API dirigida del incremento: 48/48 en Auth portal, recursos, foto compartida,
  foto propia y validación de archivo.
- Portal dirigido del incremento: 31/31 en crop, avatar, foto propia,
  estado/contexto y UI de fotografía.
- Intranet dirigida del incremento: 4/4 (3 pruebas Node y 1 prueba real de
  navegador) en geometría 1:1, uso del editor, presentación `cover center`,
  foto compartida del apoderado y lifecycle StrictMode.
- `npx tsc --noEmit`: aprobado en API, Portal e Intranet.
- `npm run build`: aprobado en API, Portal e Intranet. Permanecen los avisos ya
  conocidos de múltiples lockfiles de Next y tamaño de bundle de Vite.
- ESLint dirigido sin `--fix`: aprobado en los nuevos helpers/componentes de
  API, Portal e Intranet y en todos los archivos Portal tocados. La corrida
  aislada de `AlumnosPage.tsx` conserva su baseline conocido de 13 errores y 2
  avisos legacy, fuera del crop; no se amplió este bloque para refactorizarlos.
- Graphify no se ejecutó por instrucción explícita de este bloque.
- `git diff --check`, estado y estadística: revisados al cierre.
- Casos humanos A–D (Portal → ERP, ERP → Portal, quitar y alumno ajeno):
  pendientes; no se escribió en la base original durante las pruebas automáticas.

Validación añadida para la corrección WYSIWYG:

- Fixture sintético vertical 1080×2400 con bandas reconocibles: salida y región
  esperada verificadas en 512×512.
- Paridad: Portal e Intranet reexportan las mismas funciones canónicas y
  producen idéntico rectángulo fuente para igual zoom/pan.
- Navegador Chrome en React StrictMode: foto vertical, drag, zoom, orientación
  EXIF 6, preview cuadrado/circular y `File` final; preview data URL y archivo
  resultaron byte a byte iguales, sin petición `blob:` fallida ni error de
  consola.
- Layout automatizado sin overflow en 390×844, 440×956, 768×1024, 1366×768 y
  1440×900. Se inspeccionó visualmente una foto vertical real local en 390×844;
  no se añadió al repositorio ni se imprimieron sus datos en logs.
- Sigue pendiente la aceptación humana autenticada y cruzada Portal → Intranet
  e Intranet → Portal. Por esta razón este registro no declara GO funcional.

## Riesgos y compatibilidad

Los valores legacy de generadores externos continúan en DB si ya existían, pero
`PortalAvatar` los representa con iniciales. No se alteran reglas académicas ni
matrículas. La sincronización V1 ocurre por contexto local inmediato y nueva
consulta, sin WebSockets.

La normalización es de cliente porque el backend no dispone de un procesador de
imagen. El servidor no confía en MIME declarado: valida firma y peso, pero una
normalización secundaria con procesador server-side queda como mejora futura.
El borrado físico de reemplazos también continúa como deuda controlada.

## Auditoría visual del incremento

- Tokens/patrón: paleta y controles premium existentes del Portal;
  `AccessibleDialog`, focus rings y superficies Carbon existentes de Intranet.
- Componente creado: editor de crop reutilizable por estudiante y apoderado en
  Portal; editor reutilizable dentro del diálogo accesible de Intranet.
- El layout está acotado por `dvh`, ancho máximo, área cuadrada fluida y scroll
  interno. Las resoluciones objetivo 390×844, 440×956, 768×1024, 1366×768 y
  1440×900 quedan listas para la prueba humana, no certificadas solo por build.
- Teclado: Tab atrapado, Escape cancela, foco visible, flechas para mover,
  `+`/`-` para zoom y retorno al disparador en Portal; Intranet hereda el
  contrato probado de `AccessibleDialog`.
- Reducción de movimiento: solo el loader existente anima y usa
  `motion-reduce`; drag/zoom responde directamente al gesto y no agrega una
  animación decorativa.
- Hallazgo corregido: una fuente no cuadrada se representaba con `contain` o un
  marco 48×58 en algunos listados y con otro encuadre en el visor. La fuente
  oficial ahora es cuadrada y todos esos consumidores usan centro/cobertura.

## Archivos y reversión

El cambio abarca API de Académicos/Storage, Perfil > Hijos, contexto y avatar
del Portal, ficha de Alumnos, pruebas y documentación relacionada. Para revertir,
aplicar el patch inverso exclusivamente a estos archivos y conservar los demás
cambios sin confirmar del Portal. No existe rollback de migración.

## Commit y publicación

No se realizó commit, push ni merge.
