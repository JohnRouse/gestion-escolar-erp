# Cambio: selector de audiencia escalable en Comunicados

## Fecha

2026-09-21.

## Estado

**En pruebas.** Implementación, pruebas dirigidas, compilación y revisión
visual aislada aprobadas. Pendiente repetir la prueba humana en el modal
autenticado completo.

## Módulo

Comunicados, exclusivamente el selector de audiencia del modal `Nuevo
comunicado` en Intranet.

## Motivo

La audiencia por niveles o secciones se mostraba como una lista plana de
checkboxes. Era funcional con pocos datos, pero no escalaba a instituciones con
varios niveles, grados y muchas secciones, y podía aumentar innecesariamente la
altura del modal.

## Problema anterior

- Niveles y secciones compartían el mismo listado plano.
- No existía búsqueda por nivel, grado o sección.
- No había selección masiva por grado o nivel.
- La selección no ofrecía un resumen compacto ni acción Limpiar.
- La relación Nivel → Grado → Sección no era visible.
- El estado sin estructura usaba una alerta amarilla prominente.

## Comportamiento nuevo

- Niveles usa botones compactos seleccionables, balanceados mediante wrap y
  con estado visible por borde, fondo, icono y `aria-pressed`.
- Secciones se agrupa en Nivel → Grado → chips de sección.
- El buscador local filtra por nivel, grado o sección sin nuevas solicitudes.
- Cada grado permite seleccionar o quitar sus secciones; cada nivel realiza la
  misma acción sobre sus secciones visibles.
- El resumen muestra contador, hasta tres chips removibles, `+N más` y Limpiar.
- El contenido jerárquico usa un máximo de 280 px, scroll vertical interno y
  oculta overflow horizontal.
- Los estados sin estructura y sin resultados son neutrales, específicos y
  recuperables.

## Reglas afectadas

No cambia ninguna regla de negocio. Se conservan la audiencia V1, el año, el
scope, los reseteos al cambiar institución/año/tipo, la selección múltiple y
las validaciones existentes.

## Roles afectados

Admin, Director y Secretaria autorizados para publicar. No cambia autorización
frontend ni backend.

## Alcance institucional

Aplica por igual en colegio específico y al crear desde el consolidado después
de elegir una institución. No cambia el aislamiento de tenant o colegio.

## Archivos modificados

- `intranet/src/pages/CircularesPage.tsx`.
- `intranet/src/pages/comunicados/AudiencePickers.tsx`.
- `intranet/src/pages/comunicados/audienceSelection.ts`.
- `intranet/src/pages/comunicados/comunicadosFormRules.ts`.
- `intranet/tests/comunicadosFormRules.test.mjs`.
- `intranet/package.json`.
- `docs/modulos/comunicados.md`.
- `docs/registro-cambios/README.md`.
- Este registro.

## Base de datos

Sin cambios. No se modificó Prisma, no se creó ni aplicó migración y no se
alteraron datos locales.

## Casos contemplados

- Uno o varios niveles.
- Una o varias secciones agrupadas por nivel y grado.
- Selección individual, por grado y por nivel visible.
- Limpieza completa y retiro individual desde el resumen.
- Resumen con una, tres o muchas selecciones.
- Búsqueda por nivel, grado y letra de sección.
- Búsqueda sin resultados y limpieza del término.
- Año sin estructura activa.
- Estructura extensa con scroll interno.
- Reflow angosto sin scroll horizontal.

## Validaciones

El filtrado y las selecciones se calculan con los datos ya cargados. Los
controles son `button` o `input`, admiten Tab, Shift+Tab, Space y Enter, tienen
foco visible y anuncian selección con `aria-pressed`. Las transiciones se
limitan a color/borde/foco y se desactivan con reducción de movimiento.

## Pruebas realizadas

- `npm run test:comunicados`: 13/13 aprobadas.
- ESLint dirigido a los archivos frontend modificados: aprobado.
- `npm run lint` global: no aprobado por 414 hallazgos preexistentes del
  Intranet (382 errores y 32 advertencias) en archivos ajenos a este cambio;
  no se modificaron como parte de este alcance.
- `npm run build:check`: aprobado; permanece el aviso preexistente/no
  bloqueante por chunk mayor de 500 kB.
- Browser headless con componente real y 42 secciones mock solo en memoria:
  1440×900, 1366×768 y smoke 390×844 aprobados.
- Navegación secuencial con Tab, activación con Space y Enter y foco visible:
  aprobados.
- `prefers-reduced-motion: reduce`: `transition-property: none`, aprobado.
- Selector extenso: contenido de 1082 px contenido en viewport interno de 280
  px; ancho de scroll igual al ancho cliente, sin overflow horizontal.
- Reflow equivalente a zoom aumentado y pantalla angosta: sin overflow
  horizontal. La comprobación humana con zoom nativo dentro de la aplicación
  autenticada continúa pendiente.

## Resultado

El selector queda compacto y escalable sin cambiar contratos ni payload. La
fixture temporal de revisión fue eliminada después de capturar evidencia; no
forma parte de los archivos del cambio.

## Riesgos

La jerarquía visual interpreta el nombre compuesto entregado por el contrato
vigente (`Nivel · Grado · Sección`). Si ese texto cambiara en el futuro, el
helper mantiene fallback legible, pero correspondería evolucionar el contrato
en una tarea independiente. Falta aceptación humana final en la pantalla
autenticada con datos reales.

## Compatibilidad

Se conserva exactamente `audiencia: { tipo, ids }`; para todo el colegio los
IDs siguen enviándose vacíos. No cambia API, backend, Prisma, rutas, portal,
lectura, confirmación, adjuntos, notificaciones ni datos históricos.

## Reversión

Aplicar el patch inverso únicamente a los archivos listados. No requiere
reversión de base de datos ni de datos.

## Documentación actualizada

Ficha del módulo Comunicados, índice del registro funcional y este registro.
No se modifican reglas transversales ni escenarios porque el cambio es solo de
presentación e interacción local.

## Referencia

Rama `feat/v1-comunicados`. Sin commit, push ni merge.

## Pulido visual final

El 2026-09-21 se realizó una última pasada exclusivamente visual, sin cambiar
helpers, estado, eventos ni payload:

- Las acciones masivas visibles se redujeron a `Todas` y `Quitar`; sus
  `aria-label` conservan la acción y el contexto completos.
- Los encabezados de nivel usan fondo gris neutro opaco y posición sticky
  dentro del scroll de 280 px. El encabezado siguiente desplaza al anterior.
- Los chips de sección usan 40 px de alto, mínimo uniforme de 56 px, radio y
  peso tipográfico consistentes, con seleccionado azul discreto.
- La grilla conserva dos columnas desde `sm`, una columna en ancho estrecho y
  separación vertical ajustada mediante contenido alineado al inicio.

La revisión browser usó exactamente 34 secciones mock en memoria: Inicial
(3/4/5 años A-B), Primaria (1ro a 6to con A-B o A-B-C) y Secundaria (1ro a 5to
con A-B o A-B-C). Aprobó 1440×900, 1366×768 y smoke 390×844. El encabezado
sticky permaneció alineado al borde superior del contenedor, sin transparencia
sobre el contenido; `scrollWidth` coincidió con `clientWidth`. Enter y Space,
`aria-pressed`, foco visible y `prefers-reduced-motion` conservaron el resultado
previo. La fixture temporal fue retirada y no se persistieron datos.

Para esta pasada, ESLint dirigido, `npx tsc -b`, `npm run build` y
`git diff --check` aprobaron. El lint global con `--quiet` conserva 382 errores
preexistentes en archivos ajenos al selector. Las pruebas funcionales no se
modificaron ni se repitieron porque el alcance fue exclusivamente de markup y
estilos; permanece vigente el resultado dirigido anterior de 13/13.
