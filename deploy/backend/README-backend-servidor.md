# Backend y servidor

Estos artefactos preparan el servidor AlmaLinux para desplegar el backend del sistema con:

- PostgreSQL local
- Node.js
- Nginx
- servicio `systemd`
- backups PostgreSQL

## Orden sugerido

1. `01-preparar-servidor.sh`
2. `02-instalar-postgresql.sh`
3. `03-instalar-node-nginx.sh`
4. configurar `.env`
5. instalar dependencias del backend
6. ejecutar migraciones Prisma
7. registrar `rat-dnsipd-backend.service`
8. configurar Nginx
9. habilitar backup diario

## Importante

Los scripts son base operativa y deben revisarse antes de ejecutarse en el servidor real.
