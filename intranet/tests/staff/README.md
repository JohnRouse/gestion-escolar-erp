# Pruebas dirigidas de Staff

Todas las escrituras son sobre una instancia MySQL **nueva y descartable** en
`127.0.0.1:33316/staff_v1_test`. Las fixtures y el servidor fallan si DATABASE_URL
no coincide exactamente. No usar la base original ni el seed de la aplicación.
El servidor de pruebas importa AppModule para probar también login/contextos
reales. El navegador verifica un marcador exclusivo de ese servidor antes de CRUD.

Desde la raíz, preparar **un directorio nuevo** (si ya existe, reutilizar la
instancia solo para estas pruebas; no reinicializar encima):

    mkdir /tmp/staff-v1-mysql
    mysqld --no-defaults --initialize-insecure --datadir=/tmp/staff-v1-mysql --log-error=/tmp/staff-v1-mysql/init.log
    mysqld --no-defaults --datadir=/tmp/staff-v1-mysql --socket=/tmp/staff-v1-mysql/mysql.sock --port=33316 --bind-address=127.0.0.1 --pid-file=/tmp/staff-v1-mysql/mysql.pid --log-error=/tmp/staff-v1-mysql/server.log --mysqlx=OFF

En otra terminal (root sin contraseña existe solo en esta instancia temporal):

    mysql --no-defaults --socket=/tmp/staff-v1-mysql/mysql.sock -uroot -e 'CREATE DATABASE staff_v1_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    cd api
    DATABASE_URL='mysql://root@127.0.0.1:33316/staff_v1_test' npx prisma db push --skip-generate
    DATABASE_URL='mysql://root@127.0.0.1:33316/staff_v1_test' npm test -- --runInBand staff.integration.spec.ts
    DATABASE_URL='mysql://root@127.0.0.1:33316/staff_v1_test' npx ts-node test/staff-server.ts

La suite reinicia sus entidades en la base dedicada y deja las fixtures para
Playwright. Detener el navegador antes de repetirla. No borrar ni resetear una
base ajena para satisfacer su precondición.

En otra terminal desde `intranet/`:

    VITE_API_PROXY_TARGET='http://127.0.0.1:33317' npm run dev -- --host 127.0.0.1 --port 33318

Desde la raíz (Playwright instalado fuera del repositorio):

    npm install --cache /tmp/staff-v1-npm-cache --prefix /tmp/staff-v1-playwright --no-save --package-lock=false playwright@1.63.0
    PLAYWRIGHT_MODULE=/tmp/staff-v1-playwright/node_modules/playwright node intranet/tests/staff/flow.cjs

Usa Chrome local (`CHROME_PATH` opcional), escritorio 1440×900 y móvil 390×844,
además de reflow a 768/1280, equivalente de zoom de navegador 200% mediante viewport CSS reducido, teclado, foco y reducción de movimiento.
Capturas sintéticas se guardan en `/tmp/staff-v1-*.png`. Login Admin real,
listado/búsqueda/validaciones, alta con domicilio y acceso ERP, presentación de
usuario/rol/estado, edición rutinaria sin motivo libre y disponibilidad de citas
off/on. También verifica que Tutor no aparezca en la UX de Staff. Staff no tiene
estado laboral: no se simula activar/inactivar.
Profesor no accede por URL ni escritura HTTP. Recursos externos decorativos
fuera de la aplicación se sustituyen por respuestas vacías; API y datos son reales.

Al terminar, detener Vite/API con Ctrl+C y apagar **solo** MySQL temporal:

    mysqladmin --no-defaults --socket=/tmp/staff-v1-mysql/mysql.sock -uroot shutdown

No se requieren migraciones de aplicación ni cambios en `.env`.
