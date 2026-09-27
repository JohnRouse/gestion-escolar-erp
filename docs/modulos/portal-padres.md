# Portal de Padres V1

## Estado

**Funcionalidad aprobada; primera propuesta visual no aprobada. Segunda
propuesta institucional premium en revisión.** El Portal es una aplicación mobile first para consulta e interacción
familiar. La implementación V1 fue revisada integralmente el 21 de septiembre
de 2026 y su sistema visual se renovó el 22 de septiembre, sin cambios de API,
Prisma, migraciones ni persistencia.

La Galería social fue descartada del producto. No es P1 ni forma parte del
roadmap funcional.

## Alcance V1

- Inicio con resumen neutral de asistencia, notas, deuda, comunicado y actividad.
- Selector de estudiantes vinculados.
- Calificaciones y análisis académico existente.
- Libreta bimestral y descarga PDF.
- Asistencia del periodo lectivo.
- Horario por día.
- Estado de cuenta, saldos y comprobantes existentes.
- Citas, cancelación autorizada y directorio de personas disponibles.
- Calendario de eventos y deep links autorizados.
- Comunicados, lectura, adjuntos y confirmación.
- Actividad/notificaciones familiares.
- Perfil, seguridad, preferencias, hijos y accesos a servicios.
- Foto institucional del estudiante gestionable desde Perfil > Hijos y
  sincronizada con la ficha de Alumnos de la intranet.
- Foto propia del apoderado gestionable desde Perfil > Datos y compartida por
  `Usuario.avatar_url` con cualquier consumidor ERP de esa cuenta.

Calificaciones muestra datos y promedios disponibles, pero no inventa una
clasificación universal «Aprobado/En riesgo». Asistencia sin registros muestra
ausencia de datos. Pagos distingue deuda cero, datos no disponibles y error; el
portal no simula pagos en línea.

## Dirección visual institucional premium — 23 de septiembre de 2026

La primera propuesta se conserva como antecedente y arquitectura reutilizable,
pero su paleta tenue no recibió aprobación. La segunda propuesta concentra la
marca en navy `#111827` y azul institucional `#315EF4`, con azul fuerte
`#2346C8`, fondo `#F4F6FA`, superficies `#FFFFFF` / `#EEF2F7` y borde
`#D9DEE8`. Texto principal `#111827`, secundario `#4B5563` y metadatos
`#606B7B`. El ámbar se ajusta a `#B45309` para sostener contraste en etiquetas
pequeñas y se limita a estados semánticos.

Login e Inicio incorporan una zona compacta navy. El estudiante aparece en una
superficie blanca integrada debajo; los KPIs mantienen la cuadrícula 2×2.
`ScreenHeader` usa superficie sólida, acento superior azul y títulos de mayor
peso. BottomNav conserva sus cinco destinos con selección azul, iconos legibles
y borde azul en el selector central. Filtros y tabs seleccionados usan azul
sólido. Actividad reciente y estadísticas de asistencia usan filas/divisiones
sin tarjetas individuales. El saldo, los promedios y los comunicados sin leer
reciben mayor jerarquía, conservando cálculos, estados y acciones.

Tokens y utilidades compartidas se mantienen en `padres/src/app/globals.css`;
Tailwind referencia esos tokens para evitar duplicar la paleta. No se cambia la
lógica de contexto, sesión, contratos, backend, redirects ni pruebas
funcionales. Citas hereda el nuevo sistema mediante componentes compartidos.

Validación y matriz de escenarios visuales: [registro de la segunda propuesta](../registro-cambios/2026-09-23-portal-padres-institucional-premium.md).
La aceptación artística final corresponde a la nueva revisión humana.

## Primera propuesta visual — antecedente no aprobado

El 22 de septiembre de 2026 se renovó la presentación completa del portal sin
modificar reglas de negocio, contratos, autorización, persistencia ni backend.
La dirección visual lo vincula con la intranet mediante una base gris/blanca,
texto neutral, acento azul acero, bordes finos y sombras mínimas, pero conserva
una composición mobile first, táctil y menos densa.

Sistema visual de la primera propuesta (paleta sustituida por la segunda):

- Paleta centralizada en `globals.css` mediante `--portal-bg`,
  `--portal-surface`, `--portal-surface-muted`, `--portal-border`,
  `--portal-text`, `--portal-text-muted`, `--portal-accent`,
  `--portal-accent-hover` y los estados semánticos success, warning y danger.
  El naranja dejó de ser marca y solo permanece en advertencias.
- Tipografía unificada con la familia de la intranet: IBM Plex Sans, Inter y
  fuentes de sistema como fallback local seguro, sin carga remota obligatoria.
- Radios de 8 px en controles, 12 px en cards y 18 px en sheets. Las cards usan
  superficie blanca, borde sutil y sombra casi imperceptible.
- Escala de espacio basada en 4, 8, 12, 16, 20, 24 y 32 px; contenido centrado
  con ancho máximo de 720 px en pantallas grandes.
- Iconografía principal Lucide. Emojis y Material Symbols dejaron de usarse
  como interfaz del portal.
- Movimiento breve de 160–240 ms para entrada, interacción y sheets; la media
  query `prefers-reduced-motion` reduce animaciones y transiciones.

Los patrones reutilizables son `ScreenHeader`, `DashboardHeader`, `BottomNav`,
`PortalAvatar`, `PortalState`, `PortalSection`, `PortalSkeletonList`,
`PortalNotificationIcon` y las primitivas CSS `portal-card`, `portal-button`,
`portal-field`, `portal-filter`, `portal-badge`, `portal-list-item` y
`portal-sheet`. Loading, vacío y error comparten estructura, jerarquía y acción
de reintento cuando corresponde.

Aplicación por flujo:

- Login institucional claro, formulario compacto, inputs con iconos y CTA azul.
- Dashboard con estudiante integrado, KPIs 2×2, alertas y actividad editorial.
- BottomNav de cinco destinos con safe area y selector central contenido.
- Selector de hijo como bottom sheet de filas; perfil como sheet móvil y drawer
  lateral en tablet, con tabs desplazables sin comprimir sus etiquetas.
- Notas, libreta, asistencia, horario, pagos, citas, directorio, calendario,
  comunicados y actividad usan headers claros, cards sobrias, badges semánticos
  y jerarquía común. Libreta conserva carácter documental y Pagos carácter de
  estado de cuenta escolar, sin apariencia fintech.
- Campana, detalle de pago y selector usan sheets dentro del viewport; el
  detalle de Comunicados prioriza lectura, adjuntos y acuse de recepción.

La validación visual se realizó con datos reales del entorno en 390×844,
440×956 y 768×1024. No se observó overflow horizontal; el portal conserva el
ancho de aplicación en desktop. Se revisaron login, dashboard, calificaciones,
libreta, asistencia, horario, pagos y detalle, citas, directorio, calendario y
evento, comunicados y detalle, actividad, notificaciones, perfil, servicios y
selector de hijo. Los controles interactivos auditados mantienen un área táctil
de al menos 44×44 px; Tab, Escape y retorno de foco
se preservan en los sheets revisados. El modo oscuro existente conserva un
fallback coherente, aunque la referencia perfeccionada de este bloque es light.

## Autenticación y autorización

- El login usa `POST /auth/portal/login`.
- Toda ruta privada valida exclusivamente un JWT con canal `portal-padres`.
- Un token interno, malformado o vencido se elimina y vuelve a `/login`.
- Un `401` global limpia token, usuario, estudiante y avatar local.
- Un login nuevo elimina el estudiante almacenado de la cuenta anterior.
- Los IDs y query params solo solicitan un recurso: nunca conceden acceso.
- Los servicios resuelven nuevamente Apoderado, vínculos, matrícula, audiencia
  o propiedad y responden recurso no disponible ante IDs ajenos.

La sesión no renderiza contenido privado antes de la validación local inicial.
No se implementan refresh tokens, auto-registro ni recuperación automática en V1.

## Contexto de estudiante

`SelectedChildProvider` es la fuente frontend única para cargar hijos mediante
`GET /academicos/padres/hijos`. Reutiliza esa lista en cualquier deep link,
reconcilia la selección almacenada contra la respuesta autorizada y reemplaza
los datos obsoletos por el contrato fresco.

Con un hijo se muestra el contexto actual sin abrir un selector innecesario.
Con dos o más, el botón central abre un sheet explícito y accesible. Al cambiar
de hijo, las páginas dependientes abortan solicitudes anteriores, limpian el
contenido previo y consultan el nuevo contexto.

Los avatares usan la imagen registrada cuando existe. Ante ausencia o fallo se
muestran iniciales locales; el render básico no depende de DiceBear.
Las URLs legacy de DiceBear y generadores equivalentes tampoco se interpretan
como fotos reales aunque permanezcan en `Estudiante.avatar_url`: el componente
compartido muestra iniciales sin consultar esas URLs. Las fotos reales de la
institución siguen visibles y un fallo de carga vuelve a iniciales.

### Foto institucional compartida

Perfil > Hijos permite elegir una fotografía JPG/JPEG, PNG o WEBP de hasta 5 MB.
Antes de subir abre el componente compartido `AvatarCropDialog`: drag/touch,
pinch, slider y botones permiten mover y ampliar dentro de un área 1:1; los
previews cuadrado y circular muestran el resultado final. La fuente elegida se
lee con `FileReader`, se orienta una sola vez y se normaliza a una fuente
`data:` en memoria; el editor no mantiene object URLs ni depende de su
revocación. Confirmar genera un WEBP 512×512 (JPEG como fallback de navegador)
y recién entonces usa `POST /academicos/padres/hijos/:id/avatar`, campo
multipart `foto`. La decodificación del navegador y `createImageBitmap` con
orientación aplicada evitan conservar una rotación EXIF incorrecta.

Portal e Intranet reexportan una única implementación canónica de geometría.
La escala mínima es `cover`, el pan queda limitado para que no aparezcan huecos
y el zoom conserva el punto visual del gesto. El canvas visible representa el
viewport cuadrado completo; la circunferencia es solo un overlay y nunca entra
en `sourceX/sourceY/sourceWidth/sourceHeight`. El mismo Blob codificado alimenta
los dos previews y el `FormData`, de modo que no existe un segundo crop al
confirmar.

`jwt-portal` obtiene el Apoderado desde el actor autenticado y el
servicio comprueba `ApoderadoEstudiante` antes de guardar; nunca recibe una URL
elegida por el frontend. `DELETE /academicos/padres/hijos/:id/avatar` vuelve
`Estudiante.avatar_url` a `NULL` después de repetir la autorización.

`SelectedChildProvider.updateChildAvatar` actualiza en una sola operación la
lista `hijos`, el `selectedChild` y la selección persistida. Por ello
`DashboardHeader`, `BottomNav`, el selector y Perfil > Hijos cambian sin
recargar. La intranet observa la misma referencia al volver a consultar al
alumno; cuando la intranet reemplaza la foto, el Portal la recibe en el próximo
`GET /academicos/padres/hijos`.

El archivo se valida por MIME y firma binaria JPG/PNG/WEBP, usa un nombre opaco
generado por servidor y no acepta SVG. El almacenamiento físico anterior no se elimina en
V1 porque `StorageService` aún no ofrece un borrado fiable; quitar la foto limpia
la referencia y deja esa limpieza como deuda técnica controlada.

La imagen persistida ya es el recorte oficial cuadrado. `PortalAvatar`, la
tabla, ficha, vínculos, Tutoría y visor de Intranet usan `cover center`, sin
offsets ni crops particulares; por eso una misma `Estudiante.avatar_url`
mantiene el mismo encuadre visible en ambos productos.

### Foto del apoderado

Perfil > Datos utiliza el mismo editor 1:1 para la fuente única
`Usuario.avatar_url`. `POST /auth/portal/perfil/avatar` recibe multipart
`avatar`; `DELETE /auth/portal/perfil/avatar` limpia la referencia. Ambos
contratos están protegidos por `jwt-portal`, derivan el Usuario de `req.user` y
no reciben `id_usuario`. El PUT general del perfil no puede escribir una URL de
avatar arbitraria.

Al guardar o quitar, Perfil y `DashboardHeader` actualizan la foto en memoria y
la copia local de presentación. Al montar, el Header relee `GET
/auth/portal/perfil`, por lo que el backend prevalece sobre ese cache. Sin foto
se muestran iniciales locales; no se invoca DiceBear ni otro servicio externo.

`PortalAvatar` es también la fuente visual única del encuadre: su wrapper es
cuadrado, relativo, circular y con `overflow: hidden`, sin padding; la imagen es
un bloque que ocupa todo el interior con `object-fit: cover` y
`object-position: center center`. El borde del avatar del Header pertenece al
wrapper y no a una caja exterior con fondo. Esto evita que la alineación de
baseline de un elemento inline deje visible una franja bajo la fotografía. El
Dashboard y Perfil > Datos usan la misma URL y el mismo centro. Sin fotografía,
el usuario de prueba Carlos muestra solo `CA` en ambos lugares.

La pasada puntual posterior a la revisión premium fijó `Mi perfil` a 86dvh en
móvil con encabezado y pestañas estables y scroll solo en su contenido. La
elección Claro/Oscuro conserva `aria-pressed` y ahora combina borde, fondo,
icono y check con contraste en ambos temas. Comunicados muestra la flecha de
Servicios en lista, detalle y carga. Libreta reserva espacio al borde derecho
del promedio y muestra «—» cuando el promedio no está disponible. Véase el
[registro de los cinco ajustes](../registro-cambios/2026-09-23-portal-padres-pulido-visual.md).

## Navegación

El BottomNav conserva cinco posiciones: Inicio, Notas, estudiante, Asistencia y
Pagos. Servicios del perfil enlaza Directorio, Citas, Calendario, Libreta,
Horario y Comunicados. «Staff» no se presenta como nombre de producto al padre;
la ruta técnica `/dashboard/staff` conserva el nombre visible «Personas para
citas».

Deep links de notificaciones solo aceptan rutas internas bajo `/dashboard`.
URLs externas, protocol-relative, con barra invertida o fuera del portal se
rechazan y usan un destino seguro por origen.

Rutas legacy:

- `/dashboard/circulares` → `/dashboard/comunicados`, conservando query.
- `/dashboard/galeria` → `/dashboard`.
- `/dashboard/redirect` valida el destino y solo selecciona un hijo presente en
  la lista autorizada.

## Estados y datos

Las pantallas principales resuelven a contenido, vacío o error con reintento;
no permanecen en skeleton infinito. `AbortController` evita que respuestas del
hijo anterior sobrescriban el actual en los flujos revisados.

El dashboard usa `Promise.allSettled` para mantener datos disponibles y además
informa fallo parcial. Un error financiero nunca se transforma en «Al día» y un
fallo de actividad/comunicados no se presenta como vacío real.

Pagos muestra `total_pendiente` y `saldo` entregados por el backend. «Ver todas»
no mezcla conceptos pagados en la vista Pendientes. El botón de pago simulado
fue retirado; se orienta a Tesorería cuando no existe canal en línea.

## Accesibilidad, responsive y movimiento

- Controles semánticos, `aria-current`, `aria-pressed`, `role=dialog`, tabs y
  switches con estado accesible.
- Focus visible global y targets principales cercanos a 44 px.
- Escape, retorno de foco, bloqueo del fondo y cierre por backdrop en drawers,
  sheets y modal de citas revisados.
- Zoom del navegador no está bloqueado.
- `prefers-reduced-motion` reduce animaciones y transiciones globales.
- Safe area inferior y espacio para BottomNav.
- Sin overflow horizontal de página en 390×844, 440×956 y 768 px; filtros con
  scroll interno ocultan la barra decorativa sin perder teclado/touch.

## Galería descartada y deuda legacy

El portal no contiene feed, álbumes, fotos, comentarios, reacciones, compartir
ni reporting social. El cliente anterior fue eliminado y no hay navegación
visible.

`api/src/albumes/**` y los modelos/tablas `Album`, `Foto`, `ComentarioFoto` y
`ReaccionFoto` permanecen sin cambios para evitar destrucción de datos. Ese
backend usa contratos legacy que no cumplen el cierre `jwt-portal` actual y no
debe exponerse ni reactivarse. Deuda explícita:

> Backend legacy de álbumes/fotos pendiente de limpieza técnica; no forma parte
> del producto V1 ni del roadmap funcional.

## Pruebas y validación

- 30 pruebas frontend dirigidas: sesión, token, hijos, estados académicos y
  financieros, navegación segura, redirects, perfil y selector.
- Suites existentes de Calendario y Comunicados preservadas.
- Revisión visual local con Carlos y Rosa en 390×844, 440×956 y 768 px.
- Zoom 200% sin overflow lateral, foco visible al navegar con Tab y preferencia
  de movimiento reducido verificada en navegador.
- Recorrido de login, Inicio, Notas, Asistencia, Horario, Pagos, Citas,
  Calendario, Comunicados, Actividad, Directorio, Perfil y selector de tres hijos.
- Puerta técnica: `npx tsc --noEmit`, `npm run build`, ESLint dirigido,
  `git diff --check` y revisión del diff.
- 134 pruebas backend dirigidas de Auth portal, Citas, Eventos, Comunicados y
  Notificaciones aprobadas sin modificar backend.
- Foto compartida y apoderado: autorización propia/ajena, aislamiento JWT,
  MIME/firma JPG-PNG-WEBP, límite, crop geométrico 1:1, actualización y retiro
  de ambas referencias, sincronización del contexto y scope institucional
  cubiertos por pruebas dirigidas. La aceptación manual del crop en 390×844,
  440×956, 768×1024, 1366×768 y 1440×900 y touch real continúa pendiente. Una
  prueba de navegador en StrictMode ya cubre esos viewports, drag, zoom, EXIF 6,
  ausencia de peticiones `blob:` fallidas y paridad byte a byte entre preview y
  archivo final; también se revisó visualmente una fotografía vertical real
  local sin publicarla ni incorporarla como fixture.
- Corrección final del avatar del apoderado: el WEBP real de Carlos devuelto por
  `Usuario.avatar_url` se comprobó como 512×512 sin franja blanca en el archivo.
  Chrome validó Dashboard y Perfil > Datos en 390×844, 427×952, 440×956 y
  768×1024: círculo lleno, borde uniforme, mismo `cover center`, sin deformación
  ni overflow. También se comprobó el fallback exclusivo `CA`, Tab, foco visible,
  reducción de movimiento y zoom equivalente al 200 % sobre 768×1024. El cambio
  no modifica animaciones ni la geometría o pipeline del crop.

## Reversión

Revertir los cambios frontend y documentales de este bloque restaura la UI
anterior. No existe reversión de base de datos porque no se modificaron esquema,
migraciones ni datos.
