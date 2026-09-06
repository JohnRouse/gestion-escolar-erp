# Sistema de diseño UI/UX

## 1. Objetivo

Mantener una experiencia uniforme, legible, predecible y accesible en todos los módulos.

Las pantallas no deben diseñarse como piezas independientes.

## 2. Enfoque visual

El producto mantiene:

- Diseño minimalista.
- Jerarquía clara.
- Espacios amplios.
- Controles legibles.
- Colores funcionales.
- Patrones inspirados en Carbon Design System.

Actualmente se aplican los principios de Carbon, no necesariamente sus componentes oficiales.

## 3. Componentes compartidos

Antes de crear una pantalla se debe verificar si ya existe un componente reutilizable para:

- Encabezado.
- Tarjeta.
- Botón.
- Campo.
- Selector.
- Tabla.
- Filtro.
- Estado.
- Alerta.
- Modal.
- Pestaña.
- Skeleton.
- Paginación.
- Confirmación.
- Estado vacío.

Cuando varias páginas presentan la misma necesidad, debe crearse o mejorarse un componente compartido.

No debe copiarse un bloque visual completo para modificarlo independientemente en otra página.

## 4. Encabezados

Las páginas principales deben compartir:

- Etiqueta del módulo.
- Título principal.
- Descripción breve.
- Contexto institucional.
- Acción principal.
- Espaciado consistente.

## 5. Legibilidad

- El texto funcional debe ser legible sin aumentar el zoom.
- Las etiquetas no deben utilizar tamaños excesivamente pequeños.
- Los textos secundarios deben conservar contraste suficiente.
- Las mayúsculas sostenidas deben limitarse a etiquetas breves.
- La legibilidad tiene prioridad sobre mostrar más datos simultáneamente.

## 6. Formularios

Cada campo debe incluir:

- Etiqueta visible.
- Placeholder comprensible.
- Ayuda cuando sea necesaria.
- Estado deshabilitado reconocible.
- Mensaje de error específico.
- Indicación de obligatoriedad cuando corresponda.

No deben utilizarse controles ambiguos como una `X` aislada para limpiar.

Debe mostrarse:

- Limpiar filtros.
- Limpiar formulario.
- Restablecer.
- Cancelar.

según corresponda.

## 7. Botones

Los botones deben describir la acción:

- Guardar cambios.
- Generar vista previa.
- Ejecutar promoción.
- Validar reversión.
- Limpiar filtros.
- Ver detalle.

Un icono puede acompañar al texto, pero no reemplazarlo cuando la acción sea ambigua.

## 8. Tablas

Las tablas deben:

- Mantener encabezados claros.
- Evitar columnas comprimidas.
- Permitir desplazamiento horizontal.
- Mostrar estados con texto y color.
- Mantener acciones visibles.
- Utilizar paginación.
- Conservar legibilidad.

En pantallas pequeñas pueden convertirse en tarjetas.

## 9. Modales

Los modales de una misma funcionalidad deben mantener un tamaño uniforme.

Deben tener:

- Encabezado fijo.
- Título.
- Contexto.
- Botón de cierre.
- Área central desplazable.
- Pie fijo cuando existan acciones.
- Altura máxima basada en la ventana.
- Scroll interno para contenido extenso.

Al cambiar de pestaña no deben crecer ni encogerse abruptamente.

## 10. Carga y animaciones

No debe mostrarse un bloque incompleto para reemplazarlo bruscamente.

Se deben utilizar skeletons con dimensiones cercanas al contenido definitivo.

Cada página debe contemplar:

- Carga inicial.
- Recarga parcial.
- Resultado vacío.
- Error recuperable.
- Error bloqueante.
- Confirmación de éxito.

Las animaciones deben ser suaves y breves.

Debe respetarse `prefers-reduced-motion`.

## 11. Estados

Los estados siempre deben incluir texto.

No se debe depender únicamente de color, forma o icono.

Ejemplos:

- Finalizado.
- En proceso.
- Revertido.
- Bloqueado.
- Pendiente.
- Procesado.

## 12. Filtros

Orden recomendado:

1. Institución.
2. Búsqueda.
3. Estado.
4. Año.
5. Sección.
6. Fechas.
7. Aplicar filtros.
8. Limpiar filtros.

Los botones deben permanecer juntos y claramente identificados.

## 13. Contexto institucional

Cuando el encabezado esté en `Todos los colegios`, los datos ambiguos deben incluir la institución.

Cuando se seleccione un colegio específico, no debe repetirse innecesariamente el nombre del colegio.

## 14. Responsive

Toda funcionalidad debe revisarse en:

- Escritorio amplio.
- Laptop.
- Tablet.
- Pantalla angosta.

No se permite:

- Superposición.
- Campos cortados.
- Botones fuera del contenedor.
- Modales más grandes que la ventana.
- Tablas ilegibles.
- Pérdida de acciones.

## 15. Accesibilidad

Los controles deben disponer de:

- Foco visible.
- Navegación por teclado.
- Etiquetas asociadas.
- Contraste suficiente.
- Estados anunciables.
- Textos alternativos.

## 16. Prohibiciones

No se debe:

- Crear una variante visual sin revisar componentes existentes.
- Introducir otra librería de UI sin ADR.
- Reducir excesivamente la tipografía para hacer caber información.
- Ocultar errores silenciosamente.
- Cambiar el significado de colores entre módulos.
- Utilizar controles ambiguos.
- Mostrar contenido que aparezca de golpe después de una carga prolongada.

## 17. Teclado de diálogos superpuestos

AccessibleDialog entrega Escape y Tab/Shift+Tab exclusivamente a la capa superior.
Si esta impide el cierre, Escape no debe cerrar una capa inferior. Al cerrar el
hijo se devuelve el foco a su origen en el padre y se conserva el scroll lock
hasta cerrar el último diálogo. Véase el [escenario transversal](escenarios/dialogos-anidados-teclado.md).
