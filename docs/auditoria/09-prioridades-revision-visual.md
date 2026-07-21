# Prioridades para la revisión visual

## 1. Estado

Pendiente de revisión visual y funcional.

Este documento organiza candidatos detectados mediante análisis estático.

Ningún candidato se considera error confirmado hasta revisar la página, los componentes compartidos y el comportamiento en ejecución.

## 2. Señales globales

| Señal | Cantidad | Interpretación inicial |
|---|---:|---|
| Colores diferentes | 244 | Posible dispersión de paleta |
| Usos de transition-all | 113 | Revisar propiedades animadas |
| Archivos con estilos inline | 15 | Clasificar valores dinámicos y excepciones |
| Páginas con texto menor de 12 px | 30 | Prioridad alta de legibilidad |
| Páginas sin foco local detectado | 21 | Revisar herencia y componentes compartidos |
| Páginas sin responsive local detectado | 4 | Revisar en varias resoluciones |
| Coincidencias de reducción de movimiento | 5 | Comprobar cobertura global |

## 3. Prioridad alta: texto menor de 12 px

Estas páginas deben revisarse primero por posibles problemas de legibilidad.

| Página | Coincidencias locales |
|---|---:|
| `intranet/src/pages/AsistenciaPage.tsx` | 38 |
| `intranet/src/pages/DashboardPage.tsx` | 19 |
| `intranet/src/pages/DocentesPage.tsx` | 11 |
| `intranet/src/pages/MatriculaPage.tsx` | 9 |
| `intranet/src/pages/NotasPage.tsx` | 15 |
| `intranet/src/pages/ReportesPage.tsx` | 10 |
| `intranet/src/pages/TesoreriaPage.tsx` | 2 |
| `intranet/src/pages/TutoriaPage.tsx` | 12 |
| `intranet/src/pages/comunidad/AlumnosPage.tsx` | 12 |
| `intranet/src/pages/comunidad/ApoderadosPage.tsx` | 1 |
| `intranet/src/pages/configuracion/CabeceraLibretaTab.tsx` | 3 |
| `intranet/src/pages/configuracion/CriteriosTutoriaTab.tsx` | 2 |
| `intranet/src/pages/configuracion/PlantillasEvaluacionTab.tsx` | 3 |
| `intranet/src/pages/configuracion/PlantillasTab.tsx` | 1 |
| `intranet/src/pages/configuracion/PreparacionAnioTab.tsx` | 3 |
| `intranet/src/pages/configuracion/SeccionesTab.tsx` | 3 |
| `intranet/src/pages/matricula/DetallePromocionModal.tsx` | 8 |
| `intranet/src/pages/matricula/HistorialPromocionPanel.tsx` | 11 |
| `intranet/src/pages/matricula/MatriculasHistorialPage.tsx` | 6 |
| `intranet/src/pages/matricula/PromocionMasivaPage.tsx` | 11 |
| `intranet/src/pages/matricula/RenovacionMatriculaPage.tsx` | 3 |
| `intranet/src/pages/publico/ConsultaPagosPublicaPage.tsx` | 10 |
| `intranet/src/pages/publico/PagoPublicoPage.tsx` | 1 |
| `intranet/src/pages/reportes/AsistenciaReportesPage.tsx` | 9 |
| `intranet/src/pages/tesoreria/CobranzasPage.tsx` | 1 |
| `intranet/src/pages/tesoreria/DatosCobroPage.tsx` | 5 |
| `intranet/src/pages/tesoreria/EstadoCuentaInternoPage.tsx` | 8 |
| `intranet/src/pages/tesoreria/PagosRecibidosPage.tsx` | 6 |
| `intranet/src/pages/tesoreria/TesoreriaConfiguracionPage.tsx` | 4 |
| `intranet/src/pages/tesoreria/ValidarPagosPage.tsx` | 2 |

## 4. Prioridad alta: foco visible

La ausencia local no confirma que falte foco. Puede provenir de un componente compartido.

| Página | Elementos interactivos detectados |
|---|---:|
| `intranet/src/pages/AsistenciaMobilePage.tsx` | 9 |
| `intranet/src/pages/CalendarioPage.tsx` | 13 |
| `intranet/src/pages/CircularesPage.tsx` | 6 |
| `intranet/src/pages/DashboardPage.tsx` | 6 |
| `intranet/src/pages/MatriculaPage.tsx` | 39 |
| `intranet/src/pages/ModuloPendientePage.tsx` | 1 |
| `intranet/src/pages/PerfilPage.tsx` | 17 |
| `intranet/src/pages/ReportesPage.tsx` | 1 |
| `intranet/src/pages/configuracion/AniosLectivosTab.tsx` | 8 |
| `intranet/src/pages/configuracion/ConfiguracionPage.tsx` | 2 |
| `intranet/src/pages/configuracion/PeriodosUnidadesTab.tsx` | 17 |
| `intranet/src/pages/configuracion/PreparacionAnioTab.tsx` | 5 |
| `intranet/src/pages/matricula/DetallePromocionModal.tsx` | 6 |
| `intranet/src/pages/matricula/HistorialPromocionPanel.tsx` | 16 |
| `intranet/src/pages/matricula/MatriculasHistorialPage.tsx` | 26 |
| `intranet/src/pages/publico/ConsultaPagosPublicaPage.tsx` | 21 |
| `intranet/src/pages/publico/PagoPublicoPage.tsx` | 1 |
| `intranet/src/pages/tesoreria/DatosCobroPage.tsx` | 5 |
| `intranet/src/pages/tesoreria/EstadoCuentaInternoPage.tsx` | 6 |
| `intranet/src/pages/tesoreria/PagosExtraordinariosPage.tsx` | 9 |
| `intranet/src/pages/tesoreria/TesoreriaConfiguracionPage.tsx` | 50 |

## 5. Prioridad alta: responsive

Estas páginas no contienen prefijos responsive estáticos en su propio archivo.

- `intranet/src/pages/AsistenciaMobilePage.tsx`
- `intranet/src/pages/CalendarioPage.tsx`
- `intranet/src/pages/EstadosPage.tsx`
- `intranet/src/pages/configuracion/ConfiguracionPage.tsx`

## 6. Prioridad media: transition-all

Se debe comprobar qué propiedades cambian realmente y sustituir `transition-all` cuando sea innecesario.

| Archivo | Usos |
|---|---:|
| `intranet/src/pages/NotasPage.tsx` | 26 |
| `intranet/src/pages/MatriculaPage.tsx` | 12 |
| `intranet/src/pages/TutoriaPage.tsx` | 12 |
| `intranet/src/layout/AppHeader.tsx` | 7 |
| `intranet/src/pages/LoginPage.tsx` | 7 |
| `intranet/src/pages/matricula/MatriculasHistorialPage.tsx` | 7 |
| `intranet/src/pages/configuracion/PeriodosUnidadesTab.tsx` | 6 |
| `intranet/src/pages/DashboardPage.tsx` | 5 |
| `intranet/src/pages/ReportesPage.tsx` | 4 |
| `intranet/src/pages/configuracion/AsignacionesDocentesTab.tsx` | 4 |
| `intranet/src/pages/configuracion/PlantillasEvaluacionTab.tsx` | 4 |
| `intranet/src/pages/configuracion/PlantillasTab.tsx` | 3 |
| `intranet/src/pages/matricula/RenovacionMatriculaPage.tsx` | 3 |
| `intranet/src/layout/AppSidebar.tsx` | 2 |
| `intranet/src/pages/AsistenciaPage.tsx` | 2 |
| `intranet/src/pages/configuracion/ConfiguracionPage.tsx` | 2 |
| `intranet/src/pages/configuracion/PreparacionAnioTab.tsx` | 2 |
| `intranet/src/pages/tesoreria/PagosExtraordinariosPage.tsx` | 2 |
| `intranet/src/pages/configuracion/CriteriosTutoriaTab.tsx` | 1 |
| `intranet/src/pages/configuracion/NivelesGradosTab.tsx` | 1 |
| `intranet/src/pages/reportes/AsistenciaReportesPage.tsx` | 1 |

## 7. Prioridad media: estilos inline

Los estilos inline pueden ser válidos cuando dependen de cálculos o datos dinámicos.

| Archivo | Usos |
|---|---:|
| `intranet/src/pages/reportes/AsistenciaReportesPage.tsx` | 4 |
| `intranet/src/pages/ReportesPage.tsx` | 3 |
| `intranet/src/pages/configuracion/EscalaTab.tsx` | 3 |
| `intranet/src/pages/configuracion/PreparacionAnioTab.tsx` | 3 |
| `intranet/src/layout/AppSidebar.tsx` | 2 |
| `intranet/src/pages/AsistenciaPage.tsx` | 2 |
| `intranet/src/pages/DashboardPage.tsx` | 2 |
| `intranet/src/pages/configuracion/PlantillasTab.tsx` | 2 |
| `intranet/src/pages/AsistenciaMobilePage.tsx` | 1 |
| `intranet/src/pages/MatriculaPage.tsx` | 1 |
| `intranet/src/pages/TutoriaPage.tsx` | 1 |
| `intranet/src/pages/comunidad/AlumnosPage.tsx` | 1 |
| `intranet/src/pages/configuracion/CabeceraLibretaTab.tsx` | 1 |
| `intranet/src/pages/configuracion/SeccionesTab.tsx` | 1 |
| `intranet/src/pages/matricula/RenovacionMatriculaPage.tsx` | 1 |

## 8. Colores más utilizados

Los colores frecuentes son candidatos a tokens oficiales.

| Color | Apariciones | Archivos |
|---|---:|---:|
| `#ffffff` | 313 | 43 |
| `#161616` | 177 | 27 |
| `#0f62fe` | 166 | 38 |
| `#f4f4f4` | 100 | 17 |
| `#525252` | 100 | 20 |
| `#c6c6c6` | 88 | 18 |
| `#0043ce` | 75 | 28 |
| `#e0e0e0` | 69 | 13 |
| `#6f6f6f` | 61 | 10 |
| `#edf5ff` | 53 | 18 |
| `#393939` | 48 | 18 |
| `#8d8d8d` | 44 | 14 |
| `#a6c8ff` | 33 | 15 |
| `#f8fafc` | 30 | 18 |
| `#64748b` | 25 | 12 |
| `#0e6027` | 24 | 8 |
| `#262626` | 23 | 11 |
| `#da1e28` | 22 | 10 |
| `#cbd5e1` | 22 | 10 |
| `#f1c21b` | 20 | 9 |
| `#ccf32f` | 20 | 5 |
| `#78a9ff` | 19 | 9 |
| `#475569` | 19 | 9 |
| `#24a148` | 18 | 5 |
| `#defbe6` | 18 | 6 |
| `#198038` | 15 | 6 |
| `#0f172a` | 14 | 9 |
| `#fff1f1` | 14 | 8 |
| `#d0e2ff` | 13 | 7 |
| `#d9e2f1` | 13 | 4 |
| `#a7f0ba` | 12 | 5 |
| `rgba(15, 98, 254, 0.12)` | 12 | 9 |
| `#2563eb` | 11 | 3 |
| `#111827` | 11 | 7 |
| `#fddc69` | 11 | 4 |
| `#a2191f` | 11 | 7 |
| `#e2e8f0` | 10 | 6 |
| `#a8a8a8` | 10 | 5 |
| `#d8e0ea` | 10 | 8 |
| `#684e00` | 9 | 5 |

## 9. Orden de revisión visual

1. Estructura global, sidebar y navegación.
2. Las cuatro páginas sin responsive local detectado.
3. Páginas con texto menor de 12 px.
4. Componentes compartidos de campos y botones.
5. Páginas sin foco local detectado.
6. Archivos con mayor uso de transition-all.
7. Archivos con estilos inline.
8. Paleta y tokens de color.

## 10. Criterio para confirmar errores

Cada candidato deberá registrar:

- Ruta.
- Resolución.
- Zoom.
- Paso para reproducir.
- Comportamiento observado.
- Comportamiento esperado.
- Componente compartido involucrado.
- Severidad.
- Captura cuando corresponda.
- Corrección propuesta.
- Pruebas posteriores.

## 11. Estados permitidos

- Pendiente de revisión visual.
- Error confirmado.
- Inconsistencia confirmada.
- Mejora recomendada.
- Comportamiento válido.
- Excepción justificada.
- Falso positivo.
- Corregido.
- Validado.
