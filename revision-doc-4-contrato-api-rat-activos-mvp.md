# Revision documento 4

## Documento revisado

- `Spec Contrato Api Rat Activos Mvp.pdf`

## Valoracion general

El contrato API esta mejor aterrizado que los documentos anteriores para iniciar trabajo coordinado entre frontend y backend. Tiene una buena base:

- convenciones comunes
- formatos de respuesta
- paginacion
- errores base
- endpoints por modulo
- payloads de ejemplo

Tambien aporta algo muy valioso: empieza a exponer el nivel real de madurez del diseno. Y justamente por eso deja ver con claridad los puntos que todavia no estan cerrados del todo.

Mi conclusion es esta:

- como borrador de contrato esta bien
- como contrato final de desarrollo todavia no esta listo

El propio documento ya reconoce varios pendientes, y efectivamente esos pendientes son estructurales, no cosméticos.

## Hallazgos principales

### 1. El contrato mejora la alineacion, pero todavia no cubre el dominio real completo de actividad versionada

Impacto: alto

El mayor vacio sigue siendo `actividad-versiones`. En el funcional y frontend aparecen campos y relaciones como:

- titulares
- categorias de datos
- datos sensibles
- biométricos
- destinatarios
- transferencias
- medidas de seguridad
- medios de recoleccion
- acciones de tratamiento

En el contrato API, eso todavia no esta realmente modelado. El propio documento lo deja pendiente en la pagina final.

Esto significa que el endpoint mas importante del sistema aun no tiene un contrato completo.

Paginas relacionadas:

- 23 a 25
- 38

### 2. Sigue abierta una decision critica: JSON versus tablas relacionales para campos multivalor

Impacto: alto

Ese punto aparece explicitamente como pendiente. Y es una de las decisiones mas importantes del proyecto porque afecta:

- schema Prisma
- queries
- filtros
- reportes
- validaciones
- trazabilidad
- versionado

Mi recomendacion es clara:

- para el dominio principal, usar tablas relacionales
- JSON solo para snapshots, evidencias o campos auxiliares de baja explotacion

Si se mete en JSON cosas como titulares, categorias, destinatarios o medidas de seguridad, el MVP sera mas rapido al inicio, pero costara mucho al crecer.

Pagina relacionada:

- 38

### 3. Hay inconsistencia en el modelo de roles entre documentos

Impacto: alto

En el contrato API aparecen roles como:

- `ADMIN`
- `EDITOR`
- `RESPONSABLE_DEPENDENCIA`

Pero en otros documentos habia:

- responsable de subdireccion
- revisor de proteccion de datos
- revisor de seguridad
- auditor

Y en frontend/backend se habian resumido algunos.

Un contrato API no necesita resolver toda la politica de permisos, pero si necesita al menos:

- enum definitivo de roles
- claims devueltos en `auth/me`
- si un usuario puede tener varios roles o solo uno

Ahora mismo eso sigue ambiguo.

Paginas relacionadas:

- 3
- 4 a 6
- 37 a 38

### 4. Falta un contrato consistente para transiciones con observaciones y trazabilidad de revisión

Impacto: alto

Existen endpoints como:

- `observe`
- `subsanar`
- `approve`
- `set-current`

Pero no queda completamente definido:

- estructura de observaciones
- si se almacenan multiples observaciones por version
- si las observaciones tienen autor, fecha y estado
- si una subsanacion responde formalmente a una observacion

Hoy parece que se envian comentarios sueltos. Para un sistema de revision real, eso puede quedar corto muy pronto.

Paginas relacionadas:

- 19 a 25

### 5. El contrato mezcla bien recursos y comandos, pero necesita una politica uniforme

Impacto: medio-alto

Hay varios endpoints orientados a comandos, por ejemplo:

- `submit-review`
- `set-current`
- `archive`

Eso es valido, sobre todo cuando se trata de workflows. El problema no es el estilo, sino que aun falta una regla uniforme sobre:

- nombre de acciones
- verbos usados
- si todas las transiciones usan `POST`
- payload minimo requerido por transicion

Conviene normalizarlo antes de construir SDK o hooks frontend.

Paginas relacionadas:

- 18 a 33

### 6. Falta soporte explicito para concurrencia y control de version de edicion

Impacto: medio-alto

El contrato no expone nada como:

- `updatedAt`
- `versionStamp`
- `etag`
- precondiciones

Para un sistema con borradores, revisiones y multiples actores, eso puede generar sobrescritura silenciosa.

Minimo recomendable para MVP:

- devolver `updatedAt`
- validar ultima actualizacion al hacer `PATCH`

Paginas relacionadas:

- general en entidades editables

### 7. El contrato define listas paginadas, pero no lo aplica de forma homogénea

Impacto: medio

Algunos endpoints listan con `meta`, otros solo con `data`. Eso puede estar bien si unas listas son pequeñas, pero deberia ser intencional y consistente. Por ejemplo:

- usuarios y auditoria tienen formato paginado claro
- otras listas jerarquicas no siempre muestran `meta`

Conviene definir:

- que endpoints siempre paginan
- cuales devuelven colecciones pequeñas no paginadas

Paginas relacionadas:

- 1 a 2
- 4
- 14
- 36

### 8. Las respuestas son utiles, pero todavia faltan tipos expandibles o vistas estandar

Impacto: medio

Ejemplo:

- `GET /rats/:id`
- `GET /rats/:id/detail`

Eso es correcto, aunque conviene explicitar un patron:

- recurso base
- recurso expandido
- recurso consolidado

Lo mismo aplica a:

- actividad
- actividad version full
- reportes

Si no se formaliza, frontend terminara dependiendo de payloads muy particulares por pantalla.

Paginas relacionadas:

- 17 a 18
- 23 a 24
- 35

### 9. La definicion de errores funcionales es un acierto, pero aun incompleta

Impacto: medio

Agregar `code` interno es muy buena decision. Aun faltaria ampliar algunos escenarios:

- transicion no permitida por estado
- rat archivado no editable
- actividad archivada
- version no encontrada dentro del contexto padre
- conflicto por concurrencia
- catalogo inactivo no seleccionable

Esto ayudaria mucho al frontend y a las pruebas.

Paginas relacionadas:

- 37

### 10. Reportes y dashboard siguen dependiendo de una fuente de verdad no completamente formalizada

Impacto: medio

El contrato describe bien las salidas, pero no resuelve si toman como base:

- datos vivos
- version vigente
- snapshot oficial

Esto sigue siendo una ambiguedad transversal en los 4 documentos.

Paginas relacionadas:

- 33 a 36

### 11. Faltan contratos para comentarios, observaciones, alertas y evidencias como entidades propias

Impacto: medio

El sistema ya gira en torno a observaciones, alertas y justificaciones, pero el contrato las trata como campos embebidos o efectos laterales. Puede bastar para MVP, pero si se quiere trazabilidad real, convendria modelar al menos:

- observaciones de revision
- alertas contextuales
- evidencias o justificaciones estructuradas

Paginas relacionadas:

- 20
- 25
- 34

## Lo mejor del documento

- Baja bien las especificaciones anteriores a rutas y payloads concretos.
- Da una base util para arrancar frontend y backend en paralelo.
- Formaliza respuestas y errores.
- Hace visible el flujo principal del dominio.
- Reconoce sus propios pendientes mas sensibles.

## Inconsistencias o ajustes que conviene hacer ya

### 1. Resolver el enum definitivo de roles

Esto ya no deberia seguir pendiente si se quiere empezar a construir.

### 2. Cerrar el contrato completo de actividad versionada

Es el corazon del sistema y todavia no esta completamente descrito.

### 3. Definir estrategia relacional para multivalores

No deberia quedar abierto al inicio del desarrollo.

### 4. Formalizar respuestas para transiciones

Todas deberian devolver un payload estandar con:

- id
- estado anterior
- estado nuevo
- fecha
- actor si aplica

## Recomendaciones concretas antes de construir

### 1. Congelar primero el dominio de actividad versionada

Con:

- DTO completos
- relaciones
- tablas pivote
- validaciones por paso

### 2. Definir una convencion unica de payloads

Para:

- listas
- detalle simple
- detalle consolidado
- transiciones de workflow
- errores funcionales

### 3. Agregar control de concurrencia minimo al contrato

Ejemplo:

- `updatedAt`
- o numero de version tecnica

### 4. Formalizar observaciones y subsanaciones

Si no como entidad completa, al menos como estructura repetible y auditable.

### 5. Definir que endpoints son paginados por defecto

Y cuales no, con criterio documentado.

## Conclusion

El contrato API es un muy buen avance y probablemente el documento mas util de los cuatro para detectar lo que aun falta definir. Ayuda mucho a hacer visible el gap entre idea funcional y construccion real.

Sin embargo, todavia no esta listo como contrato cerrado de desarrollo porque mantiene abiertas decisiones fundamentales sobre:

- roles
- multivalores
- actividad versionada
- observaciones
- concurrencia
- fuente de verdad para reportes

Si esos puntos se resuelven, el contrato puede quedar lo bastante solido como para arrancar implementacion con bastante seguridad.
