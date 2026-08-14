# Plan de unificación de la estructura global

## 1. Objetivo

Definir cómo corregir los hallazgos globales sin aplicar cambios aislados o contradictorios.

## 2. Principio de implementación

Primero se corrige la fuente compartida del patrón.

Después se migran las páginas y componentes consumidores.

No se debe copiar una corrección accesible en cada modal de forma independiente.

## 3. Componente base de diálogo

Debe crearse una primitiva compartida con un nombre estable.

Nombre provisional:

- `AccessibleDialog`.
- `DialogShell`.

El nombre definitivo debe seleccionarse al implementar.

## 4. Responsabilidades del diálogo base

Debe proporcionar:

- Portal.
- Overlay.
- `role="dialog"`.
- `aria-modal="true"`.
- `aria-labelledby`.
- `aria-describedby` cuando exista descripción.
- Identificadores estables.
- Bloqueo de scroll.
- Foco inicial.
- Focus trap.
- Cierre mediante Escape configurable.
- Cierre mediante overlay configurable.
- Retorno del foco.
- Botón de cierre accesible.
- Alto máximo según viewport.
- Scroll únicamente en el cuerpo.
- Header estable.
- Footer estable.
- Transición de entrada y salida.
- Reducción de movimiento.
- Capas normalizadas.
- Prevención de cierres mientras se guarda.
- Tamaños o variantes controladas.

## 5. Variantes

La base debe permitir construir:

- Confirmación.
- Formulario.
- Detalle.
- Edición.
- Proceso destructivo.
- Información.
- Flujo público.
- Comprobante.
- Estado de éxito.

No debe incluir reglas funcionales específicas de matrícula, tesorería o comunidad.

## 6. Orden de migración

### Etapa 1

- Crear el diálogo base.
- Crear pruebas del foco, Escape y atributos ARIA.
- Documentar su API.

### Etapa 2

- Migrar `ConfirmDialog`.
- Mantener su interfaz pública actual.
- Validar confirmación, cancelación y loading.

### Etapa 3

- Hacer que `CenteredFormModal` utilice la base.
- Mantener header, body, mensajes y footer.
- Añadir foco inicial y retorno del foco.

### Etapa 4

- Migrar `ReportarPagoModal`.
- Conservar el flujo funcional.
- Añadir altura máxima y scroll interno.
- Revisar cierre automático posterior al éxito.
- Unificar campos, botones y etiquetas.

### Etapa 5

- Migrar modales de comunidad.
- Migrar comprobantes de tesorería.
- Eliminar estructuras duplicadas únicamente después de validar cada consumidor.

## 7. Header

Dividir responsabilidades en componentes o hooks:

- Branding institucional.
- Selector institucional.
- Buscador global.
- Acciones rápidas.
- Menú de usuario.
- Gestión de branding.
- Lógica de cierre externo.
- Gestión de teclado.

El selector institucional y el menú de usuario deben:

- Declarar `aria-haspopup`.
- Actualizar `aria-expanded`.
- Relacionarse mediante `aria-controls`.
- Admitir Escape.
- Devolver el foco.
- Mantener un orden de tabulación lógico.
- Evitar capturar globalmente teclas cuando no están abiertos.

## 8. Sidebar

Separar:

- Configuración de navegación.
- Filtrado por roles.
- Elemento principal.
- Grupo expandible.
- Elemento hijo.
- Flyout contraído.
- Tooltip.
- Branding.
- Controles de expansión.

El flyout debe:

- Poder abrirse mediante teclado.
- Tener foco gestionado.
- Cerrar con Escape.
- Reposicionarse al cambiar viewport.
- No depender únicamente de hover.
- Respetar reducción de movimiento.

## 9. Animaciones globales

Los keyframes reutilizables deben vivir en estilos globales controlados.

Se debe definir:

- Entrada de dropdown.
- Entrada de modal.
- Salida de modal.
- Entrada de ruta.
- Skeleton.
- Spinner.
- Reducción de movimiento.

Los componentes deben consumir clases o utilidades oficiales.

## 10. transition-all

Procedimiento:

1. Identificar propiedades que realmente cambian.
2. Sustituir `transition-all` por transiciones específicas.
3. Probar hover, foco, activo y deshabilitado.
4. Comprobar rendimiento y saltos.
5. Registrar el resultado.

No realizar reemplazo global automático.

## 11. Tipografía

Objetivo inicial:

- Ninguna etiqueta funcional menor de 12 px.
- Texto principal desde 14 px.
- Metadatos de 12 px con contraste suficiente.
- Tracking moderado.
- Mayúsculas solo en etiquetas breves.

Las etiquetas de 11 px deben migrarse por componente compartido, no por reemplazo ciego.

## 12. CSS

### CSS global permitido

- Reset.
- Tokens.
- Tipografía base.
- Layout global.
- Utilidades de accesibilidad.
- Animaciones compartidas.
- Componentes verdaderamente transversales.

### CSS modular

Los estilos específicos de matrícula, asistencia, tesorería, comunidad y otros módulos deben cargarse cerca del módulo consumidor.

### Regla de migración

- No mover todos los archivos a la vez.
- Identificar selectores usados.
- Detectar colisiones.
- Migrar un módulo por fase.
- Ejecutar comparación visual.
- Eliminar reglas antiguas solo después de validar.

## 13. Tokens

La fuente actual debe auditarse antes de crear nuevos archivos.

Se debe decidir si `carbon-theme.css` continúa como fuente oficial.

Los tokens deben cubrir:

- Superficies.
- Texto.
- Bordes.
- Foco.
- Estados.
- Radios.
- Sombras.
- Espaciado.
- Duraciones.
- Capas.

## 14. Capas

Debe definirse una escala para:

- Header.
- Sidebar.
- Overlay.
- Dropdown.
- Tooltip.
- Modal.
- Toast.
- Elementos críticos.

No deben seguir utilizándose valores arbitrarios como única estrategia.

## 15. Validaciones

Cada fase debe comprobar:

- Build.
- TypeScript.
- Lint cuando esté disponible.
- Pruebas unitarias.
- Pruebas de diálogo.
- Navegación por teclado.
- Escape.
- Retorno del foco.
- Reducción de movimiento.
- 360 × 800.
- 768 × 1024.
- 1024 × 768.
- 1366 × 768.
- 1920 × 1080.
- Zoom 125 %.
- Zoom 150 %.

## 16. Reversión

Cada migración debe ser un commit separado o un conjunto pequeño de commits relacionados.

La reversión debe permitir:

- Restaurar el componente anterior.
- Mantener la interfaz pública.
- Evitar cambios funcionales en datos.
- Revertir sin tocar base de datos.

## 17. Fases de implementación previstas

1. Base de diálogo accesible.
2. ConfirmDialog.
3. CenteredFormModal.
4. ReportarPagoModal.
5. Modales restantes.
6. Header.
7. Sidebar.
8. Animaciones globales.
9. Tipografía compartida.
10. CSS por módulos.
11. Tokens.
12. Auditoría visual por página.

## 18. Estado de ejecución — 14 de agosto de 2026

El plan se encuentra parcialmente ejecutado.

| Fase | Estado | Evidencia actual |
|---|---|---|
| 1. Base de diálogo accesible | Implementada | Existe `AccessibleDialog.tsx`. |
| 2. `ConfirmDialog` | Implementada | Compone `AccessibleDialog`. |
| 3. `CenteredFormModal` | Implementada | Compone `AccessibleDialog`. |
| 4. `ReportarPagoModal` | Implementada | Migrado a `AccessibleDialog`; flujo de éxito corregido y tipado local saneado. |
| 5. Modales restantes | Parcial | Comunidad ya posee consumidores de la base; otros modales requieren revisión. |
| 6. Header | Parcial | Refactorizado en PR #16; falta validación transversal final. |
| 7. Sidebar | Parcial | Refactorizado en PR #16; falta validación transversal final. |
| 8. Animaciones globales | Pendiente de reconciliación | Existe documentación específica, pero debe compararse con consumidores actuales. |
| 9. Tipografía compartida | Pendiente | Debe abordarse desde componentes fuente, no mediante reemplazos masivos. |
| 10. CSS por módulos | Pendiente | Mantener migración gradual. |
| 11. Tokens | Pendiente | Debe reducirse la coexistencia de familias de tokens antes de declarar una fuente definitiva. |
| 12. Auditoría visual por página | Pendiente | Se realizará después de estabilizar patrones transversales. |

### Regla de continuación

No reiniciar las fases ya implementadas.

Antes de modificar un componente debe comprobarse:

1. qué documentó la auditoría histórica;
2. cuál es el estado actual del código;
3. si ya existe una fuente compartida válida;
4. qué deuda sigue siendo real;
5. qué documentación debe actualizarse junto con la implementación.

La siguiente fase es auditar los diálogos restantes y seleccionar la
próxima migración según deuda real, consumidores y riesgo funcional.
