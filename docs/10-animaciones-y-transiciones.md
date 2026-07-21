# Animaciones y transiciones

## 1. Propósito

Establecer cómo deben utilizarse las animaciones y transiciones en Gestión Escolar ERP.

Las animaciones deben ayudar a:

- Comprender cambios de estado.
- Percibir continuidad entre acciones.
- Identificar qué elemento cambió.
- Evitar apariciones bruscas.
- Comunicar carga, éxito, error o bloqueo.
- Guiar la atención sin distraer.

No deben utilizarse únicamente como decoración.

## 2. Principios generales

Toda animación debe ser:

- Breve.
- Suave.
- Predecible.
- Consistente.
- Funcional.
- Reversible cuando corresponda.
- Compatible con reducción de movimiento.
- Adecuada para equipos de rendimiento limitado.

No debe:

- Retrasar una acción importante.
- Ocultar información.
- Provocar saltos de layout.
- Repetirse innecesariamente.
- Animar grandes cantidades de elementos sin necesidad.
- distraer al usuario durante tareas administrativas.
- dificultar el uso a personas sensibles al movimiento.

## 3. Clasificación

Cada animación o transición debe clasificarse como una de las siguientes:

- Transición de estado.
- Transición de interacción.
- Transición de navegación.
- Transición de aparición.
- Transición de desaparición.
- Transición de carga.
- Transición de confirmación.
- Animación informativa.
- Animación decorativa justificada.
- Animación innecesaria.
- Animación pendiente.
- Animación inconsistente.

## 4. Duraciones de referencia

Como punto inicial de unificación:

- Hover: 120 a 180 ms.
- Foco: 120 a 180 ms.
- Botón presionado: 80 a 140 ms.
- Campo activado: 120 a 180 ms.
- Tooltip: 120 a 180 ms.
- Menú desplegable: 160 a 220 ms.
- Pestaña: 160 a 220 ms.
- Acordeón: 180 a 240 ms.
- Panel lateral: 180 a 260 ms.
- Modal: 180 a 240 ms.
- Toast o alerta temporal: 180 a 260 ms.
- Entrada inicial de página: 180 a 260 ms.
- Skeleton: ciclo de 1.2 a 1.8 segundos.
- Indicador de carga: continuo mientras dure el proceso.

Estos valores deben comprobarse contra el comportamiento real del proyecto.

No deben mezclarse duraciones diferentes para componentes equivalentes.

## 5. Curvas de aceleración

Las transiciones deben utilizar curvas consistentes.

Como criterio general:

- Entrada: desaceleración suave.
- Salida: aceleración breve.
- Cambio de estado: curva equilibrada.
- Hover y foco: transición rápida y discreta.
- Modal o panel: curva suave sin rebote.

No deben utilizarse rebotes o efectos elásticos en tareas administrativas salvo una decisión visual documentada.

## 6. Propiedades preferidas

Se deben preferir animaciones basadas en:

- Opacidad.
- Transformación.
- Color.
- Borde.
- Sombra.
- Escala ligera.
- Desplazamiento corto.

Estas propiedades suelen ofrecer mejor rendimiento y menor riesgo de alterar el layout.

## 7. Propiedades que requieren precaución

Deben utilizarse con cuidado:

- Altura.
- Anchura.
- Margen.
- Padding.
- Posición absoluta.
- Tamaño de fuente.
- Grandes sombras.
- Filtros complejos.
- Desenfoque intenso.

Estas propiedades pueden provocar:

- Recalculo de layout.
- Saltos visuales.
- Bajo rendimiento.
- Movimiento de elementos vecinos.
- Pérdida de estabilidad.

## 8. Entrada de páginas

Las páginas pueden utilizar una entrada discreta.

Patrón recomendado:

- Opacidad inicial reducida.
- Desplazamiento vertical de 4 a 8 px.
- Duración entre 180 y 260 ms.
- Una sola ejecución al mostrar la estructura principal.

No debe:

- Repetirse en cada recarga parcial.
- Ocultar contenido durante demasiado tiempo.
- Ejecutarse antes de que el layout tenga dimensiones estables.
- aplicarse individualmente a decenas de elementos simultáneos.

La animación de página no reemplaza el estado de carga.

## 9. Navegación entre rutas

La navegación debe sentirse continua.

Se debe revisar:

- Aparición del contenido.
- Persistencia del encabezado.
- Persistencia del sidebar.
- Estado seleccionado del menú.
- Restauración o control del scroll.
- Carga del módulo de destino.
- Evitar parpadeos de contenido anterior.

No debe animarse nuevamente toda la estructura global si solo cambia el contenido principal.

## 10. Sidebar

El sidebar debe contemplar transiciones para:

- Abrir.
- Cerrar.
- Expandir grupos.
- Contraer grupos.
- Cambiar elemento activo.
- Mostrar versión móvil.
- Ocultar versión móvil.

Debe evitar:

- Saltos de ancho.
- Texto recortado durante demasiado tiempo.
- Desplazamiento abrupto del contenido.
- Pérdida del foco.
- animaciones distintas entre grupos equivalentes.

## 11. Encabezados

Los encabezados deben permanecer estables.

Las acciones principales pueden utilizar transiciones de:

- Hover.
- Foco.
- Presionado.
- Deshabilitado.
- Carga.

No debe animarse continuamente el título o la descripción.

## 12. Botones

Todo botón interactivo debe contemplar:

- Hover.
- Foco visible.
- Estado activo.
- Estado deshabilitado.
- Estado de carga.
- Confirmación cuando corresponda.

La transición debe ser breve.

El botón no debe cambiar bruscamente de tamaño cuando aparece un spinner.

Se debe reservar el espacio necesario para:

- Icono.
- Texto.
- Indicador de carga.

## 13. Campos

Los campos deben contemplar transiciones para:

- Foco.
- Hover cuando corresponda.
- Error.
- Validación correcta.
- Deshabilitado.
- Lectura.
- Cambio de borde.
- Cambio de fondo.

Los mensajes de error pueden aparecer suavemente, pero no deben retrasarse.

El layout debe reservar o manejar el espacio para evitar saltos excesivos.

## 14. Selectores y menús

Los selectores deben revisar:

- Apertura.
- Cierre.
- Cambio de opción.
- Búsqueda.
- Estado vacío.
- Carga de opciones.
- Navegación por teclado.

La lista no debe aparecer fuera de la pantalla ni quedar cortada por contenedores.

## 15. Pestañas

El cambio de pestaña debe:

- Mantener estable el contenedor.
- Marcar claramente la pestaña activa.
- Evitar cambios bruscos de altura.
- Mantener el foco de forma correcta.
- Mostrar carga cuando el contenido lo requiera.

Puede utilizarse una transición de opacidad breve.

No deben animarse grandes desplazamientos horizontales si afectan la legibilidad.

## 16. Acordeones

Los acordeones deben:

- Comunicar expansión y contracción.
- Mantener visible el encabezado.
- Cambiar el icono de forma coherente.
- Evitar cortes de contenido.
- Respetar reducción de movimiento.

Las alturas dinámicas requieren comprobación especial.

## 17. Tarjetas

Las tarjetas no interactivas no necesitan hover.

Las tarjetas interactivas pueden utilizar:

- Cambio leve de borde.
- Cambio leve de sombra.
- Desplazamiento máximo muy pequeño.
- Cambio de fondo.

No deben parecer botones si no son clicables.

## 18. Tablas

Las tablas deben revisar transiciones en:

- Hover de fila.
- Selección.
- Ordenamiento.
- Expansión de detalle.
- Aparición de acciones.
- Actualización de datos.
- Carga.
- Estado vacío.

No debe animarse cada celda individualmente.

Cuando los datos cambien, debe evitarse que las filas salten de forma confusa.

## 19. Modales

Los modales deben tener entrada y salida coherentes.

Se recomienda:

- Fondo superpuesto con transición de opacidad.
- Contenedor con opacidad y desplazamiento corto.
- Duración entre 180 y 240 ms.
- Salida ligeramente más rápida que la entrada.

También deben:

- Bloquear correctamente el fondo.
- Mantener el foco dentro.
- Devolver el foco al elemento que los abrió.
- evitar movimiento del contenido al aparecer el scrollbar.
- Respetar reducción de movimiento.

## 20. Paneles laterales

Los paneles laterales pueden utilizar desplazamiento horizontal.

Deben:

- Mantener una duración uniforme.
- Mostrar fondo superpuesto cuando corresponda.
- No exceder el viewport.
- Conservar controles visibles.
- Permitir cierre por teclado.
- Mantener foco accesible.

## 21. Alertas y toasts

Las alertas temporales pueden utilizar:

- Opacidad.
- Desplazamiento corto.
- Entrada y salida controladas.

Deben permanecer el tiempo suficiente para poder leerse.

Los errores críticos no deben desaparecer automáticamente.

Los mensajes importantes deben conservar una alternativa persistente.

## 22. Estados de éxito

Una confirmación de éxito puede incluir:

- Cambio de estado.
- Icono.
- Mensaje.
- Transición breve.

No debe utilizar animaciones exageradas.

Debe quedar claro:

- Qué acción terminó.
- Qué datos fueron afectados.
- Qué puede hacer el usuario después.

## 23. Estados de error

Los errores deben aparecer sin retrasos innecesarios.

Puede utilizarse una transición breve de:

- Opacidad.
- Borde.
- Fondo.
- Icono.

No se deben usar movimientos fuertes, vibraciones largas o parpadeos.

## 24. Estados vacíos

Los estados vacíos pueden aparecer suavemente después de confirmar que no existen datos.

No deben mostrarse durante una carga todavía activa.

Deben diferenciarse:

- Sin datos.
- Sin resultados por filtros.
- Sin permisos.
- Error de carga.
- Módulo no configurado.

## 25. Skeletons

Los skeletons deben:

- Aproximarse al contenido definitivo.
- Mantener las dimensiones.
- Evitar saltos.
- Mostrar que la carga está activa.
- Desaparecer suavemente cuando llega el contenido.

No deben:

- Tener formas completamente diferentes al contenido.
- Permanecer indefinidamente.
- aparecer después de haber mostrado contenido real.
- Utilizar animación excesivamente intensa.

## 26. Spinners

Los spinners deben utilizarse para:

- Acciones breves.
- Botones.
- Esperas localizadas.
- Operaciones sin estructura visual anticipable.

No deben reemplazar skeletons en páginas completas cuando se conoce la estructura.

## 27. Carga parcial

Cuando se actualiza solo una sección:

- No debe bloquearse toda la página.
- Debe conservarse el contexto.
- Debe indicarse qué parte se está actualizando.
- Deben evitarse parpadeos.
- Deben evitarse recargas visuales completas.

## 28. Operaciones largas

Las operaciones largas deben mostrar:

- Estado actual.
- Progreso cuando pueda calcularse.
- Mensaje explicativo.
- Prevención de duplicados.
- Resultado parcial cuando corresponda.
- Confirmación final.
- Posibilidad de cancelar si es segura.

Una animación no sustituye la información de progreso.

## 29. Animaciones repetidas

No deben repetirse automáticamente:

- Entradas de página en cada filtro.
- Animaciones de encabezado.
- Aparición de tarjetas en cada actualización.
- Efectos de éxito permanentes.
- Movimientos que distraigan durante la lectura.

## 30. Reducción de movimiento

La aplicación debe respetar:

    @media (prefers-reduced-motion: reduce)

También pueden utilizarse variantes de Tailwind equivalentes.

Cuando la reducción de movimiento esté activa:

- Eliminar animaciones decorativas.
- Reducir desplazamientos.
- Mantener cambios de estado mediante opacidad o cambio inmediato.
- Evitar movimientos continuos.
- Conservar información y funcionalidad.

## 31. Accesibilidad

Las animaciones deben:

- No parpadear rápidamente.
- No depender del movimiento para comunicar información.
- No impedir navegación por teclado.
- No desplazar inesperadamente el foco.
- No ocultar mensajes antes de ser leídos.
- Permitir reducción de movimiento.

## 32. Rendimiento

La revisión debe detectar:

- Animaciones en demasiados elementos.
- Transiciones globales indiscriminadas.
- Uso de `transition-all` sin necesidad.
- Filtros costosos.
- Grandes desenfoques.
- Animaciones continuas.
- Re-renderizados provocados por animación.
- Cambios de layout frecuentes.

Debe preferirse una transición específica a `transition-all`.

## 33. Uso de Tailwind y CSS

Se deben reutilizar:

- Clases de transición consistentes.
- Duraciones comunes.
- Curvas comunes.
- Variantes de reducción de movimiento.
- Componentes compartidos.

No debe definirse una combinación diferente para cada página.

## 34. Bibliotecas de animación

No debe incorporarse una nueva biblioteca sin una decisión arquitectónica registrada mediante ADR.

Antes de añadirla se debe justificar:

- Problema que resuelve.
- Razón por la que CSS o Tailwind no son suficientes.
- Impacto en bundle.
- Impacto en rendimiento.
- Accesibilidad.
- Mantenimiento.
- Compatibilidad.

## 35. Auditoría de animaciones

La auditoría deberá identificar:

- Elementos con hover pero sin transición.
- Elementos con foco sin transición adecuada.
- Páginas con entrada brusca.
- Modales sin entrada o salida.
- Pestañas con cambio abrupto.
- Menús sin transición.
- Skeletons inconsistentes.
- Spinners utilizados donde correspondería skeleton.
- Animaciones con duraciones diferentes.
- Uso excesivo de `transition-all`.
- Animaciones sin reducción de movimiento.
- Animaciones continuas innecesarias.
- saltos de layout.
- componentes equivalentes con comportamientos distintos.

## 36. Clasificación de hallazgos

Cada hallazgo debe clasificarse como:

- Error confirmado.
- Inconsistencia probable.
- Mejora recomendada.
- Ausencia justificada.
- Decisión visual válida.
- Falso positivo.
- Pendiente de revisión visual.

## 37. Aplicación de correcciones

Toda corrección debe indicar:

1. Componente afectado.
2. Comportamiento anterior.
3. Comportamiento nuevo.
4. Duración.
5. Curva.
6. Propiedades animadas.
7. Comportamiento con reducción de movimiento.
8. Archivos modificados.
9. Resoluciones probadas.
10. Resultado visual.
11. Impacto en rendimiento.
12. Documentación actualizada.

## 38. Validación visual

Las animaciones deben comprobarse en:

- Navegación normal.
- Navegación por teclado.
- Reducción de movimiento.
- Equipo o navegador de rendimiento limitado.
- Pantalla pequeña.
- Pantalla amplia.
- Zoom aumentado.
- Carga lenta simulada.

## 39. Prohibiciones

No se debe:

- Animar todo por defecto.
- Utilizar movimiento sin propósito.
- Usar `transition-all` indiscriminadamente.
- Aplicar rebotes en procesos administrativos.
- Cambiar duraciones entre componentes equivalentes.
- Animar propiedades costosas sin necesidad.
- Ignorar reducción de movimiento.
- retrasar mensajes de error.
- ocultar contenido real durante una animación.
- introducir una librería sin ADR.
- corregir automáticamente toda ausencia detectada.
