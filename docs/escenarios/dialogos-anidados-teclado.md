# Teclado en diálogos anidados

Estado: implementado y validado en fixture aislada de componentes, 2026-09-05.

## Situación, actores y alcance

Un usuario autorizado abre un diálogo y, desde él, otro diálogo de confirmación
o formulario. Aplica a todos los roles que puedan abrir el consumidor, tanto
con Todos los colegios como con una institución específica. Los permisos y datos
los conserva el módulo consumidor. Este escenario no consulta ni persiste datos.

## Flujo y resultados esperados

1. Abrir padre e hijo: el foco entra al superior y el documento queda bloqueado.
2. Pulsar Tab dentro del hijo: avanzar sin intervención del padre. Desde el
   último control volver al primero; Shift+Tab realiza el recorrido inverso.
3. Sin controles enfocables, ambas teclas conservan el foco en el panel superior.
4. Pulsar Escape: solicitar exclusivamente el cierre del superior. Con
   `preventClose` o `closeOnEscape=false`, ambos permanecen abiertos.
5. Cerrar el hijo: devolver el foco al control que lo abrió en el padre y
   conservar el bloqueo de scroll.
6. Cerrar el padre: devolver el foco a su origen y restaurar el overflow anterior.

## Alternativas

- Tres capas: cerrar una por evento, conservando los dos retornos intermedios.
- Desmontar primero el padre: el hijo conserva foco y scroll; al cerrar vuelve
  al origen externo heredado cuando todavía existe.
- Desmontar ambos: restaurar foco externo y overflow, sin listeners residuales.
- Reabrir un portal: el orden efectivo de sus capas determina quién recibe teclado.
- Cambiar bloqueo durante la apertura: aplicar inmediatamente la opción vigente.
- Cierre síncrono: el evento no se redistribuye al diálogo expuesto.
- Sin origen conectado: enfocar un control del diálogo restante o su panel.

No se agregan mensajes, registros históricos ni acciones transaccionales.
Reversión y evidencia: [registro de la corrección](../registro-cambios/2026-09-05-accessible-dialog-teclado-anidado.md).
Prueba reproducible: `intranet/tests/dialog/keyboard.cjs` y su README.
