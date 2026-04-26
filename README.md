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
