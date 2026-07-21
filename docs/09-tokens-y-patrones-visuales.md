# Tokens y patrones visuales

## 1. Propósito

Establecer una fuente visual común para Gestión Escolar ERP.

El objetivo es evitar que cada página defina de forma independiente:

- Colores.
- Tipografías.
- Fondos.
- Bordes.
- Radios.
- Sombras.
- Estados.
- Espaciados.
- Alturas.
- Comportamientos interactivos.

El sistema debe verse y comportarse como una sola aplicación.

## 2. Estado de este documento

Este documento define la estructura y los criterios obligatorios del sistema visual.

Los valores exactos que ya utiliza el proyecto deberán obtenerse mediante la auditoría del código real.

Hasta completar esa auditoría, los valores se clasificarán como:

- Token confirmado.
- Valor repetido pendiente de centralización.
- Variante válida.
- Inconsistencia probable.
- Valor excepcional justificado.
- Valor obsoleto.
- Decisión pendiente.

No debe sustituirse automáticamente un valor solo porque sea distinto.

## 3. Fuente oficial de los estilos

Los valores visuales deben centralizarse preferentemente en:

- Variables CSS.
- Configuración de Tailwind.
- Componentes compartidos.
- Variantes tipadas.
- Utilidades globales controladas.

No deben dispersarse en cada página mediante:

- Colores hexadecimales arbitrarios.
- Estilos inline innecesarios.
- Bloques extensos de clases duplicadas.
- Alturas diferentes para controles equivalentes.
- Radios diferentes sin una razón funcional.
- Sombras decorativas sin patrón.

## 4. Categorías obligatorias de tokens

### 4.1 Superficies

El sistema debe diferenciar al menos:

- Fondo general de la aplicación.
- Fondo del contenido principal.
- Fondo de panel.
- Fondo de tarjeta.
- Fondo elevado.
- Fondo de campo.
- Fondo seleccionado.
- Fondo deshabilitado.
- Fondo informativo.
- Fondo de error.
- Fondo de advertencia.
- Fondo de éxito.

### 4.2 Texto

Debe existir una referencia común para:

- Texto principal.
- Texto secundario.
- Texto tenue.
- Texto deshabilitado.
- Texto sobre fondo oscuro.
- Texto de enlace.
- Texto informativo.
- Texto de éxito.
- Texto de advertencia.
- Texto de error.

### 4.3 Bordes

Debe distinguirse:

- Borde normal.
- Borde suave.
- Borde de división.
- Borde activo.
- Borde seleccionado.
- Borde deshabilitado.
- Borde de error.
- Borde de advertencia.
- Borde de éxito.

### 4.4 Foco

Todo control interactivo debe poseer foco visible.

El foco debe:

- Ser reconocible sin depender únicamente del color.
- Mantener contraste suficiente.
- No quedar oculto por `overflow`.
- Ser consistente entre botones, enlaces y campos.
- Aparecer durante navegación por teclado.
- No confundirse con un estado de error.

### 4.5 Estados funcionales

Los estados deben disponer de texto, color e icono cuando corresponda.

Deben existir criterios comunes para:

- Información.
- Éxito.
- Advertencia.
- Error.
- Pendiente.
- En proceso.
- Finalizado.
- Bloqueado.
- Deshabilitado.
- Revertido.
- Anulado.
- Observado.

El significado de un color no debe cambiar entre módulos.

## 5. Tipografía

## 5.1 Principios

La legibilidad tiene prioridad sobre mostrar más información simultáneamente.

No debe reducirse excesivamente la tipografía para hacer caber contenido.

## 5.2 Tamaños de referencia

Como criterio inicial:

- Texto funcional: 14 px o superior.
- Contenido principal: 16 px cuando corresponda.
- Etiquetas de campos: 14 px.
- Texto de botones: 14 px o superior.
- Metadatos: 12 px.
- Texto auxiliar: 12 px o superior.
- No utilizar texto menor de 12 px sin justificación documentada.

Los tamaños definitivos deberán contrastarse con el sistema actual.

## 5.3 Jerarquía

Debe existir una jerarquía consistente para:

- Etiqueta del módulo.
- Título de página.
- Descripción.
- Título de sección.
- Título de tarjeta.
- Etiqueta de campo.
- Contenido.
- Texto secundario.
- Metadatos.
- Mensajes de ayuda.
- Mensajes de error.

## 5.4 Longitud de línea

En monitores amplios, los párrafos no deben ocupar todo el ancho disponible.

Los contenidos extensos deben conservar una longitud de lectura cómoda.

Las tablas pueden aprovechar más espacio, pero sin perder agrupación visual.

## 6. Campos de formulario

Todos los campos equivalentes deben compartir:

- Altura.
- Fondo.
- Borde.
- Radio.
- Tipografía.
- Color de texto.
- Color de placeholder.
- Espaciado interno.
- Foco.
- Error.
- Estado deshabilitado.
- Transición.
- Mensaje de ayuda.
- Mensaje de validación.

Esto aplica a:

- Input.
- Select.
- Textarea.
- Buscador.
- Selector de fecha.
- Selector de institución.
- Selector de año.
- Campo de moneda.
- Campo numérico.
- Campo de documento.
- Autocompletado.

## 6.1 Etiquetas

Cada campo debe tener una etiqueta visible.

No debe depender únicamente del placeholder.

La obligatoriedad debe señalarse de forma clara y consistente.

## 6.2 Placeholder

El placeholder debe:

- Ser comprensible.
- Mantener contraste suficiente.
- No simular un valor ya ingresado.
- No reemplazar instrucciones importantes.
- No contener textos excesivamente largos.

## 6.3 Estado de error

El error debe incluir:

- Borde o indicador visible.
- Mensaje específico.
- Texto comprensible.
- Relación clara con el campo.
- Foco accesible cuando corresponda.

No debe depender únicamente del color rojo.

## 6.4 Estado deshabilitado

Un campo deshabilitado debe:

- Ser reconocible.
- Mantener el texto legible.
- No parecer un campo editable.
- Explicar el motivo cuando el bloqueo no sea evidente.

## 7. Botones

## 7.1 Variantes necesarias

El sistema debe unificar como mínimo:

- Acción principal.
- Acción secundaria.
- Acción terciaria.
- Acción destructiva.
- Acción de advertencia.
- Acción silenciosa.
- Botón de icono.
- Botón de enlace.

## 7.2 Reglas

Todo botón debe:

- Describir la acción.
- Mantener altura consistente.
- Tener foco visible.
- Mostrar estado hover.
- Mostrar estado activo.
- Mostrar estado deshabilitado.
- Mostrar carga cuando la acción tarde.
- Evitar envíos duplicados.
- Conservar una transición breve.
- Mantener un área táctil suficiente.

## 7.3 Tamaños de referencia

Como criterio inicial:

- Altura mínima en escritorio: 40 px.
- Área táctil mínima en móvil: 44 px.
- Los botones relacionados deben conservar alturas iguales.
- Los botones de una misma fila deben mantener alineación.

## 7.4 Iconos

Un icono puede acompañar al texto.

No debe reemplazarlo cuando la acción pueda ser ambigua.

Los botones solo con icono deben incluir:

- Nombre accesible.
- Tooltip cuando corresponda.
- Área táctil suficiente.
- Foco visible.

## 8. Tarjetas y paneles

Las tarjetas equivalentes deben compartir:

- Fondo.
- Borde.
- Radio.
- Sombra.
- Espaciado.
- Encabezado.
- Separación interna.
- Estado hover cuando sean interactivas.
- Transición.

No toda agrupación necesita una tarjeta.

Debe evitarse llenar cada pantalla de cajas con bordes y sombras innecesarias.

## 9. Tablas

Las tablas deben unificar:

- Encabezados.
- Altura de filas.
- Alineación.
- Bordes.
- Estado hover.
- Filas seleccionadas.
- Acciones.
- Paginación.
- Estado vacío.
- Skeleton.
- Scroll horizontal.
- Densidad.

No deben comprimirse columnas hasta volver ilegible el contenido.

Los estados deben mostrar texto y no depender únicamente de color.

## 10. Modales

Los modales deben compartir:

- Fondo superpuesto.
- Contenedor.
- Radio.
- Sombra.
- Encabezado.
- Botón de cierre.
- Área central.
- Pie de acciones.
- Altura máxima.
- Scroll interno.
- Transición de entrada y salida.

Un modal no debe superar el tamaño de la ventana.

Los modales de una misma funcionalidad no deben cambiar abruptamente de tamaño al cambiar de pestaña.

## 11. Mensajes y alertas

Deben existir patrones comunes para:

- Información.
- Confirmación.
- Advertencia.
- Error recuperable.
- Error bloqueante.
- Acción completada.
- Acción parcial.
- Operación revertida.

Cada mensaje debe indicar:

- Qué ocurrió.
- Qué efecto tuvo.
- Qué puede hacer el usuario.
- Si la acción puede reintentarse.

## 12. Radios

Los radios deben utilizar una escala limitada y documentada.

No deben aparecer valores diferentes en cada pantalla sin una razón.

Debe diferenciarse entre:

- Campo.
- Botón.
- Tarjeta.
- Modal.
- Etiqueta o badge.
- Contenedor principal.

## 13. Sombras

Las sombras deben utilizarse para comunicar elevación o separación.

No deben utilizarse únicamente como decoración.

Debe existir una escala limitada para:

- Elemento plano.
- Tarjeta.
- Elemento interactivo elevado.
- Menú.
- Modal.

## 14. Espaciado

Debe utilizarse una escala coherente.

Los espacios deben representar relaciones:

- Elementos muy relacionados: separación pequeña.
- Elementos de un mismo grupo: separación media.
- Secciones diferentes: separación mayor.

No debe compensarse un layout incorrecto agregando márgenes arbitrarios.

## 15. Colores arbitrarios

Todo color hexadecimal, RGB, HSL o clase de color excepcional debe clasificarse como:

- Token oficial.
- Variante funcional.
- Valor heredado.
- Excepción justificada.
- Inconsistencia pendiente.

Los valores repetidos deben evaluarse para centralización.

Los valores únicos deben revisarse para determinar si son necesarios.

## 16. Componentes compartidos

Cuando un patrón aparezca en varias páginas debe evaluarse como:

- Componente compartido.
- Variante de un componente.
- Token.
- Utilidad centralizada.
- Patrón de layout.

No debe copiarse un bloque extenso de clases para mantener versiones independientes.

## 17. Auditoría visual

La auditoría deberá identificar:

- Colores distintos para la misma función.
- Campos con alturas diferentes.
- Botones equivalentes con estilos distintos.
- Radios inconsistentes.
- Sombras no estandarizadas.
- Texto menor de 12 px.
- Foco ausente.
- Estados dependientes solo del color.
- Estilos inline.
- Colores hexadecimales dispersos.
- Bloques extensos de clases duplicados.
- Componentes que deberían compartirse.
- Páginas que no usan los patrones globales.

## 18. Corrección de inconsistencias

Toda corrección debe indicar:

1. Inconsistencia encontrada.
2. Evidencia.
3. Páginas afectadas.
4. Componente o token correcto.
5. Archivos a modificar.
6. Riesgo.
7. Validación visual.
8. Validación responsive.
9. Accesibilidad.
10. Documentación actualizada.

## 19. Prohibiciones

No se debe:

- Crear colores nuevos sin revisar los tokens actuales.
- Cambiar el significado de un color entre módulos.
- Reducir el texto para resolver problemas de espacio.
- Usar estilos inline sin justificación.
- Duplicar componentes visuales completos.
- Utilizar solo color para comunicar estados.
- Aplicar sombras diferentes sin un criterio.
- Añadir una librería visual sin ADR.
- Corregir automáticamente todos los valores distintos sin revisión.
