# Project Intelligence Report - rat_dnsipd

Fecha de auditoria: 2026-05-24  
Repositorio activo: `E:\developement\rat_dnsipd`  
Rama al momento del analisis: `codex/wizard-ux-refresh`  
Ultimo commit observado: `702baa3 Mejora wizard y controles por dependencia`

Este documento es un handoff tecnico para que otro modelo IA pueda continuar el desarrollo sin perder contexto arquitectonico, funcional ni de seguridad.

---

## 1. Executive Technical Summary

`rat_dnsipd` es un sistema institucional para gestionar Registro de Actividades de Tratamiento (RAT), Actividades de Tratamiento, Activos de Informacion, MTGE, Riesgos, EIPD, Reportes, Auditoria, Catalogos y Estructura Organica.

La intencion funcional real es convertir "Actividades de tratamiento" en el nucleo operativo. RAT funciona como cabecera/documento formalizable y las Actividades son la unidad de gestion diaria. Los Activos de Informacion son soporte tecnologico/documental asociado a actividades, riesgos y EIPD.

Arquitectura general:

```text
React + Vite + TypeScript
  -> Axios API client con JWT en localStorage
  -> Vite proxy /api en desarrollo
  -> Nginx proxy /api en produccion
NestJS modular
  -> JwtAuthGuard + AuthorizationScopeService
  -> Servicios con Prisma
  -> PostgreSQL 16
```

Estado actual:

- Backend real existe para auth, usuarios, catalogos, estructura organica, activos, RAT, actividades, versiones, actividad-activos, MTGE, riesgos, EIPD y auditoria.
- Frontend consume backend real para auth, usuarios, catalogos, activos, dependencias, subdirecciones, dashboard parcialmente y nuevo tratamiento parcialmente.
- Frontend todavia conserva datasets/localStorage para RAT/Actividades (`rat-registry-data.ts`, `registry-workspace.ts`) y para algunos estados de EIPD/estructura.
- Se implemento scoping por dependencia para Operador y roles transversales para Revisor/Admin Funcional/Admin Tecnico.
- Docker dev incluye PostgreSQL containerizado; Docker prod asume PostgreSQL externo.

Madurez:

- MVP avanzado, con capas base claras.
- Seguridad RBAC/ABAC en transicion: backend ya aplica scoping en varios servicios; frontend tambien filtra por rol para UX.
- Persistencia de Nuevo Tratamiento no esta completamente integrada punta a punta con backend real; el wizard produce registros locales/workspace.
- Riesgos, MTGE y EIPD tienen backend base, pero UI aun no esta completamente conectada a flujo persistente.

Modulos mas importantes:

- Backend: `auth`, `rat`, `actividades`, `actividad-versiones`, `activos`, `catalogos`, `estructura-organica`, `users`, `audit`.
- Frontend: `RatCreatePage`, `ActivitiesPage`, `AssetsPage`, `DashboardPage`, `MainLayout`, `permissions`, `dependency-scope`, `TreatmentReportPreview`.

---

## 2. Repository Structure Analysis

Estructura relevante:

```text
rat_dnsipd/
  package.json                     # workspace npm backend/frontend
  docker-compose.yml               # dev: postgres + backend + frontend + migrator + seed
  compose.prod.yml                 # prod: backend + frontend + migrator/seed, DB externa
  .env.dev(.example)               # variables dev
  .env.prod(.example)              # variables prod; riesgo si contiene secretos reales
  backend/
    Dockerfile
    package.json
    prisma/
      schema.prisma
      seed.ts
      import-activos.ts
      normalize-activos-text.ts
      migrations/20260425061754_init/migration.sql
      iess-estructura-organica.base.json
    src/
      main.ts
      app.module.ts
      auth/
      users/
      catalogos/
      estructura-organica/
      rat/
      actividades/
      actividad-versiones/
      actividad-activos/
      activos/
      mtge/
      riesgos/
      eipd/
      audit/
      alertas/
      prisma/
  frontend/
    Dockerfile
    vite.config.ts
    src/
      main.tsx
      App.tsx
      router/AppRouter.tsx
      layouts/MainLayout.tsx
      services/api-client.ts
      lib/query-client.ts
      components/
      features/
        auth/
        dashboard/
        activities-page/
        rat/
        assets/
        catalogs/
        organization/
        eipd/
        audit/
        users/
        modules/
      styles.css
  docker/nginx/frontend.conf
  deploy/backend/                  # scripts y ejemplos para backend en servidor Linux
  docs/                            # arquitectura, manuales y este reporte
```

Core funcional:

- `backend/src/rat`, `actividades`, `actividad-versiones`: nucleo RAT/Actividad/versionamiento.
- `backend/src/activos`: inventario y calculo de valor/impacto.
- `frontend/src/features/rat/RatCreatePage.tsx`: flujo principal de alta/edicion/duplicacion de tratamientos.
- `frontend/src/features/activities-page/ActivitiesPage.tsx`: bandeja matriz, PDF, mapa/grafo.
- `frontend/src/features/assets/AssetsPage.tsx`: inventario real de activos con CRUD y KPIs.

Infraestructura:

- Dockerfiles, compose, Nginx, deploy scripts.
- Prisma migrations, seed, importadores.

Desacoplable:

- `ExecutiveKpiGrid`, `TableScrollFrame`, `SearchableSelect`, `ActivityRelationshipGraph`.
- `AuthorizationScopeService` podria evolucionar a policy engine.

Experimental/hibrido:

- `rat-registry-data.ts` y `registry-workspace.ts`: simulan persistencia RAT/Actividad en frontend.
- `organization-structure-data.ts`: conserva localStorage para parte de estructura.
- `ModulePage.tsx`: placeholders para MTGE/Riesgos/Reportes.

---

## 3. Real Architecture Reconstruction

Arquitectura real aplicada:

```text
Browser
  -> React Router
  -> RequireAuth
  -> MainLayout
  -> Feature Page
  -> TanStack Query / local state / localStorage
  -> Axios apiClient
  -> /api/*
  -> NestJS Controller
  -> JwtAuthGuard
  -> CurrentUser decorator
  -> Service
  -> AuthorizationScopeService
  -> PrismaService
  -> PostgreSQL
```

Patrones implementados:

- Modular monolith en backend NestJS.
- Service layer con Prisma directo; no hay repositorios separados.
- DTOs con `class-validator` y `ValidationPipe` global (`whitelist`, `transform`, `forbidNonWhitelisted`).
- Transacciones Prisma para operaciones con auditoria.
- RBAC/ABAC centralizado parcialmente en `AuthorizationScopeService`.
- Frontend SPA CSR con React Router, Zustand para auth, TanStack Query para datos API.
- UI basada en componentes reutilizables, estilos globales CSS y tokens CSS.

Lifecycle de request backend:

```text
HTTP /api/activos
  -> Controller @UseGuards(JwtAuthGuard)
  -> Passport JWT extrae Bearer token
  -> JwtStrategy valida usuario activo contra DB
  -> CurrentUser inyecta actor
  -> Service compone where Prisma con authz.activoWhere(actor)
  -> Prisma consulta
  -> respuesta { data }
```

Lifecycle de datos de Nuevo Tratamiento actual:

```text
RatCreatePage
  -> carga dependencias, subdirecciones, catalogos, activos reales
  -> aplica scope del Operador
  -> genera codigo RAT/ACT por sigla de dependencia
  -> usuario llena wizard
  -> guarda en registry-workspace/localStorage
  -> ActivitiesPage lee dataset base + workspace local
```

Inconsistencias:

- Backend tiene endpoints reales para RAT/Actividades, pero `RatCreatePage` aun no persiste de forma completa en ellos.
- `ActividadVersion` backend no almacena todos los campos ricos del wizard (titulares detallados, terceros, activo electronico visible, etc.).
- Frontend y backend tienen RBAC duplicado: backend es autoridad, frontend solo UX.
- Migracion inicial SQL esta desfasada con `schema.prisma` actual (enum RoleCode y ActivoInformacion expandido). La fuente real debe ser `schema.prisma` + migraciones futuras; hay riesgo si no se generan nuevas migraciones.

Anti-patterns/deuda:

- Grandes componentes monoliticos (`RatCreatePage`, `AssetsPage`, `DashboardPage`, `styles.css`).
- Persistencia localStorage para datos core.
- Una sola migracion inicial mientras el schema evoluciono.
- Secretos locales presentes en archivos `.env` no example.
- Sin tests unitarios reales para reglas criticas RBAC/ABAC/workflow.

---

## 4. Backend Deep Analysis

### Bootstrap

`backend/src/main.ts`:

- Habilita CORS con `CORS_ORIGIN` separado por comas.
- Prefijo global `/api`.
- `ValidationPipe` global:
  - `whitelist: true`
  - `transform: true`
  - `forbidNonWhitelisted: true`

No hay interceptores globales, filtros de excepcion personalizados, rate limiting, Helmet ni logging estructurado.

### AppModule

Importa:

- ConfigModule global.
- PrismaModule, AuditModule, AuthModule.
- Users, Catalogos, EstructuraOrganica.
- Rat, Actividades, ActividadVersiones, ActividadActivos.
- Riesgos, Eipd, Activos.

`AlertasModule` existe pero no esta importado en `AppModule`; por tanto sus endpoints no estan activos.

### Auth

Endpoints:

- `POST /api/auth/login`
- `GET /api/auth/me`

Flujo:

- Login busca `User` por username.
- Rechaza usuario inexistente o inactivo.
- Compara password con bcrypt.
- Firma JWT con `sub`, `username`, `role`.
- Retorna `{ data: { accessToken, user } }`.

JWT:

- `passport-jwt`.
- Secret desde `JWT_SECRET`, fallback inseguro `change_me`.
- Expiracion configurada en AuthModule (revisar si usa `JWT_EXPIRES_IN`; por comportamiento login genera token con vencimiento observado).
- `JwtStrategy.validate` vuelve a consultar DB y exige usuario activo.

Riesgos:

- JWT en localStorage frontend: riesgo XSS.
- No hay refresh token.
- No hay revocacion por token.
- No hay rate limit de login.

### AuthorizationScopeService

Es el componente de seguridad mas importante.

Roles agrupados:

- Tecnicos: `ADMIN`, `ADMIN_TECNICO`.
- Funcionales: `ADMIN_FUNCIONAL`.
- Revisores: `REVISOR`, `APROBADOR_FUNCIONAL`, `REVISOR_PROTECCION_DATOS`, `REVISOR_SEGURIDAD`.
- Autores: `OPERADOR`, `EDITOR_OPERATIVO`, `RESPONSABLE_SUBDIRECCION`, `RESPONSABLE_DEPENDENCIA`.
- Global read: tecnico, funcional, revisores, auditor.
- Admin usuarios: tecnico.
- Admin catalogos/organizacion: tecnico y funcional.
- Gestion activos: revisores y admin funcional.
- Creacion activos: operadores y roles operativos.

ABAC:

- `ratWhere(actor)`: global retorna `{}`, operador filtra por `dependenciaId` y opcional `subdireccionId`.
- `actividadWhere(actor)`: filtra via `rat`.
- `activoWhere(actor)`: filtra por `dependenciaId`.
- `assertCanUseDependencia`, `resolveDependenciaIdForWrite`, `assertCanUseSubdireccion`.

Regla critica: un usuario no global debe tener `dependenciaId`; si no, falla con Forbidden/Unprocessable.

### Audit

Endpoints:

- `GET /api/audit-logs`
- `GET /api/audit-logs/:id`

Solo roles `ADMIN`, `ADMIN_TECNICO`, `ADMIN_FUNCIONAL`, `AUDITOR`.

`AuditService.log` escribe:

- modulo, entidad, accion, actor, actorRole.
- entidadId.
- detalleAntes/detalleDespues JSON.
- metadata.

Patron: los servicios con transacciones llaman `audit.log(tx, payload)` para atomicidad.

### RAT

Endpoints:

- `GET /api/rats`
- `GET /api/rats/:id`
- `POST /api/rats`

Reglas:

- Consultas aplican `ratWhere(actor)`.
- Crear exige `assertCanAuthorTreatment`.
- Dependencia se resuelve desde actor si rol scoped y DTO no trae dependencia (`fallbackToActor`).
- Subdireccion debe pertenecer a dependencia.
- Codigo RAT debe iniciar con `RAT-{SIGLA}`.
- Codigo RAT unico.
- Al crear RAT crea `RatVersion` inicial `1.0` en `BORRADOR`.
- Audita CREATE.

Riesgo: no hay update/archive de RAT en controller actual, aunque DTOs existen.

### Actividades

Endpoints:

- `GET /api/actividades`
- `GET /api/actividades/:id`
- `POST /api/rats/:ratId/actividades`
- `PATCH /api/actividades/:id`
- `PATCH /api/actividades/:id/archive`
- `GET /api/actividades/:id/versiones`
- `GET /api/actividades/:id/detail`

Reglas:

- Consultas aplican `actividadWhere(actor)`.
- Crear exige rol autor.
- Codigo actividad debe iniciar con `ACT-{SIGLA}-`.
- Unicidad por RAT: `@@unique([ratId,codigo])`.
- Crear actividad crea `ActividadVersion` inicial `1.0` en `BORRADOR`.
- Update de solo estado exige `assertCanManageContentStates` (revisor); update de contenido exige autor.
- Archive exige admin workflow tecnico.

### ActividadVersiones

Endpoints:

- `POST /api/actividades/:actividadId/versiones`
- `GET /api/actividad-versiones/:id`
- `GET /api/actividad-versiones/:id/full`
- `GET /api/actividad-versiones/:id/observaciones`
- `PATCH /api/actividad-versiones/:id`
- `POST /api/actividad-versiones/:id/submit-review`
- `POST /api/actividad-versiones/:id/observe`
- `POST /api/actividad-versiones/:id/subsanar`
- `POST /api/actividad-versiones/:id/approve`
- `POST /api/actividad-versiones/:id/set-current`
- `POST /api/actividad-versiones/:id/archive`

Workflow real:

```text
BORRADOR
  -> submit-review -> EN_REVISION
EN_REVISION
  -> observe -> OBSERVADA
  -> approve -> APROBADA
OBSERVADA
  -> subsanar -> SUBSANADA
SUBSANADA
  -> submit-review -> EN_REVISION
APROBADA
  -> set-current -> VIGENTE
VIGENTE
  -> archive -> ARCHIVADA (solo admin workflow)
```

Validaciones para enviar a revision:

- finalidad completa.
- baseLicitudId completa.
- plazoConservacion completo.
- MTGE calculado.

Restriccion: versiones `VIGENTE` no editables.

### ActividadActivos

Endpoints:

- `GET /api/actividad-versiones/:actividadVersionId/activos`
- `POST /api/actividad-versiones/:actividadVersionId/activos`
- `DELETE /api/actividad-versiones/:actividadVersionId/activos/:activoId`

Reglas inferidas:

- Relaciona `ActividadVersion` con `ActivoInformacion`.
- Aplica scope tanto de actividad como activo.
- Evita duplicado por constraint `@@unique([actividadVersionId, activoId])`.
- Debe ser punto clave para mapa Actividad-Activo.

### Activos

Endpoints:

- `GET /api/activos`
- `GET /api/activos/:id`
- `POST /api/activos`
- `PATCH /api/activos/:id`
- `PATCH /api/activos/:id/disable`
- `DELETE /api/activos/:id` (baja logica)
- `GET /api/activos/:id/actividad-versiones`

Reglas:

- Scoping por dependencia en lectura y escritura.
- Crear activos: `assertCanAuthorAssets` (incluye Operador).
- Editar/deshabilitar: `assertCanManageAssets` (Revisor/Admin Funcional).
- Baja logica: `activo=false`.
- Codigo unico.
- Activo no puede referenciarse a si mismo como padre.
- Activo padre debe existir y respetar dependencia.
- Catalog IDs se validan.
- `fuentesUsuarios` se normaliza como tabla hija; update reemplaza lista completa si viene en DTO.
- Valor del activo se calcula con `ParametroSistema`:
  - `ACTIVOS / VALOR_ACTIVO_CONFIG`
  - `ACTIVOS / IMPACTO_RANGOS`
- Impacto se resuelve al catalogo `IMPACTO_ACTIVO` por codigo.

Calculo:

```text
valorActivo = (C*wC + I*wI + D*wD) / divisor
impactoCodigo = primer rango donde valorActivo <= limiteSuperior
```

### Catalogos

Endpoints:

- `GET /api/catalogos`
- `POST /api/catalogos`
- `PATCH /api/catalogos/:id`

GET requiere JWT pero no valida rol especifico. Crear/editar exige admin catalogos.

Normaliza:

- dominio/tipo/codigo a mayusculas sin tildes, no alfanumerico -> `_`.
- Unico por `(tipo,codigo)`, no incluye dominio.

Dominios activos:

- `GENERAL`
- `TRATAMIENTOS`
- `ACTIVOS`

Riesgo: constraint ignora `dominio`; un mismo tipo/codigo no puede repetirse entre dominios.

### Estructura Organica

Endpoints dependencias:

- `GET /api/dependencias`
- `GET /api/dependencias/:id`
- `POST /api/dependencias`
- `PATCH /api/dependencias/:id`
- `GET /api/dependencias/:id/subdirecciones`
- `GET /api/dependencias/:id/rats`

Endpoints subdirecciones:

- `GET /api/subdirecciones`
- `GET /api/subdirecciones/:id`
- `POST /api/subdirecciones`
- `PATCH /api/subdirecciones/:id`
- `GET /api/subdirecciones/:id/rats`

Reglas:

- Usuarios no globales solo ven su dependencia/subdirecciones.
- Crear/editar depende de `assertCanAdministerOrganization`.
- `activo` permite habilitar/deshabilitar logicamente.

Nota: existen controladores singulares `dependencia.controller.ts` y `subdireccion.controller.ts` probablemente legacy/no importados o conflictivos; revisar antes de tocar.

### MTGE

Endpoints:

- `GET /api/actividad-versiones/:actividadVersionId/mtge`
- `POST /api/actividad-versiones/:actividadVersionId/mtge/calculate`
- `DELETE /api/actividad-versiones/:actividadVersionId/mtge`

Reglas:

- Calculable solo por autor y version editable.
- `puntajeTotal = volumenTitulares + variedadCategorias + duracionTratamiento + alcanceGeografico`.
- Gran escala si `puntajeTotal >= 12`.
- Actualiza `ActividadVersion.puntajeMtge`, `esGranEscala`, `requiereEipd`.
- `requiereEipd = granEscala || existe riesgo alto/critico`.

### Riesgos

Endpoints:

- `GET /api/actividad-versiones/:actividadVersionId/riesgos`
- `POST /api/actividad-versiones/:actividadVersionId/riesgos`
- `GET /api/riesgos/:id`
- `PATCH /api/riesgos/:id`
- `DELETE /api/riesgos/:id`

Reglas:

- Nivel riesgo = `probabilidad * impacto`:
  - `>=17` Critico
  - `>=10` Alto
  - `>=5` Medio
  - resto Bajo
- Estados de aprobacion (`APROBADO`, `OBSERVADO`, `DEVUELTO`, etc.) requieren aprobador/revisor.
- Otros cambios requieren `assertCanUpdateAssessments` (revisor).
- Al crear/editar/eliminar sincroniza `requiereEipd`.

### EIPD

Endpoints:

- `GET /api/actividad-versiones/:actividadVersionId/eipd`
- `POST /api/actividad-versiones/:actividadVersionId/eipd`
- `GET /api/eipd/:id`
- `PATCH /api/eipd/:id`
- `DELETE /api/eipd/:id`

Reglas:

- Una EIPD por `ActividadVersion` (`actividadVersionId` unique).
- Crear EIPD fuerza `ActividadVersion.requiereEipd=true`.
- Estados de aprobacion/rechazo/devolucion requieren aprobador.
- Otros cambios requieren revisor/evaluador.
- Al eliminar recalcula `requiereEipd` con MTGE y riesgos.

### Users

Endpoints:

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PATCH /api/users/:id`

Solo Admin Tecnico.

Reglas:

- Roles scoped (`OPERADOR`, `EDITOR_OPERATIVO`, `RESPONSABLE_DEPENDENCIA`, `RESPONSABLE_SUBDIRECCION`) requieren dependencia.
- Subdireccion asignada debe pertenecer a dependencia.
- No se permite al admin tecnico desactivarse a si mismo ni remover su propio rol tecnico.
- Password bcrypt 10.
- Respuesta nunca expone passwordHash.

---

## 5. Frontend Deep Analysis

Arquitectura:

- SPA React 18, Vite, TypeScript.
- CSR puro; no SSR.
- `main.tsx` monta `QueryClientProvider` y `App`.
- `App` hidrata sesion desde localStorage y monta `BrowserRouter`.
- `AppRouter` define rutas protegidas.
- `MainLayout` provee sidebar, responsive mobile topbar y logout.

Rutas reales:

- `/login`
- `/dashboard`
- `/actividades`
- `/actividades/nuevo`
- `/activos`
- `/eipd`
- `/rats` -> ActivitiesPage
- `/rats/new` -> RatCreatePage
- `/estructura-organica`
- `/usuarios`
- `/audit`
- `/catalogos`
- `/catalogos/activos`
- `/mtge`, `/riesgos`, `/reportes` como `ModulePage` placeholders.

Autenticacion frontend:

- Zustand store `auth-store`.
- Session en localStorage key `rat_dnsipd_auth`.
- Axios interceptor agrega `Authorization: Bearer`.
- `RequireAuth` redirige a `/login` si no hay token.
- No valida expiracion localmente; si token expira, APIs fallan pero no hay interceptor 401 global para logout.

Permisos frontend:

- `permissions.ts` replica capacidades por rol.
- Es para UX, no autoridad.
- `ModuleAccessGate` bloquea rutas segun rol.
- `dependency-scope.ts` restringe Operador por dependencia asignada usando dependenciaId y sigla/codigo.

Layout:

- Sidebar blanco, colapsable, persistido en localStorage key `rat_dnsipd_sidebar_collapsed`.
- Menu visible segun permisos.
- Logout/cambiar usuario limpia sesion local.

API strategy:

- `apiClient` baseURL `VITE_API_BASE_URL` (default `/api`).
- Vite proxy `/api` a backend.
- TanStack Query sin configuracion global especial (no retry/staleTime central).

Componentes reutilizables:

- `ExecutiveKpiGrid`: KPIs con tonos y enlaces.
- `TableScrollFrame`: scroll horizontal sincronizado.
- `AppIcon`: wrapper de iconos lucide.
- `SearchableSelect`: combobox custom para wizard.
- `ReportPreviewModal` y `TreatmentReportPreview`: PDF/print institucional.
- `ActivityRelationshipGraph`: grafo ReactFlow actividad-activo.

Pantallas:

### LoginPage

- Login real contra `/auth/login`.
- Incluye botones de usuarios demo:
  - admin / Admin1234*
  - operador.dsgsif / Operador1234*
  - revisor / Revisor1234*
  - admin.funcional / Funcional1234*

### DashboardPage

- Hibrido:
  - Consulta `/dependencias`, `/activos`, `/users` segun permisos.
  - Usa tambien `rat-registry-data.ts`/workspace para actividades.
- KPIs role-aware:
  - Operador ve alcance de su dependencia.
  - Roles globales ven transversal.
  - Admin tecnico enfocado en usuarios/activos criticos/configuracion.
- Links a `/actividades`, `/actividades/nuevo`, `/activos`, `/usuarios`, etc.

### ActivitiesPage

- Matriz operativa central.
- Consulta dependencias para scoping.
- Actividades vienen de `getRatRegistryRecords()` + `registry-workspace.ts`.
- Filtros: busqueda, dependencia, estado, riesgo, EIPD.
- Acciones:
  - vista previa PDF por actividad.
  - mapa/grafo.
  - editar/duplicar (semilla localStorage para RatCreatePage).
  - cambio de estado local.
- PDF ya se genera con plantilla aislada mediante `TreatmentReportPreview` y `printReportPreviewDocument`, no con impresion de pantalla completa.

### RatCreatePage

Wizard principal. Consume backend real para:

- dependencias activas.
- subdirecciones por dependencia.
- catalogos del dominio `TRATAMIENTOS`.
- activos filtrados por dependencia.

Persistencia actual:

- No crea RAT/Actividad/Version backend real.
- Construye `RatRegistryRecord` local y lo guarda en `registry-workspace`.

Estructura de pasos actual:

1. Identificacion.
2. Finalidad y base de licitud.
3. Titulares y datos personales.
4. Operacion del tratamiento.
5. Terceros y transferencias.
6. Conservacion.
7. Medidas de seguridad.
8. Activos asociados.
9. Riesgo y EIPD.

Reglas UX:

- Operador queda bloqueado a su dependencia.
- Codigo RAT se genera `RAT-{SIGLA}-{year}`.
- Activo electronico se elige desde inventario real y autocompleta tipo.
- Paso 3 desagrega titulares, categorias, campos y justificacion para alimentar riesgos/EIPD.
- Wizard tiene progreso, estado borrador/en revision y accion guardar borrador.

### AssetsPage

- Consume `/activos`, `/activos/:id`, `/dependencias`, `/catalogos`.
- CRUD real para activos.
- Roles:
  - Operador: puede crear, no editar.
  - Revisor/Admin Funcional: pueden editar y dar baja.
  - Admin Tecnico: lectura/configuracion, no gestion funcional de activos.
- Confirmacion antes de guardar.
- Feedback success/error.
- KPIs de impacto y distribucion Top 5 dependencias; para Operador se oculta/reduce redundancia cuando solo ve su dependencia.

### CatalogsPage / AssetCatalogsPage

- CRUD real de catalogos via `/catalogos`.
- Separacion dominio sistema/tratamientos y activos.

### OrganizationStructurePage

- Mezcla backend real y local data.
- Riesgo: cambios pueden no persistir completamente si van por helpers localStorage.

### EipdPage

- Usa dependencias backend para scoping y workspace local para expedientes EIPD.
- No esta completamente integrada al backend `EipdService`.

### UsersPage

- CRUD real contra `/users`.
- Solo visible para Admin Tecnico.

Patrones UI:

- Fondo blanco predominante.
- CSS global centralizado en `styles.css`.
- Badges/status pills semanticos.
- KPI cards con tonos semanticamente relacionados.
- Modales con confirmacion/feedback.

Riesgos frontend:

- `styles.css` muy grande, alto acoplamiento visual.
- `RatCreatePage` y `AssetsPage` son componentes demasiado grandes.
- Duplicacion de permisos frontend/backend.
- Uso intensivo de localStorage para datos core.
- No hay error boundary global.
- No hay interceptor 401 para limpiar sesion.

---

## 6. Database Reverse Engineering

Motor: PostgreSQL. ORM: Prisma 5.22.

Fuente actual de modelo: `backend/prisma/schema.prisma`.

Entidades:

### User

Usuario autenticable. Campos: nombre, email unique, username unique, passwordHash, role enum, activo, dependenciaId, subdireccionId. Relaciona a OrgDependencia/OrgSubdireccion.

Regla: usuarios scoped deben tener dependencia. Admin tecnico administra usuarios.

### Catalogo

Tabla maestra transversal. Campos: dominio, tipo, codigo, nombre, descripcion, activo. Unique `(tipo,codigo)`. Referenciada por ActividadVersion.baseLicitud y multiples dimensiones de ActivoInformacion.

### ParametroSistema

Configuracion parametrizable por modulo/clave. Unique `(modulo,clave)`. Usada por activos para valor/impacto.

Claves activas:

- `ACTIVOS / VALOR_ACTIVO_CONFIG`
- `ACTIVOS / IMPACTO_RANGOS`

### OrgTipoProceso

Agrupa dependencias por tipo de proceso.

### OrgDependencia

Entidad organizacional principal. Reglas del negocio usan "Dependencia" como termino transversal. Relaciona subdirecciones, RAT, usuarios, activos.

### OrgSubdireccion

Dependencia ejecutora/subunidad hija de dependencia. Puede asignarse a usuarios y RAT.

### Rat

Cabecera formal. Unique codigo. Pertenece a dependencia/subdireccion. Tiene versiones y actividades.

### RatVersion

Version formal del RAT. Unique `(ratId,numeroVersion)`.

### ActividadTratamiento

Unidad operativa del tratamiento. Pertenece a RAT. Unique `(ratId,codigo)`.

### ActividadVersion

Version de actividad. Contiene finalidad, base licitud, plazo, flags MTGE/EIPD, estadoVersion. Relaciona activos, mtge, riesgos, eipd, observaciones.

Estados usados: `BORRADOR`, `EN_REVISION`, `OBSERVADA`, `SUBSANADA`, `APROBADA`, `VIGENTE`, `REEMPLAZADA`, `ARCHIVADA`.

### ActivoInformacion

Inventario ampliado. Campos de dependencia fuente, clasificacion, nivel, ambiente, datos personales, visibilidad internet, fuente, baja, propiedad intelectual, CIA, valorActivo, impacto, propietario, custodio, procesos, ubicacion, controles.

Relaciones:

- dependencia.
- activo padre/hijos.
- multiples catalogos.
- fuentesUsuarios.
- actividadVersiones via ActividadActivo.

### ActivoFuenteUsuario

Tabla hija para cardinalidad variable de "Nombre del usuario (Fuente)". Unique `(activoId,nombre)`. Cascade on delete.

### ActividadActivo

Join table entre ActividadVersion y ActivoInformacion. Unique `(actividadVersionId,activoId)`.

### MtgeEvaluacion

Uno a uno con ActividadVersion. Guarda puntaje y dimensiones MTGE.

### RiesgoEvaluacion

Muchos por ActividadVersion. Guarda probabilidad, impacto, residual, nivel y estado.

### Eipd

Uno a uno con ActividadVersion. Unique codigo y actividadVersionId.

### RevisionObservacion

Observaciones de revisor para flujo de devolucion/subsanacion.

### AuditLog

Trazabilidad transversal JSON antes/despues.

Diagrama textual:

```text
OrgTipoProceso 1--N OrgDependencia
OrgDependencia 1--N OrgSubdireccion
OrgDependencia 1--N Rat
OrgSubdireccion 1--N Rat
Rat 1--N RatVersion
Rat 1--N ActividadTratamiento
ActividadTratamiento 1--N ActividadVersion
ActividadVersion N--N ActivoInformacion via ActividadActivo
ActividadVersion 1--1 MtgeEvaluacion
ActividadVersion 1--N RiesgoEvaluacion
ActividadVersion 1--1 Eipd
ActividadVersion 1--N RevisionObservacion
OrgDependencia 1--N ActivoInformacion
ActivoInformacion 1--N ActivoFuenteUsuario
Catalogo 1--N ActivoInformacion dimensions
Catalogo 1--N ActividadVersion.baseLicitud
User N--1 OrgDependencia
User N--1 OrgSubdireccion
AuditLog standalone
```

Migraciones:

- Solo se observo `20260425061754_init`.
- Riesgo alto: migracion SQL inicial no refleja por completo el `schema.prisma` actual (enum RoleCode y ActivoInformacion ampliado). Antes de desplegar en un entorno nuevo se debe generar/aplicar migraciones actualizadas o validar que DB destino ya fue evolucionada manualmente.

Seed:

- Lee `iess-estructura-organica.base.json`.
- Inserta tipos de proceso, dependencias y subdirecciones.
- Normaliza siglas conocidas: DNAC, DSGSIF, DNTI, etc.
- Inserta catalogos por dominios.
- Inserta parametros de activos.
- Inserta usuarios seed:
  - `admin` ADMIN_TECNICO.
  - `operador.dsgsif`, `operador.dnac`, `operador.dnti` OPERADOR con dependencia.
  - `revisor` REVISOR.
  - `aprobador.funcional` APROBADOR_FUNCIONAL.
  - `revisor.seguridad` REVISOR_SEGURIDAD.
  - `admin.funcional` ADMIN_FUNCIONAL.

Importacion activos:

- `import-activos.ts` y `normalize-activos-text.ts` soportan carga/limpieza de matriz Excel.
- El sistema espera activos ya importados; historicamente se reportaron 138/139 activos.

---

## 7. Infrastructure & DevOps

Scripts raiz:

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`
- `npm run docker:dev`
- `npm run docker:dev:detached`
- `npm run docker:dev:migrate`
- `npm run docker:dev:seed`
- `npm run docker:prod`
- `npm run docker:prod:migrate`

Dev Docker:

`docker-compose.yml`:

- `postgres`: postgres:16-alpine, volume `rat_postgres_data`, port 5432.
- `backend`: target development, port 3000, volume `./backend:/app/backend`, depends postgres healthy.
- `frontend`: target development, port 5173, proxy a backend.
- `migrator`: profile tools.
- `seed`: profile tools.

Prod Docker:

`compose.prod.yml`:

- No incluye PostgreSQL. `DATABASE_URL` debe apuntar a DB externa.
- Backend read_only, tmpfs `/tmp`, no-new-privileges, expose 3000.
- Frontend Nginx read_only, tmpfs cache/run/tmp, port configurable 8080.
- Nginx hace proxy `/api/` hacia `backend:3000/api/`.
- Migrator/seed como perfiles.

Dockerfiles:

- Backend multi-stage node:22-alpine.
- Prisma generate en build.
- Production corre `node backend/dist/src/main.js` con usuario no root.
- Frontend build Vite y sirve con Nginx 1.27-alpine.

Deploy backend standalone:

`deploy/backend/` contiene scripts para AlmaLinux/PostgreSQL/Nginx/systemd/backups.

Resiliencia actual:

- Docker `restart: unless-stopped`.
- Healthchecks backend/frontend/postgres dev.
- Nginx health endpoint.
- No hay replicas, load balancing ni colas.
- No hay migracion automatica al arranque por defecto; se ejecuta migrator separado.
- Backups productivos existen como scripts en deploy, no como servicio compose.

Orden recomendado dev:

```powershell
cd E:\developement\rat_dnsipd
npm install
docker compose --env-file .env.dev -f docker-compose.yml up -d postgres
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:migrate
npm --workspace backend run prisma:seed
npm --workspace backend run start:dev
npm --workspace frontend run dev -- --force
```

Orden recomendado docker dev:

```powershell
docker compose --env-file .env.dev -f docker-compose.yml up -d --build
docker compose --env-file .env.dev -f docker-compose.yml --profile tools run --rm migrator
docker compose --env-file .env.dev -f docker-compose.yml --profile tools run --rm seed
```

---

## 8. Security Audit

Fortalezas:

- JWT requerido en endpoints funcionales.
- `ValidationPipe` estricto.
- Passwords bcrypt.
- Backend aplica scoping por dependencia en consultas criticas.
- Backend revalida usuario activo en cada request JWT.
- Nginx incluye headers basicos: X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.
- Docker prod corre no root/read_only/no-new-privileges.
- Auditoria de cambios importantes.

Riesgos/vulnerabilidades:

Critico:

- Archivos `.env` reales en repo local pueden contener secretos. No deben versionarse ni transferirse sin saneamiento.
- Migraciones no sincronizadas con schema actual pueden romper despliegue o generar DB incompleta.

Alto:

- JWT en localStorage expuesto a XSS.
- No hay rate limiting en login/API.
- No hay Helmet en NestJS.
- No hay interceptor 401 frontend para logout controlado.
- RBAC frontend/backend duplicado; drift posible.
- Algunas pantallas core aun usan localStorage/datasets, lo que permite inconsistencias funcionales y ausencia de auditoria.

Medio:

- Catalogos GET requiere JWT pero no ABAC; probablemente correcto como maestro transversal, pero debe validarse con clasificacion de catalogos.
- CORS usa lista env; si env prod queda vacio, CORS origin false bloquea navegador, o mala configuracion rompe app.
- No hay CSRF porque usa Bearer, pero localStorage + XSS sigue siendo riesgo.
- No hay sanitizacion especial HTML; React escapa por defecto, pero `document.write` en PDF imprime markup interno. Evitar contenido no confiable sin escape.

Bajo:

- Favicon 404 en dev.
- No hay observabilidad estructurada.

Recomendaciones:

- Mover JWT a cookie HttpOnly SameSite si viable.
- Agregar Helmet y rate limiter.
- Agregar interceptor Axios para 401.
- Agregar tests RBAC/ABAC por rol.
- Sanitizar/escapar cualquier markup usado para impresion.
- Mantener `.env.example`; excluir `.env*` reales salvo examples.

---

## 9. Business Logic Extraction

Reglas fundamentales:

- "Dependencia" es termino transversal. Evitar "Unidad" como etiqueta de negocio salvo "Dependencia ejecutora".
- Operador solo ve y gestiona informacion de su dependencia asignada.
- Roles transversales (Revisor/Admin Funcional/Admin Tecnico segun caso) ven alcance institucional.
- RAT debe iniciar con `RAT-{SIGLA}` de la dependencia.
- Actividad debe iniciar con `ACT-{SIGLA}-`.
- Activos se filtran por dependencia para operador.
- Tipo de activo viene de catalogo/inventario, no texto libre.
- Baja de activos es logica (`activo=false`), no borrado fisico.
- ActividadVersion vigente no se edita.
- Envio a revision requiere finalidad, base licitud, plazo y MTGE.
- Revisor observa/aprueba; Operador subsana.
- EIPD se activa por gran escala MTGE, riesgo alto/critico o EIPD existente.
- Valor activo/impacto no se hardcodea en UI; se parametriza en DB.

Roles funcionales reales:

- Operador: crea borradores de actividades/activos dentro de dependencia, consulta MTGE/EIPD/Riesgos segun alcance, no edita activos existentes.
- Revisor: transversal, revisa/observa/aprueba, actualiza riesgos/EIPD, puede editar activos.
- Admin funcional: administra catalogos/estructura/auditoria/reportes, puede editar activos, no administra usuarios.
- Admin tecnico: administra usuarios/seguridad/configuracion; no deberia operar gestion funcional salvo lectura.

Workflows:

```text
Operador crea RAT/Actividad/Version
  -> Borrador
  -> calcula MTGE
  -> envia a revision
Revisor revisa
  -> Observada: comentario al operador
  -> Aprobada
  -> Vigente
```

---

## 10. API Contract Documentation

Formato comun:

- Exito: `{ data: ... }`.
- Listas: `{ data: [...] }`, a veces con `filters`.
- Auth: `Authorization: Bearer <accessToken>`.
- Base path: `/api`.

Auth:

- `POST /auth/login`
  - body: `{ username, password }`
  - response: `{ data: { accessToken, user } }`
- `GET /auth/me`

Users:

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`

Catalogos:

- `GET /catalogos?dominio&tipo&activo&search`
- `POST /catalogos`
- `PATCH /catalogos/:id`

Estructura:

- `GET /dependencias?tipoProcesoId&activo&search`
- `GET /dependencias/:id`
- `POST /dependencias`
- `PATCH /dependencias/:id`
- `GET /dependencias/:id/subdirecciones`
- `GET /dependencias/:id/rats`
- `GET /subdirecciones?dependenciaId&activo&search`
- `GET /subdirecciones/:id`
- `POST /subdirecciones`
- `PATCH /subdirecciones/:id`
- `GET /subdirecciones/:id/rats`
- `GET /tipo-proceso`

RAT/Actividades:

- `GET /rats`
- `GET /rats/:id`
- `POST /rats`
- `GET /actividades`
- `GET /actividades/:id`
- `POST /rats/:ratId/actividades`
- `PATCH /actividades/:id`
- `PATCH /actividades/:id/archive`
- `GET /actividades/:id/versiones`
- `GET /actividades/:id/detail`

Versiones:

- `POST /actividades/:actividadId/versiones`
- `GET /actividad-versiones/:id`
- `GET /actividad-versiones/:id/full`
- `GET /actividad-versiones/:id/observaciones`
- `PATCH /actividad-versiones/:id`
- `POST /actividad-versiones/:id/submit-review`
- `POST /actividad-versiones/:id/observe`
- `POST /actividad-versiones/:id/subsanar`
- `POST /actividad-versiones/:id/approve`
- `POST /actividad-versiones/:id/set-current`
- `POST /actividad-versiones/:id/archive`

Activos:

- `GET /activos?search&dependenciaId&tipoActivoId&impactoId&activo`
- `GET /activos/:id`
- `POST /activos`
- `PATCH /activos/:id`
- `PATCH /activos/:id/disable`
- `DELETE /activos/:id` (baja logica)
- `GET /activos/:id/actividad-versiones`

Actividad-Activos:

- `GET /actividad-versiones/:actividadVersionId/activos`
- `POST /actividad-versiones/:actividadVersionId/activos`
- `DELETE /actividad-versiones/:actividadVersionId/activos/:activoId`

MTGE:

- `GET /actividad-versiones/:actividadVersionId/mtge`
- `POST /actividad-versiones/:actividadVersionId/mtge/calculate`
- `DELETE /actividad-versiones/:actividadVersionId/mtge`

Riesgos:

- `GET /actividad-versiones/:actividadVersionId/riesgos`
- `POST /actividad-versiones/:actividadVersionId/riesgos`
- `GET /riesgos/:id`
- `PATCH /riesgos/:id`
- `DELETE /riesgos/:id`

EIPD:

- `GET /actividad-versiones/:actividadVersionId/eipd`
- `POST /actividad-versiones/:actividadVersionId/eipd`
- `GET /eipd/:id`
- `PATCH /eipd/:id`
- `DELETE /eipd/:id`

Audit:

- `GET /audit-logs`
- `GET /audit-logs/:id`

Errores:

- Nest defaults: 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 422 unprocessable.

---

## 11. Technical Debt & Risk Mapping

Critico:

- Migraciones Prisma desalineadas con schema actual.
- Core RAT/Actividad en frontend localStorage, no persistencia backend completa.
- Secretos reales potencialmente presentes en archivos `.env`.

Alto:

- Componentes frontend monoliticos.
- `styles.css` enorme y dificil de mantener.
- Falta de tests RBAC/ABAC/workflows.
- Doble fuente de verdad permisos frontend/backend.
- Produccion depende de DB externa, pero proceso de backup/restore no esta automatizado en compose.

Medio:

- No hay error boundary.
- No hay manejo global 401.
- No hay logging estructurado/observabilidad.
- `AlertasModule` existe pero no esta montado.
- Controladores singulares legacy en estructura organica pueden confundir.
- `frontend/src/AppRouter.tsx` parece archivo legacy paralelo a `router/AppRouter.tsx`.

Bajo:

- Chunk frontend grande.
- Favicon 404.
- Textos sin tildes por ASCII historico.

Refactors recomendados:

1. Generar migraciones reales desde schema actual.
2. Persistir `RatCreatePage` contra backend real.
3. Extraer `RatCreatePage` en hooks/componentes por paso.
4. Extraer `AssetsPage` en hooks y modal components.
5. Centralizar permissions en contrato compartido o endpoint `/auth/capabilities`.
6. Dividir CSS por dominios o CSS modules manteniendo tokens globales.
7. Agregar tests e2e/API para roles.

---

## 12. Current Development State

Completas o funcionales:

- Login JWT.
- Sidebar responsive con logout/cambio usuario.
- Usuarios Admin Tecnico.
- Catalogos backend real.
- Catalogos activos separados.
- Activos backend real con CRUD, baja logica, calculo valor/impacto.
- Dependencias/subdirecciones backend real.
- Auditoria backend real.
- PDF institucional por actividad aislado de la vista.
- Grafo actividad-activo con ReactFlow.
- Scoping operador en varias pantallas.
- Wizard Nuevo Tratamiento funcional en UI, con pasos unificados y desagregacion de datos personales.

Parciales:

- Nuevo Tratamiento no persiste completo en backend.
- Actividades/RAT mezclan dataset y localStorage con backend real.
- EIPD UI usa workspace local parcialmente.
- Riesgos/MTGE UI son placeholders o integracion parcial.
- Estructura Organica frontend mezcla local y backend.
- Dashboard usa mezcla API + dataset.

Experimentales:

- `registry-workspace.ts`.
- `organization-structure-data.ts`.
- `ModulePage` placeholders.
- `AlertasModule` no montado.

Hacks temporales:

- localStorage como persistencia de registros core.
- Usuarios demo en LoginPage.
- Generacion de PDF via `window.open/document.write/iframe`.

Estado Git:

- Rama `codex/wizard-ux-refresh` contiene commit `702baa3`.
- Push fallo previamente por SSH publickey; requiere configurar credenciales.

---

## 13. Claude Migration Context

Convenciones que Claude debe respetar:

- Trabajar solo en `E:\developement\rat_dnsipd`.
- No usar "Unidad" como termino de negocio; usar "Dependencia". "Dependencia ejecutora" es aceptado para subdireccion.
- Backend es autoridad de seguridad; frontend solo mejora UX.
- Mantener respuestas API en `{ data: ... }`.
- Mantener JWT Bearer hasta que se planifique migracion.
- Mantener baja logica para activos.
- No romper codificacion de RAT/Actividad:
  - `RAT-{SIGLA}-{YEAR}`
  - `ACT-{SIGLA}-...`
- No hardcodear calculo de valor/impacto en UI.
- No eliminar datasets locales hasta que el flujo persistente backend este completo y migrado.

Arquitectura que no debe romper:

- `AuthorizationScopeService` como punto central RBAC/ABAC backend.
- `AuditService.log` en transacciones de cambios.
- `PrismaService` como acceso DB.
- `apiClient` con base `/api`.
- `MainLayout` + `RequireAuth` + `ModuleAccessGate`.
- `ExecutiveKpiGrid`, `TableScrollFrame`, `SearchableSelect` como patrones reutilizables.

Modulos peligrosos:

- `RatCreatePage.tsx`: muy grande, alto acoplamiento de reglas.
- `rat-registry-data.ts`: contiene dataset base, reportes, trazabilidad; muchos consumidores.
- `registry-workspace.ts`: puente temporal localStorage.
- `AuthorizationScopeService`: cualquier cambio puede exponer datos entre dependencias.
- `schema.prisma`: cambios requieren migracion formal.
- `styles.css`: cambios globales pueden afectar todo.

Estrategia segura para continuar:

1. Congelar permisos actuales con tests.
2. Crear migracion Prisma actualizada para schema real.
3. Ampliar modelo backend para campos ricos del wizard:
   - titulares.
   - categorias/campos de datos personales.
   - terceros/transferencias.
   - activos asociados.
   - medidas de seguridad.
   - riesgo/EIPD preliminar.
4. Cambiar `RatCreatePage.handleSaveDraft` para llamar:
   - crear/obtener RAT.
   - crear ActividadTratamiento.
   - crear/actualizar ActividadVersion.
   - vincular ActividadActivo.
   - guardar detalle de datos personales.
5. Migrar `ActivitiesPage` a `/actividades` backend real.
6. Mantener `rat-registry-data.ts` como fallback/test fixture hasta completar migracion.
7. Integrar EIPD/Riesgos/MTGE UI a endpoints reales.
8. Eliminar localStorage core gradualmente.

Prioridades tecnicas:

Alta:

- Migraciones.
- Persistencia real Nuevo Tratamiento.
- Tests RBAC/ABAC.
- 401 interceptor y error boundary.

Media:

- Refactor frontend por componentes.
- Observabilidad/logging.
- Seguridad headers/rate limit.

Baja:

- Code splitting.
- Limpieza de archivos legacy.

Checklist antes de modificar:

- `npm run build`.
- Probar login con `operador.dsgsif`, `revisor`, `admin.funcional`, `admin`.
- Verificar que Operador solo vea su dependencia.
- Verificar que Admin Tecnico no pueda crear tratamiento funcional.
- Verificar que Revisor/Admin Funcional puedan editar activos.
- Verificar PDF desde Actividades no imprime navegacion/listado.

Fin del reporte.
