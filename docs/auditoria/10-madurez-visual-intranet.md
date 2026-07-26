# Madurez visual del intranet

## Propósito

Este documento registra el estado real de las páginas que viven dentro de `intranet/` y evita considerar una pantalla como terminada únicamente porque su ruta o lógica ya existen.

La revisión de `padres/` y `web/` queda fuera de este alcance hasta que esos frontends entren formalmente en trabajo.

## Estados

- **SIN DISEÑO**: la ruta existe, pero utiliza una pantalla de reserva o no tiene interfaz funcional propia.
- **PROVISIONAL**: existe una interfaz mínima que permite probar parte del flujo, pero no representa el diseño objetivo.
- **FUNCIONAL NO FINAL**: la lógica principal existe, aunque la estructura visual, los estados, el responsive o la accesibilidad todavía requieren rediseño.
- **PARCIAL**: existe una base visual consistente y algunos bloques ya están unificados, pero falta cerrar la revisión visual o funcional.
- **DISEÑO FINAL**: la página fue implementada, revisada visualmente, validada en responsive y documentada con su commit y PR.
- **BLOQUEADO**: no puede cerrarse por una dependencia funcional, de producto, permisos, API o datos.
- **REVISIÓN PENDIENTE**: la ruta está inventariada, pero todavía no se realizó una revisión semántica suficiente para clasificarla.

## Reglas de cierre

Una página solo puede pasar a **DISEÑO FINAL** cuando se hayan documentado:

1. Estructura y jerarquía visual.
2. Estados de carga, vacío, error y éxito.
3. Comportamiento responsive.
4. Accesibilidad de controles, diálogos, foco y teclado.
5. Componentes compartidos utilizados.
6. Flujos funcionales comprobados.
7. Commit, pull request y validaciones técnicas.
8. Diferencias entre el diseño objetivo y el resultado implementado.

## Inventario inicial de rutas

La siguiente matriz parte de las rutas activas declaradas en `intranet/src/App.tsx`. Las clasificaciones no confirmadas permanecen como **REVISIÓN PENDIENTE** para evitar conclusiones basadas únicamente en conteos estáticos.

| Ruta | Archivo o destino | Estado actual | Hallazgo confirmado | Próxima acción |
|---|---|---|---|---|
| `/dashboard` | `pages/DashboardPage.tsx` | REVISIÓN PENDIENTE | Ruta funcional registrada. | Revisión semántica y visual. |
| `/matricula` | `pages/MatriculaPage.tsx` | PARCIAL | Modales manuales migrados y fusionados. | Revisión visual final del módulo. |
| `/matricula/historial` | `pages/matricula/MatriculasHistorialPage.tsx` | PARCIAL | Modal principal migrado y fusionado. | Revisión visual final. |
| `/matricula/renovacion` | `pages/matricula/RenovacionMatriculaPage.tsx` | REVISIÓN PENDIENTE | Ruta funcional registrada. | Revisión semántica y visual. |
| `/matricula/promocion-masiva` | `pages/matricula/PromocionMasivaPage.tsx` | PARCIAL | Modal operativo migrado y fusionado. | Revisión visual final. |
| `/tesoreria` | `pages/TesoreriaPage.tsx` | PARCIAL | Bloque principal de modales de Tesorería migrado y fusionado. | Revisar páginas todavía fuera de ese bloque. |
| `/tesoreria/configuracion` | `pages/tesoreria/TesoreriaConfiguracionPage.tsx` | PARCIAL | Modal compartido migrado y fusionado. | Revisión visual final. |
| `/tesoreria/datos-cobro` | `pages/tesoreria/DatosCobroPage.tsx` | REVISIÓN PENDIENTE | Ruta funcional registrada. | Revisión semántica y visual. |
| `/tesoreria/pagos-extraordinarios` | `pages/tesoreria/PagosExtraordinariosPage.tsx` | REVISIÓN PENDIENTE | Ruta funcional registrada. | Revisión semántica y visual. |
| `/tesoreria/validar-pagos` | `pages/tesoreria/ValidarPagosPage.tsx` | PARCIAL | Modal de confirmación migrado y fusionado. | Revisión visual final. |
| `/tesoreria/pagos-recibidos` | `pages/tesoreria/PagosRecibidosPage.tsx` | PARCIAL | Detalle y acciones migrados y fusionados. | Revisión visual final. |
| `/tesoreria/estado-cuenta` | `pages/tesoreria/EstadoCuentaInternoPage.tsx` | REVISIÓN PENDIENTE | Ruta funcional registrada. | Revisión semántica y visual. |
| `/tesoreria/cobranzas` | `pages/tesoreria/CobranzasPage.tsx` | PARCIAL | Modal de seguimiento migrado y fusionado. | Revisión visual final. |
| `/tesoreria/agenda-cobranzas` | `pages/tesoreria/AgendaCobranzasPage.tsx` | PARCIAL | Modales de mensaje e historial migrados y fusionados. | Revisión visual final. |
| `/asistencia` | `pages/AsistenciaPage.tsx` | REVISIÓN PENDIENTE | Ruta protegida por módulo. | Revisión semántica, responsive y visual. |
| `/asistencia/mobile` | `pages/AsistenciaMobilePage.tsx` | REVISIÓN PENDIENTE | Vista móvil independiente. | Revisión móvil y funcional. |
| `/calendario` | `pages/CalendarioPage.tsx` | REVISIÓN PENDIENTE | Ruta protegida por módulo. | Revisión semántica y visual. |
| `/horario` | redirección a `/calendario` | NO APLICA | No posee página propia. | Mantener documentada la redirección. |
| `/notas` | `pages/NotasPage.tsx` | REVISIÓN PENDIENTE | Ruta protegida por módulo. | Revisión semántica y visual. |
| `/notas/comentarios` | redirección a `/tutoria` | NO APLICA | No posee página propia. | Mantener documentada la redirección. |
| `/tutoria` | `pages/TutoriaPage.tsx` | REVISIÓN PENDIENTE | Ruta protegida por módulo. | Revisión semántica y visual. |
| `/circulares` | `pages/CircularesPage.tsx` | FUNCIONAL NO FINAL | Formulario e historial operativos con diseño heredado y modal manual básico. | Rediseño integral de página y diálogo. |
| `/configuracion` | `pages/configuracion/ConfiguracionPage.tsx` | PARCIAL | Modales manuales del bloque Configuración migrados y fusionados. | Revisión visual por pestaña. |
| `/docentes` | `pages/DocentesPage.tsx` | PARCIAL | Formulario y ficha migrados a wrappers compartidos en `bb596b2`. | Validación consolidada y revisión visual. |
| `/comunidad/alumnos` | `pages/comunidad/AlumnosPage.tsx` | PARCIAL | Visor y ajuste de fotografía migrados en `99f6c3a`. | Validación consolidada y revisión visual. |
| `/comunidad/apoderados` | `pages/comunidad/ApoderadosPage.tsx` | REVISIÓN PENDIENTE | Ruta funcional registrada. | Revisión semántica y visual. |
| `/staff` | `ModuloPendientePage` | SIN DISEÑO | Solo existe una pantalla de reserva; no hay gestión real de personal. | Definir producto, permisos, modelo de datos y diseño. |
| `/citas` | `ModuloPendientePage` | SIN DISEÑO | Solo existe una pantalla de reserva. | Definir flujo, disponibilidad, estados y permisos. |
| `/enfermeria` | `ModuloPendientePage` | SIN DISEÑO | Solo existe una pantalla de reserva. | Definir ficha médica, privacidad, alertas y flujo de atención. |
| `/notificaciones` | `ModuloPendientePage` | SIN DISEÑO | Solo existe una pantalla de reserva. | Definir fuentes, estados, filtros y acciones. |
| `/perfil` | `pages/PerfilPage.tsx` | REVISIÓN PENDIENTE | Ruta funcional registrada. | Revisión semántica y visual. |
| `/reportes` | `pages/ReportesPage.tsx` | REVISIÓN PENDIENTE | Ruta protegida por módulo. | Revisión semántica y visual. |
| `/reportes/asistencia` | `pages/reportes/AsistenciaReportesPage.tsx` | REVISIÓN PENDIENTE | Ruta protegida por módulo. | Revisión semántica y visual. |
| `/pago/:referencia` | `pages/publico/PagoPublicoPage.tsx` | REVISIÓN PENDIENTE | Página pública dentro del proyecto intranet. | Revisar como flujo público separado. |
| `/consulta-pagos` | `pages/publico/ConsultaPagosPublicaPage.tsx` | REVISIÓN PENDIENTE | Página pública dentro del proyecto intranet. | Revisar como flujo público separado. |

## Ficha confirmada: Circulares

### Estado actual

- **Clasificación:** FUNCIONAL NO FINAL.
- **Ruta:** `/circulares`.
- **Archivo:** `intranet/src/pages/CircularesPage.tsx`.
- **Objetivo actual:** redactar una circular, seleccionar niveles destinatarios, enviarla y consultar el historial.
- **Datos consumidos:** `GET /api/circulares?page=1&limit=20`.
- **Acción principal:** `POST /api/circulares` con título, contenido y niveles.
- **Detalle:** overlay local abierto desde cada elemento del historial.

### Hallazgos

1. Utiliza `Breadcrumb` y clases heredadas como `card`, `input`, `btn` y `chip`, mientras las páginas recientes usan `PageHeader` y componentes visuales compartidos.
2. El formulario y el historial carecen de estados visibles de carga, vacío, error y envío.
3. Los errores de las peticiones se silencian mediante bloques `catch` vacíos.
4. La lista de niveles está escrita directamente en el frontend y no confirma que corresponda al contexto institucional activo.
5. No utiliza `SchoolContext`, por lo que debe revisarse el aislamiento por colegio o sede.
6. El modal de detalle es un overlay manual sin `AccessibleDialog`, foco controlado, Escape, retorno de foco ni nombre accesible para el botón de apertura.
7. El botón de envío no presenta estado de procesamiento ni protección contra doble envío.
8. El historial no presenta paginación visible, aunque la consulta solicita una página y un límite.
9. La pantalla mezcla estilos oscuros heredados con el lenguaje visual claro actual del intranet.
10. La respuesta visual y el comportamiento en tamaños pequeños no están confirmados.

### Diseño objetivo pendiente

El rediseño deberá contemplar:

- `PageHeader` con contexto institucional y métricas básicas.
- Editor de circular con título, contenido, audiencia y validación visible.
- Destinatarios derivados de datos reales del contexto activo.
- Estados de borrador, envío, éxito y error.
- Historial con búsqueda, filtros, paginación, estado vacío y carga.
- `AccessibleDialog` o una vista dedicada para el detalle.
- Identificación de remitente, fecha, audiencia y estado de entrega.
- Responsive para escritorio, tableta y móvil.
- Permisos por rol y aislamiento multiinstitución.

### Decisión de implementación

No se migrará únicamente el overlay actual. El diálogo se sustituirá dentro del rediseño integral para evitar consolidar una estructura visual que ya está marcada como no final.

### Cierre futuro

Cuando la página sea rediseñada, esta ficha deberá actualizarse con:

- Estructura finalmente implementada.
- Componentes compartidos utilizados.
- Diferencias respecto al objetivo.
- Estados funcionales comprobados.
- Capturas o referencias visuales.
- Commit y pull request.
- Resultado de TypeScript, ESLint, Vite y pruebas manuales.

## Ficha confirmada: módulos reservados

Las rutas `/staff`, `/citas`, `/enfermeria` y `/notificaciones` renderizan `ModuloPendientePage`. Esa pantalla mantiene la navegación estable y explica una intención futura, pero no constituye la implementación funcional ni el diseño final de esos módulos.

Cada módulo deberá recibir una ficha independiente cuando entre en trabajo. Hasta entonces permanecen clasificados como **SIN DISEÑO**.

## Historial de actualización

| Fecha | Cambio | Referencia |
|---|---|---|
| 2026-07-26 | Se crea la matriz viva limitada a `intranet/`. | Rama `feat/migra-modales-comunidad`. |
| 2026-07-26 | Se documenta Circulares como funcional no final. | `intranet/src/pages/CircularesPage.tsx`. |
| 2026-07-26 | Se documentan Staff, Citas, Enfermería y Notificaciones como rutas reservadas sin diseño funcional. | `intranet/src/App.tsx` y `ModuloPendientePage.tsx`. |
| 2026-07-26 | Se registra la migración técnica de Alumnos y Docentes, pendiente de validación consolidada. | Commits `99f6c3a` y `bb596b2`. |
