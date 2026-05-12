# Arquitectura Docker segura para rat_dnsipd

## Objetivo

Dockerizar el sistema desde el inicio con separacion clara entre aplicacion,
base de datos, configuracion y operacion. En produccion la base de datos es
externa al Compose; el Compose productivo solo ejecuta frontend, backend y
tareas controladas de migracion.

## Archivos principales

```text
docker-compose.yml          # Desarrollo local completo: frontend, backend, PostgreSQL
compose.prod.yml            # Produccion: frontend + backend contra PostgreSQL externo
.env.dev.example            # Variables ejemplo para desarrollo
.env.prod.example           # Variables ejemplo para produccion
backend/Dockerfile          # Imagen NestJS
frontend/Dockerfile         # Imagen frontend estatico con Nginx
docker/nginx/frontend.conf  # Nginx SPA + proxy /api
```

## Desarrollo local

En desarrollo se incluye PostgreSQL para que el entorno sea reproducible.

```powershell
Copy-Item .env.dev.example .env.dev
docker compose --env-file .env.dev -f docker-compose.yml up --build
```

Servicios:

- `postgres`: PostgreSQL 16 con volumen Docker nombrado.
- `backend`: NestJS en modo watch.
- `frontend`: Vite con proxy `/api` hacia backend.
- `migrator`: perfil manual para migraciones.
- `seed`: perfil manual para datos base.

Comandos utiles:

```powershell
npm run docker:dev
npm run docker:dev:migrate
npm run docker:dev:seed
```

## Produccion

En produccion PostgreSQL no vive dentro del Compose. La aplicacion recibe la
conexion por `DATABASE_URL`.

```powershell
Copy-Item .env.prod.example .env.prod
# Editar .env.prod con host externo, usuario, clave y secreto JWT robusto.
docker compose --env-file .env.prod -f compose.prod.yml up -d --build
```

Servicios:

- `backend`: API NestJS compilada, usuario no root, filesystem read-only.
- `frontend`: Nginx sirviendo `dist/` y proxy `/api` hacia `backend`.
- `migrator`: perfil manual para `prisma migrate deploy`.
- `seed`: perfil manual y controlado para instalacion inicial.

Migraciones productivas:

```powershell
npm run docker:prod:migrate
```

El seed productivo no debe ejecutarse automaticamente. Usarlo solo en una
instalacion inicial o una ventana controlada:

```powershell
docker compose --env-file .env.prod -f compose.prod.yml --profile seed run --rm seed
```

## Datos y recuperacion

La estructura de base vive en el repositorio:

```text
backend/prisma/schema.prisma
backend/prisma/migrations/
backend/prisma/seed.ts
```

Los datos reales viven en PostgreSQL externo o en backups. Si se pierde la base:

1. Crear base vacia.
2. Configurar `DATABASE_URL`.
3. Ejecutar `prisma migrate deploy`.
4. Restaurar backup real con `pg_restore` o `psql`.
5. Ejecutar seed solo si se requiere reponer datos maestros.

Las migraciones reconstruyen estructura; el seed reconstruye datos base; los
backups recuperan datos operativos reales.

## Seguridad base aplicada

- Produccion no incluye PostgreSQL embebido.
- Secretos fuera del codigo mediante `.env.prod`.
- `JWT_SECRET` obligatorio en Compose productivo.
- CORS configurable por `CORS_ORIGIN`.
- Backend y frontend con healthchecks.
- Contenedores productivos con `no-new-privileges`.
- Backend y frontend en modo read-only con `tmpfs` para temporales.
- Frontend servido por Nginx, no por Vite.
- API expuesta a usuarios por `/api` detras de Nginx.

## Checklist operacional

- [ ] `.env.prod` no esta versionado.
- [ ] `DATABASE_URL` apunta a PostgreSQL externo.
- [ ] `JWT_SECRET` es largo, aleatorio y unico por ambiente.
- [ ] PostgreSQL externo tiene backups y pruebas de restore.
- [ ] `prisma migrate deploy` se ejecuta antes de iniciar una version nueva.
- [ ] `seed` no se ejecuta automaticamente en produccion.
- [ ] Solo frontend/Nginx queda publicado hacia usuarios.
- [ ] Backend no se expone directamente si existe proxy externo.
- [ ] Logs y retencion se gestionan fuera del contenedor.
