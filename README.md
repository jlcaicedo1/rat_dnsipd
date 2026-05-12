# rat_dnsipd

Base principal del proyecto `rat_dnsipd` para la gestion de:

- RAT
- actividades de tratamiento
- activos de informacion
- MTGE
- riesgos
- EIPD
- reportes
- auditoria

## Estructura

- `backend`: API NestJS + Prisma + PostgreSQL
- `frontend`: app React + Vite + TypeScript
- `docs`: decisiones de arquitectura y entregables de analisis

## Estado actual

Se incluye:

- estructura inicial del monorepo
- esqueleto backend
- `schema.prisma` inicial
- convenciones de dominio
- esqueleto frontend

## Siguiente paso recomendado

1. instalar dependencias
2. generar cliente Prisma
3. ejecutar migraciones
4. continuar por modulos: auth, catalogos, estructura organica, RAT

## Docker

El proyecto separa desarrollo y produccion:

- `docker-compose.yml`: desarrollo local con PostgreSQL, backend y frontend.
- `compose.prod.yml`: produccion con frontend y backend; PostgreSQL es externo.

Desarrollo:

```bash
cp .env.dev.example .env.dev
npm run docker:dev
```

Produccion:

```bash
cp .env.prod.example .env.prod
# editar DATABASE_URL, JWT_SECRET y CORS_ORIGIN
npm run docker:prod:migrate
npm run docker:prod
```

Guia completa: `docs/arquitectura-docker-segura.md`.
