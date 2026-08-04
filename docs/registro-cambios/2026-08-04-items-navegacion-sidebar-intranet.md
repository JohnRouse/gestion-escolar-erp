# Extracción de ítems de navegación del Sidebar de intranet

Fecha: 2026-08-04

## Objetivo

Reducir la responsabilidad de `AppSidebar.tsx` separando el renderizado de los elementos de navegación, sus submenús y los tooltips del modo colapsado.

## Cambios realizados

- Se creó `intranet/src/components/sidebar/SidebarNavigationItem.tsx`.
- El nuevo componente concentra:
  - botones principales del menú;
  - apertura y cierre de submenús en modo expandido;
  - estados activos de padres e hijos;
  - opciones agrupadas y simples;
  - tooltip de los ítems sin submenú en modo colapsado;
  - eventos de mouse y teclado que abren el flyout colapsado.
- `AppSidebar.tsx` conserva:
  - filtrado por roles y permisos;
  - resolución de rutas activas;
  - navegación;
  - estado de expansión;
  - temporizadores y referencias del flyout;
  - coordinación con `SidebarCollapsedFlyout`.

## Alcance funcional

No se modificaron rutas, permisos, etiquetas, iconos ni reglas de acceso. La extracción mantiene el comportamiento visual y funcional existente tanto en escritorio como en móvil.

## Validaciones realizadas

- Build de intranet completado correctamente.
- `git diff --check` sin errores.
- Pruebas visuales y funcionales aprobadas para:
  - menús simples y agrupados;
  - estados activos de padres e hijos;
  - modo expandido y colapsado;
  - flyouts por mouse y teclado;
  - tooltips;
  - expansión mediante el fondo libre;
  - cierre del menú móvil después de navegar.

## Resultado estructural

`AppSidebar.tsx` quedó reducido a aproximadamente 490 líneas. El renderizado de navegación quedó aislado en un componente reutilizable y más fácil de revisar sin alterar el controlador principal del Sidebar.
