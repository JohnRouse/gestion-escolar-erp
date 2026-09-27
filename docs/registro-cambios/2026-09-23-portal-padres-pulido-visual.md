# Portal de Padres — cinco ajustes de revisión humana

Fecha: 2026-09-23. Estado: ajustes implementados y validados localmente;
GO para revisión humana final. Aceptación humana aún pendiente.

## Alcance

La funcionalidad del Portal de Padres permanece aprobada. La revisión visual
premium pidió cinco correcciones concretas. No cambian roles, alcance de
estudiante, contratos API, reglas de negocio, backend, Prisma, migraciones ni
persistencia. La Galería sigue descartada.

## Correcciones

1. `PortalAvatar` usa `isRealStudentPhoto` para todos sus consumidores:
   Dashboard, BottomNav, selector y Perfil > Hijos. Una URL conocida de
   DiceBear o generador legacy se trata visualmente como ausente y muestra
   iniciales locales. Las URLs SVG también se tratan como ilustraciones, no
   como fotos. Fotos reales HTTP(S) o rutas institucionales se muestran; la
   carga fallida vuelve a iniciales. El valor guardado no se altera.
2. `ProfileDrawer` conserva altura móvil de 86dvh entre Datos, Seguridad,
   Preferencias, Hijos y Servicios. Header y tabs quedan fijos; el cuerpo
   tiene scroll interno. El drawer lateral de tablet se conserva.
3. Claro/Oscuro usa borde azul, superficie seleccionada, icono, texto legible
   y check visible. `aria-pressed`, foco y selección por teclado se mantienen.
4. Comunicados usa `ScreenHeader` con `backHref` seguro a
   `/dashboard?open=servicios` en lista, detalle y estado de carga. Búsqueda,
   filtros, deep links, query params y redirect legacy continúan iguales.
5. Libreta agrega espacio a la derecha del promedio principal. Los valores
   existentes conservan su redondeo; `null` se representa «—» sin inventar una
   nota.

## Validación

Recorrido visual en build de producción con datos sintéticos y API interceptada:
390×844, 440×956 y 768×1024. Se revisaron Dashboard premium, KPIs,
BottomNav, selector de estudiante, Profile sheet, Comunicados y Libreta.
Sin overflow horizontal ni excepciones JavaScript; cero solicitudes a
DiceBear. Foto real simulada cargó como imagen, URL legacy y ausencia de foto
mostraron iniciales en Dashboard, BottomNav, selector y Perfil > Hijos.

Las cinco pestañas conservan coordenada superior y altura exactas en cada
viewport: 390 px → 725,83 px de alto, 440 px → 822,16 px, 768 px → drawer
1024 px. El cuerpo admite scroll interno sin mover el header. Tema oscuro
seleccionado muestra borde/fondo/check legibles; se activó con teclado y
`aria-pressed` cambió. Comunicados vuelve a Servicios desde lista, detalle y
enlace directo. Libreta mantuvo 7, 16, 16,5 (redondeado según lógica vigente)
y «—» a más de 24 px del borde derecho. Capturas locales en
`capturas locales temporales de los cinco ajustes`.

Puerta técnica: `npm run build`, `npx tsc --noEmit`, ESLint dirigido sin
`--fix`, 33/33 pruebas existentes y nuevas, `git diff --check`. Las respuestas
de prueba de navegador permanecieron locales y no modificaron datos reales.

## Reversión

Revertir únicamente estos ajustes y este registro. No restaurar el árbol de
trabajo completo: contiene cambios previos sin confirmar. No hay reversión de
datos o esquema. No se realiza commit, push ni merge.
