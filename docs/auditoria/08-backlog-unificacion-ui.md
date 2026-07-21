# Backlog inicial de unificación visual

## 1. Propósito

Organizar los candidatos detectados por el análisis estático antes de realizar cambios en el frontend.

Ningún elemento de este backlog debe corregirse automáticamente sin comprobar su comportamiento real.

## 2. Revisión prioritaria

- Alta: comprobar si la reducción de movimiento detectada cubre globalmente los componentes animados.
- Alta: revisar 21 páginas interactivas sin clases locales de foco detectadas.
- Alta: revisar 30 páginas con texto arbitrario menor de 12 px.
- Media: revisar 19 páginas que utilizan transition-all.
- Media: revisar 4 páginas sin prefijos responsive detectados.
- Media: revisar 29 páginas con dimensiones arbitrarias en píxeles.
- Media: clasificar 28 estilos inline.
- Media: clasificar 244 colores diferentes y determinar cuáles son tokens oficiales.
- Mejora: evaluar 64 bloques extensos repetidos como componentes o variantes compartidas.

## 3. Orden sugerido para la revisión visual

1. Estructura global, navegación y sidebar.
2. Login.
3. Dashboard.
4. Registro de matrícula.
5. Renovación individual.
6. Promoción masiva.
7. Historial de matrículas.
8. Notas.
9. Asistencia.
10. Tesorería.
11. Configuración.
12. Modales, formularios y tablas compartidas.

## 4. Páginas interactivas sin foco local detectado

- `intranet/src/pages/AsistenciaMobilePage.tsx`
- `intranet/src/pages/CalendarioPage.tsx`
- `intranet/src/pages/CircularesPage.tsx`
- `intranet/src/pages/DashboardPage.tsx`
- `intranet/src/pages/MatriculaPage.tsx`
- `intranet/src/pages/ModuloPendientePage.tsx`
- `intranet/src/pages/PerfilPage.tsx`
- `intranet/src/pages/ReportesPage.tsx`
- `intranet/src/pages/configuracion/AniosLectivosTab.tsx`
- `intranet/src/pages/configuracion/ConfiguracionPage.tsx`
- `intranet/src/pages/configuracion/PeriodosUnidadesTab.tsx`
- `intranet/src/pages/configuracion/PreparacionAnioTab.tsx`
- `intranet/src/pages/matricula/DetallePromocionModal.tsx`
- `intranet/src/pages/matricula/HistorialPromocionPanel.tsx`
- `intranet/src/pages/matricula/MatriculasHistorialPage.tsx`
- `intranet/src/pages/publico/ConsultaPagosPublicaPage.tsx`
- `intranet/src/pages/publico/PagoPublicoPage.tsx`
- `intranet/src/pages/tesoreria/DatosCobroPage.tsx`
- `intranet/src/pages/tesoreria/EstadoCuentaInternoPage.tsx`
- `intranet/src/pages/tesoreria/PagosExtraordinariosPage.tsx`
- `intranet/src/pages/tesoreria/TesoreriaConfiguracionPage.tsx`

## 5. Páginas con hover sin transición local

- No se detectaron.

## 6. Páginas sin responsive local detectado

- `intranet/src/pages/AsistenciaMobilePage.tsx`
- `intranet/src/pages/CalendarioPage.tsx`
- `intranet/src/pages/EstadosPage.tsx`
- `intranet/src/pages/configuracion/ConfiguracionPage.tsx`

## 7. Páginas sin transición ni animación local

- `intranet/src/pages/EstadosPage.tsx`
- `intranet/src/pages/ModuloPendientePage.tsx`

## 8. Páginas con dimensiones arbitrarias en píxeles

- `intranet/src/pages/AsistenciaPage.tsx`
- `intranet/src/pages/CircularesPage.tsx`
- `intranet/src/pages/DashboardPage.tsx`
- `intranet/src/pages/DocentesPage.tsx`
- `intranet/src/pages/MatriculaPage.tsx`
- `intranet/src/pages/NotasPage.tsx`
- `intranet/src/pages/ReportesPage.tsx`
- `intranet/src/pages/TesoreriaPage.tsx`
- `intranet/src/pages/TutoriaPage.tsx`
- `intranet/src/pages/comunidad/AlumnosPage.tsx`
- `intranet/src/pages/configuracion/AniosLectivosTab.tsx`
- `intranet/src/pages/configuracion/AsignacionesDocentesTab.tsx`
- `intranet/src/pages/configuracion/ConceptosPagoTab.tsx`
- `intranet/src/pages/configuracion/CriteriosTutoriaTab.tsx`
- `intranet/src/pages/configuracion/CursosTab.tsx`
- `intranet/src/pages/configuracion/PeriodosUnidadesTab.tsx`
- `intranet/src/pages/configuracion/PlantillasTab.tsx`
- `intranet/src/pages/configuracion/PreparacionAnioTab.tsx`
- `intranet/src/pages/configuracion/SeccionesTab.tsx`
- `intranet/src/pages/configuracion/TiposEvalTab.tsx`
- `intranet/src/pages/matricula/DetallePromocionModal.tsx`
- `intranet/src/pages/matricula/HistorialPromocionPanel.tsx`
- `intranet/src/pages/matricula/MatriculasHistorialPage.tsx`
- `intranet/src/pages/matricula/RenovacionMatriculaPage.tsx`
- `intranet/src/pages/publico/ConsultaPagosPublicaPage.tsx`
- `intranet/src/pages/reportes/AsistenciaReportesPage.tsx`
- `intranet/src/pages/tesoreria/AgendaCobranzasPage.tsx`
- `intranet/src/pages/tesoreria/CobranzasPage.tsx`
- `intranet/src/pages/tesoreria/EstadoCuentaInternoPage.tsx`

## 9. Páginas con texto menor de 12 px

- `intranet/src/pages/AsistenciaPage.tsx`
- `intranet/src/pages/DashboardPage.tsx`
- `intranet/src/pages/DocentesPage.tsx`
- `intranet/src/pages/MatriculaPage.tsx`
- `intranet/src/pages/NotasPage.tsx`
- `intranet/src/pages/ReportesPage.tsx`
- `intranet/src/pages/TesoreriaPage.tsx`
- `intranet/src/pages/TutoriaPage.tsx`
- `intranet/src/pages/comunidad/AlumnosPage.tsx`
- `intranet/src/pages/comunidad/ApoderadosPage.tsx`
- `intranet/src/pages/configuracion/CabeceraLibretaTab.tsx`
- `intranet/src/pages/configuracion/CriteriosTutoriaTab.tsx`
- `intranet/src/pages/configuracion/PlantillasEvaluacionTab.tsx`
- `intranet/src/pages/configuracion/PlantillasTab.tsx`
- `intranet/src/pages/configuracion/PreparacionAnioTab.tsx`
- `intranet/src/pages/configuracion/SeccionesTab.tsx`
- `intranet/src/pages/matricula/DetallePromocionModal.tsx`
- `intranet/src/pages/matricula/HistorialPromocionPanel.tsx`
- `intranet/src/pages/matricula/MatriculasHistorialPage.tsx`
- `intranet/src/pages/matricula/PromocionMasivaPage.tsx`
- `intranet/src/pages/matricula/RenovacionMatriculaPage.tsx`
- `intranet/src/pages/publico/ConsultaPagosPublicaPage.tsx`
- `intranet/src/pages/publico/PagoPublicoPage.tsx`
- `intranet/src/pages/reportes/AsistenciaReportesPage.tsx`
- `intranet/src/pages/tesoreria/CobranzasPage.tsx`
- `intranet/src/pages/tesoreria/DatosCobroPage.tsx`
- `intranet/src/pages/tesoreria/EstadoCuentaInternoPage.tsx`
- `intranet/src/pages/tesoreria/PagosRecibidosPage.tsx`
- `intranet/src/pages/tesoreria/TesoreriaConfiguracionPage.tsx`
- `intranet/src/pages/tesoreria/ValidarPagosPage.tsx`

## 10. Procedimiento para confirmar un hallazgo

Cada candidato debe revisarse mediante:

1. Lectura del componente.
2. Identificación de estilos heredados.
3. Ejecución del frontend.
4. Revisión en varias resoluciones.
5. Revisión con zoom.
6. Navegación por teclado.
7. Comprobación de foco.
8. Comprobación de reducción de movimiento.
9. Captura o evidencia.
10. Clasificación de severidad.

## 11. Información de cada corrección futura

- Hallazgo confirmado.
- Página y ruta.
- Resolución.
- Comportamiento anterior.
- Patrón correcto.
- Componente o token compartido.
- Archivos modificados.
- Pruebas realizadas.
- Resultado.
- Documentación actualizada.
