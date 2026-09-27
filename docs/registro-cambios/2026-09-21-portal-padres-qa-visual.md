# Portal de Padres V1 — QA funcional y visual

Fecha: 2026-09-21
Rama: `feat/v1-portal-padres-qa-visual`
Estado: QA funcional y humana aprobadas; rediseño listo para prueba humana visual

## Objetivo

Revisar integralmente el Portal V1 sin reescribir su arquitectura ni modificar
API, Prisma, migraciones o datos, y retirar la Galería social por decisión de
producto.

## Cambios principales

- Boundary de sesión privado con validación de canal y expiración, limpieza
  consistente y manejo global de `401`.
- Carga centralizada de hijos, reconciliación segura y selector accesible para
  múltiples estudiantes.
- Fallback local de iniciales; eliminación de DiceBear y del selector de avatar
  generado externamente.
- Dashboard sin `.0` inventado, sin clasificación académica universal y con
  errores parciales visibles.
- Asistencia y notas distinguen ausencia de registros de un valor cero.
- Pagos distingue error, sin deuda y deuda; usa saldo oficial y elimina el pago
  simulado.
- Citas informa errores y expone cancelación real cuando el contrato la permite.
- Actividad y campana comparten navegación interna segura.
- Perfil/drawers/sheets mejorados en teclado, foco, Escape y semántica.
- Nombres y accesos de Servicios alineados al lenguaje familiar.
- Barras decorativas de scroll horizontal ocultas y página sin overflow lateral.
- Galería eliminada del frontend visible; ruta legacy con redirect a Inicio.

## Rediseño visual integral del Portal de Padres

El 22 de septiembre de 2026 se ejecutó un rediseño visual completo posterior al
QA funcional y a la prueba humana. No se reabrieron reglas, contratos ni
backend: la lógica de sesión, alcance, hijo seleccionado, pagos, notas,
asistencia, citas, eventos, comunicados, notificaciones, redirects y logout se
preservó.

Dirección y sistema:

- El portal adopta el lenguaje familiar de la intranet —gris claro, blanco,
  slate y azul acero— con densidad móvil, targets táctiles y navegación directa.
- Se incorporaron tokens `--portal-*` para superficie, borde, texto, acento y
  estados. El naranja ya no es marca y queda reservado al warning.
- IBM Plex Sans encabeza la pila tipográfica, con Inter y sistema como fallback
  sin depender de una fuente remota.
- Controles, cards y sheets usan radios de 8, 12 y 18 px respectivamente;
  sombras mínimas, bordes finos y spacing regular sustituyen la apariencia de
  burbujas anterior.
- Lucide es el lenguaje de iconos. Se retiraron emojis de actividad, estados y
  componentes académicos, y no se añadió ninguna biblioteca.
- Se consolidaron `PortalState`, `PortalSection`, `PortalSkeletonList`,
  `PortalNotificationIcon`, `PortalAvatar`, headers, BottomNav y primitivas de
  card, botón, campo, filtro, badge, fila y sheet.

Cobertura visual:

- Login, header principal, headers internos, dashboard y KPIs.
- BottomNav, selector de estudiante, perfil y Servicios.
- Calificaciones, libreta, asistencia y horario.
- Pagos con detalle y comprobantes existentes; citas y directorio académico.
- Calendario con selección de día; comunicados en lista y detalle.
- Actividad, campana de notificaciones y estados loading/empty/error.

Responsive y accesibilidad:

- Recorrido con datos reales en Chrome a 390×844, 440×956 y 768×1024, sin
  overflow horizontal y con contenido centrado a un máximo de 720 px.
- Navegación por teclado, foco visible, Escape y retorno de foco verificados en
  selector de hijo y notificaciones. Drawers, tabs, switches y dialogs conservan
  su semántica previa.
- Targets visibles auditados: acciones, filtros y controles interactivos de
  44 px o más.
- `prefers-reduced-motion` deja animaciones y transiciones en duración mínima.
- Dark mode conserva su fallback funcional; el acabado de referencia es light.

El bloque modifica exclusivamente frontend y documentación. No contiene
Prisma, migraciones, cambios de API, pagos simulados, DiceBear ni Galería.

## Seguridad verificada

Los contratos activos de Auth, Hijos, Notas, Libreta, Asistencia, Horario,
Tesorería, Citas, Eventos, Comunicados y Notificaciones usan `jwt-portal`. Los
servicios derivan propiedad desde la identidad del token y los vínculos.

Se identificó que `api/src/albumes/**` conserva autorización interna legacy y
accesos que no deben considerarse aptos para el Portal. No se modificó porque la
función fue descartada y se prohibió un cambio destructivo. Queda dormante y
documentada para limpieza técnica posterior.

## Validación visual

Chrome headless local, API y portal reales, sin mutar datos:

- Carlos: login, dashboard, notas, asistencia, horario, pagos, citas,
  calendario, comunicados, actividad, directorio, perfil y redirects.
- Rosa: selector con tres hijos y estado seleccionado.
- Viewports: 390×844, 440×956 y 768×956.
- Resultado: sin overflow horizontal de página, BottomNav estable, cards y
  headers consistentes, drawers/sheets dentro del viewport y ruta de Galería en
  Inicio.
- Zoom 200%: sin overflow lateral; navegación por Tab mostró foco sólido.
- `prefers-reduced-motion: reduce`: el login omitió la espera del splash y el
  formulario quedó disponible inmediatamente.

## Pruebas

- `node --test tests/*.test.mjs`: 30/30 aprobadas.
- Backend dirigido: 5 suites, 134/134 pruebas aprobadas (Auth portal, Citas,
  Eventos, Comunicados y Notificaciones).
- Casos: token ausente/interno/vencido, login portal, limpieza de sesión,
  selección y rechazo de hijo ajeno almacenado, error parcial, pagos sin datos,
  asistencia/notas vacías, navegación segura, Galería y Comunicados legacy,
  Calendario deep link, tabs y selector inferior.

## Reversión

Revertir este bloque frontend/documental. No se requiere rollback de base de
datos ni migración.

## Pendientes no bloqueantes

- Prueba humana final completa con cuentas familiares.
- Refresh token y recuperación automática permanecen fuera de V1.
- Limpieza futura del backend/datos legacy de álbumes debe diseñarse y aprobarse
  como trabajo técnico separado; no implica recuperar la función social.
