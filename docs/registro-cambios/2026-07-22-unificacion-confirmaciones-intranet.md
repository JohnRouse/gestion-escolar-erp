# Unificación de confirmaciones del intranet

Fecha: 2026-07-22

## Objetivo

Unificar las confirmaciones del frontend mediante `ConfirmDialog` y corregir operaciones asíncronas que podían cerrar el diálogo antes de finalizar o permitir interacciones repetidas.

## Alcance

Se actualizaron once archivos de `intranet/src` relacionados con asistencia, notas y configuración académica.

## Cambios implementados

- Se eliminaron tres confirmaciones nativas basadas en `window.confirm` o `confirm`.
- Los tres flujos reemplazados ahora utilizan `ConfirmDialog`.
- Se añadieron estados de procesamiento a nueve confirmaciones asíncronas.
- Se impide cerrar, cancelar o confirmar repetidamente mientras una petición está en curso.
- Las confirmaciones permanecen visibles durante el procesamiento.
- El elemento seleccionado se conserva hasta que finaliza la operación.
- Se preservó el tono `warning` para la desactivación reversible de criterios.
- Las eliminaciones permanentes mantienen el tono `danger`.
- No se modificó el contrato público de `ConfirmDialog`.

## Flujos nuevos con ConfirmDialog

- Continuación de asistencia pendiente en `AsistenciaMobilePage`.
- Eliminación de evaluaciones en `NotasPage`.
- Eliminación de plantillas en `PlantillasTab`.

## Validaciones técnicas

- No quedan confirmaciones nativas en `intranet/src`.
- TypeScript en `main`: 35 diagnósticos previos.
- TypeScript en la rama: 35 diagnósticos.
- No se introdujeron diagnósticos TypeScript nuevos.
- ESLint en `main`: 90 diagnósticos previos en los archivos revisados.
- ESLint en la rama: 90 diagnósticos.
- No aumentó ninguna regla ESLint.
- No se introdujeron diagnósticos ESLint semánticamente nuevos.
- Build de Vite: correcto.
- `git diff --check`: correcto.

## Validación visual

La prueba manual fue reportada como conforme en los flujos accesibles desde la aplicación.

Se comprobó:

- Foco inicial seguro.
- Navegación contenida con Tab y Shift + Tab.
- Cierre mediante Escape.
- Cierre mediante overlay.
- Retorno del foco al control de origen.
- Presentación visual consistente.
- Botones y textos legibles.
- Cancelación sin ejecutar eliminaciones reales.

`PlantillasTab.tsx` no se encuentra conectado actualmente a la navegación principal. Su cambio quedó cubierto mediante validación estática, TypeScript, ESLint y build.

## Alcance excluido

- No se modificó el backend.
- No se modificó la API.
- No se modificó la base de datos.
- No se añadieron dependencias.
- No se migraron todavía los demás modales manuales.
