# Formato obligatorio de respuestas y bloques de aplicación

## 1. Propósito

Establecer cómo deben prepararse las instrucciones ejecutables para modificar Gestión Escolar ERP.

Cada respuesta debe permitir que el cambio sea:

- Comprendido.
- Aplicado.
- Verificado.
- Documentado.
- Respaldado.
- Revertido.

No debe depender de conocimientos implícitos, de una conversación anterior ni de la memoria de una persona.

## 2. Estructura general de una respuesta

Cuando una respuesta implique cambios en el proyecto debe contener, según corresponda:

1. Objetivo.
2. Problema actual.
3. Alcance.
4. Riesgos.
5. Requisitos previos.
6. Rama y ruta de trabajo.
7. Respaldo.
8. Bloque ejecutable.
9. Archivos esperados.
10. Archivos excluidos.
11. Validaciones.
12. Resultado esperado.
13. Estado de Git.
14. Documentación actualizada.
15. Procedimiento de reversión.
16. Estado de commit y push.
17. Próximo paso.

## 3. Explicación antes del bloque

Antes del bloque se debe explicar con lenguaje claro:

- Qué se modificará.
- Por qué se modificará.
- Qué partes del sistema serán afectadas.
- Qué partes no deben cambiar.
- Qué riesgo existe.
- Qué se validará después.

No se debe entregar un bloque extenso sin explicar su propósito.

## 4. Tamaño de los bloques

Los bloques deben dividirse cuando:

- Modifican áreas independientes.
- Incluyen demasiados archivos.
- Mezclan frontend, backend y base de datos.
- Mezclan implementación y despliegue.
- Una validación intermedia puede prevenir errores.
- El tamaño dificulta detectar un pegado incompleto.
- Existen delimitadores que podrían ser interpretados por la interfaz.

Se prefieren bloques pequeños o medianos y verificables.

## 5. Prevención de cortes de formato

Dentro de un bloque ejecutable no deben colocarse delimitadores Markdown que puedan cerrar el bloque principal.

Cuando un documento generado necesite mostrar ejemplos de código:

- Deben utilizarse líneas indentadas.
- Deben evitarse cercas internas de tres acentos graves.
- Debe comprobarse que el bloque principal llegue hasta el delimitador final de Python.
- El cierre de Python debe aparecer solo en una línea como `PY`.

Si la terminal muestra el indicador `>`, normalmente está esperando el cierre de una comilla, un bloque o un heredoc.

En ese caso se debe cancelar con `Ctrl + C` antes de continuar.

## 6. Configuración segura de Bash

Los bloques habituales deben comenzar con:

    set +e
    set +u
    set +o pipefail 2>/dev/null || true

Esto evita que un error no controlado cierre la sesión o interrumpa la revisión de resultados.

No deben utilizarse normalmente:

- `set -e`.
- `exit 1`.
- Comandos que cierren la terminal.
- Eliminaciones recursivas sin comprobación.
- Sobrescrituras ciegas.
- `sudo` sin una necesidad concreta.
- Cambios destructivos sin respaldo.
- Comandos de base de datos sobre la base original durante pruebas destructivas.

## 7. Uso de Bash

Bash debe utilizarse principalmente para:

- Cambiar de directorio.
- Consultar Git.
- Crear carpetas.
- Copiar respaldos.
- Ejecutar compilaciones.
- Ejecutar pruebas.
- Ejecutar herramientas del proyecto.
- Mostrar archivos afectados.
- Crear ramas.
- Preparar commits después de validar.
- Subir ramas después de autorización.

Bash no debe utilizarse para reemplazos complejos de texto cuando exista riesgo de modificar una coincidencia equivocada.

## 8. Uso de Python 3

Se debe preferir Python 3 cuando el cambio requiera:

- Crear varios documentos.
- Modificar texto con precisión.
- Verificar marcadores antes de reemplazarlos.
- Mantener codificación UTF-8.
- Analizar archivos.
- Generar inventarios.
- Transformar contenido estructurado.
- Evitar expresiones complejas de `sed`.
- Evitar reemplazos parciales.
- Repetir una operación de forma controlada.

Estructura recomendada:

    python3 <<'PY'
    from pathlib import Path

    root = Path.home() / "gestion-escolar-erp"

    # Comprobaciones y modificaciones controladas.
    PY

## 9. Reglas para scripts de Python

Todo script de modificación debe:

- Usar rutas explícitas.
- Leer y escribir en UTF-8.
- Comprobar que el archivo existe.
- Comprobar que el marcador esperado existe.
- Evitar reemplazos ciegos.
- Detener la modificación si existe ambigüedad.
- Informar qué archivo creó o modificó.
- No ocultar excepciones importantes.
- Evitar alterar archivos no previstos.
- Mantener la terminal abierta.

Cuando se cree un archivo nuevo, debe comprobarse previamente que no exista, salvo que el objetivo sea actualizarlo.

Cuando se actualice un archivo existente, debe conservarse una copia o un patch cuando corresponda.

## 10. Respaldos

Antes de cambios sensibles se debe utilizar uno o varios de estos respaldos:

- Patch de Git.
- Copia individual de archivos.
- Copia de una carpeta.
- Respaldo SQL.
- Exportación de configuración.
- Checksum SHA-256.
- Registro del estado previo.

Los respaldos deben guardarse fuera del repositorio cuando contengan:

- Datos.
- Secretos.
- Variables de entorno.
- Archivos temporales.
- Información personal.
- Copias de base de datos.
- Cargas de usuarios.

## 11. Base de datos

Todo cambio destructivo, transaccional o de migración debe:

1. Identificar la base de datos afectada.
2. Crear un respaldo.
3. Probarse primero en una base aislada.
4. Ejecutar validaciones.
5. Comprobar compatibilidad con datos históricos.
6. Documentar reversión.
7. Evitar pruebas destructivas sobre la base original.

No debe suponerse que una migración exitosa garantiza que el comportamiento funcional sea correcto.

## 12. Archivos permitidos

Antes del commit se debe definir una lista de archivos esperados.

Se debe comprobar:

- Que todos los archivos esperados estén presentes.
- Que no existan archivos inesperados preparados.
- Que no se incluyan secretos.
- Que no se incluyan respaldos.
- Que no se incluyan archivos personales.
- Que no se incluyan cambios de otro desarrollo.
- Que no se mezcle documentación con trabajo funcional no relacionado.

## 13. Validaciones mínimas

Para documentación:

    git diff --check
    git status --short
    git diff --stat

Para frontend, según corresponda:

    npm run build
    npm run lint
    npm run test

Para backend, según corresponda:

    npm run build
    npm run lint
    npm run test

También deben ejecutarse pruebas funcionales específicas del módulo.

No se debe afirmar que una funcionalidad está validada únicamente porque compila.

## 14. Interpretación de resultados

Después de cada ejecución se debe explicar:

- Qué terminó correctamente.
- Qué no se ejecutó.
- Qué error apareció.
- Si el texto se visualizó desordenado pero el comando terminó bien.
- Qué archivos cambiaron.
- Qué validaciones pasaron.
- Qué validaciones faltan.
- Qué debe ocurrir antes del commit.

## 15. Commit y push

No se debe realizar commit o push antes de:

- Revisar los archivos afectados.
- Ejecutar validaciones.
- Comprobar archivos inesperados.
- Crear respaldo cuando corresponda.
- Actualizar documentación.
- Obtener autorización cuando el usuario pidió revisión previa.

El bloque debe indicar expresamente una de estas situaciones:

- No se realizó commit ni push.
- Commit realizado, push pendiente.
- Commit y push realizados.
- Operación incompleta.

## 16. Pull requests

Todo pull request debe documentar:

- Problema resuelto.
- Comportamiento anterior.
- Comportamiento nuevo.
- Módulos afectados.
- Roles afectados.
- Alcance institucional.
- Base de datos.
- Pruebas.
- Riesgos.
- Documentos actualizados.
- Procedimiento de reversión.

## 17. Reversión

Todo cambio importante debe tener una estrategia de reversión.

Puede incluir:

- Aplicar un patch inverso.
- Restaurar archivos respaldados.
- Revertir un commit.
- Restaurar una base de datos.
- Ejecutar una migración inversa validada.
- Desactivar una función mediante configuración.

La reversión no debe improvisarse después de un fallo.

## 18. Prohibiciones

No se debe:

- Entregar bloques sin contexto.
- Mezclar cambios independientes sin necesidad.
- Sobrescribir archivos sin comprobarlos.
- Hacer reemplazos ambiguos.
- Ejecutar pruebas destructivas sobre datos reales.
- Cerrar la terminal como consecuencia de una validación.
- Hacer commit automático cuando se solicitó revisar.
- Omitir la documentación del cambio.
- Declarar éxito sin revisar la salida.
- Depender únicamente de lo conversado en el chat.
