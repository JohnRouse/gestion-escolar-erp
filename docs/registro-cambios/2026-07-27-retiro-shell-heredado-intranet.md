# Retiro del shell heredado de la intranet

## Objetivo

Eliminar una estructura de navegación antigua que permanecía en el repositorio sin participar en las rutas activas.

## Componentes retirados

- `intranet/src/components/IntranetLayout.tsx`
- `intranet/src/components/Topbar.tsx`
- `intranet/src/components/Sidebar.tsx`

## Comprobación de uso

La aplicación activa utiliza `AppLayout`, `AppHeader` y `AppSidebar`.

Los tres componentes retirados solamente se relacionaban entre sí y no tenían consumidores externos dentro de `intranet/src`.

## Validaciones

- búsqueda de consumidores externos: sin resultados;
- build de Vite: correcto;
- `git diff --check`: correcto;
- sin cambios en API, base de datos, rutas o permisos.

## Siguiente fase

Dividir gradualmente las responsabilidades de `AppHeader` sin alterar su apariencia ni su comportamiento funcional.
