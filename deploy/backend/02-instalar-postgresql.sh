#!/usr/bin/env bash
set -euo pipefail

PGDATA_TARGET="/app/rat_dnsipd/postgresql/data"
PGUSER="postgres"

echo "==> Instalando PostgreSQL desde repositorio del sistema"
dnf install -y postgresql-server postgresql-contrib

echo "==> Inicializando cluster"
postgresql-setup --initdb

echo "==> Deteniendo servicio para mover PGDATA"
systemctl stop postgresql.service || true

echo "==> Preparando nuevo directorio de datos en /app"
mkdir -p "${PGDATA_TARGET}"
chown -R "${PGUSER}:${PGUSER}" /app/rat_dnsipd/postgresql
chmod 700 "${PGDATA_TARGET}"

echo "==> Copiando datos iniciales"
if [ -d /var/lib/pgsql/data ] && [ -n "$(ls -A /var/lib/pgsql/data 2>/dev/null)" ]; then
  rsync -a /var/lib/pgsql/data/ "${PGDATA_TARGET}/"
fi

echo "==> Ajustando unidad systemd local para PGDATA"
mkdir -p /etc/systemd/system/postgresql.service.d
cat >/etc/systemd/system/postgresql.service.d/override.conf <<EOF
[Service]
Environment=PGDATA=${PGDATA_TARGET}
EOF

echo "==> Ajustando contexto SELinux si aplica"
if command -v semanage >/dev/null 2>&1; then
  semanage fcontext -a -t postgresql_db_t "${PGDATA_TARGET}(/.*)?"
  restorecon -Rv /app/rat_dnsipd/postgresql || true
fi

echo "==> Habilitando PostgreSQL"
systemctl daemon-reload
systemctl enable --now postgresql.service

echo "==> Estado PostgreSQL"
systemctl status postgresql.service --no-pager
