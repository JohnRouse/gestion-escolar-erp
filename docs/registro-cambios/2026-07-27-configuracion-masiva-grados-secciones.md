# Configuración masiva de grados y secciones

Fecha: 2026-07-27

## 1. Objetivo

Mejorar la configuración académica para que un administrador pueda registrar grados y secciones de forma masiva, con validaciones consistentes para evitar nombres y códigos duplicados.

## 2. Archivos funcionales

- `api/src/academicos/academicos.controller.ts`
- `api/src/academicos/academicos.service.ts`
- `intranet/src/components/GradeBatchModal.tsx`
- `intranet/src/pages/configuracion/NivelesGradosTab.tsx`
- `intranet/src/pages/configuracion/SeccionesTab.tsx`

## 3. Cambios implementados

### Grados

- Se añadió el modal `GradeBatchModal`.
- Se incorporaron plantillas para Inicial, Primaria y Secundaria.
- Se pueden agregar, editar y retirar filas antes de guardar.
- Se normalizan espacios, mayúsculas, minúsculas y tildes para detectar equivalencias.
- Se reutilizan grados existentes y se vinculan a la institución cuando corresponde.
- La creación individual delega en la misma lógica transaccional del lote.

### Secciones

- Se añadió la creación masiva por grado o por todos los grados de un nivel.
- La sección propuesta por defecto es `A`.
- La capacidad se aplica a cada aula creada.
- La vista previa indica qué secciones se crearán y cuáles ya existen.
- Los duplicados parciales se omiten y se informa el resultado.
- Cuando todas las secciones objetivo ya existen, la operación se rechaza.
- La edición individual impide cambiar una sección a un código ya usado en el mismo colegio y grado.
- Al cambiar el código se actualiza también el nombre del aula cuando no está compartida.

### Niveles

- Los niveles equivalentes, como `Inicial`, `inicial`, `INICIAL` o valores con espacios adicionales, se consideran el mismo registro.
- La API distingue entre nivel creado, vinculado y ya configurado.
- El frontend presenta un mensaje específico para cada resultado.
- La edición impide renombrar un nivel con el nombre de otro nivel existente.
- Las operaciones respetan el alcance de instituciones permitido para el usuario.

## 4. Endpoints

- `POST /academicos/grados/lote`
- `POST /academicos/secciones/lote`
- `PUT /academicos/niveles/:id`
- `PUT /academicos/secciones/:id`

Los endpoints de lote usan transacciones con aislamiento serializable y validan institución, nivel, grado, capacidad y duplicados antes de escribir.

## 5. Validaciones realizadas

- Build de NestJS: correcto.
- Build de Vite: correcto.
- Prettier dirigido: correcto.
- `git diff --check`: correcto.
- Prueba visual del modal de grados: correcta.
- Prueba visual del modal de secciones: correcta.
- Prueba de creación para un grado: correcta.
- Prueba de creación para todos los grados del nivel: correcta.
- Prueba de duplicado parcial: correcta.
- Prueba de edición de sección duplicada: bloqueada correctamente.
- Pruebas de nivel equivalente y renombrado duplicado: bloqueadas correctamente.

## 6. Alcance y consideraciones

- No se añadieron dependencias.
- No se modificó el esquema de Prisma.
- No se ejecutaron migraciones.
- No se incluye una limpieza automática de duplicados preexistentes.
- La prevención de secciones duplicadas se aplica en la lógica transaccional. El esquema actual no contiene un índice único para colegio, grado y código de sección; una garantía absoluta frente a escrituras concurrentes requerirá una migración futura.
- Se mantiene la edición individual de niveles, grados y secciones.
