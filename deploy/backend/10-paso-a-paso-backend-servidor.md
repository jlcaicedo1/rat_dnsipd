# Paso a paso backend y servidor

## Objetivo

Preparar el servidor `192.168.111.151` desde backend para alojar:

- PostgreSQL local
- backend NestJS
- frontend servido por Nginx

## Paso 1. Definir estrategia de repositorio

Usar un solo repositorio:

- `rat_dnsipd`

Motivo:

- facilita desarrollo coordinado
- simplifica despliegue del MVP

## Paso 2. Subir el repositorio remoto

En tu equipo local:

```bash
git init
git add .
git commit -m "chore: bootstrap rat_dnsipd"
git branch -M main
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
```

## Paso 3. Preparar el servidor

Copiar y ejecutar:

```bash
bash deploy/backend/01-preparar-servidor.sh
```

## Paso 4. Instalar PostgreSQL local

Ejecutar:

```bash
bash deploy/backend/02-instalar-postgresql.sh
```

Luego revisar:

- estado del servicio
- `PGDATA` en `/app/rat_dnsipd/postgresql/data`

## Paso 5. Aplicar tuning inicial PostgreSQL

Agregar el contenido de:

- `deploy/backend/04-postgresql-tuning.conf`

al `postgresql.conf`, luego reiniciar:

```bash
systemctl restart postgresql.service
```

## Paso 6. Crear base y usuario de aplicacion

Como usuario `postgres`:

```bash
sudo -u postgres psql
```

Dentro de `psql`:

```sql
CREATE USER rat_app WITH PASSWORD 'CAMBIAR_PASSWORD';
CREATE DATABASE rat_db OWNER rat_app;
GRANT ALL PRIVILEGES ON DATABASE rat_db TO rat_app;
```

## Paso 7. Instalar Node.js y Nginx

Ejecutar:

```bash
bash deploy/backend/03-instalar-node-nginx.sh
```

## Paso 8. Publicar el proyecto en servidor

Clonar repositorio en una ruta temporal o en `releases/`:

```bash
cd /app/rat_dnsipd/releases
git clone <URL_DEL_REPOSITORIO> 2026-04-24-001
ln -sfn /app/rat_dnsipd/releases/2026-04-24-001 /app/rat_dnsipd/current
chown -R ratapp:ratapp /app/rat_dnsipd
```

## Paso 9. Configurar variables de entorno backend

Crear:

- `/app/rat_dnsipd/shared/env/backend.env`

Basado en:

- `deploy/backend/05-backend.env.example`

## Paso 10. Instalar dependencias backend

```bash
cd /app/rat_dnsipd/current/backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

## Paso 11. Registrar servicio backend

Copiar:

- `deploy/backend/06-rat-dnsipd-backend.service`

hacia:

- `/etc/systemd/system/rat-dnsipd-backend.service`

Luego:

```bash
systemctl daemon-reload
systemctl enable --now rat-dnsipd-backend.service
systemctl status rat-dnsipd-backend.service --no-pager
```

## Paso 12. Configurar Nginx

Copiar:

- `deploy/backend/07-nginx-rat-dnsipd.conf`

hacia:

- `/etc/nginx/conf.d/rat-dnsipd.conf`

Luego validar:

```bash
nginx -t
systemctl reload nginx
```

## Paso 13. Configurar backups

Copiar:

- `deploy/backend/08-backup-postgres.sh`

hacia:

- `/app/rat_dnsipd/scripts/backup-postgres.sh`

Dar permisos:

```bash
chmod 750 /app/rat_dnsipd/scripts/backup-postgres.sh
chown ratapp:ratapp /app/rat_dnsipd/scripts/backup-postgres.sh
```

Registrar cron usando:

- `deploy/backend/09-backup-postgres.cron`

## Paso 14. Verificaciones finales

Comprobar:

```bash
curl http://127.0.0.1:3000/api/health
curl http://192.168.111.151/
curl http://192.168.111.151/api/health
systemctl status postgresql.service --no-pager
systemctl status rat-dnsipd-backend.service --no-pager
systemctl status nginx --no-pager
```

## Fuentes consultadas

- PostgreSQL Red Hat family downloads: [postgresql.org](https://www.postgresql.org/download/linux/redhat)
- PostgreSQL en RHEL 10: [docs.redhat.com](https://docs.redhat.com/documentation/red_hat_enterprise_linux/10/html/configuring_and_using_database_servers/using-postgresql)
- NodeSource RPM: [rpm.nodesource.com](https://rpm.nodesource.com/)
