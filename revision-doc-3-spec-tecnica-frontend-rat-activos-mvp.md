# Revision documento 3

## Documento revisado

- `Spec Tecnica Frontend Rat Activos Mvp.pdf`

## Valoracion general

La SPEC de frontend esta bien planteada para un MVP serio. Tiene una arquitectura moderna y pragmatica:

- React + TypeScript
- Vite
- React Hook Form + Zod
- TanStack Query
- arquitectura por features

Tambien esta bien orientada al dominio: no cae en la trampa de hacer pantallas planas ni de replicar una matriz Excel. El uso de wizard para actividad versionada es una muy buena decision.

El principal riesgo de este documento no esta en la tecnologia elegida, sino en que el frontend esta describiendo una UX rica sobre un dominio que todavia no esta 100 por ciento cerrado en backend y modelo de datos. Si no se ajusta eso, la UI puede terminar implementando suposiciones que luego el backend no soporte limpiamente.

## Hallazgos principales

### 1. La experiencia de usuario esta bien pensada, pero depende de un backend mas rico del que hoy esta especificado

Impacto: alto

El wizard de actividad plantea pasos para:

- titulares
- categorias de datos
- transferencias
- medidas de seguridad
- activos
- MTGE
- riesgo
- EIPD

Eso implica que el backend debe exponer:

- catálogos completos
- relaciones N:M
- validaciones por paso
- guardado parcial
- estados de completitud
- alertas calculadas

Hoy la SPEC backend todavia no aterriza completamente ese nivel de detalle. Por eso hay un riesgo claro de desacople entre UX deseada y API real disponible.

Paginas relacionadas:

- 16 a 20

### 2. Falta definir la estrategia de guardado del wizard

Impacto: alto

El documento dice "guardado parcial por paso", pero no define como se implementa:

- autosave
- save manual por paso
- save del borrador completo
- validacion parcial versus validacion final
- manejo de errores por seccion

Este punto es clave porque cambia:

- diseño de formularios
- hooks
- DTO
- contratos API
- experiencia del usuario

Recomendacion:

- definir desde ya si cada paso guarda contra el backend
- o si el wizard mantiene estado local y persiste por bloques

Para este dominio, mi recomendacion MVP es:

- guardado manual por paso
- persistencia inmediata al backend
- resumen final solo para validacion de envio a revision

Paginas relacionadas:

- 16
- 20

### 3. El frontend esta absorbiendo reglas de negocio que deberian estar centralizadas en backend

Impacto: alto

Hay varias reglas visuales y de comportamiento que son razonables para UX, pero no deben vivir solo en frontend:

- sugerir EIPD por biométricos
- alertar activo sin custodio
- mostrar version vigente no editable
- determinar EIPD pendiente
- clasificar proximidad de revision

El frontend puede mostrarlas, pero su fuente de verdad deberia ser backend o al menos una regla compartida bien definida. Si no, apareceran inconsistencias entre pantallas y con el API.

Paginas relacionadas:

- 7 a 8
- 17 a 20
- 26

### 4. La arquitectura por features es correcta, pero faltan definiciones de composicion transversal

Impacto: medio-alto

Hay buena separacion por modulos, aunque faltan decisiones sobre elementos transversales:

- sistema central de notificaciones/toasts
- manejo global de errores 401, 403, 409
- invalidacion de cache por cambios de workflow
- esquema comun de filtros y paginacion
- estrategia de breadcrumbs dinamicos
- formatos comunes para estados y badges

Sin esos acuerdos, cada feature puede resolverse de forma distinta y perder consistencia.

Paginas relacionadas:

- 3 a 6
- 24 a 27

### 5. Faltan patrones claros para manejar estados de versiones y transiciones

Impacto: medio-alto

El documento describe pantallas, badges y acciones, pero no define con suficiente detalle:

- como se habilitan o deshabilitan acciones por estado
- que botones se muestran segun rol y estado
- como se comunica una transicion invalida
- si se pide confirmacion y motivo antes de ciertas acciones

En este sistema, la UI de workflow es parte critica del negocio, no un detalle visual.

Recomendacion:

- crear una matriz `rol + estado + accion visible + accion permitida`

Paginas relacionadas:

- 14 a 20
- 25

### 6. Hay riesgo de sobrecargar el wizard de actividad en una sola entrega MVP

Impacto: medio-alto

El wizard tiene 12 pasos y cruza varios dominios en una sola experiencia:

- actividad
- activos
- MTGE
- riesgo
- EIPD

Eso puede ser correcto funcionalmente, pero tambien puede volver lenta la implementacion y mas fragil la usabilidad inicial. Si el backend aun madura, este wizard se convierte en el punto mas costoso del MVP.

Recomendacion:

- mantener la experiencia unificada
- pero dividir internamente el desarrollo en subflujos claramente independientes
- asegurar navegacion no lineal con indicadores de completitud

Paginas relacionadas:

- 16 a 20

### 7. La seguridad frontend esta bien para MVP, pero localStorage es una deuda conocida

Impacto: medio

El documento lo reconoce, lo cual esta bien. Igual conviene dejar mas explicito:

- el frontend no debe confiar en permisos ocultando botones
- localStorage es temporal para MVP local
- toda accion sensible debe depender de backend

Tambien faltaria definir:

- expiracion percibida de sesion
- redireccion por 401
- experiencia cuando expira el token

Paginas relacionadas:

- 25

### 8. Reportes imprimibles estan bien pensados, pero falta definir si consumen snapshots o datos vivos

Impacto: medio

Este problema ya aparecio en funcional y backend. En frontend tambien sigue abierto. Si la vista de reporte se construye sobre datos editables en tiempo real, puede perder trazabilidad.

Para un MVP, se puede tolerar reporte web sobre version vigente, pero debe quedar explicitado.

Paginas relacionadas:

- 23

### 9. La especificacion visual es funcional, pero todavia generica

Impacto: medio

La paleta y badges estan definidos, pero aun falta:

- sistema tipografico
- espaciado base
- estados de componentes
- accesibilidad minima
- responsive behavior por pantalla

No es un bloqueo, pero sin eso el frontend puede quedar correcto funcionalmente y flojo en consistencia visual.

Paginas relacionadas:

- 8
- 9 a 10
- 27

### 10. No se define estrategia clara para tablas grandes y filtros

Impacto: medio

Varios modulos dependen de listados:

- RAT
- dependencias
- subdirecciones
- activos
- auditoria
- riesgos
- EIPD

Falta decidir:

- paginacion server-side o client-side
- ordenamiento
- busqueda libre
- persistencia de filtros en URL
- exportabilidad futura

Esto es especialmente importante para auditoria y activos.

Paginas relacionadas:

- 11 a 24

### 11. Faltan decisiones de accesibilidad y usabilidad operativa

Impacto: medio

El sistema sera usado probablemente por perfiles no tecnicos. Conviene definir desde ahora:

- labels claros
- mensajes de ayuda
- indicadores de campos obligatorios
- prevencion de perdida de cambios
- soporte de teclado basico en wizard y tablas

Paginas relacionadas:

- 7
- 16 a 20
- 26

### 12. Riesgo de duplicacion de schemas entre Zod y DTO backend

Impacto: medio

El documento dice correctamente que la validacion frontend debe coincidir con backend, pero no dice como evitar deriva. Si cada lado define esquemas por separado, la divergencia llega rapido.

Recomendacion:

- si no hay generacion automatica, al menos definir contratos tipados por modulo
- idealmente, derivar tipos desde OpenAPI o un contrato compartido en una fase siguiente

Paginas relacionadas:

- 24 a 26

## Lo mejor del documento

- El wizard es la decision UX correcta para este dominio.
- La estructura por features esta bien alineada con el backend.
- La seleccion del stack es moderna y realista.
- Hay buena intencion de consistencia visual con badges, alertas y layouts.
- El documento entiende que la UI debe guiar y no solo capturar datos.

## Inconsistencias o ajustes que conviene hacer ya

### 1. Alinear frontend con el dominio real de permisos

El frontend resume roles en:

- Administrador
- Responsable
- Editor
- Revisor
- Auditor

Pero el funcional original tenia un detalle mayor. Esa perdida de precision puede afectar visibilidad de acciones.

### 2. Alinear rutas y páginas con estados de negocio

Por ejemplo:

- detalle de actividad versus detalle de version de actividad
- cuando se entra al wizard
- cuando una version se consulta en modo solo lectura

### 3. Definir mejor la relacion entre wizard y pantallas satelite

Hoy no es del todo claro si MTGE, riesgo y EIPD se gestionan solo dentro del wizard o tambien en vistas independientes editables.

## Recomendaciones concretas antes de implementar

### 1. Definir contrato UX del wizard

Debe incluir:

- estrategia de guardado
- navegacion entre pasos
- validacion parcial
- indicadores de completitud
- comportamiento al salir con cambios sin guardar

### 2. Crear una matriz de permisos y acciones visibles

Por pantalla y por estado.

### 3. Definir convenciones de query keys y cache invalidation

Especialmente para:

- cambios de estado
- detalle RAT
- resumen dashboard
- reportes

### 4. Definir patrones de tablas y filtros

Con una politica comun para:

- paginacion
- filtros en URL
- ordenamiento
- vacios
- loading

### 5. No implementar el wizard completo antes de cerrar backend y schema

Conviene validar primero:

- modelo de datos real
- endpoints
- guardado parcial
- relaciones N:M

## Conclusion

La SPEC de frontend es buena y esta bien enfocada. El equipo que la use tendra una guia util para construir una interfaz modular y bastante madura para MVP.

El mayor riesgo no es de tecnologia ni de organizacion visual, sino de sincronizacion con el dominio y el backend. Si se implementa frontend antes de cerrar:

- contratos API
- modelo relacional
- estrategia de guardado del wizard
- permisos por estado y rol

es probable que el frontend tenga que rehacerse en partes importantes.

Con esos ajustes, esta especificacion puede convertirse en una muy buena base de implementacion.
