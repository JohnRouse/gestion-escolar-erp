# Cambio: Comunicados V1 con audiencia y estado personal

## Fecha y estado

2026-09-20. **En pruebas**, corrección anual preparada y pendiente de revisión
y aplicación manual de la nueva migración antes de repetir aceptación humana.

## Módulo y motivo

Comunicación institucional, portal de familias y Notificaciones. Se reemplaza
el nombre visible Circulares por Comunicados y se cierra el aislamiento de
scope, audiencia, lectura y confirmación que el flujo anterior no garantizaba.

Durante la prueba humana con matrículas operativas 2027 se detectó que el
selector elegía 2026 por estado Abierto y que `Circular` no persistía año. Como
`Seccion` se reutiliza, el mismo `id_seccion` podía representar audiencias de
años distintos. Esa era la causa de una posible exposición cruzada.

## Comportamiento nuevo

- Gestión para Admin, Director y Secretaria con `jwt`, `RolesGuard`, tenant,
  colegio y `rol_colegio` efectivo; Profesor queda rechazado.
- Audiencia V1 desde estructura anual activa; todo el colegio usa NULL/NULL.
- `Circular.id_anio` persiste el año explícito de cada publicación nueva. El
  selector muestra todos los años permitidos y prioriza matrículas operativas.
- Colegio, nivel, sección, portal, notificaciones, lectura y confirmación exigen
  coincidencia anual para comunicados nuevos.
- Categorías acotadas, urgencia independiente y adjuntos con política común.
- Portal `jwt-portal` mobile-first con búsqueda, filtros, detalle, adjuntos,
  lectura y confirmación reales.
- `CircularEstadoApoderado` es fuente única por Apoderado canónico; las columnas
  de destinatario quedan legacy y no hubo backfill.
- Notificación deduplicada por Usuario, contexto explícito y deep link canónico.
- Rutas legacy de ambos clientes redirigen conservando query; NotificationBell
  convierte URLs históricas.
- Eventos, Comunicados y Notificaciones permanecen separados.

La confirmación V1 es un acuse personal registrado, no firma digital
certificada ni consentimiento jurídico formal.

## Base de datos

La migración `20260919190000_comunicados_estado_apoderado` ya había sido
revisada, aplicada correctamente en `gestion_escolar_erp_local`, registrada con
`prisma migrate resolve` y verificada antes de retomar este trabajo. No se
modificó ni reaplicó.

Se preparó `20260920230000_comunicados_anio`, que solo agrega la columna
nullable `Circular.id_anio`, índice y FK a `AnioLectivo` con `ON DELETE
RESTRICT ON UPDATE CASCADE`. Es nullable por compatibilidad histórica, pero el
DTO y servicio la exigen para toda publicación nueva. No realiza backfill, no
deduce años y **no se aplicó**. No se ejecutaron db push, migrate dev, migrate,
reset ni seed.

## Casos y validaciones

Se cubren roles de gestión, año de otro colegio, año cerrado, selector
2026/2027, prioridad 2027 por matrícula operativa, sección ausente de
`SeccionAnio`, audiencia general sin estructura, cruce 2026/2027 para
colegio/nivel/sección, deduplicación, recurso familiar propio/ajeno, lectura y
confirmación, deep link, adjuntos, redirects, JWT y legacy. DTO y backend
rechazan contenido, audiencia, tipos, tamaños y scope inválidos.

## Pruebas realizadas

- Jest API dirigido de esta corrección (Comunicados, Portal y Notificaciones):
  58/58.
- Node dirigido de reglas de formulario y rutas intranet: 3/3.
- Node dirigido del portal y NotificationBell: 8/8.
- `npm run build` de API: aprobado.
- `npm run build:check` de Intranet: aprobado; Vite mantiene el aviso no
  bloqueante de chunk mayor de 500 kB.
- `npx tsc --noEmit` de Padres: aprobado.
- `npm run build` de Padres: aprobado; Next conserva el aviso no bloqueante por
  múltiples lockfiles al inferir la raíz del workspace.
- ESLint dirigido, sin `--fix`, de los archivos propios del incremento en API,
  Intranet y Padres: aprobado.
- `git diff --check`: aprobado.

`npx prisma format`, `npx prisma validate` y `npx prisma generate`: aprobados
sin aplicar la migración. No se declara validación visual: no existe runtime de
navegador/Playwright disponible en este workspace para este incremento.

## Diseño y accesibilidad

Intranet reutiliza `PageHeader`, `AccessibleDialog`, `inputClass`, tabla/tarjetas
y tokens Carbon-inspired. El hallazgo corregido es que el año operativo quedaba
oculto: ahora existe un selector etiquetado `Año lectivo *`, con estado visible,
foco consistente y limpieza de audiencia al cambiar. No se agregó componente
paralelo ni biblioteca visual.

La revisión estática confirma orden DOM, etiquetas, control nativo por teclado,
foco visible heredado y que no se añadieron animaciones o transiciones; por ello
`prefers-reduced-motion` no cambia. Los builds validan los breakpoints existentes,
pero la comprobación real en 360×800, 390×844, 768×1024, 1280×720, 1440×900 y
1920×1080, zoom 125/150/200 %, teclado, foco y reducción de movimiento queda
pendiente para la aceptación humana posterior a la migración. Portal mantiene
patrón mobile-first, controles de al menos 44 px, mensajes persistentes y
reintento de lectura sin bucle.

## Compatibilidad, riesgos y reversión

La API y modelos siguen llamándose Circular. Los comunicados legacy sin año
conservan tratamiento restrictivo y no se atribuyen a un año sin evidencia; no
se mutan ni se amplía su acceso. El almacenamiento local heredado usa rutas
aleatorias bajo `/uploads`; entrega privada/firmada es deuda transversal. La
publicación y el aviso no forman una transacción distribuida con el filesystem,
por lo que reconciliación automática ante fallos externos queda P1.

Antes de aplicarla, revertir la corrección mediante patch inverso y retirar solo
la migración anual no aplicada. No revertir ni editar la migración de estado ya
aplicada y no eliminar estados personales sin un plan de datos independiente y
respaldado.

## Documentación actualizada

Ficha de módulo, escenario, reglas transversales, roles, índices, flujo,
estado del proyecto y plan de cierre V1.

## Referencia

Rama `feat/v1-comunicados`. Sin commit, push ni merge.
