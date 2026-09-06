# Regresión de teclado de AccessibleDialog

La fixture importa el componente real, `ConfirmDialog`, `CenteredFormModal` y el
CSS de la intranet. Usa React StrictMode y estado en memoria. No monta la app,
autenticación, contextos institucionales ni clientes de API. No forma parte de la
entrada de producción. El cierre del hijo usa `flushSync` para comprobar que un
mismo Escape no se entrega de nuevo al padre tras un cierre síncrono.

Requisitos: dependencias habituales de intranet, Chrome local y Playwright
(disponible mediante `PLAYWRIGHT_MODULE`, sin agregar dependencias al proyecto).
Desde la raíz, en terminales separadas:

    npm --prefix intranet run dev -- --host 127.0.0.1 --port 3012
    npm install --prefix /tmp/accessible-dialog-playwright --no-save --package-lock=false playwright@1.63.0
    PLAYWRIGHT_MODULE=/tmp/accessible-dialog-playwright/node_modules/playwright node intranet/tests/dialog/keyboard.cjs

Variables opcionales: `CHROME_PATH`, `DIALOG_TEST_URL` y `DIALOG_SCREENSHOT_DIR`
(directorio existente para capturas). El runner bloquea API, uploads, solicitudes
que no sean GET y destinos externos. Las fuentes externas del CSS se bloquean
explícitamente; la revisión utiliza las fuentes de respaldo locales.

La suite cubre Escape, `preventClose`, `closeOnEscape`, Tab/Shift+Tab, foco fuera
del panel, panel vacío, controles ocultos/deshabilitados, tres capas, autoFocus,
foco explícito, StrictMode, cierres síncronos y simultáneos, desmontaje inferior,
reapertura, Cancelar, botón de cierre, overlay, retorno de foco y scroll anidado.
Comprueba nueve resoluciones, foco visible y movimiento reducido. La prueba de
zoom reduce el viewport CSS al equivalente de 125/150/200 %; no automatiza el
zoom nativo de la interfaz del navegador. No certifica lectores de pantalla ni
los flujos de negocio de cada consumidor.
