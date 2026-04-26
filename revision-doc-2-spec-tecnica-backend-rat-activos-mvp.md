# Revision documento 2

## Documento revisado

- `Spec Tecnica Backend Rat Activos Mvp.pdf`

## Valoracion general

La SPEC tecnica de backend esta bien encaminada para un MVP realista. Toma decisiones sensatas:

- NestJS
- PostgreSQL
- Prisma
- JWT simple
- monolito modular

Ademas, mantiene una estructura coherente con el documento funcional anterior y propone modulos razonables para construir de forma incremental.

Aun asi, el documento todavia tiene vacios tecnicos importantes. No son fallas de stack, sino huecos en modelo transaccional, consistencia de dominio, control de concurrencia, autorizacion fina y estrategia de versionado. Si se desarrolla tal como esta, el sistema podria funcionar, pero con riesgos altos de comportamientos ambiguos y deuda tecnica temprana.

## Hallazgos principales

### 1. La separacion modular es correcta, pero el corte entre modulos puede generar acoplamiento innecesario

Impacto: alto

Separar `rat`, `rat-versiones`, `actividades` y `actividad-versiones` suena limpio, pero en la practica estos modulos van a compartir reglas transaccionales muy estrechas:

- crear RAT crea version inicial
- crear actividad crea version inicial
- set current reemplaza la anterior
- detalle de RAT depende de actividades, riesgo, MTGE y alertas

Si esta separacion se implementa como modulos tecnicamente aislados sin una capa de aplicacion/coordinacion, puede aparecer logica duplicada o acoplamiento circular entre servicios.

Recomendacion:

- mantener modulos, pero definir claramente servicios de dominio y servicios de aplicacion
- concentrar workflows de versionado en una capa compartida

Paginas relacionadas:

- 2 a 6
- 12 a 16

### 2. Falta una estrategia explicita de transacciones para operaciones compuestas

Impacto: alto

Varias operaciones son claramente atomicas y deberian ejecutarse en una unica transaccion:

- crear RAT + crear RatVersion inicial + auditoria
- crear actividad + crear ActividadVersion inicial + auditoria
- aprobar y poner vigente una version + reemplazar la anterior
- calcular MTGE + actualizar actividad version + marcar requiereEipd + auditoria

La SPEC no define como se manejaran estas operaciones con Prisma.

Recomendacion:

- usar `prisma.$transaction` en todos los casos de cambio compuesto
- documentar que pasos son atomicos y cuales son tolerantes a falla parcial

Paginas relacionadas:

- 12 a 19
- 22 a 23

### 3. La auditoria esta planteada de forma util, pero hoy puede romper consistencia o quedarse incompleta

Impacto: alto

El documento dice que la auditoria no debe bloquear la operacion principal salvo error critico de base de datos. Eso es razonable, pero falta definir:

- si la auditoria se escribe en la misma transaccion o fuera de ella
- si se permite perder auditoria en ciertas fallas
- si hay auditoria de lectura sensible
- si se auditan solo eventos finales o tambien intentos fallidos de acceso y cambios de estado

Dado que el sistema es sensible, la decision debe ser explicita.

Recomendacion:

- auditar acciones de negocio criticas dentro de la misma transaccion cuando afectan estado
- usar logs tecnicos separados para errores y seguridad

Paginas relacionadas:

- 4
- 22 a 23

### 4. El modelo de autorizacion por rol es demasiado simple para el dominio real

Impacto: alto

La SPEC reconoce validacion por rol y por dependencia, pero aun es insuficiente para varios casos reales:

- usuarios con multiples roles
- revisores globales versus revisores por area
- subdireccion distinta dentro de la misma dependencia
- permisos diferentes para crear, editar, revisar, aprobar y archivar
- acceso historico a registros de dependencias anteriores

Recomendacion:

- modelar permisos por accion y contexto
- separar autenticacion de autorizacion
- no depender solo de `rol: string`

Minimo para MVP:

- tabla de usuario-rol
- validacion de ambito organizacional
- matriz de permisos por endpoint o caso de uso

Paginas relacionadas:

- 8 a 10
- 23

### 5. Los DTO de actividad y activo estan subespecificados frente al funcional

Impacto: alto

El documento funcional describe una actividad mucho mas rica de lo que aparece en los DTO backend. En backend se ve:

- finalidad
- base de licitud
- plazo de conservacion
- algunos flags

Pero no aparece con claridad el modelo para:

- titulares
- categorias de datos
- datos sensibles
- medios de recoleccion
- acciones de tratamiento
- destinatarios
- transferencias
- medidas de seguridad

Esto sugiere que falta modelar relaciones N:M o colecciones hijas. Si no se cierra ahora, el schema Prisma quedara incompleto.

Paginas relacionadas:

- 14 a 18

### 6. Falta definir con precision el schema relacional para relaciones multiples

Impacto: alto

Se mencionan entidades principales, pero la lista del punto 8.1 es insuficiente para soportar el dominio funcional real. Faltan probablemente tablas como:

- actividad_version_titular
- actividad_version_categoria_dato
- actividad_version_medida_seguridad
- actividad_version_transferencia
- actividad_version_destinatario
- actividad_version_accion_tratamiento
- alerta_contextual

Sin esto, la API puede quedar orientada a campos planos cuando el dominio requiere relaciones.

Paginas relacionadas:

- 7
- 14 a 22

### 7. El workflow de versionado esta mejor definido que en el funcional, pero aun faltan guardas de negocio

Impacto: medio-alto

Las transiciones estan bien descritas, aunque faltan validaciones como:

- quien puede ejecutar cada transicion
- si `approve` y `set-current` son acciones separadas o consecutivas obligatorias
- si una version observada mantiene historial de observaciones
- si se puede archivar una version no vigente
- si una version aprobada puede volver a borrador

Tambien falta aclarar si los cambios a relaciones hijas obligan nueva version o quedan en el mismo borrador.

Paginas relacionadas:

- 13
- 14 a 15
- 24 a 25

### 8. El diseno REST es aceptable, pero hay inconsistencias y algunos endpoints mezclan recursos y comandos

Impacto: medio

Ejemplos:

- `POST /rat-versiones/:id/set-current`
- `PATCH /rats/:id/archive`
- `POST /actividad-versiones/:id/submit-review`

No es un problema grave para un MVP, pero conviene estandarizar:

- o bien endpoints de comandos por accion
- o bien actualizaciones de estado via transicion explicita

Si no, la API crece de manera irregular.

Recomendacion:

- mantener comandos si priorizan claridad, pero normalizar nombres y semantica
- definir contrato de transicion de estado uniforme

Paginas relacionadas:

- 12 a 20

### 9. MTGE y riesgo contienen logica de negocio importante, pero estan embebidos como calculos sin version metodologica

Impacto: medio-alto

Hoy el MVP puede soportarlo, pero falta contemplar:

- version de metodologia MTGE
- parametrizacion de umbrales
- trazabilidad del criterio aplicado al momento del calculo

Si despues cambia la metodologia, no bastara con recalcular; se necesitara saber con que regla se evaluo historicamente.

Recomendacion:

- almacenar puntajes parciales y formula aplicada
- guardar version de metodologia en la evaluacion

Paginas relacionadas:

- 17 a 19

### 10. No se define estrategia de concurrencia ni control de edicion simultanea

Impacto: medio-alto

En un sistema versionado y con revisiones, esto es importante:

- dos usuarios pueden editar el mismo borrador
- un revisor puede aprobar una version mientras otro usuario la modifica
- un usuario puede intentar asociar activos mientras otro cambia el estado

Prisma y PostgreSQL lo soportan tecnicamente, pero la SPEC no define:

- optimistic locking
- `updatedAt` checks
- validacion de estado al guardar

Paginas relacionadas:

- 12 a 20

### 11. Faltan decisiones sobre borrado logico y politica de historicos

Impacto: medio

Se habla de archivar o retirar, pero no queda especificado:

- si todas las entidades usan `deletedAt` o `status`
- que recursos pueden retirarse logicamente
- como filtran los endpoints por defecto
- si el historico incluye relaciones inactivas

Esto afecta mucho el schema y los reportes.

Paginas relacionadas:

- 11
- 15 a 16

### 12. La seguridad basica es valida para MVP, pero faltan piezas minimas de endurecimiento

Impacto: medio

No veo aun definiciones sobre:

- rate limiting en login
- politica de contraseñas
- expiracion y refresh de token
- invalidacion de sesiones
- CORS
- sanitizacion de campos ricos

Para entorno local esta bien como arranque, pero deben quedar en lista explicita de deuda.

Paginas relacionadas:

- 7 a 9
- 23 a 24

## Lo mejor del documento

- Escoge una arquitectura acertada para el problema: monolito modular.
- Tiene coherencia razonable con la SPEC funcional.
- Ordena bien los modulos de backend.
- Propone validaciones y errores estandarizados.
- Introduce reglas de workflow y clases de reglas separadas.
- El roadmap por sprints es sensato para una primera construccion.

## Inconsistencias o ajustes que conviene hacer ya

### 1. Alinear roles del backend con roles funcionales del documento 1

En backend aparecen roles mas resumidos:

- Administrador
- Responsable
- Editor
- Revisor
- Auditor

Pero en funcional estaban mas desagregados:

- Responsable de dependencia
- Responsable de subdireccion
- Revisor de proteccion de datos
- Revisor de seguridad de la informacion

Conviene no perder ese nivel de precision.

### 2. Alinear DTO con el dominio real

Especialmente en:

- actividad version
- riesgo
- EIPD
- activos

### 3. Completar el inventario de entidades Prisma

Las entidades listadas no bastan todavia para modelar todo el formulario funcional.

### 4. Definir si los reportes salen de versiones vivas o snapshots

Esto sigue abierto y es importante para consistencia auditada.

## Recomendaciones concretas antes de construir

### 1. Crear un documento complementario de decisiones de dominio

Debe cerrar:

- cardinalidades
- ownership
- permisos
- versionado
- snapshots
- reglas de transicion

### 2. Diseñar primero el `schema.prisma` completo

Antes de crear controladores o DTO.

### 3. Definir casos de uso transaccionales

Minimo:

- crear RAT
- crear actividad
- publicar version
- calcular MTGE
- registrar riesgo
- crear EIPD
- archivar

### 4. Incorporar una estrategia minima de concurrencia

Por ejemplo:

- campo `updatedAt`
- precondiciones por estado
- validacion de ultima modificacion

### 5. Diseñar autorizacion por ambito

No solo por rol.

## Conclusion

La SPEC de backend es buena como base de implementacion y esta mejor definida que muchas especificaciones tecnicas de MVP. La direccion arquitectonica es correcta.

El mayor riesgo no esta en NestJS, Prisma o PostgreSQL, sino en que el backend se implemente antes de cerrar bien:

- el modelo relacional completo
- las transacciones de negocio
- la autorizacion por contexto
- las reglas de versionado y publicacion

Si se corrigen esos puntos, esta SPEC puede bajar con bastante seguridad a `schema.prisma`, contratos API y plan de implementacion real.
