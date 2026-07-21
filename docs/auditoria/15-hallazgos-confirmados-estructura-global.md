# Hallazgos confirmados de la estructura global

## 1. Propósito

Separar los errores comprobados mediante lectura del código de los candidatos que todavía necesitan revisión visual.

## 2. Estados utilizados

- Confirmado por código.
- Deuda arquitectónica confirmada.
- Riesgo alto pendiente de prueba visual.
- Mejora recomendada.
- Falso positivo.
- Comportamiento correcto.
- Pendiente de comprobación.

## 3. Diálogos compartidos

### 3.1 ConfirmDialog

Archivo:

- `intranet/src/components/ConfirmDialog.tsx`.

Estado:

- Error confirmado.

Hallazgos confirmados:

- No declara `role="dialog"`.
- No declara `aria-modal="true"`.
- No relaciona el título mediante `aria-labelledby`.
- No relaciona la descripción mediante `aria-describedby`.
- No gestiona la tecla Escape.
- No establece foco inicial.
- No contiene el foco dentro del diálogo.
- No devuelve el foco al control que lo abrió.
- No bloquea el scroll del documento.
- El botón de cierre con icono no posee nombre accesible.
- Utiliza texto de 11 px en el eyebrow.
- Implementa estructura, estilos y comportamiento modal de forma independiente.

Severidad:

- Alta para accesibilidad.
- Media para consistencia visual.

### 3.2 CenteredFormModal

Archivo:

- `intranet/src/components/CenteredFormModal.tsx`.

Estado:

- Implementación parcialmente correcta.

Comportamientos correctos confirmados:

- Utiliza portal.
- Declara `role="dialog"`.
- Declara `aria-modal="true"`.
- Proporciona un nombre accesible.
- Bloquea el scroll del documento.
- Gestiona Escape.
- Limita el alto del contenido.
- Incluye nombre accesible en el botón de cierre.

Comportamientos faltantes confirmados:

- No establece foco inicial.
- No implementa focus trap.
- No devuelve el foco al control que abrió el modal.
- Utiliza texto de 11 px en el eyebrow.
- No centraliza todavía el comportamiento de todos los diálogos.

Severidad:

- Alta para gestión del foco.
- Baja para tipografía.
- Media como deuda de unificación.

### 3.3 ReportarPagoModal

Archivo:

- `intranet/src/components/publico/ReportarPagoModal.tsx`.

Estado:

- Error confirmado y riesgo responsive pendiente de prueba visual.

Hallazgos confirmados:

- No utiliza un contenedor compartido de diálogo.
- No declara `role="dialog"`.
- No declara `aria-modal="true"`.
- No posee nombre accesible para el diálogo.
- No gestiona Escape.
- No establece foco inicial.
- No implementa focus trap.
- No devuelve el foco.
- No bloquea el scroll del documento.
- El botón de cierre con icono no posee nombre accesible.
- Repite etiquetas de 11 px.
- Repite estilos de campos y botones dentro del componente.

Riesgos pendientes de comprobación visual:

- El contenido puede superar la altura útil del viewport.
- Puede existir scroll del documento detrás del modal.
- El teclado móvil puede ocultar campos o acciones.
- El cierre automático posterior al éxito puede dificultar la lectura.

Severidad:

- Alta.

### 3.4 Otros diálogos

Archivos señalados:

- `ContinuidadMatriculaModal.tsx`.
- `CommunityDetailModal.tsx`.
- `CommunityEditModal.tsx`.
- `ComprobantePagoModal.tsx`.

Estado:

- Pendiente de comprobación individual.
- Alta probabilidad de repetir los mismos problemas.

No deben corregirse por separado antes de definir el contenedor compartido.

## 4. Header

Archivo:

- `intranet/src/layout/AppHeader.tsx`.

Estado:

- Deuda estructural confirmada.

Hallazgos confirmados:

- Declara keyframes y clases CSS dentro del componente.
- No incluye reducción de movimiento en el mismo bloque.
- Utiliza `transition-all`.
- Utiliza texto arbitrario de 11 px.
- El selector institucional abre un popup sin atributos ARIA completos detectados.
- Mantiene lógica visual, de navegación, branding, carga de imágenes y menús en un archivo de gran tamaño.

Riesgos pendientes de prueba:

- Retorno del foco al cerrar dropdowns.
- Navegación completa mediante teclado.
- Actualización de `aria-expanded`.
- Cierre al hacer clic fuera.
- Superposición en 360 px.
- Comportamiento con zoom de 150 %.
- Truncado de nombres institucionales largos.

Severidad:

- Alta para accesibilidad de menús.
- Media para mantenibilidad.
- Media para consistencia visual.

## 5. Sidebar

Archivo:

- `intranet/src/layout/AppSidebar.tsx`.

Estado:

- Deuda estructural confirmada y comportamiento pendiente de prueba.

Hallazgos confirmados:

- Contiene navegación, permisos, expansión, flyouts, tooltips, branding y posicionamiento en un solo archivo.
- Calcula manualmente la posición y altura estimada de flyouts.
- Utiliza `transition-all` en tooltips.
- El tooltip detectado depende del estado hover.
- Utiliza dimensiones y posiciones arbitrarias.
- Mantiene tiempos de cierre definidos localmente.

Pendiente de comprobar:

- Acceso a tooltips mediante teclado.
- Foco al abrir flyouts.
- Navegación mediante flechas.
- Escape.
- Retorno del foco.
- Reubicación al redimensionar la ventana.
- Scroll con menús largos.
- Reducción de movimiento.

Severidad:

- Media.
- Alta si la navegación mediante teclado no es operable.

## 6. Layout principal

Archivo:

- `intranet/src/layout/AppLayout.tsx`.

Estado:

- Comportamiento generalmente correcto, pendiente de pruebas.

Comportamientos positivos:

- Utiliza una sola región de scroll principal.
- Mantiene header y sidebar fuera del contenido desplazable.
- Reinicia el scroll al cambiar de ruta.
- Utiliza padding responsive.
- Mantiene ancho fluido.

Pendiente de comprobar:

- Doble scroll en páginas con contenedores propios.
- Interacción entre header sticky y scroll.
- Animación de ruta con reducción de movimiento.
- Restauración de posición al utilizar Atrás.
- Comportamiento en pantallas de baja altura.

## 7. Tipografía menor de 12 px

Estado:

- Inconsistencia confirmada.

Se encontraron usos de `text-[11px]` en componentes globales y compartidos.

Regla:

- Las etiquetas funcionales, eyebrows, metadatos necesarios y nombres de campo no deben utilizar menos de 12 px.
- Las correcciones deben revisar también contraste, tracking y peso.
- No debe aumentarse únicamente el tamaño sin comprobar el espacio disponible.

## 8. transition-all

Estado:

- Deuda técnica confirmada.

El uso repetido de `transition-all` impide conocer qué propiedades se animan y puede incluir propiedades costosas.

Regla:

- Sustituir por transiciones específicas.
- Ejemplos de propiedades válidas: color, background-color, border-color, opacity, transform y box-shadow.
- Cada sustitución debe comprobarse visualmente.
- No debe realizarse un reemplazo masivo ciego.

## 9. Reducción de movimiento

Estado:

- Cobertura parcial confirmada.

Existen reglas de reducción de movimiento, pero no cubren necesariamente los keyframes y animaciones declaradas dentro de componentes.

Regla:

- Centralizar keyframes reutilizables.
- Añadir una estrategia global.
- Mantener variantes locales solo cuando sean necesarias.
- Probar con `prefers-reduced-motion: reduce`.

## 10. Fragmentación CSS

Estado:

- Deuda arquitectónica confirmada.

Resultados:

- 50 archivos CSS encontrados.
- 49 archivos alcanzables desde la cadena de entrada.
- 24 importaciones directas desde TypeScript o TSX.
- 221 colores distintos detectados en el conjunto global revisado.

Interpretación:

- La aplicación depende ampliamente de una cascada compartida.
- Existe riesgo de conflictos por orden, especificidad y sobrescritura.
- Los estilos de módulos pueden afectar otras áreas.
- No debe eliminarse ni reorganizarse CSS sin mapa de dependencias y pruebas visuales.

## 11. Paleta

Estado:

- Pendiente de clasificación, no error confirmado.

Los 221 valores incluyen:

- Colores funcionales.
- Transparencias.
- Sombras.
- Tokens.
- Valores heredados.
- Variantes de módulos.
- Posibles duplicados.

No deben reducirse automáticamente a una paleta mínima.

## 12. Prioridad general

1. Crear una base compartida de diálogo accesible.
2. Migrar ConfirmDialog.
3. Integrar CenteredFormModal con la base compartida.
4. Migrar ReportarPagoModal.
5. Revisar los demás modales.
6. Corregir semántica y foco del header.
7. Corregir navegación por teclado del sidebar.
8. Centralizar animaciones globales.
9. Clasificar CSS y tokens.
10. Revisar páginas individuales.
