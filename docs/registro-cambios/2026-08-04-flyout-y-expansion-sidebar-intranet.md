# Flyout colapsado y superficie de expansión del Sidebar

Fecha: 2026-08-04

## Objetivo

Reducir la complejidad de `AppSidebar.tsx` y mejorar la experiencia visual del Sidebar colapsado sin modificar rutas, permisos ni comportamiento responsive.

## Cambios realizados

- Se extrajo el flyout del Sidebar colapsado a `intranet/src/components/sidebar/SidebarCollapsedFlyout.tsx`.
- El nuevo componente conserva el portal, la posición dinámica, el cierre temporizado y la navegación por teclado.
- `AppSidebar.tsx` mantiene el estado y los controladores de apertura, cierre, foco y navegación.
- Se eliminó el botón adicional de expansión que aparecía debajo del logo al contraer el Sidebar.
- Dashboard y el resto de la navegación mantienen ahora la misma posición vertical al expandir y contraer.
- Las zonas libres del panel colapsado muestran `cursor-col-resize` y permiten expandir el Sidebar mediante clic.
- Los elementos interactivos quedan excluidos de esa superficie para evitar expansiones accidentales.

## Accesibilidad e interacción

- El flyout conserva `role="menu"` y sus opciones `role="menuitem"`.
- Se mantienen `ArrowUp`, `ArrowDown`, `Home`, `End`, `Escape` y `ArrowLeft`.
- Al cerrar con teclado, el foco vuelve al botón que abrió el flyout.
- Los botones y enlaces mantienen su cursor y comportamiento propios.

## Validación realizada

- Build de `intranet`: correcto.
- `git diff --check`: correcto.
- Apertura y cierre del flyout con mouse: correcto.
- Navegación por teclado: correcta.
- Menús simples y agrupados: correctos.
- Navegación y ruta activa: correctas.
- Expansión mediante clic en fondo libre: correcta.
- Sin desplazamiento vertical de Dashboard al contraer.
- Sin activaciones accidentales al pulsar iconos o botones.

## Archivos involucrados

- `intranet/src/layout/AppSidebar.tsx`
- `intranet/src/components/sidebar/SidebarCollapsedFlyout.tsx`
