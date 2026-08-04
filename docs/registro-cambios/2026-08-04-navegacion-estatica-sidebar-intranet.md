# Extracción de la navegación estática del Sidebar

## Objetivo

Separar la definición de rutas, categorías, iconos y roles del componente visual `AppSidebar`, sin cambiar permisos, navegación ni comportamiento responsive.

## Cambios

- Se creó `intranet/src/config/sidebarNavigation.ts`.
- Se trasladaron los tipos `NavLeaf`, `NavChild` y `NavItem`.
- Se trasladaron las categorías y opciones del menú lateral.
- `AppSidebar.tsx` ahora consume `sidebarMenuGroups` y mantiene el filtrado por rol y tutoría.

## Alcance preservado

La extracción no modifica:

- rutas disponibles;
- roles autorizados;
- regla especial de acceso a Tutoría;
- estados expandido o colapsado;
- flyout del menú colapsado;
- navegación por teclado;
- identidad institucional;
- comportamiento móvil.

## Validaciones

- Script de transformación: correcto.
- Build de Vite: correcto.
- `git diff --check`: correcto.
- No quedaron definiciones antiguas dentro de `AppSidebar.tsx`.
- No hubo cambios en API ni base de datos.

## Resultado estructural

`AppSidebar.tsx` redujo su tamaño y conserva la lógica interactiva. La configuración estática queda centralizada y disponible para futuras pruebas, validaciones o reutilización.

## Siguiente fase

Separar el flyout del Sidebar colapsado y después revisar el renderizado reutilizable de opciones de navegación.
