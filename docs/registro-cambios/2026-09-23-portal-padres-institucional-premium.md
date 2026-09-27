# Portal de Padres — segunda propuesta institucional premium

Fecha: 2026-09-23. Estado: propuesta implementada y validada localmente;
GO para nueva revisión humana. Dirección artística aún no aprobada.

## Motivo y alcance

La funcionalidad está aprobada. La primera propuesta visual fue rechazada por
exceso de blanco, gris tenue y pesos visuales similares. Se conservan sus
componentes reutilizables y se revisa exclusivamente dirección artística,
paleta y jerarquía. Esta decisión sustituye la paleta descrita en el registro
visual del 21/22 de septiembre, sin invalidar su QA funcional.

Aplica al portal familiar y a sus estudiantes vinculados. No modifica roles,
permisos, alcance institucional, contexto de estudiante ni reglas transversales.
El portal no incorpora un nuevo selector «Todos los colegios»; conserva el
contexto institucional existente. Sin backend, Prisma, migraciones, contratos,
datos, cambios de lógica o tests funcionales. Sin Graphify, commit, push o merge.

## Presentación y componentes

- Tokens centrales: navy `#111827` / `#1F2937`; azul `#315EF4`, fuerte
  `#2346C8`, hover `#2547D0`, superficie azul `#E8EEFF`.
- Fondo `#F4F6FA`, superficie blanca, superficie secundaria `#EEF2F7`, borde
  `#D9DEE8`, texto `#111827` / `#4B5563` / `#606B7B`.
- Verde `#15803D`, rojo `#CF2525`, ámbar `#B45309` para texto semántico
  legible. Sin gradientes decorativos, glassmorphism, neón ni emojis.
- Login: cabecera navy, icono escolar Lucide, mensaje breve, formulario blanco
  integrado y botón azul sólido; campos y autenticación conservados.
- `DashboardHeader`: marca compacta, saludo blanco y estudiante integrado.
  Inicio mantiene KPIs 2×2 con acento azul, cifras fuertes e iconos de marca.
  Actividad reciente pasa a filas sin cajas individuales.
- `ScreenHeader`: superficie sólida, línea azul y división clara; sin banner
  oscuro en páginas internas.
- `BottomNav`: fondo sólido, sombra superior suave, activo azul y selector
  central de tamaño contenido con borde visible.
- Calificaciones y Libreta: nota principal prominente y badges contrastados.
  Asistencia: círculo conservado, resumen fuerte, tres indicadores separados
  por divisores y filtros azules.
- Pagos: saldo sobre superficie azul suave, importe fuerte y separación de
  concepto, vencimiento, estado y monto; cálculos y acciones conservados.
- Comunicados: títulos legibles, borde y superficie azul en no leídos;
  urgencia y confirmación conservan significado y comportamiento.
- `ProfileDrawer` y selector de hijo: tabs/filas activas visibles, títulos
  fuertes, backdrop navy al 58%. Citas hereda tokens, badges y header.
- Primitivas compartidas en `globals.css`: cards, filtros, iconos, botones,
  resúmenes, navegación, sheets y foco. Sin biblioteca adicional.

## Movimiento y accesibilidad

Se conservan duraciones de 160–240 ms, entradas de página/sheet y transiciones
de interacción. No se introducen animaciones decorativas. Foco global sólido
de 3 px, variante clara sobre navy y reducción mediante
`prefers-reduced-motion`. Los tamaños de texto se ajustan por rol, no de forma
global. El ajuste de metadatos y ámbar prioriza contraste.

## Validaciones

La revisión se ejecuta en Chrome sobre el build de producción con respuestas
interceptadas y datos sintéticos fuera del repositorio. Ninguna solicitud de
este recorrido llega a la API ni escribe en la base original. No sustituye una
nueva prueba funcional integrada, cuya aprobación anterior se conserva.

Matriz: Login, Dashboard, Calificaciones, Asistencia, Pagos, Comunicados,
Profile sheet, cambio de hijo, Libreta y Citas en 390×844, 440×956 y 768×1024.
Además se revisan Servicios, notas desplegadas, detalle de pago y comunicado.
Se comprueban overflow de página y límites de diálogos, selección de hijo,
Escape/retorno de foco, Tab/Shift+Tab, foco sólido y movimiento reducido.
Reflow equivalente a 200% sobre 768×1024: viewport CSS 384×512; no equivale a
certificar zoom nativo en todos los navegadores/dispositivos.

Contraste calculado de texto sobre sus superficies: secundario 6,98:1,
metadatos sobre gris 4,81:1, metadatos sobre azul 4,66:1, botón azul con blanco
5,20:1, ámbar semántico 4,66:1, verde semántico 4,54:1, rojo semántico
4,81:1 y texto secundario sobre navy 11,95:1. El rojo se oscurece ligeramente
respecto de la propuesta para superar 4,5:1 en sus badges.

La cascada de primitivas se organiza en `@layer components` y el reset de
tipografía de controles en `@layer base`: permite que las utilidades de tamaño,
color y espaciado se apliquen como fueron declaradas. Corrige separación de
secciones, tamaño de tabs y selectores, sin cambiar sus acciones.

Resultados:

| Escenario | 390×844 | 440×956 | 768×1024 |
|---|---|---|---|
| Login e Inicio | Revisado | Revisado | Revisado |
| Calificaciones y Asistencia | Revisado | Revisado | Revisado |
| Pagos y Comunicados | Revisado | Revisado | Revisado |
| Perfil y cambio de hijo | Revisado | Revisado | Revisado |
| Libreta y Citas | Revisado | Revisado | Revisado |

Sin overflow horizontal de página; filtros/tabs conservan su scroll interno.
Sheets dentro del viewport, cierre por Escape, retorno de foco y selección de
hijo comprobados. Foco visible 3 px y movimiento reducido ≤0,01 ms verificados.
El reflow 384×512 mantiene diálogos dentro del viewport con contenido interno
desplazable. Se generaron 56 capturas, más tres láminas de comparación, en
`capturas locales temporales de validación`. No se detectaron excepciones JavaScript
en el recorrido. La referencia evaluada es el tema claro.

- `npm run build`: aprobado, 19 rutas generadas.
- `npx tsc --noEmit`: aprobado.
- ESLint dirigido, sin `--fix`: aprobado.
- `node --test tests/*.test.mjs`: 30/30, sin modificar suites.
- `git diff --check`: aprobado; estado y estadística revisados.
- Comparación AST con copia previa: lógica fuera de JSX y manejadores de
  eventos idénticos. El delta de este bloque alcanza 12 archivos de presentación
  y tres documentos; el resto de cambios sin confirmar ya existía.

Avisos de herramientas sin fallo: Next detecta múltiples lockfiles y Node
informa el tipo de módulo implícito en las suites existentes. No se cambia
configuración ni dependencias para resolver esos avisos dentro de este bloque.

## Reversión y riesgos

Revertir exclusivamente los ajustes de presentación y documentación de este
bloque, preservando el trabajo funcional anterior sin confirmar. Se tomó una
copia local previa en `una copia local temporal` para comparar este delta.
No usar restauración global desde Git: eliminaría trabajo previo del usuario.
No hay rollback de base de datos. Riesgo principal: aceptación subjetiva de la
dirección artística; no equivale a aprobación comercial automática.

No se creó commit ni PR.
