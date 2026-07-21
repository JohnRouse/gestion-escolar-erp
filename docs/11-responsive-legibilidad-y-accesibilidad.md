# Responsive, legibilidad y accesibilidad

## 1. Propósito

Establecer cómo debe adaptarse Gestión Escolar ERP a distintos tamaños de pantalla, niveles de zoom, métodos de navegación y necesidades de accesibilidad.

El sistema debe poder utilizarse correctamente en:

- Monitores pequeños.
- Laptops.
- Tablets.
- Pantallas angostas.
- Monitores amplios.
- Monitores de alta resolución.
- Navegadores con zoom aumentado.
- Navegación mediante teclado.
- Dispositivos táctiles cuando corresponda.

El objetivo no es únicamente evitar que el contenido se rompa.

También debe garantizarse:

- Legibilidad.
- Orden.
- Jerarquía.
- Acceso a todas las acciones.
- Comprensión.
- Comodidad.
- Ausencia de desplazamientos innecesarios.
- Uso adecuado del espacio disponible.

## 2. Principio general

Responsive no significa reducir todos los elementos.

Significa reorganizar la interfaz de acuerdo con:

- Espacio disponible.
- Prioridad de la información.
- Relación entre controles.
- Tipo de tarea.
- Densidad de datos.
- Método de interacción.
- Contexto del usuario.

Una pantalla puede no presentar superposiciones y aun así tener un diseño deficiente.

## 3. Resoluciones obligatorias de revisión

Toda pantalla principal debe revisarse como mínimo en:

- 360 × 800.
- 390 × 844.
- 768 × 1024.
- 1024 × 768.
- 1280 × 720.
- 1366 × 768.
- 1440 × 900.
- 1920 × 1080.
- 2560 × 1440.

Estas medidas representan referencias de comprobación.

No deben convertirse en layouts separados codificados de forma rígida.

## 4. Orientaciones

Cuando el módulo pueda utilizarse en tablet debe revisarse en:

- Vertical.
- Horizontal.

Debe comprobarse:

- Cambio de columnas.
- Menús.
- Modales.
- Tablas.
- Formularios.
- Botones.
- Teclado virtual.
- Scroll.
- Elementos fijos.

## 5. Categorías de pantalla

### 5.1 Pantalla angosta

Incluye aproximadamente móviles y ventanas estrechas.

Debe priorizar:

- Una columna.
- Acciones principales visibles.
- Controles táctiles.
- Textos legibles.
- Navegación compacta.
- Orden lógico.
- Scroll vertical.
- Tablas adaptadas.

### 5.2 Tablet

Puede utilizar:

- Una o dos columnas.
- Paneles apilados.
- Navegación reducida.
- Tablas con scroll horizontal.
- Acciones agrupadas.

### 5.3 Laptop pequeña

Debe aprovechar el espacio sin comprimir:

- Filtros.
- Tablas.
- Formularios.
- Encabezados.
- Acciones.
- Sidebar.

### 5.4 Escritorio estándar

Debe mostrar una jerarquía cómoda y estable.

No debe forzar al usuario a recorrer grandes distancias visuales entre controles relacionados.

### 5.5 Monitor amplio

Debe aprovechar el espacio sin estirar indiscriminadamente el contenido.

Debe evitar:

- Párrafos demasiado largos.
- Formularios dispersos.
- Grandes espacios vacíos sin propósito.
- Tarjetas excesivamente anchas.
- Botones alejados de su contexto.
- Tablas con columnas artificialmente separadas.

## 6. Ancho del contenido

Los contenidos de lectura deben utilizar un ancho máximo razonable.

Los formularios deben mantener agrupados los campos relacionados.

Las tablas y paneles de datos pueden utilizar un ancho mayor.

No debe aplicarse un único ancho máximo a todos los tipos de contenido.

Se debe distinguir entre:

- Lectura.
- Formulario.
- Dashboard.
- Tabla.
- Reporte.
- Modal.
- Panel de configuración.

## 7. Contenedores principales

Los contenedores principales deben utilizar:

- Ancho fluido.
- Márgenes consistentes.
- Padding adaptable.
- Límites máximos cuando corresponda.
- Separación visual clara.

Deben evitarse:

- Anchuras fijas para toda la página.
- Alturas rígidas.
- Contenido cortado.
- Scroll doble innecesario.
- Espacios laterales desproporcionados.

## 8. Sidebar

El sidebar debe revisarse en:

- Estado expandido.
- Estado contraído.
- Pantalla angosta.
- Pantalla amplia.
- Scroll interno.
- Menús largos.
- Submenús.
- Texto largo.
- Zoom aumentado.

En pantalla pequeña debe:

- Poder abrirse y cerrarse.
- No bloquear permanentemente el contenido.
- Mostrar fondo superpuesto cuando corresponda.
- Conservar foco.
- Permitir cierre por teclado.
- No dejar el contenido desplazado después de cerrarse.

## 9. Encabezados de página

Los encabezados deben adaptarse sin perder:

- Etiqueta del módulo.
- Título.
- Descripción.
- Contexto institucional.
- Año lectivo.
- Acción principal.
- Acciones secundarias.

En pantallas angostas:

- El título puede ocupar una fila completa.
- Las acciones pueden pasar debajo.
- Los botones pueden utilizar todo el ancho cuando sea necesario.
- No deben quedar apretados en una sola línea.

## 10. Contexto institucional

El selector de institución y año debe conservar claridad en cualquier tamaño.

Cuando el alcance sea `Todos los colegios`:

- El año debe incluir la institución.
- Los resultados ambiguos deben incluir la institución.
- Las tablas deben conservar el contexto.

Cuando exista un colegio específico:

- No debe repetirse innecesariamente el nombre.
- El año puede mostrarse sin la institución.

El responsive no debe eliminar información institucional necesaria.

## 11. Layouts de columnas

La cantidad de columnas debe depender de:

- Relación entre campos.
- Ancho disponible.
- Longitud de etiquetas.
- Longitud de valores.
- Tipo de tarea.

Referencia general:

- Pantalla angosta: una columna.
- Tablet: una o dos columnas.
- Laptop: dos columnas cuando sea apropiado.
- Escritorio amplio: dos o tres columnas solamente si mantienen relación lógica.

No debe utilizarse una tercera columna únicamente para llenar espacio.

## 12. Formularios

Los formularios deben comprobar:

- Etiquetas completas.
- Campos sin cortes.
- Mensajes de error.
- Textos de ayuda.
- Selectores.
- Calendarios.
- Campos largos.
- Campos de moneda.
- Campos numéricos.
- Botones.
- Agrupaciones.
- Orden de tabulación.

En pantallas angostas:

- Los campos deben ocupar el ancho disponible.
- Las etiquetas deben permanecer visibles.
- Los botones deben poder apilarse.
- Los mensajes de error no deben superponerse.
- Los selectores no deben salir del viewport.

## 13. Campos largos

Los valores largos deben contemplar:

- Ajuste de texto.
- Truncado con acceso al contenido completo.
- Tooltip cuando corresponda.
- Scroll interno únicamente cuando sea necesario.
- No empujar acciones fuera del contenedor.

Aplica especialmente a:

- Nombres.
- Direcciones.
- Correos.
- Instituciones.
- Secciones.
- Conceptos de pago.
- Observaciones.
- Motivos.
- Descripciones.

## 14. Botones

Los botones deben:

- Mantener texto legible.
- Evitar cortes.
- Permitir apilamiento.
- Mantener área táctil.
- Conservar jerarquía.
- No desaparecer por falta de espacio.
- No quedar fuera del contenedor.

En pantallas pequeñas:

- La acción principal debe seguir siendo identificable.
- Las acciones secundarias pueden agruparse.
- Las acciones destructivas no deben quedar junto a acciones primarias sin separación.

## 15. Grupos de botones

Los grupos deben adaptarse mediante:

- Wrap.
- Columnas.
- Menú de acciones adicionales.
- Barra inferior.
- Alineación vertical.

No debe reducirse excesivamente el texto del botón para conservar una sola fila.

## 16. Tablas

Toda tabla debe definir su estrategia responsive.

Las opciones posibles incluyen:

- Scroll horizontal.
- Columnas ocultables.
- Columnas prioritarias.
- Filas convertidas en tarjetas.
- Detalle expandible.
- Vista resumida.
- Vista alternativa móvil.

No se debe asumir que todas las tablas deben transformarse del mismo modo.

## 17. Columnas prioritarias

Cada tabla debe identificar:

- Columnas obligatorias.
- Columnas secundarias.
- Columnas que pueden ocultarse.
- Acciones.
- Identificador principal.
- Estado.
- Contexto institucional.

Las acciones importantes no deben desaparecer.

## 18. Scroll horizontal

Cuando se utilice scroll horizontal:

- Debe ser evidente.
- El encabezado debe mantenerse comprensible.
- Las acciones deben seguir accesibles.
- No debe bloquear el scroll vertical.
- Debe funcionar con teclado.
- Debe funcionar con touchpad.
- Debe evitarse un segundo scroll horizontal exterior.

## 19. Tablas convertidas en tarjetas

Una tabla puede convertirse en tarjetas cuando:

- Tiene pocas columnas esenciales.
- Cada fila representa una entidad clara.
- Las acciones pueden agruparse.
- El orden de la información sigue siendo comprensible.

No debe convertirse automáticamente toda tabla en tarjetas.

Las tablas comparativas o de alta densidad pueden necesitar scroll horizontal.

## 20. Filtros

Los filtros deben adaptarse sin perder:

- Orden.
- Etiquetas.
- Acción de aplicar.
- Acción de limpiar.
- Contexto institucional.
- Estado seleccionado.

Orden recomendado:

1. Institución.
2. Búsqueda.
3. Estado.
4. Año.
5. Sección.
6. Fechas.
7. Aplicar.
8. Limpiar.

En pantallas angostas pueden apilarse.

Los botones de aplicar y limpiar deben permanecer juntos.

## 21. Barras de herramientas

Las barras deben revisar:

- Wrap.
- Scroll.
- Agrupación.
- Acciones principales.
- Acciones secundarias.
- Contadores.
- Filtros.
- Búsqueda.

No deben quedar controles cortados o fuera de vista.

## 22. Modales

Todo modal debe utilizar:

- Ancho máximo.
- Altura máxima basada en viewport.
- Encabezado visible.
- Contenido desplazable.
- Pie estable cuando existan acciones.
- Cierre accesible.
- Padding adaptable.

Debe comprobarse en:

- Pantalla angosta.
- Tablet.
- Laptop pequeña.
- Zoom aumentado.
- Contenido corto.
- Contenido largo.
- Mensajes de error.

## 23. Modales en pantalla pequeña

En pantallas pequeñas el modal puede:

- Ocupar casi todo el ancho.
- Ocupar casi toda la altura.
- Convertirse en panel completo.
- Utilizar scroll interno.

No debe:

- Superar el viewport.
- Ocultar el botón de cierre.
- dejar las acciones fuera de pantalla.
- generar dos scrolls verticales difíciles de controlar.

## 24. Paneles laterales

Los paneles laterales deben:

- Ajustar su ancho.
- No superar el viewport.
- Mantener acciones visibles.
- Permitir scroll.
- Conservar encabezado.
- Permitir cierre accesible.

En pantallas pequeñas pueden ocupar todo el ancho.

## 25. Dashboard

Los dashboards deben comprobar:

- Número de columnas.
- Tamaño de tarjetas.
- Gráficos.
- Leyendas.
- Valores largos.
- Estados vacíos.
- Carga.
- Contexto institucional.

En monitores amplios no deben separarse excesivamente los indicadores relacionados.

En pantallas pequeñas deben mantener orden de prioridad.

## 26. Gráficos

Los gráficos deben:

- Adaptar ancho.
- Mantener etiquetas legibles.
- Evitar leyendas cortadas.
- Proporcionar alternativa textual.
- Conservar contraste.
- No depender solo del color.
- Mostrar datos completos mediante tooltip o tabla accesible.

## 27. Calendarios

Los calendarios deben comprobar:

- Vista mensual.
- Vista semanal.
- Vista diaria.
- Eventos largos.
- Eventos superpuestos.
- Navegación.
- Botones.
- Zoom.
- Pantalla pequeña.

Puede requerirse una vista alternativa de agenda en pantallas angostas.

## 28. Alturas fijas

Las alturas fijas deben evitarse en:

- Contenido principal.
- Formularios.
- Tarjetas con texto variable.
- Modales.
- Tablas.
- Listados.
- Estados de error.

Pueden utilizarse con justificación en:

- Iconos.
- Avatares.
- Skeletons controlados.
- Indicadores.
- Barras.
- Componentes visuales con proporción conocida.

## 29. Anchuras fijas

Las anchuras fijas requieren revisión especial.

Pueden ser válidas en:

- Iconos.
- Avatares.
- Sidebar.
- Columnas técnicas.
- Indicadores.

Son riesgosas en:

- Formularios.
- Tarjetas.
- Modales.
- Contenedores principales.
- Buscadores.
- Selectores con valores largos.

## 30. Zoom del navegador

Cada módulo debe comprobarse al menos en:

- 100 %.
- 125 %.
- 150 %.
- 200 % cuando sea aplicable.

Con zoom aumentado:

- No debe perderse funcionalidad.
- Las acciones deben seguir disponibles.
- El contenido debe poder recorrerse.
- No deben superponerse elementos.
- El foco debe permanecer visible.
- Los modales deben seguir operables.

## 31. Texto y legibilidad

El texto debe poder leerse sin aumentar el zoom en condiciones normales.

Se debe evitar:

- Texto menor de 12 px.
- Contraste insuficiente.
- Líneas demasiado largas.
- Mayúsculas sostenidas extensas.
- Tipografía demasiado ligera.
- Placeholder casi invisible.
- Texto deshabilitado ilegible.

## 32. Contraste

Debe verificarse contraste para:

- Texto principal.
- Texto secundario.
- Placeholder.
- Enlaces.
- Botones.
- Estados.
- Iconos.
- Bordes.
- Foco.
- Elementos deshabilitados.

El contraste debe comprobarse con herramientas, no solo visualmente.

## 33. Foco visible

Todo elemento interactivo debe mostrar foco visible.

Incluye:

- Enlaces.
- Botones.
- Campos.
- Selectores.
- Pestañas.
- Filas interactivas.
- Menús.
- Iconos clicables.
- Controles de tabla.
- Cierre de modal.

El foco no debe quedar oculto.

## 34. Navegación por teclado

Debe poderse realizar mediante teclado:

- Abrir menú.
- Recorrer navegación.
- Completar formularios.
- Cambiar pestañas.
- Abrir y cerrar modales.
- Seleccionar opciones.
- Activar botones.
- Recorrer tablas interactivas.
- Cerrar paneles.
- Acceder a mensajes.

El orden de tabulación debe seguir el orden visual y lógico.

## 35. Modales y foco

Cuando se abre un modal:

- El foco debe ingresar al modal.
- Debe mantenerse dentro.
- Escape debe cerrarlo cuando sea seguro.
- El cierre debe devolver el foco al elemento anterior.
- El fondo no debe poder recorrerse accidentalmente.

## 36. Etiquetas accesibles

Todo campo debe tener etiqueta asociada.

Los controles solo con icono deben tener nombre accesible.

Las imágenes informativas deben tener texto alternativo.

Las imágenes decorativas deben omitirse de la lectura asistida.

## 37. Mensajes de error

Los mensajes deben:

- Identificar el problema.
- Relacionarse con el campo o acción.
- Ser comprensibles.
- Indicar cómo corregir.
- Poder ser anunciados por tecnologías de asistencia.
- No depender solo del color.

## 38. Estados

Todo estado debe comunicar mediante:

- Texto.
- Color.
- Icono cuando corresponda.

No debe utilizarse únicamente:

- Verde.
- Rojo.
- Amarillo.
- Forma.
- Posición.

## 39. Contenido dinámico

Los cambios dinámicos importantes deben poder anunciarse.

Incluye:

- Guardado exitoso.
- Error.
- Cambio de estado.
- Carga completada.
- Resultado vacío.
- Filtro aplicado.
- Operación revertida.
- Acción bloqueada.

## 40. Reducción de movimiento

Debe respetarse la preferencia de reducción de movimiento.

La interfaz debe mantener:

- Claridad.
- Información.
- Estados.
- Navegación.
- Confirmaciones.

La ausencia de movimiento no debe eliminar significado.

## 41. Área táctil

Los controles táctiles deben disponer de un área suficiente.

Referencia:

- Mínimo aproximado de 44 × 44 px.

Debe existir separación suficiente entre:

- Guardar.
- Cancelar.
- Eliminar.
- Cerrar.
- Acciones de fila.
- Navegación.

## 42. Cursores y señales de interacción

Los elementos clicables deben parecer interactivos.

Los elementos no clicables no deben mostrar:

- Cursor de enlace.
- Hover de tarjeta interactiva.
- Sombra de botón.
- Foco innecesario.

## 43. Scroll

Debe revisarse:

- Scroll principal.
- Scroll de modal.
- Scroll de tabla.
- Scroll de sidebar.
- Scroll de panel.
- Scroll horizontal.

Debe evitarse:

- Scroll doble sin necesidad.
- Scroll oculto.
- Bloqueo del scroll después de cerrar modal.
- Pérdida de posición inesperada.
- Elementos fijos que oculten contenido.

## 44. Elementos sticky

Los elementos sticky deben comprobarse con:

- Encabezados.
- Tablas.
- Barras de acciones.
- Modales.
- Zoom.
- Pantalla pequeña.

No deben:

- Cubrir contenido.
- Superponerse entre sí.
- Ocultar anclas.
- impedir llegar al último elemento.

## 45. Contenido vacío

Los estados vacíos deben diferenciar:

- No existen datos.
- No existen resultados para filtros.
- Falta configuración.
- Falta permiso.
- Error de carga.
- Módulo pendiente.

El diseño debe adaptarse sin dejar grandes espacios confusos.

## 46. Carga

Durante la carga:

- La estructura debe mantenerse estable.
- Los skeletons deben aproximarse al contenido.
- Las acciones bloqueadas deben identificarse.
- No debe mostrarse un estado vacío prematuramente.
- No debe aparecer contenido incompleto.

## 47. Errores responsive comunes

La auditoría debe buscar:

- Superposición.
- Texto cortado.
- Botones fuera del contenedor.
- Selectores fuera del viewport.
- Modales demasiado grandes.
- Tablas ilegibles.
- Acciones ocultas.
- Scroll doble.
- Campos demasiado estrechos.
- Labels en varias líneas que rompen el layout.
- Tarjetas estiradas.
- Grandes espacios vacíos.
- Columnas innecesarias.
- Sidebar que cubre contenido.
- Footer o barra fija que oculta acciones.

## 48. Inconsistencias de legibilidad

La auditoría debe buscar:

- Texto menor de 12 px.
- Contraste desigual.
- Placeholders diferentes.
- Campos con textos distintos.
- Títulos sin jerarquía.
- Uso excesivo de mayúsculas.
- Información secundaria demasiado tenue.
- Anchos de lectura excesivos.
- Contenido comprimido.

## 49. Inconsistencias de accesibilidad

La auditoría debe buscar:

- Falta de foco.
- Controles sin etiqueta.
- Iconos sin nombre accesible.
- Estados solo por color.
- Orden de tabulación incorrecto.
- Modales sin control de foco.
- Tooltips inaccesibles.
- Filas clicables sin semántica.
- Errores no anunciables.
- Imágenes sin alternativa.
- Animaciones sin reducción de movimiento.

## 50. Matriz por página

Cada página debe registrar:

- Ruta.
- Módulo.
- Estado.
- Anchos probados.
- Zoom probado.
- Navegación por teclado.
- Foco.
- Tablas.
- Formularios.
- Modales.
- Animaciones.
- Errores encontrados.
- Severidad.
- Archivos relacionados.
- Corrección propuesta.
- Estado de la corrección.

## 51. Severidad de hallazgos

### Crítica

Impide utilizar una función o acceder a información.

### Alta

Oculta una acción importante, rompe un flujo o dificulta significativamente la operación.

### Media

Produce inconsistencia, incomodidad o pérdida parcial de claridad.

### Baja

Es principalmente visual y no impide la operación.

### Mejora

No es un error, pero elevaría la calidad y consistencia.

## 52. Clasificación del hallazgo

Cada hallazgo debe clasificarse como:

- Error confirmado.
- Inconsistencia probable.
- Mejora recomendada.
- Comportamiento válido.
- Ausencia justificada.
- Falso positivo.
- Pendiente de prueba visual.

## 53. Evidencia

Todo hallazgo visual debe registrar:

- Página.
- Ruta.
- Resolución.
- Zoom.
- Paso para reproducir.
- Resultado observado.
- Resultado esperado.
- Captura cuando corresponda.
- Archivo probable.
- Severidad.

## 54. Correcciones

Toda corrección debe indicar:

1. Hallazgo.
2. Evidencia.
3. Patrón correcto.
4. Componente compartido.
5. Token.
6. Archivos a modificar.
7. Resoluciones de prueba.
8. Zoom.
9. Teclado.
10. Accesibilidad.
11. Animación.
12. Resultado.
13. Documentación actualizada.

## 55. Criterios de aceptación

Una pantalla no se considera terminada hasta comprobar:

- Escritorio amplio.
- Laptop.
- Tablet.
- Pantalla angosta.
- Zoom.
- Scroll.
- Formularios.
- Tablas.
- Modales.
- Estados de carga.
- Estado vacío.
- Error.
- Teclado.
- Foco.
- Contraste.
- Reducción de movimiento.

## 56. Prohibiciones

No se debe:

- Resolver falta de espacio reduciendo excesivamente texto.
- Ocultar acciones necesarias.
- Utilizar dimensiones fijas sin revisar.
- Permitir modales mayores que el viewport.
- depender únicamente del scroll horizontal.
- eliminar información institucional necesaria.
- sacrificar accesibilidad por estética.
- asumir que escritorio amplio representa todas las pantallas.
- declarar responsive una pantalla sin probarla.
- corregir automáticamente hallazgos sin revisión.
