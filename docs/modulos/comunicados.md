# Comunicados

## 1. Estado

**En pruebas.** La V1 está implementada en backend, intranet y portal. La
migración aditiva `20260919190000_comunicados_estado_apoderado` ya fue aplicada
y no se modifica. La nueva migración
`20260920230000_comunicados_anio` está preparada para revisión manual y **no se
ha aplicado**. Prisma validate/generate, pruebas dirigidas y builds aprobaron;
la aceptación humana anual requiere aplicar primero esa migración de forma
controlada.

## 2. Propósito

Comunicados publica avisos y comunicaciones formales institucionales para las
familias. El nombre visible es **Comunicados**; el modelo y la API conservan
`Circular` y `/circulares` por compatibilidad interna.

- Evento calendariza una actividad.
- Comunicado contiene la comunicación formal, audiencia y adjuntos.
- Notificación es el aviso personal automático que conduce al comunicado.

Ninguno de estos módulos sustituye a los otros.

## 3. Usuarios y roles

- Admin, Director y Secretaria consultan y publican solo en colegios donde su
  membresía activa y `rol_colegio` efectivo permiten gestión.
- Profesor no crea, edita ni publica y no tiene entrada al módulo interno.
- Apoderado consulta, lee y confirma solo mediante `jwt-portal`, vínculos
  `ApoderadoEstudiante` y matrículas operativas.

El frontend orienta la navegación; guards y servicio vuelven a autorizar.

## 4. Alcance institucional

- Colegio específico: lista, detalle, opciones y creación se limitan a ese
  tenant/colegio.
- Consolidado: solo incorpora membresías de gestión activas del tenant activo;
  cada fila identifica su institución.
- Crear siempre requiere tenant y colegio inequívocos.
- Un ID directo de otro tenant/colegio responde sin revelar el recurso.
- Un registro histórico con colegio conocido puede usar ese contexto; uno con
  tenant y colegio nulos solo entra en intranet cuando existe un único contexto
  no ambiguo.

## 5. Datos principales

- `Circular`: contenido, tenant, colegio, año lectivo, remitente, categoría,
  urgencia y requisito de confirmación. `id_anio` es nullable únicamente para
  compatibilidad legacy; todo comunicado nuevo V1 lo persiste.
- `CircularDestinatario`: audiencia compartida. Sus columnas históricas
  `leida`, `fecha_lectura`, `confirmada` y `fecha_confirmacion` son **legacy** y
  no calculan el estado personal del portal.
- `CircularEstadoApoderado`: fuente única de lectura y confirmación personal.
- `Adjunto`: nombre y URL de archivo asociado.
- `Matricula`, `ApoderadoEstudiante` y `Usuario`: resuelven familias y avisos.

## 6. Flujo principal

1. Un gestor abre `/comunicados` y elige una institución y un año lectivo
   visible.
2. Registra categoría, título, contenido, audiencia, urgencia, confirmación y
   adjuntos opcionales.
3. El backend valida actor, tenant, colegio, año permitido y destinos contra la
   estructura activa de ese mismo año.
4. Se crea `Circular` con `id_tenant`, `id_colegio`, `id_anio` y sus
   destinatarios. Todo el colegio genera exactamente
   una fila `id_nivel=NULL, id_seccion=NULL`.
5. Los adjuntos aceptados se guardan mediante `StorageService` y se asocian en
   lote al comunicado.
6. Se resuelven matrículas operativas y se crea una notificación por Usuario.
7. El portal deriva de nuevo la audiencia real; la notificación o el query param
   no conceden acceso.

## 7. Audiencia y año operativo

Audiencias V1: todo el colegio, uno o varios niveles, o una o varias secciones.
No existen niveles hardcodeados ni catálogo global. Las opciones se deduplican
desde `SeccionAnio` activa, siguiendo
`SeccionAnio → Seccion → Grado → Nivel` para el tenant, colegio y año
seleccionado.

Opciones excluye Cerrado, Archivado y Finalizado; admite Abierto, En curso,
Activo, Matrícula abierta y Planificación. El selector permanece visible cuando
hay uno o varios años. La recomendación inicial prioriza un año con matrículas
operativas y luego estado (Abierto/En curso/Activo, Matrícula abierta,
Planificación) y fecha. Cambiar institución limpia año y audiencia; cambiar año
limpia los destinos y recarga estructura sin conservar IDs del anterior.

Todo el colegio no consulta ni expande niveles, pero queda acotado por
`Circular.id_anio`. Si el año es válido y todavía no tiene `SeccionAnio`, esa
audiencia continúa disponible; nivel y sección se deshabilitan con el mensaje
`No existe estructura activa para este año.`

## 8. Categorías, urgencia y adjuntos

Categorías: General, Académico, Administrativo, Urgente, Actividad y
Recordatorio. `urgente` es una marca independiente.

Cada carga admite hasta cinco archivos de 10 MB y un comunicado hasta diez.
Se aceptan PDF, JPG/JPEG, PNG, WebP y documentos comunes de Word, Excel y
PowerPoint. Cliente y backend comprueban tamaño, MIME y extensión; el nombre se
reduce a su segmento final y el almacenamiento genera una ruta propia segura.
Intranet y portal abren el adjunto en una pestaña separada.

## 9. Lectura y confirmación personal

La identidad funcional es `UNIQUE(id_circular, id_apoderado)`. Varias cuentas
de la misma Persona Apoderado comparten estado; `id_usuario_lectura` e
`id_usuario_confirmacion` conservan la cuenta que realizó cada primera acción.

- Ausencia de fila: no leído y no confirmado.
- Lectura: `fecha_lectura != NULL`.
- Confirmación: `fecha_confirmacion != NULL`; al confirmar también se asegura
  lectura.
- Ambas acciones son idempotentes y vuelven a validar audiencia.
- Un comunicado sin `requiere_autorizacion` rechaza confirmación.

V1 registra un **acuse o confirmación personal de recepción**, no una firma
digital certificada ni consentimiento jurídico formal.

## 10. Publicación y notificaciones

Se consideran matrículas `Activo`, `Matriculado` y `Pre-matriculado`; se
excluyen `Inactivo` y `Reserva`. Para comunicados V1 se exige además
`Matricula.id_anio = Circular.id_anio` tanto para todo el colegio como para
nivel o sección. Los Usuarios se deduplican aunque coincidan varios hijos. El
aviso conserva tenant/colegio explícitos,
`referencia_tipo=circular`, `referencia_id=<id>` y URL
`/dashboard/comunicados?id_circular=<id>`.

## 11. Portal y rutas

- Intranet canónica: `/comunicados`.
- Intranet legacy: `/circulares` redirige y conserva query params.
- Portal canónica: `/dashboard/comunicados`.
- Portal legacy: `/dashboard/circulares` redirige y conserva query params.
- API compatible: `/circulares`.

El portal mobile-first ofrece listado, búsqueda, filtros de lectura, urgentes y
adjuntos, detalle, remitente, audiencia, fecha, contenido, archivos y acuse de
recepción. `id_circular` abre detalle solo si el ID aparece en la respuesta
autorizada. NotificationBell convierte además la URL histórica antes de
navegar.

## 12. Estados de interfaz y accesibilidad

Intranet usa `PageHeader` y `AccessibleDialog`, con filtros, tabla/tarjetas,
paginación, formulario y detalle. Ambos clientes contemplan carga, vacío,
error, éxito y reintento; no usan `alert()`. Los controles tienen texto, foco
visible y áreas táctiles, y las animaciones existentes respetan reducción de
movimiento.

En `Nuevo comunicado`, los niveles se presentan como botones seleccionables
compactos. Las secciones se agrupan en la jerarquía Nivel → Grado → Sección,
con búsqueda local por esos tres campos, selección masiva por nivel o grado,
resumen limitado a tres chips y acción Limpiar. El listado de secciones tiene
un máximo de 280 px y scroll vertical propio para no aumentar indefinidamente
el modal. La selección usa botones nativos con `aria-pressed`, icono de
confirmación y foco visible; no depende solo del color. Sin estructura o sin
resultados de búsqueda se muestran estados vacíos neutrales y diferenciados.
Los encabezados de nivel permanecen visibles durante el scroll interno; sus
acciones y las de grado usan textos compactos `Todas`/`Quitar` con nombres
accesibles completos. Los chips de sección mantienen 40 px de alto y un ancho
mínimo uniforme de 56 px.

## 13. API

| Método y ruta | Guard | Finalidad |
|---|---|---|
| `GET /circulares` | `jwt` + roles | Lista interna paginada y filtrada |
| `GET /circulares/opciones` | `jwt` + roles | Año y audiencia operativa |
| `GET /circulares/count` | `jwt` + roles | Conteo en scope |
| `GET /circulares/:id` | `jwt` + roles | Detalle interno autorizado |
| `POST /circulares` | `jwt` + roles | Publicar comunicado |
| `POST /circulares/:id/adjuntos` | `jwt` + roles | Asociar adjuntos validados |
| `GET /circulares/padres` | `jwt-portal` | Lista familiar autorizada |
| `PUT /circulares/:id/leida` | `jwt-portal` | Marcar lectura personal |
| `POST /circulares/:id/confirmar` | `jwt-portal` | Confirmar recepción personal |

## 14. Base de datos y compatibilidad

La migración aplicada `20260919190000_comunicados_estado_apoderado` crea
`CircularEstadoApoderado` y permanece intacta. La migración pendiente
`20260920230000_comunicados_anio` agrega únicamente `Circular.id_anio`, su
índice y FK a `AnioLectivo` con `ON DELETE RESTRICT ON UPDATE CASCADE`.

No existe backfill. Los comunicados legacy sin año conservan tratamiento
restrictivo y no se atribuyen a un año sin evidencia. No se infiere año por
fecha, sección ni catálogo; su política de acceso previa no se amplía.

## 15. Pruebas y trazabilidad

Las pruebas dirigidas cubren roles, scope, años 2026/2027, prioridad por
matrícula, año cerrado/ajeno, estructura anual, destinos NULL/NULL, cruce de
años en colegio/nivel/sección, matrículas operativas, deduplicación, portal,
lectura/confirmación, legacy, adjuntos, aislamiento JWT y redirects. Los
resultados exactos están en el registro funcional.

Las reglas frontend cubren además selección simple y múltiple de niveles,
agrupación Nivel → Grado → Sección, selección individual y masiva, limpieza,
búsqueda por nivel/grado/sección, búsqueda sin resultados, cambio de año y
conservación exacta de los IDs en el payload.

`CircularEstadoApoderado` conserva actor y fecha para lectura/confirmación. La
creación conserva remitente, tenant, colegio y fecha. V1 no introduce edición,
borrado ni firma digital.

## 16. Pendientes y deuda técnica

- Revisión y aplicación manual de `20260920230000_comunicados_anio`; luego,
  aceptación humana final con datos persistidos en las resoluciones objetivo,
  zoom, teclado y reducción de movimiento.
- Repetir la prueba humana visual del selector jerárquico dentro del modal
  autenticado completo. La fixture temporal con datos en memoria aprobó
  1440×900, 1366×768 y smoke 390×844 sin modificar persistencia.
- El almacenamiento local heredado sirve `/uploads`; una futura entrega privada
  o firmada requiere una decisión transversal de almacenamiento, no un sistema
  paralelo exclusivo de Comunicados.
- Reintento/reconciliación automática de notificaciones y archivos ante fallos
  externos queda como hardening P1.
- Fuera de V1: firma digital certificada, chat/respuestas, seguimiento legal,
  proveedores email/SMS y analítica avanzada de aperturas.

## 17. Historial de cambios

- [Selector de audiencia escalable](../registro-cambios/2026-09-21-comunicados-selector-audiencia.md).
- [Comunicados V1](../registro-cambios/2026-09-20-comunicados-v1.md).
