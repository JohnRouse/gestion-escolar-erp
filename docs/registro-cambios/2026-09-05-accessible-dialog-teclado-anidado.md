# Cambio: teclado exclusivo del diálogo superior

## Fecha, estado y módulo

2026-09-05. Implementado; validado en Chrome/Playwright sobre componentes reales
en una fixture aislada. Infraestructura transversal de AccessibleDialog.

## Motivo y problema anterior

La reproducción previa al cambio, en 1280 × 720, confirmó:

| Acción | Resultado anterior | Resultado corregido |
|---|---|---|
| Escape con padre e hijo | Callbacks `padre,hijo`; cero diálogos | Callback `hijo`; padre abierto |
| Escape con hijo bloqueado | Callback `padre`; hijo aislado | Ningún callback; ambos abiertos |
| Tab desde primer control del hijo | Volvía al botón de cierre | Avanza al siguiente control |
| Shift+Tab desde cierre del hijo | Llegaba al último control | Se conserva, sin intervención del padre |

El padre interfería mediante su listener independiente de keydown en captura
sobre document. `stopPropagation` no evita otros listeners del mismo nodo.

## Comportamiento nuevo y diseño

- Un registro privado de capas y un único listener de teclado para todas las
  instancias abiertas. El listener se elimina al cerrar la última.
- Las capas siguen el orden DOM de los portales, que comparten `z-[12000]` y
  `document.body`: representa su orden de pintado, sin depender del orden de
  ejecución de efectos/listeners. La reapertura también respeta ese orden.
- Se selecciona una sola instancia por evento. El cierre síncrono no vuelve a
  despachar Escape al padre recién expuesto.
- Escape se consume incluso si el superior rechaza cerrar por `preventClose`
  o `closeOnEscape=false`. Solo este superior procesa Tab/Shift+Tab.
- Registro, opciones vigentes y foco inicial se sincronizan en layout effects.
  Se elimina requestAnimationFrame; no se añaden timeouts ni retardos.
- Se conserva el destino inicial nativo para el replay de StrictMode mientras
  pertenezca al mismo panel. `initialFocusRef` mantiene prioridad.
- El cierre de una capa inferior no roba foco al superior. Su origen externo
  se transmite a capas cuyos controles de apertura desaparecen con ella.
- Se conserva el contador de scroll y el valor original de overflow.

## Reglas, roles y alcance institucional

Regla de interfaz transversal; sin cambios de reglas académicas o financieras.
Afecta a los roles que ya pueden abrir cada consumidor. Mismo comportamiento en
Todos los colegios, colegio específico y usuarios con uno o varios colegios.
La autorización permanece en los consumidores y sus servicios.

## Archivos y documentación

- `intranet/src/components/AccessibleDialog.tsx`: única modificación de producto.
- `intranet/tests/dialog/`: fixture, runner Playwright y procedimiento.
- Este registro; escenario `docs/escenarios/dialogos-anidados-teclado.md`.
- Índices de escenarios y cambios; reglas de UI en `docs/02-sistema-de-diseno-ui-ux.md`.
- Estado de infraestructura en `docs/auditoria/17-estado-actual-componentes-globales.md`
  (documento vigente de este componente transversal) y `docs/06-estado-del-proyecto.md`.

## Base de datos, trazabilidad y compatibilidad

Sin cambios en backend, API, Prisma, base de datos ni consumidores, incluido
ContinuidadMatriculaModal. Sin solicitudes de negocio ni datos persistidos. No
hay migraciones, entidades transformadas ni impacto en registros históricos.
La trazabilidad de este cambio es documental y el diff local. Se conserva el
contrato público de la primitiva y sus wrappers.

## Pruebas y resultados

Playwright 1.63.0 con Chrome local, fixture en `/tests/dialog/`, React StrictMode:

- Escape normal y síncrono, bloqueo dinámico y closeOnEscape desactivado: pasan.
- Avance interior, límites en ambas direcciones, foco externo/panel, cero
  controles y exclusión de ocultos/deshabilitados: pasan.
- Tres capas, autoFocus nativo en montaje condicional, foco explícito de
  ConfirmDialog y autoFocus de CenteredFormModal: pasan.
- Desmontaje inferior, cierre simultáneo, reapertura y cinco ciclos de apertura:
  pasan; se mantienen retorno de foco y overflow original `scroll`.
- Cierre con botón, overlay y Cancelar: pasan.
- Cero errores JavaScript de página y cero solicitudes de API o mutación.
  Las fuentes de Google del CSS se bloquearon; se usaron fuentes de respaldo.
- `npm run build` y `npm run build:check` en intranet: correctos. Vite advierte
  de un chunk superior a 500 kB; no bloquea compilación.
- ESLint dirigido a la primitiva y fixture: correcto.
- `git diff --check`: correcto.
- `graphify update .`: actualización AST completada, sin coste de API. El grafo
  queda en 2975 nodos/6262 relaciones en esta ejecución. Advertencias ajenas a
  esta corrección: parser SQL opcional ausente (48 archivos sin extracción),
  extracción parcial de `web/src/app/layout.tsx` y etiquetas de comunidades
  parcialmente reajustadas. No se regeneró la semántica de documentación.


## Revisión visual y accesibilidad

Se reutiliza AccessibleDialog y sus patrones existentes: `max-w-2xl`, altura
máxima basada en `100dvh`, scroll interno, anillo de foco y
`motion-reduce:animate-none`. No se modifican CSS, tokens ni transiciones.
La eliminación de requestAnimationFrame afecta la inicialización del foco, no
las clases de entrada (200 ms) ni las transiciones del botón (150 ms).

Resoluciones verificadas: 360×800, 390×844, 768×1024, 1024×768, 1280×720,
1366×768, 1440×900, 1920×1080 y 2560×1440. El panel queda dentro del viewport,
el botón de cierre muestra foco visible y la navegación permanece en el hijo.
Con movimiento reducido la animación computada es `none`.

Zoom equivalente 125 %, 150 % y 200 % mediante reducción del viewport CSS
respecto de 1440×900: panel y teclado operables. Se generaron capturas locales;
esto no equivale a una prueba del zoom nativo de la interfaz de Chrome.

## Riesgos y límites

- La selección de capa presupone los portales actuales con igual z-index y
  destino. Un cambio futuro de esa política deberá actualizar el registro.
- No se ejecutaron los flujos de negocio reales de cada pantalla, ni lectores
  de pantalla, otros motores de navegador o zoom nativo. La validación cubre la
  primitiva y dos wrappers reales con datos sintéticos en memoria.
- No se añaden inert, aria-hidden del fondo ni un trap de eventos focusin;
  esta corrección se limita al propietario del teclado y al ciclo de foco.

## Reversión y referencia

Para revertir esta corrección, revertir la modificación de `AccessibleDialog`
y los archivos documentales y de prueba asociados a este cambio.
No requiere reversión de datos porque no hubo cambios en backend, esquema ni
persistencia.
