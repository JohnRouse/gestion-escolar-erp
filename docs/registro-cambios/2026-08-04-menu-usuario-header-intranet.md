# Refactorización del menú de usuario del encabezado

## Objetivo

Separar el menú de usuario de `AppHeader` para reducir responsabilidades del encabezado principal y mejorar la accesibilidad sin alterar el flujo funcional de la intranet.

## Cambios aplicados

- se creó `intranet/src/components/header/HeaderUserMenu.tsx`;
- se trasladó la lógica de avatar, nombre corto, rol, correo y acciones de usuario;
- se reemplazó la alerta nativa de soporte por el sistema de toast existente;
- se añadió semántica de menú con `aria-haspopup`, `aria-expanded`, `aria-controls`, `role="menu"` y `role="menuitem"`;
- se añadió apertura con flecha abajo, cierre con Escape y retorno de foco al disparador;
- se mantuvo el cierre por clic fuera del menú;
- se corrigió la capa de clic exterior para que permanezca transparente y no oscurezca ni haga parpadear el dashboard;
- `AppHeader.tsx` quedó reducido y conserva únicamente la coordinación entre selector institucional, búsqueda global, notificaciones y menú de usuario.

## Validaciones realizadas

- build de Vite correcto;
- `git diff --check` correcto;
- apertura y cierre normal del menú;
- cierre con Escape;
- cierre al hacer clic fuera;
- cierre del selector institucional al abrir el menú de usuario;
- navegación correcta hacia Perfil y Configuración;
- toast de Soporte correcto;
- cierre de sesión correcto;
- dashboard visible sin oscurecimiento ni parpadeos durante la apertura del menú.

## Alcance

No se modificaron la API, la base de datos, las rutas ni los permisos.
