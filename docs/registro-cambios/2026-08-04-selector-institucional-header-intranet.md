# Selector institucional del encabezado de la intranet

## Objetivo

Separar del encabezado principal la selección de institución, la vista consolidada y la administración de logos, manteniendo el comportamiento existente y mejorando la estructura accesible del componente.

## Componentes involucrados

- `intranet/src/components/header/HeaderInstitutionSelector.tsx`
- `intranet/src/layout/AppHeader.tsx`

## Cambios principales

- extracción del selector institucional desde `AppHeader`;
- aislamiento de la carga y restauración de logos;
- conservación de la selección de colegio y de la vista consolidada;
- coordinación con la búsqueda global y el menú de usuario;
- cierre por clic exterior y por tecla `Escape`;
- incorporación de `aria-expanded`, `aria-controls`, `role="listbox"`, `role="option"`, `aria-selected` y `role="alert"`;
- uso de una capa exterior transparente para evitar oscurecimiento o parpadeo de la pantalla.

## Validaciones realizadas

- apertura y cierre del selector;
- cierre al hacer clic fuera;
- cierre mediante `Escape`;
- cambio de institución;
- cambio a vista consolidada;
- coordinación con búsqueda global y menú de usuario;
- dashboard visible sin oscurecimiento ni parpadeos;
- build de Vite correcto;
- `git diff --check` correcto;
- worktree limpio tras la sincronización.

## Resultado estructural

`AppHeader.tsx` quedó reducido a 77 líneas y actúa como coordinador de:

- botón de menú lateral;
- selector institucional;
- búsqueda global;
- notificaciones;
- menú de usuario.

## Siguiente fase

Revisar y dividir `AppSidebar.tsx`, comenzando por inventariar responsabilidades, navegación, estados visuales y comportamiento responsive antes de realizar cambios.
