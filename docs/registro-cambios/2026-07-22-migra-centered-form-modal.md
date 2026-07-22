# Migración de CenteredFormModal

Fecha: 2026-07-22

## 1. Objetivo

Migrar `CenteredFormModal` a la infraestructura compartida de `AccessibleDialog`, conservando su contrato público y el comportamiento de sus consumidores.

## 2. Archivos funcionales

- `intranet/src/components/AccessibleDialog.tsx`
- `intranet/src/components/CenteredFormModal.tsx`

## 3. Cambios implementados

- `CenteredFormModal` dejó de implementar su propio portal.
- Se eliminó la gestión duplicada de Escape.
- Se eliminó el bloqueo duplicado del scroll.
- Se incorporó focus trap mediante la base compartida.
- Se incorporó retorno del foco al control de origen.
- Se preservó el cierre por Escape y por overlay.
- Se impidió el cierre durante el guardado.
- Se preservó el foco inicial de los campos con `autoFocus`.
- Se añadieron estados accesibles para mensajes de error y éxito.
- Se añadió compatibilidad con reducción de movimiento.
- Se retiró el texto funcional de 11 px.
- No se modificó la interfaz pública del componente.

## 4. Consumidores comprobados

- `AniosLectivosTab.tsx`
- `CursosTab.tsx`

No fue necesario modificar ninguno de los dos consumidores.

## 5. Validaciones técnicas

- TypeScript aislado: correcto.
- ESLint dirigido: correcto.
- Build de Vite: correcto.
- `git diff --check`: correcto.
- Sin dependencias nuevas.

## 6. Validación visual y funcional

La prueba manual se realizó en:

1. Nuevo año lectivo.
2. Nueva área curricular.

Se confirmó:

- Foco inicial en el primer campo.
- Navegación contenida con Tab.
- Navegación inversa con Shift + Tab.
- Cierre mediante Escape.
- Cierre mediante overlay.
- Retorno del foco al botón de origen.
- Bloqueo de interacción y scroll del fondo.
- Mensajes de validación visibles dentro del diálogo.
- Visualización correcta del encabezado, campos y botones.
- Funcionamiento correcto sin crear registros de prueba.

## 7. Modales independientes detectados

Durante la revisión visual se identificaron otros modales que todavía no usan la base compartida:

- `CriteriosTutoriaTab.tsx`
- `NivelesGradosTab.tsx`

Estos elementos no forman parte de esta rama. Serán incluidos en un inventario completo y migrados en fases posteriores.

## 8. Alcance excluido

- No se modificó lógica de negocio.
- No se modificó la API.
- No se modificó la base de datos.
- No se añadieron dependencias.
- No se migraron otros modales independientes.
