# Implementación de diálogo accesible base

Fecha: 2026-07-22

## 1. Objetivo

Crear una base reutilizable de diálogo accesible y migrar el componente `ConfirmDialog` sin cambiar su interfaz pública ni sus consumidores.

## 2. Archivos funcionales

- `intranet/src/components/AccessibleDialog.tsx`
- `intranet/src/components/ConfirmDialog.tsx`

## 3. Capacidades implementadas

- Renderizado mediante portal.
- Semántica `role="dialog"`.
- `aria-modal`.
- Asociación accesible del título y la descripción.
- Foco inicial configurable.
- Contención del foco mediante Tab y Shift + Tab.
- Cierre mediante Escape.
- Cierre mediante overlay.
- Bloqueo del scroll del documento.
- Retorno del foco al control que abrió el diálogo.
- Protección del cierre durante operaciones en curso.
- Compatibilidad con reducción de movimiento.
- Etiqueta accesible en el botón de cierre.
- Eliminación de `transition-all` en `ConfirmDialog`.
- Sustitución del texto funcional de 11 px.

## 4. Compatibilidad

La interfaz pública de `ConfirmDialog` se mantuvo:

- `open`
- `title`
- `description`
- `eyebrow`
- `confirmLabel`
- `cancelLabel`
- `tone`
- `loading`
- `onConfirm`
- `onCancel`

No se modificaron los consumidores existentes.

## 5. Validaciones técnicas

- TypeScript aislado de ambos componentes: correcto.
- ESLint dirigido: correcto.
- Build de Vite: correcto.
- `git diff --check`: correcto.
- La rama no introdujo nuevos diagnósticos TypeScript respecto de `origin/main`.

El proyecto conserva 35 diagnósticos TypeScript preexistentes que no pertenecen a esta implementación.

## 6. Validación visual y funcional

La prueba manual se realizó sobre una confirmación real de eliminación de horario en Calendario.

Se comprobaron satisfactoriamente:

1. Foco inicial en Cancelar.
2. Ciclo de Tab contenido dentro del diálogo.
3. Ciclo inverso con Shift + Tab.
4. Cierre mediante Escape.
5. Retorno del foco al control de origen.
6. Cierre mediante el fondo oscuro.
7. Bloqueo de interacción con la página inferior.
8. Bloqueo del scroll del documento.
9. Legibilidad y ajuste del contenido.
10. Legibilidad de la etiqueta superior.

## 7. Alcance excluido

- No se modificó lógica de negocio.
- No se modificó la API.
- No se modificó la base de datos.
- No se añadieron dependencias.
- No se migraron todavía otros modales.
- No se corrigió la deuda global de TypeScript.
- No se abordó la división de paquetes de Vite.

## 8. Corrección transversal de retorno de foco

Fecha de validación: 2026-08-28.

Se corrigieron dos defectos confirmados en la infraestructura compartida:

- React puede aplicar `autoFocus` durante el commit antes de que los efectos de
  `AccessibleDialog` capturen el foco externo. La primitiva conserva ahora el
  último elemento enfocado fuera de cada instancia y evita que el foco nativo
  de un descendiente sustituya ese origen.
- El `mousedown` del overlay continuaba su acción predeterminada después de
  desmontar el portal y sobrescribía el retorno de foco con `body`. El overlay
  previene esa acción predeterminada antes de solicitar el cierre.

`initialFocusRef` continúa siendo la opción recomendada cuando el consumidor
necesita declarar explícitamente el foco inicial. El `autoFocus` nativo queda
soportado para compatibilidad, pero no reemplaza a `initialFocusRef` cuando el
destino debe ser estable y explícito.

La corrección mantiene Escape, botón de cierre, Cancelar, `preventClose`, focus
trap, bloqueo de scroll y reducción de movimiento. Se validaron un consumidor
directo, `ConfirmDialog` y `CenteredFormModal` sin modificar sus contratos.
