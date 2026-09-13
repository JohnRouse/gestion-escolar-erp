# Citas — agenda institucional V1

Fecha: 2026-09-11. Rama esperada: `feat/v1-citas`.
Estado: base individual implementada; ampliada por el incremento de reuniones de
sección del 2026-09-12. El acceso externo continúa pendiente.

## Alcance

Se reemplazó `/citas` pendiente por agenda operativa con creación interna,
detalle, filtros, resumen, estados, reprogramación, acuerdos e historial. El
backend separa destinos Docente/Tutor de Staff, estructura la matrícula del hijo
y aplica autorización por tenant, colegio, rol y participación. El portal consume
el nuevo contrato sin reescribir su autenticación.

## Datos y seguridad

La migración aditiva hace opcional `Cita.id_staff`, añade Docente, matrícula,
tenant, colegio y contexto, e incorpora `CitaMovimiento`. Preserva filas antiguas
y solo rellena relaciones demostrables. Fue aplicada y marcada como aplicada en
la base local de desarrollo antes del incremento del 2026-09-12. Las rutas
antiguas que cambiaban estado por ID sin actor fueron retiradas.

Las escrituras usan transacciones serializables y revalidan autoridad dentro de
la transacción. Admin/Director/Secretaria administran sus colegios; otros usuarios
internos solo sus citas como destino; Apoderado solo citas y matrículas propias.
No se confía en IDs del cliente ni se infieren funciones por cargo.

## Experiencia y accesibilidad

Se reutilizaron `PageHeader`, `AccessibleDialog` y `Toast`, tokens slate/azul y
estados funcionales. Escritorio usa lista administrativa; móvil usa fichas. Los
diálogos heredan Escape, trampa/retorno de foco y reducción de movimiento. Se
incluyeron carga, vacío, error, bloqueo, recarga y éxito. No se añadió calendario
decorativo, biblioteca visual o horario académico como disponibilidad.

## Integraciones y límites

El servicio emite avisos simples a destino/familia mediante
`NotificacionesService`; la bandeja y la propiedad de “marcar leída” siguen fuera.
El directorio legacy de Académicos deja de mezclar Docentes con Staff y el portal
usa destinos estructurados. Auth todavía rechaza roles externos, así que el flujo
del portal no se declara aceptado de extremo a extremo.

## Pruebas y reversión

La suite `citas.service.spec.ts` aprobó 17/17 casos dirigidos: alcance de los tres
roles gestores, propiedad de destino/apoderado, vínculo del hijo, Docente/Tutor,
Staff elegible, Persona dual, fechas, solapamiento, estados, reprogramación,
acuerdos, IDs ajenos y legacy. Los resultados de build, lint, Prisma, Chrome,
`git diff --check` y Graphify fueron:

- Prisma format, validate y generate: aprobados. En esa validación inicial la
  migración aún no se había aplicado; posteriormente fue aplicada y no debe
  reescribirse.
- API build: aprobado. ESLint dirigido sin `--fix`: aprobado.
- Intranet `build:check`: aprobado; conserva el aviso histórico de chunk mayor
  de 500 kB. ESLint dirigido: aprobado.
- Portal: TypeScript `--noEmit` y ESLint dirigido aprobados. `next build` compiló
  y terminó el chequeo TypeScript, pero el prerender global falló en la página no
  modificada `/dashboard/circulares` porque su `useSearchParams` carece de límite
  Suspense. No se amplió este incremento para corregir esa pantalla ajena.
- Chrome sintético sobre el build real de intranet: 1440×900, 1280×800, 768×900,
  390×844 y reflow de 720×450 equivalente a zoom 200 %. Sin desbordamiento,
  errores de consola ni pérdida de acciones. Se comprobó reducción de movimiento,
  creación, detalle, Escape y retorno de foco. Las capturas quedaron en `/tmp`.
- `git diff --check`: aprobado. `graphify update .`: aprobado; informó únicamente
  advertencias del extractor SQL opcional y un error de parseo preexistente en
  `web/src/app/layout.tsx`.

Revertir código/documentación requiere el patch inverso. La migración no aplicada
no requiere rollback. Si se aplica en el futuro, cualquier reversión debe preservar
citas y movimientos; no se autoriza borrado de datos históricos.
