# Siguiente fase de desarrollo

## Orden sugerido

1. Instalar dependencias del `backend` y `frontend`.
2. Configurar PostgreSQL y `.env`.
3. Generar cliente Prisma y crear migracion inicial.
4. Implementar modulos reales:
   - auth
   - users
   - catalogos
   - estructura organica
   - RAT
5. Implementar luego:
   - actividades
   - activos
   - MTGE
   - riesgos
   - EIPD
   - auditoria

## Decisiones ya incorporadas

- modelo relacional para multivalores de actividad
- roles por tabla y no solo campo string
- observaciones como entidad propia
- alertas contextuales
- separacion entre versionado y auditoria

## Pendiente inmediato

El siguiente modulo de mas valor es `actividad_version`, porque es el corazon funcional del sistema.
