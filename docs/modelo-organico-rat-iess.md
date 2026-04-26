# Modelo organico y asociacion de RAT para IESS

## Conclusion funcional

Para el caso IESS, el `RAT` no debe colgar de cada subdireccion como si fuera un registro aislado. El modelo correcto es:

- la estructura organica se registra como un arbol de unidades;
- el `RAT` pertenece a una unidad responsable padre;
- la `actividad de tratamiento` identifica la unidad que la ejecuta;
- el sistema usa la unidad ejecutora para sugerir o filtrar los `RAT` validos.

Con esto evitamos duplicar RAT por cada subdireccion y, al mismo tiempo, mantenemos trazabilidad de donde nace realmente cada actividad.

## Limitacion del modelo actual

Hoy el proyecto tiene un modelo de dos niveles:

- `OrgDependencia`
- `OrgSubdireccion`

Ese modelo sirve para un MVP pequeno, pero no soporta bien la realidad del IESS porque:

- la estructura institucional tiene mas de dos niveles;
- existen bloques organizacionales, direcciones, subdirecciones, comites y entidades vinculadas;
- el numero de RAT no siempre coincide con el numero de subdirecciones;
- una misma direccion puede tener varios RAT y varias subdirecciones operando actividades dentro de esos RAT.

## Modelo objetivo recomendado

### 1. Unidad organica unica

Conviene migrar a una tabla unica `OrgUnidad` con autorelacion:

- `id`
- `codigo`
- `nombre`
- `tipoUnidad`
- `parentId`
- `orden`
- `activo`
- `responsable`
- `esContenedorRat`

Puntos importantes:

- `codigo` debe ser interno y estable; no conviene usar numerales visibles como `5.3` o `6.2` como clave de negocio;
- los numerales, si se necesitan para reportes, deben vivir en un campo de orden o etiqueta de presentacion;
- `esContenedorRat` define si esa unidad puede ser propietaria directa de uno o varios RAT.

### 2. RAT asociado a unidad responsable

El `RAT` deberia asociarse a la unidad que realmente lo gobierna:

- `Rat.unidadResponsableId`

Esa unidad suele ser una direccion, direccion nacional o unidad equivalente que agrupa procesos afines.

### 3. Actividad asociada a RAT y a unidad ejecutora

La actividad no solo debe pertenecer a un `RAT`; tambien debe registrar donde se ejecuta:

- `ActividadTratamiento.ratId`
- `ActividadTratamiento.unidadEjecutoraId`

Esto permite responder dos preguntas distintas:

- cual es el RAT rector del tratamiento;
- que unidad organizacional ejecuta la actividad.

### 4. Cobertura organica opcional por RAT

Si un mismo RAT aplica a varias unidades hijas, conviene una tabla de cobertura:

- `RatCoberturaUnidad.ratId`
- `RatCoberturaUnidad.unidadId`
- `RatCoberturaUnidad.incluyeDescendientes`

Esto permite que un RAT perteneciente a una direccion cubra una o varias subdirecciones sin duplicarlo.

## Regla operativa para automatizar la asociacion

La automatizacion recomendable para el MVP no es "asignar a ciegas", sino "reducir inteligentemente el universo de RAT":

1. El usuario selecciona la unidad ejecutora de la actividad.
2. El sistema identifica la unidad responsable mas cercana que tenga `esContenedorRat = true`, o usa la cobertura definida en `RatCoberturaUnidad`.
3. El sistema lista los RAT activos de esa unidad responsable.
4. Si existe un solo RAT candidato, se sugiere automaticamente.
5. Si existen varios RAT candidatos, el usuario elige uno dentro de una lista ya filtrada.

Este enfoque evita errores de clasificacion y sigue siendo rapido para el usuario.

## Regla importante de negocio

La estructura organica sirve para acotar el conjunto de RAT posibles, pero no deberia determinar por si sola el numero exacto de RAT.

Ejemplo:

- la `Direccion del Seguro General de Salud Individual y Familiar` puede tener cinco RAT;
- esas cinco subdirecciones no obligan matematicamente a que siempre exista una relacion 1 a 1 entre subdireccion y RAT;
- el numero real de RAT debe responder a finalidades, procesos y dominios de tratamiento, no solo a la estructura del organigrama.

Por eso la mejor regla es:

- la estructura organica define el contexto;
- el RAT define la agrupacion funcional del tratamiento.

## Ejemplo aplicado a tu caso

Para la `Direccion del Seguro General de Salud Individual y Familiar`:

- la direccion es la unidad responsable del conjunto;
- sus subdirecciones operan actividades de tratamiento;
- cada actividad selecciona primero su subdireccion ejecutora;
- el sistema busca los RAT vigentes de la direccion;
- el usuario asocia la actividad al RAT correcto dentro de ese conjunto filtrado.

Asi obtenemos exactamente el comportamiento que planteas:

- una estructura organica completa;
- varios RAT por unidad padre;
- actividades operadas por unidades hijas;
- asociacion guiada y consistente.

## Implementacion recomendada por fases

### Fase 1

- mantener el modelo actual funcionando;
- cargar la estructura IESS en un archivo base reutilizable;
- ajustar el frontend para hablar de "unidad responsable" y "unidad ejecutora";
- usar la estructura para filtrar RAT candidatos al crear actividades.

### Fase 2

- crear `OrgUnidad` como tabla jerarquica unica;
- migrar `OrgDependencia` y `OrgSubdireccion` al nuevo arbol;
- mover `Rat` a `unidadResponsableId`;
- agregar `unidadEjecutoraId` en actividades.

### Fase 3

- agregar cobertura organica de RAT;
- sugerencia automatica de RAT por unidad;
- reportes por arbol organizacional;
- permisos por unidad y por ancestros.

## Decision recomendada para este proyecto

Si vamos a construir bien el sistema y no solo un MVP corto, la mejor decision es:

- no usar numerales del organigrama como clave;
- no modelar el IESS con solo dependencia y subdireccion;
- pasar a una jerarquia organica unificada;
- dejar que el RAT pertenezca a la unidad padre y que la actividad identifique la unidad que la ejecuta.

Ese es el modelo mas estable para el crecimiento del sistema.
