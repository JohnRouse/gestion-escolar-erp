# Citas

## Estado y propósito

Estado: **EN PRUEBAS para V1**. La agenda institucional interna admite citas
individuales y reuniones de sección con API, autorización, estados, acuerdos e
historial. El portal familiar sigue bloqueado para aceptación de extremo a
extremo porque la autenticación vigente rechaza cuentas Apoderado/Padre/Madre.

`/citas` es un único módulo y una única agenda. La primera decisión del alta es:

- **Cita individual:** conversación asociada a una matrícula, estudiante y
  apoderado vinculados.
- **Reunión de sección:** convocatoria colectiva cuya audiencia estructural es
  una sección; no usa un estudiante o apoderado ficticios.

En ambos casos se elige un responsable como Docente/Tutor o Staff. Persona sigue
siendo la identidad canónica: una Persona dual puede figurar en ambos contextos,
sin duplicarse ni convertir Docentes en Staff técnico.

## Modelo y migraciones

La migración `20260911160000_citas_v1_agenda` creó la base de agenda V1 e
historial y ya está aplicada/marcada como aplicada en la base local de desarrollo.
No se modifica en este incremento.

La segunda migración aditiva
`20260911220000_citas_reuniones_seccion` permanece **creada pero no aplicada**.
Hace `Cita.id_apoderado` nullable y agrega:

- `Cita.tipo`: `individual` o `seccion`, con `individual` por defecto para que
  todas las filas históricas conserven su semántica.
- `Cita.id_seccion`: relación opcional con `Seccion`, indexada junto con fecha.

Reglas de escritura comprobadas por backend:

- `tipo=individual`: `id_matricula` e `id_apoderado` son obligatorios y deben
  representar una matrícula activa y un vínculo real; no acepta audiencia
  colectiva.
- `tipo=seccion`: `id_seccion` es obligatorio; `id_matricula` e `id_apoderado`
  deben ser `NULL`.
- Ambos tipos pertenecen a tenant/colegio y tienen exactamente un responsable
  Docente o Staff con contexto estructurado.

`CitaMovimiento` continúa siendo append-only y conserva creación, transición,
reprogramación y acuerdos con actor, fecha, estado, horario anterior/nuevo y
comentario. No se eliminan citas ni movimientos.

## Búsqueda de familia

`GET /citas/participantes` no devuelve datos al abrir el diálogo. Requiere una
búsqueda de al menos dos caracteres, se consume con debounce de 300 ms y
cancelación de la solicitud anterior, consulta en base de datos y limita la
búsqueda a 25 matrículas.

Busca parcialmente por:

- nombres, apellidos y DNI del estudiante;
- `Matricula.codigo_matricula`;
- `Estudiante.codigo_estudiante`;
- nombres, apellidos y DNI del apoderado.

Solo considera matrículas operativas (`Activo`, `Matriculado` o
`Pre-matriculado`), colegios autorizados del tenant y relaciones persistidas
`ApoderadoEstudiante`. Una consulta compuesta por varias palabras exige que cada
término coincida en algún campo de la misma Persona.

La unidad del contrato es matrícula/estudiante, no matrícula+apoderado. Cada
`id_matricula` se devuelve una vez con `apoderados[]`, lista que contiene
únicamente sus vínculos reales y su parentesco persistido. Cuando la consulta
coincide inequívocamente con un solo apoderado se incluye
`apoderado_coincidente`; una coincidencia simultánea de alumno y apoderado nunca
duplica la matrícula.

La UI muestra estudiante, sección, institución solo en consolidado y código de
matrícula/estudiante. Tras elegirlo, presenta el campo obligatorio `Apoderado
participante` con los elementos de `apoderados[]`; usa la coincidencia inequívoca
como preselección y deja la elección manual cuando hay ambigüedad. El estado
vacío distingue falta de texto, búsqueda en curso, error y ausencia real de
coincidencias.

## Responsables

- **Docente:** asignación académica persistida en la sección.
- **Tutor:** relación de Tutoría persistida y presentada como contexto Docente;
  la cita/reunión guarda `id_docente`, no crea Staff por ser Tutor.
- **Staff:** `es_miembro_staff=true`, `permite_citas=true` y pertenencia al
  colegio.

Una Persona Docente+Staff puede aparecer dos veces cuando ambas funciones son
válidas. Para reuniones creadas por Profesor, las opciones de responsable se
restringen a su propia Persona y a sus contextos válidos; un gestor puede elegir
un responsable elegible de la sección/colegio.

Pendientes y confirmadas de ambos tipos bloquean solapamientos del mismo
responsable incluso si una reserva usa contexto Docente y otra Staff sobre la
misma Persona.

## Secciones y permisos

- Admin: cualquier sección de sus colegios con autoridad efectiva.
- Director: cualquier sección de sus colegios con autoridad efectiva.
- Secretaria: cualquier sección de sus colegios con autoridad efectiva; no usa
  consolidado.
- Profesor: únicamente secciones donde `AsignacionDocente.id_docente` coincide
  con su Persona.
- Tutor: su sección `Staff.id_seccion` con `es_tutor=true`; también conserva sus
  secciones docentes reales.

Las opciones de Profesor/Tutor se deduplican por `id_seccion` y muestran todas
las relaciones encontradas, por ejemplo `Tutor` y `Comunicación`. El backend
vuelve a cargar la sección dentro de la transacción, comprueba tenant, colegio,
rol efectivo y asignación; conocer o alterar un `id_seccion` no concede acceso.

## Audiencia de una reunión

Los participantes no se copian en la reunión. En el detalle se derivan siempre:

`Sección → matrículas activas → estudiantes → vínculos de apoderados`.

La respuesta muestra conteos deduplicados de familias y estudiantes y una vista
secundaria desplegable con ambos listados. Una futura entidad separada podrá
registrar asistencia individual sin cambiar la audiencia estructural de V1.

## Estados, historial y acuerdos

La máquina compartida admite:

```text
pendiente → confirmada → realizada
pendiente → rechazada                  (solo cita individual)
pendiente / confirmada → cancelada
pendiente / confirmada --reprogramar--> pendiente
```

Una reunión no expone ni acepta rechazo colectivo. Cancelar exige motivo.
Reprogramar valida fecha, orden horario y solapamiento, conserva antes/después y
vuelve a pendiente. Los acuerdos pueden anexarse en confirmada o realizada.

## Agenda y detalle

La agenda distingue cada fila con badge discreto `Individual` o `Sección`.
Individual muestra estudiante/apoderado; Sección muestra sección y asunto. Ambas
muestran responsable, horario, institución cuando el alcance es consolidado y
estado textual.

El detalle individual contiene alumno, apoderado, responsable, motivo, horario,
acuerdos e historial. El detalle grupal contiene colegio, sección, responsable,
conteos/listas convocadas, asunto, horario, acuerdos e historial; no renderiza
campos vacíos de estudiante o apoderado.

## Portal de familias

No se amplió ni relajó autenticación externa. El contrato de
`GET /citas/apoderado` ya incluye:

- citas individuales cuyo `id_apoderado` coincide con la identidad autenticada;
- reuniones de secciones donde mantiene un hijo con matrícula activa y vínculo
  persistido.

El portal presenta una reunión mediante `tipo` y `seccion`, sin llamarla registro
legacy. La cancelación familiar continúa limitada a citas individuales propias;
una familia no puede cancelar una reunión colectiva. No se implementó asistencia.

## Notificaciones

Se reutiliza la bandeja personal de Notificaciones V1. La creación avisa al
responsable interno y los cambios relevantes avisan a las cuentas familiares
activas. Cada aviso nuevo guarda tenant, colegio, origen `citas`, referencia a
la cita y canal `intranet` o `padres`. Los usuarios se deduplican dentro de la
operación. Para reuniones se emiten los eventos:

- `cita.seccion.creada`;
- `cita.seccion.reprogramada`;
- `cita.seccion.cancelada`.

Los destinatarios se derivan de matrículas `Activo`, `Matriculado` o
`Pre-matriculado` y vínculos actuales de la sección. Un fallo de aviso se
registra y no revierte la transacción de agenda.

## API

| Método y ruta | Finalidad |
|---|---|
| `GET /citas` | Agenda interna paginada, resumen y filtros |
| `GET /citas/participantes?q=...` | Búsqueda incremental de matrículas/apoderados elegibles |
| `GET /citas/destinatarios` | Responsables válidos para una cita individual |
| `GET /citas/secciones` | Secciones autorizadas, deduplicadas para Profesor/Tutor |
| `GET /citas/responsables` | Responsables válidos para una reunión de sección |
| `POST /citas` | Creación discriminada por `tipo` |
| `GET /citas/:id` | Detalle autorizado, incluida audiencia grupal |
| `PATCH /citas/:id/estado` | Confirmar, rechazar individual, cancelar o realizar |
| `PATCH /citas/:id/reprogramar` | Reprogramación trazable |
| `POST /citas/:id/acuerdos` | Acuerdo append-only |
| `GET /citas/apoderado/hijos` | Matrículas activas vinculadas |
| `GET /citas/apoderado/destinatarios` | Destinos para matrícula propia |
| `GET /citas/apoderado` | Citas propias y reuniones de secciones vinculadas |
| `POST /citas/apoderado` | Cita individual propia |
| `PATCH /citas/apoderado/:id/cancelar` | Cancelación individual propia con motivo |

Todas las entradas usan DTO estricto. Fecha es `AAAA-MM-DD`; horas son `HH:mm` y
el inicio debe preceder al fin.

## UI, accesibilidad y validación

- Componentes/patrones: `PageHeader`, `AccessibleDialog`, `Toast`, controles y
  superficies vigentes; no se añadió biblioteca visual.
- Formulario: selector de tipo al inicio y montaje exclusivo de campos por tipo.
  Profesor entra directamente en `Reunión de sección`; `Cita individual` queda
  visible como opción no habilitada porque ese flujo exige gestión autorizada.
- Responsive: una columna en pantalla angosta, grillas desde `sm`, modal con
  scroll interno y resultados con altura limitada.
- Accesibilidad: labels/fieldset, foco inicial, foco visible, teclado,
  `aria-live`, estados textuales y `motion-reduce`.
- Estados: carga, búsqueda, vacío, error/reintento, bloqueo y éxito.
- Alta individual: la selección principal es una matrícula; el apoderado se
  elige después en un `select` etiquetado y obligatorio. El backend revalida el
  vínculo y responde 400 sin persistir ante una combinación manipulada.

Prisma format/validate/generate, API build, intranet `build:check`, Jest dirigido
(48/48) y ESLint dirigido aprobaron sin aplicar la segunda migración. Chrome
sobre el build real con mocks seguros aprobó `/citas`, Individual, Reunión y
detalle en 1440×900, 390×844 y reflow 720×450 equivalente a 200 %, sin overflow
ni errores de consola. Escape devolvió el foco, el foco visible permaneció claro
y `prefers-reduced-motion` dejó cero animaciones activas. Se corrigió el hallazgo
de texto inconsistente `Destinatario` → `Responsable`; no se añadió ni cambió
ninguna animación. `git diff --check` aprobó y `graphify update .` reconstruyó el
grafo de código (3417 nodos/7292 aristas); mantuvo avisos no bloqueantes por el
extractor SQL opcional y un parseo parcial preexistente en `web/src/app/layout.tsx`.

La corrección de contrato del 2026-09-13 volvió a aprobar Jest de Citas (48/48),
API build e intranet `build:check`. No requirió cambios Prisma, migración ni
animaciones. Por alcance solicitado no se repitió la auditoría visual/responsive
completa; queda pendiente la última prueba humana del selector individual.

## Reversión

El código/documentación puede revertirse con patch inverso. Si la segunda
migración llegara a aplicarse, la reversión debe conservar/exportar reuniones,
retirar primero la FK e índices de `id_seccion` y nunca eliminar citas o
movimientos históricos. No se usa `prisma db push`, reset ni seed.
