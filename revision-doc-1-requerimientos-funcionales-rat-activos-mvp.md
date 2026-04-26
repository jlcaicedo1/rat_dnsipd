# Revision documento 1

## Documento revisado

- `Spec Requerimientos Funcionales Rat Activos Mvp.pdf`

## Valoracion general

El documento esta bien encaminado para un MVP. Tiene buena estructura, define dominio, actores, modulos y reglas transversales, y ademas evita varios errores comunes: no trata el RAT como Excel, reconoce el versionamiento y separa actividad, activo, riesgo y EIPD.

Sin embargo, todavia tiene vacios importantes de modelado, workflow y consistencia funcional que conviene cerrar antes de pasar a diseno tecnico o desarrollo. El principal riesgo no esta en que falten pantallas, sino en que varias reglas no estan completamente definidas y eso puede provocar implementaciones ambiguas.

## Hallazgos principales

### 1. Falta definicion formal del modelo de aprobacion y de quien cambia estados

Impacto: alto

El documento define estados para RAT, versiones y EIPD, pero no deja completamente claro:

- quien puede mover cada estado
- que transiciones son validas
- si hay aprobacion de uno o varios revisores
- si la aprobacion de privacidad y seguridad es secuencial o paralela
- que ocurre si un revisor aprueba y otro observa

Sin esta definicion, el backend y la UI pueden implementar logicas incompatibles.

Paginas relacionadas:

- 3 a 4
- 12
- 19

### 2. Hay ambiguedad entre RAT como contenedor y RAT versionable

Impacto: alto

El documento dice correctamente que el RAT es un contenedor, pero al mismo tiempo define versionamiento del RAT. Aun no queda totalmente explicito que parte del RAT versiona:

- solo sus metadatos
- el conjunto de actividades incluidas en un momento dado
- una foto regulatoria completa
- o ambos

Este punto es clave porque cambia completamente el modelo de datos. Recomiendo definir si el RAT tiene:

- una entidad viva `rat`
- una entidad `rat_version`
- y una entidad snapshot que consolide actividades versionadas publicadas

Paginas relacionadas:

- 1 a 3
- 10 a 12

### 3. La nocion de cambio sustancial existe, pero no esta operativizada

Impacto: alto

Se listan cambios sustanciales en reglas transversales, pero no se define:

- si el sistema detecta automaticamente esos cambios
- si el usuario puede forzar una edicion menor
- si existe tabla o catalogo de tipo de cambio
- si se exige justificacion siempre o solo en cambios sustanciales

Conviene convertir esto en reglas de motor o al menos en una matriz formal de campos versionables.

Paginas relacionadas:

- 11
- 23 a 24

### 4. Riesgo esta modelado demasiado simple para sostener EIPD y trazabilidad futura

Impacto: alto

Para MVP puede bastar una evaluacion basica, pero tal como esta redactado, el modulo de riesgo queda muy plano:

- no distingue riesgo inherente y residual con claridad metodologica
- no define catalogo de amenazas, vulnerabilidades y controles
- no define si habra multiples riesgos por actividad o uno solo
- no define propietario del riesgo ni plan de tratamiento

Si EIPD depende del riesgo, ese nivel de simplificacion puede quedarse corto muy rapido.

Paginas relacionadas:

- 18
- 19

### 5. La logica de EIPD obligatoria necesita reglas mas precisas y trazables

Impacto: alto

Se indican disparadores funcionales de EIPD, pero no se define:

- si basta uno solo o combinacion de varios
- si el usuario puede justificar excepcion
- quien valida que una EIPD ya no sea requerida
- si la EIPD se recalcula al cambiar una actividad

Esto debe quedar como regla formal, no solo como texto descriptivo.

Paginas relacionadas:

- 19
- 24

### 6. Faltan definiciones de cardinalidad y restricciones clave del dominio

Impacto: medio-alto

El documento lista campos y asociaciones, pero faltan reglas como:

- un RAT puede existir sin subdireccion, pero una actividad puede estar asociada a dependencia o solo al RAT
- una actividad puede pertenecer a un solo RAT o migrar de RAT
- un activo puede estar en varias actividades y con roles distintos
- una version de actividad puede tener multiples evaluaciones MTGE o solo una vigente
- una version puede tener multiples riesgos

Estas decisiones deben fijarse antes del ERD.

Paginas relacionadas:

- 10 a 18

### 7. Los catalogos estan bien planteados, pero falta gobernanza sobre ellos

Impacto: medio

Se define administracion de catalogos, aunque faltan algunas reglas:

- si ciertos catalogos son cerrados y no editables por administradores funcionales
- si los cambios de catalogo afectan historicos
- si se versionan o solo se activan/inactivan
- si ciertos catalogos tienen jerarquia o pesos para calculos

Esto es especialmente importante para MTGE, riesgo, clasificacion y estados.

Paginas relacionadas:

- 9 a 10
- 16 a 18

### 8. Auditoria minima esta bien, pero todavia no separa auditoria de versionado

Impacto: medio

El documento exige auditoria de eventos y tambien versionamiento, pero son capacidades distintas. Conviene separarlas explicitamente:

- auditoria: quien hizo que y cuando
- versionado: como quedo el objeto en cada version

Si se mezclan ambas cosas en una sola tabla o modulo, despues costara hacer diff, reproducibilidad y reportes regulatorios.

Paginas relacionadas:

- 22
- 23 a 25

### 9. El dashboard y los reportes describen salidas, pero no la fuente de verdad

Impacto: medio

Hace falta aclarar si los reportes deben salir de:

- datos vivos
- versiones vigentes
- snapshots aprobados

Para un sistema auditable, esto es importante. Un reporte oficial no deberia depender solo del estado actual de tablas editables.

Paginas relacionadas:

- 20 a 22

### 10. Faltan criterios no funcionales importantes para un sistema sensible

Impacto: medio

Los RNF actuales son utiles pero insuficientes para este dominio. Falta al menos definir:

- politicas de respaldo
- retencion de auditoria
- manejo de adjuntos o evidencias
- trazabilidad de errores
- tiempos objetivo de respuesta
- estrategia de logs de seguridad
- reglas de acceso a datos sensibles

Paginas relacionadas:

- 24 a 25

## Lo mejor del documento

- Tiene una estructura clara y casi lista para convertirse en backlog.
- Acerta al poner la actividad de tratamiento como unidad normativa principal.
- Reconoce que el RAT es un contenedor y no una sola actividad.
- Introduce versionamiento como regla obligatoria.
- Usa catalogos como datos maestros.
- Ya anticipa el problema de gran escala, riesgo y EIPD de forma integrada.

## Recomendaciones concretas antes del diseno tecnico

### 1. Cerrar una matriz de estados y transiciones

Para cada entidad:

- RAT
- version de RAT
- actividad
- version de actividad
- EIPD
- riesgo

Definir:

- estado inicial
- estados permitidos
- transiciones validas
- rol autorizado para cada transicion
- validaciones previas

### 2. Definir el modelo de versionado formal

Debe quedar explicito:

- que se versiona
- que no se versiona
- cuando se crea nueva version
- cuando se crea snapshot
- que datos alimentan reportes oficiales

### 3. Formalizar la matriz de cardinalidades

Ejemplos:

- RAT 1:N actividades
- actividad 1:N versiones
- version de actividad N:M activos
- version de actividad 1:1 MTGE vigente
- version de actividad 1:N riesgos
- version de actividad 0:1 o 1:N EIPD segun politica

### 4. Ampliar el modelo de riesgo

Aunque siga siendo MVP, sugiero incluir al menos:

- descripcion del riesgo
- activo afectado
- categoria de riesgo
- controles existentes
- riesgo residual
- responsable
- decision de tratamiento

### 5. Precisar reglas de EIPD

Definirlas como reglas ejecutables:

- disparadores
- prioridad de criterios
- posibilidad de excepcion
- necesidad de revaluacion ante cambios

## Siguiente entregable recomendado

Con este documento, el siguiente paso correcto no es codificar todavia. Lo ideal es producir estos artefactos en este orden:

1. matriz de estados y transiciones
2. ERD detallado
3. diccionario de datos
4. contrato API por modulo
5. backlog por epicas e historias

## Conclusion

El documento es una buena base funcional para el MVP y esta por encima de un requerimiento superficial. La mayor mejora pendiente no es agregar modulos, sino cerrar las ambiguedades de workflow, versionado, cardinalidad y reglas de negocio automáticas.

Con esos ajustes, ya se puede bajar con mucha seguridad a arquitectura tecnica y esquema inicial de base de datos.
