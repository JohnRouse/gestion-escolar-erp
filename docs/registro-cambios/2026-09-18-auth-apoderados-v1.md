# Cambio: Auth de apoderados V1 aislado

## Fecha

2026-09-18

## Estado

En pruebas.

## Módulo

Autenticación externa y contratos del portal de apoderados.

## Motivo

El portal llamaba al login interno, mientras Auth rechazaba correctamente roles
externos. Era necesario habilitar el recorrido familiar sin relajar la frontera
de la intranet.

## Comportamiento anterior

`POST /auth/login` y `JwtStrategy('jwt')` rechazaban Apoderado/Padre/Madre. El
portal llamaba ese login y varios de sus endpoints usaban el mismo guard
interno. Algunas páginas consumían contratos de intranet.

## Comportamiento nuevo

Se añadieron `/auth/portal/login`, perfil/cambio de contraseña y la estrategia
`jwt-portal`. Los JWT llevan una claim de canal obligatoria. Controllers
dedicados protegen los contratos familiares y los servicios derivan el actor
del token, verifican ApoderadoEstudiante, matrícula, audiencia o propietario.
El frontend usa solo el token de portal y limpia la sesión ante 401.

## Reglas afectadas

Separación intranet/portal, no enumeración de credenciales, autoridad familiar,
matrículas operativas, audiencia y propiedad de recursos.

## Roles afectados

Apoderado, Padre y Madre. Los roles internos mantienen el canal `jwt`; Tutor
académico no se interpreta como apoderado.

## Alcance institucional

Los vínculos familiares pueden abarcar varios colegios, pero no crean un scope
`Todos los colegios`. Cada recurso permanece ligado a la matrícula y contexto
real del hijo.

## Base de datos

Sin cambios de Prisma, migración o seed.

## Validaciones realizadas

- Jest dirigido: 6 suites, 129 pruebas aprobadas para Auth, recursos
  familiares, Citas, Eventos, Notificaciones y Circulares.
- API `npm run build`: aprobada.
- Portal `npm run build` y `npx tsc --noEmit`: aprobados.
- ESLint sin `--fix`: los archivos nuevos de estrategia/controllers/tests y
  `login`/límite de sesión aprobaron sin errores. El barrido de todos los
  archivos modificados sigue encontrando deuda histórica de lint en servicios
  y pantallas legacy; no se hizo una refactorización ajena a este cierre.
- `git diff --check`: aprobado.
- Smoke de API local: login interno y externo, perfil, hijos y recursos P0
  propios respondieron correctamente; tokens cruzados fueron 401 y los IDs
  ajenos probados en Notas, Asistencia, Horario y Tesorería fueron 404.

## Diseño y accesibilidad

Se conservaron tokens y componentes existentes. El login ahora es formulario
semántico, muestra foco visible, anuncia errores, admite teclado y respeta
reducción de movimiento. Los falsos botones de recuperación/acceso se
reemplazaron por orientación textual. No se realizó rediseño general. La prueba
visual en 390×844 y con zoom queda pendiente por ausencia de navegador.

## Riesgos y deuda

Faltan aceptación humana y prueba con datos persistidos. Galería/Álbumes es P1
y permanece fuera del contrato habilitado. No hay refresh tokens,
auto-registro ni recuperación automática. La lectura de circulares no dispone
de relación individual por usuario en el esquema vigente.

## Correcciones de aceptación humana

- El proxy de Padres conserva `API_INTERNAL_URL` con fallback local y ahora
  reescribe también `/uploads/:path*` hacia el API. La foto de prueba respondió
  200 a través de `localhost:3003/uploads/...`; no se copiaron archivos al
  frontend.
- Las consultas de Calificaciones exclusivas del portal aceptan matrículas
  `Activo`, `Matriculado` y `Pre-matriculado`, y excluyen `Inactivo` y
  `Reserva`. La comprobación `ApoderadoEstudiante` continúa ejecutándose antes
  de consultar información académica.
- En el contrato del portal `bimestre_id` representa el número de bimestre. Si
  se omite o no corresponde al año de la matrícula, se selecciona el que
  contiene la fecha actual o, en su defecto, el primero configurado. La ausencia
  de bimestres o notas produce un estado vacío válido y no un 404 repetitivo.
- Calendario consume `GET /academicos/padres/anios` y `GET /eventos/padres`,
  ambos con `jwt-portal`. Prefiere el año operativo del hijo y normaliza `En
  curso`, `Abierto`, `Activo`, `Matrícula abierta` y `Planificación`; excluye
  cerrados y archivados. Error y ausencia de año terminan la carga, muestran un
  mensaje explícito y el error permite reintentar.
- Dashboard dejó de solicitar hijos tanto en la página como en el encabezado;
  el encabezado conserva una sola carga. Dashboard, alertas, calificaciones,
  libreta y calendario cancelan respuestas obsoletas cuando cambia el contexto.

### Medición local

Smoke con `carlos.diaz`, sin registrar el JWT, sobre API local: perfil 0,031 s;
hijos 0,056 s; asistencia 0,015 s; notas 0,143 s; alertas 0,025 s; estado de
cuenta 0,025 s; circulares 0,027 s; eventos 0,034 s; notificaciones 0,209 s.
La libreta respondió en 0,100 s y el archivo de prueba mediante el proxy de
uploads en 0,028 s. Ningún endpoint medido superó un segundo.

## Reversión

Aplicar patch inverso a API, portal y documentación. No hay datos ni esquema que
revertir.

## Referencia

Rama `feat/v1-auth-apoderados`. Sin commit, push ni merge.
