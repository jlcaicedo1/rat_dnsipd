# Manual tecnico, arquitectura, operacion y migracion

## 1. Objetivo

Este documento describe la arquitectura actual de `rat_dnsipd`, la forma
correcta de levantar el sistema, la configuracion por ambiente y el proceso
recomendado para migrar la aplicacion y la base de datos a otro servidor.

El proyecto activo y unico valido es:

```text
E:\developement\rat_dnsipd
```

## 2. Vision general del sistema

`rat_dnsipd` es un sistema institucional para gestionar:

- Actividades de tratamiento.
- RAT como documento formalizable.
- Activos de informacion.
- Catalogos.
- Estructura organica.
- Usuarios, RBAC y scoping por dependencia.
- MTGE, Riesgos, EIPD.
- Reportes y auditoria.

Stack principal:

- Frontend: React + Vite + TypeScript.
- Backend: NestJS + Prisma.
- Base de datos: PostgreSQL 16.
- Contenedores: Docker Compose por ambiente.

## 3. Arquitectura actual

La arquitectura se separo por ambiente.

### 3.1 Desarrollo local

En desarrollo Docker Compose levanta todo el entorno necesario:

```text
docker-compose.yml
  postgres   -> PostgreSQL local de desarrollo
  backend    -> API NestJS en modo desarrollo
  frontend   -> Vite React
  migrator   -> tarea manual para migraciones Prisma
  seed       -> tarea manual para datos base
```

Diagrama:

```mermaid
flowchart LR
    U["Usuario desarrollador"] --> F["Frontend Vite :5173"]
    F --> B["Backend NestJS :3000"]
    B --> P["PostgreSQL Docker :5432"]
    M["Migrator Prisma"] --> P
    S["Seed Prisma"] --> P
```

### 3.2 Produccion

En produccion la base de datos no vive dentro del Compose de la aplicacion.
PostgreSQL debe estar fuera del stack, ya sea en un servidor dedicado, servicio
administrado o instancia externa controlada.

```text
compose.prod.yml
  frontend   -> Nginx + build estatico React
  backend    -> API NestJS compilada
  migrator   -> tarea manual para migraciones Prisma
  seed       -> tarea manual y controlada

PostgreSQL -> externo al Compose
```

Diagrama:

```mermaid
flowchart LR
    U["Usuarios"] --> N["Nginx / Frontend"]
    N -->|/api| B["Backend NestJS"]
    B --> P["PostgreSQL externo"]
    M["Migrator Prisma"] --> P
    BK["Backups PostgreSQL"] --> P
```

## 4. Estructura relevante del repositorio

```text
docker-compose.yml
compose.prod.yml
.env.dev.example
.env.prod.example

backend/
  Dockerfile
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/

frontend/
  Dockerfile
  src/
  vite.config.ts

docker/
  nginx/
    frontend.conf

docs/
  arquitectura-docker-segura.md
  manual-tecnico-arquitectura-operacion-migracion.md
```

## 5. Configuracion por ambiente

### 5.1 Desarrollo local

Archivo real local:

```text
.env.dev
```

Basado en:

```text
.env.dev.example
```

Valores actuales de desarrollo:

```env
POSTGRES_DB=rat_db
POSTGRES_USER=dnsipd
POSTGRES_PASSWORD=dnsipd
POSTGRES_PORT=5432

DATABASE_URL=postgresql://dnsipd:dnsipd@postgres:5432/rat_db?schema=public

BACKEND_PORT=3000
FRONTEND_PORT=5173

JWT_SECRET=dnsipd_local_dev_secret
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

VITE_API_BASE_URL=/api
VITE_DEV_API_PROXY_TARGET=http://backend:3000
```

### 5.2 Produccion

Archivo real productivo:

```text
.env.prod
```

Basado en:

```text
.env.prod.example
```

Plantilla de produccion:

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://usuario:clave@host-db:5432/rat_db?schema=public&connection_limit=10&pool_timeout=20

JWT_SECRET=CAMBIAR_POR_UN_SECRETO_LARGO_ALEATORIO
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://dominio-del-sistema

FRONTEND_PORT=8080
VITE_API_BASE_URL=/api
NODE_OPTIONS=--max-old-space-size=768
```

Si PostgreSQL externo esta en el mismo host fisico donde corre Docker, puede
usarse:

```env
DATABASE_URL=postgresql://dnsipd:dnsipd@host.docker.internal:5432/rat_db?schema=public&connection_limit=10&pool_timeout=20
```

Para produccion real no se recomienda reutilizar la clave local `dnsipd` ni el
secreto `dnsipd_local_dev_secret`.

## 6. Levantamiento del sistema en desarrollo

### 6.1 Preparacion inicial

```powershell
cd E:\developement\rat_dnsipd
Copy-Item .env.dev.example .env.dev
```

Editar `.env.dev` si se requiere cambiar puertos o credenciales locales.

### 6.2 Levantar servicios

```powershell
npm run docker:dev
```

Modo segundo plano:

```powershell
npm run docker:dev:detached
```

### 6.3 Ejecutar migraciones

```powershell
npm run docker:dev:migrate
```

### 6.4 Ejecutar seed

```powershell
npm run docker:dev:seed
```

### 6.5 Validaciones

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:3000/api/health
```

Checklist:

- [ ] PostgreSQL esta saludable.
- [ ] Backend responde `/api/health`.
- [ ] Frontend carga.
- [ ] Login funciona.
- [ ] Dashboard carga segun rol.
- [ ] Activos, catalogos y estructura responden.

## 7. Levantamiento del sistema en produccion

### 7.1 Requisitos previos

- Docker instalado.
- Docker Compose disponible.
- PostgreSQL externo creado.
- Red habilitada desde backend hacia PostgreSQL.
- Usuario de base con permisos controlados.
- `.env.prod` creado y protegido.

### 7.2 Preparar variables

```powershell
cd E:\developement\rat_dnsipd
Copy-Item .env.prod.example .env.prod
```

Editar:

```text
DATABASE_URL
JWT_SECRET
CORS_ORIGIN
FRONTEND_PORT
```

### 7.3 Migrar estructura

```powershell
npm run docker:prod:migrate
```

Este comando ejecuta:

```text
prisma migrate deploy
```

No ejecuta seed ni modifica datos operativos fuera del esquema de migraciones.

### 7.4 Levantar aplicacion

```powershell
npm run docker:prod
```

Por defecto publica el frontend en:

```text
http://localhost:8080
```

### 7.5 Seed productivo

El seed productivo debe ejecutarse solo en instalacion inicial o ventana
controlada:

```powershell
docker compose --env-file .env.prod -f compose.prod.yml --profile seed run --rm seed
```

## 8. Seguridad aplicada

Medidas implementadas:

- Produccion no contiene PostgreSQL embebido en Compose.
- La base se define por `DATABASE_URL`.
- `JWT_SECRET` es obligatorio en produccion.
- CORS se controla por `CORS_ORIGIN`.
- Frontend productivo corre con Nginx, no con Vite.
- Backend productivo corre compilado.
- Contenedores productivos usan `read_only`.
- Se usan `tmpfs` para temporales.
- Se aplica `no-new-privileges`.
- Healthchecks en backend y frontend.
- Migraciones y seed son tareas manuales, no se ejecutan automaticamente al
  iniciar la aplicacion.

Medidas que debe garantizar la infraestructura:

- PostgreSQL no expuesto publicamente.
- Acceso a DB solo desde backend o red segura.
- Backups externos.
- Rotacion de secretos.
- Monitoreo de disco, conexiones, locks y errores.

## 9. Resiliencia y recuperacion ante fallos

### 9.1 Falla del backend

Compose tiene:

```text
restart: unless-stopped
healthcheck: /api/health
```

Si el proceso cae, Docker intenta reiniciarlo. Si no logra conectar a la base
externa, el contenedor puede seguir fallando hasta que la base vuelva a estar
disponible.

### 9.2 Falla del frontend

El contenedor Nginx tambien usa:

```text
restart: unless-stopped
healthcheck: /health
```

Al caer, Docker lo reinicia. Como sirve archivos estaticos, su recuperacion es
rapida.

### 9.3 Falla de PostgreSQL externo

La aplicacion depende criticamente de PostgreSQL. Si la base externa falla:

- El backend no podra operar transacciones.
- Frontend puede cargar, pero las pantallas con API fallaran.
- La recuperacion depende de la estrategia de la base externa.

Requisitos minimos de resiliencia para PostgreSQL:

- Backups automaticos.
- Retencion definida.
- Restore probado.
- Monitoreo de espacio y conexiones.
- Snapshots o replica si la criticidad lo exige.

### 9.4 Falla de migracion

Las migraciones son manuales y separadas. Si una migracion falla:

- No se levanta una version parcialmente migrada.
- Se revisa el error.
- Se corrige migracion o estado de base.
- Se reintenta `docker:prod:migrate`.

### 9.5 Falla de seed

El seed no bloquea el arranque normal porque no se ejecuta automaticamente. Si
falla, se corrige el dato base y se reintenta de forma controlada.

## 10. Migracion de datos a otro servidor

`seed.ts` no sustituye un backup. El seed solo reconstruye datos base. Para
migrar datos reales se requiere backup de PostgreSQL.

Resumen:

```text
Prisma migrations -> estructura
seed.ts           -> datos base
pg_dump/restore   -> datos reales
```

### 10.1 Generar backup en origen

Formato recomendado:

```powershell
pg_dump -h localhost -p 5432 -U dnsipd -d rat_db -Fc -f rat_db_backup.dump
```

Clave local actual:

```text
dnsipd
```

### 10.2 Preparar base en destino

En PostgreSQL destino:

```sql
CREATE USER dnsipd WITH PASSWORD 'dnsipd';
CREATE DATABASE rat_db OWNER dnsipd;
GRANT ALL PRIVILEGES ON DATABASE rat_db TO dnsipd;
```

En produccion real se recomienda usar una clave distinta y robusta.

### 10.3 Restaurar backup en destino

```powershell
pg_restore -h localhost -p 5432 -U dnsipd -d rat_db --clean --if-exists rat_db_backup.dump
```

### 10.4 Ejecutar migraciones despues del restore

```powershell
npm run docker:prod:migrate
```

### 10.5 Levantar aplicacion

```powershell
npm run docker:prod
```

### 10.6 Validaciones post migracion

- [ ] `/api/health` responde.
- [ ] Login funciona.
- [ ] Usuarios existen.
- [ ] Dependencias existen.
- [ ] Catalogos existen.
- [ ] Activos existen.
- [ ] Actividades/RAT existen.
- [ ] Conteos del dashboard son coherentes.
- [ ] Operador solo ve su dependencia.
- [ ] Revisor/Admin funcional ven alcance institucional.

## 11. Automatizacion recomendada de backup y restore

Aunque PostgreSQL este fuera del Compose, se recomienda automatizar herramientas
de operacion como servicios temporales:

```text
db-backup
db-restore
```

Estos servicios no levantan la base. Solo se conectan a la base externa y
ejecutan `pg_dump` o `pg_restore`.

Flujo recomendado futuro:

```powershell
docker compose --env-file .env.prod -f compose.prod.yml --profile backup run --rm db-backup
docker compose --env-file .env.prod -f compose.prod.yml --profile restore run --rm db-restore
```

Directorio sugerido para backups:

```text
/app/rat_dnsipd/backups/postgres
```

En Windows local:

```text
E:\developement\rat_dnsipd\backups\postgres
```

El backup local debe copiarse a un repositorio externo seguro: NAS, servidor
secundario, S3/MinIO o almacenamiento institucional.

## 12. Checklist de despliegue en otro servidor

- [ ] Clonar o copiar repositorio.
- [ ] Instalar Docker y Docker Compose.
- [ ] Crear PostgreSQL externo.
- [ ] Crear usuario y base.
- [ ] Restaurar backup si es migracion real.
- [ ] Crear `.env.prod`.
- [ ] Configurar `DATABASE_URL`.
- [ ] Configurar `JWT_SECRET`.
- [ ] Configurar `CORS_ORIGIN`.
- [ ] Ejecutar `npm run docker:prod:migrate`.
- [ ] Ejecutar seed solo si aplica.
- [ ] Levantar `npm run docker:prod`.
- [ ] Validar `/api/health`.
- [ ] Validar frontend.
- [ ] Validar login y permisos por rol.
- [ ] Configurar backups periodicos.
- [ ] Probar restore.

## 13. Usuarios semilla actuales

Usuarios disponibles al ejecutar seed:

```text
admin / Admin1234*
admin.funcional / Funcional1234*
revisor / Revisor1234*
aprobador.funcional / Aprobador1234*
revisor.seguridad / Seguridad1234*
operador.dsgsif / Operador1234*
operador.dnti / Operador1234*
```

En produccion real deben cambiarse las contrasenas iniciales despues del primer
ingreso.

## 14. Recomendacion final

La arquitectura actual deja una separacion correcta:

- Docker gestiona aplicacion.
- PostgreSQL productivo vive fuera.
- Prisma gestiona estructura.
- Seed gestiona datos base.
- Backup/restore gestiona datos reales.
- Nginx sirve frontend y enruta API.

La siguiente mejora recomendada es implementar servicios `db-backup` y
`db-restore` en Compose para automatizar migraciones de datos sin depender de
comandos manuales de PostgreSQL en cada servidor.
